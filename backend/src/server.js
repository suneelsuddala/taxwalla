import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import { Pool } from 'pg';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 8788);
const secret = process.env.SESSION_SECRET;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  const origin = process.env.APP_ORIGIN;
  if (origin && req.headers.origin === origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const error = (res, status, code, message) => res.status(status).json({ success: false, code, message });
const hash = (password, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
function verify(password, stored) { const [salt, expected] = String(stored).split(':'); if (!salt || !expected) return false; const actual = crypto.scryptSync(password, salt, 64).toString('hex'); return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }
function sign(payload) { const body = Buffer.from(JSON.stringify(payload)).toString('base64url'); return `${body}.${crypto.createHmac('sha256', secret).update(body).digest('base64url')}`; }
function session(req) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!secret || !token) return null; const [body, sig] = token.split('.'); if (!body || !sig) return null; const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url'); if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null; try { const value = JSON.parse(Buffer.from(body, 'base64url').toString()); return value.exp > Date.now() ? value : null; } catch { return null; } }
async function requireAuth(req, res, next) { const value = session(req); if (!value) return error(res, 401, 'AUTH_REQUIRED', 'Sign in is required.'); const access = await pool.query('SELECT role FROM memberships WHERE user_id=$1 AND business_id=$2', [value.userId, value.businessId]); if (!access.rowCount) return error(res, 403, 'BUSINESS_ACCESS_DENIED', 'Business access denied.'); req.session = value; next(); }
app.get('/health', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'up' }); } catch (e) { res.status(503).json({ ok: false, database: 'down', message: e.message }); } });
app.post('/api/v1/auth/register', async (req, res) => { const username = String(req.body?.username || '').trim().toLowerCase(); const password = String(req.body?.password || ''); const name = String(req.body?.businessName || '').trim(); if (!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(username) || password.length < 8 || !name) return error(res, 400, 'INVALID_REGISTRATION', 'Valid username, business name and 8 character password are required.'); const client = await pool.connect(); try { await client.query('BEGIN'); const user = await client.query('INSERT INTO users(username,password_hash) VALUES($1,$2) RETURNING id,username', [username, hash(password)]); const business = await client.query('INSERT INTO businesses(name,state) VALUES($1,$2) RETURNING id,name', [name, String(req.body?.state || 'Andhra Pradesh')]); await client.query('INSERT INTO memberships(user_id,business_id,role) VALUES($1,$2,$3)', [user.rows[0].id, business.rows[0].id, 'owner']); await client.query('COMMIT'); const token = sign({ userId: user.rows[0].id, businessId: business.rows[0].id, exp: Date.now() + 28800000 }); res.status(201).json({ success: true, token, user: user.rows[0], business: business.rows[0] }); } catch (e) { await client.query('ROLLBACK'); if (e.code === '23505') return error(res, 409, 'USERNAME_EXISTS', 'That username is already in use.'); console.error(e); error(res, 500, 'REGISTRATION_FAILED', 'Could not create the account.'); } finally { client.release(); } });
app.post('/api/v1/auth/login', async (req, res) => { try { const username = String(req.body?.username || '').trim().toLowerCase(); const result = await pool.query('SELECT id,username,password_hash FROM users WHERE username=$1', [username]); if (!result.rowCount || !verify(String(req.body?.password || ''), result.rows[0].password_hash)) return error(res, 401, 'INVALID_CREDENTIALS', 'Incorrect username or password.'); const membership = await pool.query('SELECT business_id,role FROM memberships WHERE user_id=$1 ORDER BY created_at LIMIT 1', [result.rows[0].id]); if (!membership.rowCount) return error(res, 403, 'NO_BUSINESS', 'No business is assigned.'); const m = membership.rows[0]; res.json({ success: true, token: sign({ userId: result.rows[0].id, businessId: m.business_id, exp: Date.now() + 28800000 }), user: { id: result.rows[0].id, username }, businessId: m.business_id, role: m.role }); } catch (e) { console.error(e); error(res, 500, 'LOGIN_FAILED', 'Could not sign in.'); } });
app.get('/api/v1/auth/me', requireAuth, async (req, res) => { const result = await pool.query('SELECT u.id,u.username,b.id business_id,b.name business_name,m.role FROM users u JOIN memberships m ON m.user_id=u.id JOIN businesses b ON b.id=m.business_id WHERE u.id=$1 AND b.id=$2', [req.session.userId, req.session.businessId]); res.json({ success: true, user: result.rows[0] || null }); });
app.get('/api/v1/reports/summary', requireAuth, async (req, res) => { const result = await pool.query("SELECT (SELECT COALESCE(SUM(total_minor),0) FROM invoices WHERE business_id=$1 AND status <> 'cancelled') sales_minor, (SELECT COALESCE(SUM(amount_minor),0) FROM expenses WHERE business_id=$1) expenses_minor", [req.session.businessId]); res.json({ success: true, summary: result.rows[0] }); });
app.use((e, _req, res, _next) => { console.error(e); error(res, 500, 'INTERNAL_ERROR', 'Unexpected server error.'); });
if (!secret) console.warn('SESSION_SECRET is not configured.');
app.listen(port, () => console.log(`Taxwalla API listening on port ${port}`));
