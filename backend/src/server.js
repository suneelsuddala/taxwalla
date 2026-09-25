import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8788);
const sessionSecret = process.env.SESSION_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const useSsl = process.env.PGSSL === 'require'
  || (process.env.NODE_ENV === 'production' && process.env.PGSSL !== 'disable');
const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10000,
  ...(useSsl
    ? { ssl: { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } }
    : {})
});

app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  const origin = process.env.APP_ORIGIN;
  if (origin && req.headers.origin === origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function sendError(res, status, code, message, fields = undefined) {
  return res.status(status).json({ success: false, code, message, ...(fields ? { fields } : {}) });
}

function validUsername(value) {
  return /^[a-z0-9][a-z0-9._-]{3,31}$/.test(value);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function readSession(token) {
  if (!sessionSecret || !token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

async function requireSession(req, res, next) {
  const session = readSession(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!session) return sendError(res, 401, 'AUTH_REQUIRED', 'Sign in is required.');
  const membership = await pool.query(
    'SELECT role FROM memberships WHERE user_id = $1 AND business_id = $2',
    [session.userId, session.businessId]
  );
  if (!membership.rowCount) return sendError(res, 403, 'BUSINESS_ACCESS_DENIED', 'You do not have access to this business.');
  req.session = { ...session, role: membership.rows[0].role };
  next();
}

function requireFields(body, fields) {
  return fields.filter((field) => typeof body?.[field] !== 'string' || !body[field].trim());
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'up' });
  } catch (error) {
    console.error('Health database check failed.', {
      code: error.code,
      message: error.message,
      host: databaseUrl ? (() => {
        try {
          return new URL(databaseUrl).hostname;
        } catch {
          return 'invalid-database-url';
        }
      })() : 'missing-database-url'
    });
    res.status(503).json({ ok: false, database: 'down', message: 'Database connection is unavailable.' });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const businessName = String(req.body?.businessName || '').trim();
  const missing = requireFields({ username, password, businessName }, ['username', 'password', 'businessName']);
  if (missing.length || !validUsername(username) || password.length < 8) {
    return sendError(res, 400, 'INVALID_REGISTRATION', 'Provide a valid username, business name and password of at least 8 characters.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hashPassword(password)]
    );
    const business = await client.query(
      'INSERT INTO businesses (name, state) VALUES ($1, $2) RETURNING id, name',
      [businessName, String(req.body.state || 'Andhra Pradesh').trim()]
    );
    await client.query(
      'INSERT INTO memberships (user_id, business_id, role) VALUES ($1, $2, $3)',
      [user.rows[0].id, business.rows[0].id, 'owner']
    );
    await client.query('COMMIT');
    const token = signSession({ userId: user.rows[0].id, businessId: business.rows[0].id, exp: Date.now() + 8 * 60 * 60 * 1000 });
    res.status(201).json({ success: true, token, user: user.rows[0], business: business.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return sendError(res, 409, 'USERNAME_EXISTS', 'That username is already in use.');
    console.error('Registration failed.', error);
    sendError(res, 500, 'REGISTRATION_FAILED', 'Could not create the account.');
  } finally {
    client.release();
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  try {
    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
    if (!result.rowCount || !verifyPassword(password, result.rows[0].password_hash)) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Incorrect username or password.');
    }
    const membership = await pool.query(
      'SELECT business_id, role FROM memberships WHERE user_id = $1 ORDER BY created_at LIMIT 1',
      [result.rows[0].id]
    );
    if (!membership.rowCount) return sendError(res, 403, 'NO_BUSINESS', 'No business is assigned to this account.');
    const session = membership.rows[0];
    const token = signSession({ userId: result.rows[0].id, businessId: session.business_id, exp: Date.now() + 8 * 60 * 60 * 1000 });
    res.json({ success: true, token, user: { id: result.rows[0].id, username }, businessId: session.business_id, role: session.role });
  } catch (error) {
    console.error('Login failed.', error);
    sendError(res, 500, 'LOGIN_FAILED', 'Could not sign in.');
  }
});

app.get('/api/v1/auth/me', requireSession, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.username, b.id AS business_id, b.name AS business_name, m.role
     FROM users u JOIN memberships m ON m.user_id = u.id JOIN businesses b ON b.id = m.business_id
     WHERE u.id = $1 AND b.id = $2`,
    [req.session.userId, req.session.businessId]
  );
  res.json({ success: true, user: result.rows[0] || null });
});

app.get('/api/v1/products', requireSession, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM products WHERE business_id = $1 ORDER BY name',
    [req.session.businessId]
  );
  res.json({ success: true, products: result.rows });
});

app.post('/api/v1/products', requireSession, async (req, res) => {
  const missing = requireFields(req.body, ['name', 'sku']);
  if (missing.length) return sendError(res, 400, 'INVALID_PRODUCT', 'Product name and SKU are required.', missing);
  const values = [
    req.session.businessId, req.body.name.trim(), req.body.sku.trim(), String(req.body.hsnCode || '').trim(),
    Number(req.body.gstRate || 0), Number(req.body.stockQty || 0), Number(req.body.sellingPriceMinor || 0)
  ];
  if (values.slice(4).some((value) => !Number.isFinite(value) || value < 0)) return sendError(res, 400, 'INVALID_PRODUCT', 'Numeric product values must be non-negative.');
  try {
    const result = await pool.query(
      `INSERT INTO products (business_id, name, sku, hsn_code, gst_rate, stock_qty, selling_price_minor)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      values
    );
    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return sendError(res, 409, 'SKU_EXISTS', 'That SKU already exists for this business.');
    console.error('Product creation failed.', error);
    sendError(res, 500, 'PRODUCT_CREATE_FAILED', 'Could not create the product.');
  }
});

app.get('/api/v1/customers', requireSession, async (req, res) => {
  const result = await pool.query('SELECT * FROM customers WHERE business_id = $1 ORDER BY name', [req.session.businessId]);
  res.json({ success: true, customers: result.rows });
});

app.post('/api/v1/customers', requireSession, async (req, res) => {
  const missing = requireFields(req.body, ['name']);
  if (missing.length) return sendError(res, 400, 'INVALID_CUSTOMER', 'Customer name is required.', missing);
  const result = await pool.query(
    'INSERT INTO customers (business_id, name, phone, email, gstin, state) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.session.businessId, req.body.name.trim(), req.body.phone || null, req.body.email || null, req.body.gstin || null, req.body.state || null]
  );
  res.status(201).json({ success: true, customer: result.rows[0] });
});

app.get('/api/v1/invoices', requireSession, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM invoices WHERE business_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.session.businessId]
  );
  res.json({ success: true, invoices: result.rows });
});

app.get('/api/v1/payments', requireSession, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM payments WHERE business_id = $1 ORDER BY paid_at DESC LIMIT 100',
    [req.session.businessId]
  );
  res.json({ success: true, payments: result.rows });
});

app.post('/api/v1/payments', requireSession, async (req, res) => {
  const amount = Number(req.body?.amountMinor);
  const allowedModes = new Set(['cash', 'upi', 'bank', 'card', 'credit']);
  if (!Number.isSafeInteger(amount) || amount <= 0 || !allowedModes.has(req.body?.mode)) {
    return sendError(res, 400, 'INVALID_PAYMENT', 'Payment amount and a supported payment mode are required.');
  }
  try {
    const result = await pool.query(
      `INSERT INTO payments (business_id, invoice_id, amount_minor, mode)
       SELECT $1, i.id, $2, $3
       FROM invoices i
       WHERE i.business_id = $1 AND ($4::uuid IS NULL OR i.id = $4::uuid)
       RETURNING *`,
      [req.session.businessId, amount, req.body.mode, req.body.invoiceId || null]
    );
    if (!result.rowCount) return sendError(res, 404, 'INVOICE_NOT_FOUND', 'The invoice was not found in this business.');
    res.status(201).json({ success: true, payment: result.rows[0] });
  } catch (error) {
    console.error('Payment creation failed.', error);
    sendError(res, 500, 'PAYMENT_CREATE_FAILED', 'Could not record the payment.');
  }
});

app.get('/api/v1/expenses', requireSession, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM expenses WHERE business_id = $1 ORDER BY expense_date DESC, created_at DESC LIMIT 100',
    [req.session.businessId]
  );
  res.json({ success: true, expenses: result.rows });
});

app.post('/api/v1/expenses', requireSession, async (req, res) => {
  const missing = requireFields(req.body, ['category', 'description']);
  const amount = Number(req.body?.amountMinor);
  if (missing.length || !Number.isSafeInteger(amount) || amount <= 0) {
    return sendError(res, 400, 'INVALID_EXPENSE', 'Category, description and a positive amount are required.', missing);
  }
  const result = await pool.query(
    `INSERT INTO expenses (business_id, category, description, amount_minor, expense_date)
     VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE)) RETURNING *`,
    [req.session.businessId, req.body.category.trim(), req.body.description.trim(), amount, req.body.expenseDate || null]
  );
  res.status(201).json({ success: true, expense: result.rows[0] });
});

app.get('/api/v1/purchases', requireSession, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM purchases WHERE business_id = $1 ORDER BY purchase_date DESC, created_at DESC LIMIT 100',
    [req.session.businessId]
  );
  res.json({ success: true, purchases: result.rows });
});

app.post('/api/v1/purchases', requireSession, async (req, res) => {
  const missing = requireFields(req.body, ['supplierName']);
  const values = ['subtotalMinor', 'taxMinor', 'totalMinor'].map((key) => Number(req.body?.[key] || 0));
  if (missing.length || values.some((value) => !Number.isSafeInteger(value) || value < 0) || values[2] <= 0) {
    return sendError(res, 400, 'INVALID_PURCHASE', 'Supplier and valid purchase totals are required.', missing);
  }
  const result = await pool.query(
    `INSERT INTO purchases
      (business_id, supplier_name, reference_number, subtotal_minor, tax_minor, total_minor, purchase_date)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE)) RETURNING *`,
    [req.session.businessId, req.body.supplierName.trim(), req.body.referenceNumber || null, values[0], values[1], values[2], req.body.purchaseDate || null]
  );
  res.status(201).json({ success: true, purchase: result.rows[0] });
});

app.get('/api/v1/returns', requireSession, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM returns WHERE business_id = $1 ORDER BY return_date DESC, created_at DESC LIMIT 100',
    [req.session.businessId]
  );
  res.json({ success: true, returns: result.rows });
});

app.post('/api/v1/returns', requireSession, async (req, res) => {
  const missing = requireFields(req.body, ['returnNumber', 'kind', 'reason']);
  const amount = Number(req.body?.amountMinor);
  if (missing.length || !['credit_note', 'debit_note'].includes(req.body.kind) || !Number.isSafeInteger(amount) || amount <= 0) {
    return sendError(res, 400, 'INVALID_RETURN', 'Return number, type, reason and a positive amount are required.', missing);
  }
  try {
    const result = await pool.query(
      `INSERT INTO returns (business_id, invoice_id, return_number, kind, reason, amount_minor, return_date)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE)) RETURNING *`,
      [req.session.businessId, req.body.invoiceId || null, req.body.returnNumber.trim(), req.body.kind, req.body.reason.trim(), amount, req.body.returnDate || null]
    );
    res.status(201).json({ success: true, return: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return sendError(res, 409, 'RETURN_EXISTS', 'That return number already exists.');
    console.error('Return creation failed.', error);
    sendError(res, 500, 'RETURN_CREATE_FAILED', 'Could not record the return.');
  }
});

app.get('/api/v1/reports/summary', requireSession, async (req, res) => {
  const result = await pool.query(
    `SELECT
      (SELECT COALESCE(SUM(total_minor), 0) FROM invoices WHERE business_id = $1 AND status <> 'cancelled') AS sales_minor,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM payments WHERE business_id = $1) AS payments_minor,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM expenses WHERE business_id = $1) AS expenses_minor,
      (SELECT COALESCE(SUM(total_minor), 0) FROM purchases WHERE business_id = $1 AND status <> 'cancelled') AS purchases_minor,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM returns WHERE business_id = $1 AND kind = 'credit_note') AS credit_notes_minor,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM returns WHERE business_id = $1 AND kind = 'debit_note') AS debit_notes_minor`,
    [req.session.businessId]
  );
  res.json({ success: true, summary: result.rows[0] });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error.', error);
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected server error occurred.');
});

if (!sessionSecret || sessionSecret.startsWith('replace-')) {
  console.warn('SESSION_SECRET is not configured. Authentication tokens will not be safe.');
}

app.listen(port, () => console.log(`Taxwalla API listening on http://127.0.0.1:${port}`));
