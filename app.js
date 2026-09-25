const STORAGE_KEY = 'ledger-bloom-gst-v1';
const AUTH_KEY = 'ledger-bloom-auth-v1';
const DEFAULT_STATE = {
  business: {
    name: 'SVDF GST',
    gstin: '33AAAAA0000A1Z5',
    state: 'Tamil Nadu',
    invoicePrefix: 'INV',
    salesCoverage: 'All India',
    billingModes: ['GST', 'non-GST'],
    phone: '',
    email: '',
    address: '',
    upiId: '',
    invoiceFooter: 'Thank you for your business'
  },
  products: [
    { id: 'p-1', name: 'Smart Ledger Book', sku: 'SLB-100', hsnCode: '4901', gstRate: 18, stockQty: 25, sellingPrice: 350 },
    { id: 'p-2', name: 'Premium Pen Set', sku: 'PEN-200', hsnCode: '4820', gstRate: 12, stockQty: 50, sellingPrice: 120 },
    { id: 'p-3', name: 'Office Chair', sku: 'CHAIR-500', hsnCode: '9403', gstRate: 18, stockQty: 12, sellingPrice: 2800 }
  ],
  customers: [
    { id: 'c-1', name: 'Aarav Traders', phone: '9876543210', gstin: '33AAAAA1111A1Z1', state: 'Tamil Nadu' },
    { id: 'c-2', name: 'Bharat Retail', phone: '9123456780', gstin: '', state: 'Karnataka' }
  ],
  invoices: [],
  nextInvoiceNumber: 1001
};

const state = loadState();
let invoiceItems = [];
let activeModal = null;
let activeModule = null;

const promoCards = [
  { title: 'Smart GST automation', text: 'Auto-calc taxes, manage tax modes and export clean reports with less friction.', tag: 'GST Ready' },
  { title: 'Inventory control', text: 'Track stock levels, reorder risks and movement logs from one premium dashboard.', tag: 'Live Stock' },
  { title: 'Cash flow clarity', text: 'Monitor receivables, unpaid invoices and payment trends before they become a problem.', tag: 'Insights' }
];

const featureCards = [
  { title: 'Fast billing', text: 'Create GST and non-GST invoices in under a minute with intuitive product and customer selection.' },
  { title: 'Multi-business ready', text: 'Support multiple business profiles, states, invoice prefixes and admin controls.' },
  { title: 'Public-ready brand', text: 'Present your product with a premium home page designed for promotion and trust-building.' },
  { title: 'Offline-first', text: 'Keep your workflow resilient with local data persistence and browser-based continuity.' },
  { title: 'Customer visibility', text: 'Know who owes what and surface outstanding balances without digging through sales data.' },
  { title: 'Smart reports', text: 'See activity, stock health and sales performance in a presentation-friendly interface.' }
];

const els = {
  businessNameHeader: document.getElementById('businessNameHeader'),
  salesToday: document.getElementById('salesToday'),
  receivables: document.getElementById('receivables'),
  stockValue: document.getElementById('stockValue'),
  gstCollected: document.getElementById('gstCollected'),
  recentInvoices: document.getElementById('recentInvoices'),
  lowStockList: document.getElementById('lowStockList'),
  productsTableBody: document.getElementById('productsTableBody'),
  customersTableBody: document.getElementById('customersTableBody'),
  invoiceCustomerSelect: document.getElementById('invoiceCustomerSelect'),
  customerGstinInput: document.getElementById('customerGstinInput'),
  fetchGstinButton: document.getElementById('fetchGstinButton'),
  gstinStatus: document.getElementById('gstinStatus'),
  documentTypeSelect: document.getElementById('documentTypeSelect'),
  invoiceNumber: document.getElementById('invoiceNumber'),
  invoiceDateInput: document.getElementById('invoiceDateInput'),
  dueDateInput: document.getElementById('dueDateInput'),
  businessStateInput: document.getElementById('businessStateInput'),
  placeOfSupplyInput: document.getElementById('placeOfSupplyInput'),
  taxModeSelect: document.getElementById('taxModeSelect'),
  supplyTreatmentSelect: document.getElementById('supplyTreatmentSelect'),
  reverseChargeInput: document.getElementById('reverseChargeInput'),
  selectedProduct: document.getElementById('selectedProduct'),
  itemQty: document.getElementById('itemQty'),
  addItemButton: document.getElementById('addItemButton'),
  productPreview: document.getElementById('productPreview'),
  invoiceItemsBody: document.getElementById('invoiceItemsBody'),
  subtotalDisplay: document.getElementById('subtotalDisplay'),
  cgstDisplay: document.getElementById('cgstDisplay'),
  sgstDisplay: document.getElementById('sgstDisplay'),
  igstDisplay: document.getElementById('igstDisplay'),
  grandTotalDisplay: document.getElementById('grandTotalDisplay'),
  balanceDisplay: document.getElementById('balanceDisplay'),
  paidAmountInput: document.getElementById('paidAmountInput'),
  discountInput: document.getElementById('discountInput'),
  freightInput: document.getElementById('freightInput'),
  roundOffInput: document.getElementById('roundOffInput'),
  paymentModeSelect: document.getElementById('paymentModeSelect'),
  invoiceNotesInput: document.getElementById('invoiceNotesInput'),
  saveInvoiceButton: document.getElementById('saveInvoiceButton'),
  printInvoiceButton: document.getElementById('printInvoiceButton'),
  salesRegisterList: document.getElementById('salesRegisterList'),
  stockStatusList: document.getElementById('stockStatusList'),
  businessNameInput: document.getElementById('businessNameInput'),
  businessPhoneInput: document.getElementById('businessPhoneInput'),
  businessEmailInput: document.getElementById('businessEmailInput'),
  businessGstinInput: document.getElementById('businessGstinInput'),
  businessStateInputSettings: document.getElementById('businessStateInputSettings'),
  invoicePrefixInput: document.getElementById('invoicePrefixInput'),
  salesCoverageInput: document.getElementById('salesCoverageInput'),
  billingModesInput: document.getElementById('billingModesInput'),
  upiIdInput: document.getElementById('upiIdInput'),
  invoiceFooterInput: document.getElementById('invoiceFooterInput'),
  businessAddressInput: document.getElementById('businessAddressInput'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  productForm: document.getElementById('productForm'),
  customerForm: document.getElementById('customerForm'),
  newInvoiceButton: document.getElementById('newInvoiceButton'),
  addProductButton: document.getElementById('addProductButton'),
  addCustomerButton: document.getElementById('addCustomerButton'),
  saveSettingsButton: document.getElementById('saveSettingsButton'),
  closeModalButton: document.getElementById('closeModalButton')
};

const authEls = {
  screen: document.getElementById('authScreen'),
  loginStep: document.getElementById('authLoginStep'),
  setupStep: document.getElementById('authSetupStep'),
  recoveryStep: document.getElementById('authRecoveryStep'),
  loginUsername: document.getElementById('loginUsernameInput'),
  loginPassword: document.getElementById('loginPasswordInput'),
  setupUsername: document.getElementById('setupUsernameInput'),
  setupPassword: document.getElementById('setupPasswordInput'),
  setupConfirmPassword: document.getElementById('setupConfirmPasswordInput'),
  recoveryPhone: document.getElementById('recoveryPhoneInput'),
  recoveryEmail: document.getElementById('recoveryEmailInput'),
  recoveryPassword: document.getElementById('recoveryPasswordInput'),
  loginButton: document.getElementById('loginButton'),
  createAccountButton: document.getElementById('createAccountButton'),
  recoverAccountButton: document.getElementById('recoverAccountButton'),
  showSetupButton: document.getElementById('showSetupButton'),
  showRecoveryButton: document.getElementById('showRecoveryButton'),
  backToLoginButton: document.getElementById('backToLoginButton'),
  backFromRecoveryButton: document.getElementById('backFromRecoveryButton'),
  error: document.getElementById('authError'),
  signedInUsername: document.getElementById('signedInUsername'),
  logoutButton: document.getElementById('logoutButton')
};

const moduleCatalog = {
  payments: {
    title: 'Payments & collections',
    description: 'Track incoming payments, outstanding balances, reminders and payment methods from one place.',
    cards: [
      ['Outstanding invoices', 'Review customer balances and due dates before they become overdue.'],
      ['Payment links', 'Prepare UPI and payment-link workflows for faster collection.'],
      ['Receipts', 'Record cash, UPI, bank, card and credit receipts with an audit trail.'],
      ['Payment reminders', 'Prepare WhatsApp, SMS and email reminders for unpaid invoices.']
    ]
  },
  expenses: {
    title: 'Expenses & purchase costs',
    description: 'Capture operating expenses and keep your profit-and-loss view current.',
    cards: [
      ['Expense bills', 'Record rent, travel, utilities, salaries and other operating costs.'],
      ['Supplier payables', 'Track what is owed to vendors and when it is due.'],
      ['Expense categories', 'Organize costs for cleaner reporting and CA review.'],
      ['Attachments', 'Keep invoice scans and supporting documents linked to entries.']
    ]
  },
  purchases: {
    title: 'Purchase bills',
    description: 'Manage supplier invoices, received stock and purchase-related GST data.',
    cards: [
      ['Create purchase bill', 'Capture supplier, items, GST, due dates and payment status.'],
      ['Stock receipt', 'Increase inventory from approved purchase documents.'],
      ['Supplier ledger', 'See payable balances and purchase history by vendor.'],
      ['Input tax credit', 'Prepare purchase tax data for reconciliation and GST review.']
    ]
  },
  gst: {
    title: 'GST center',
    description: 'Prepare tax summaries and compliance work without hiding provider-dependent steps.',
    cards: [
      ['GSTR-1 preparation', 'Review outward supplies and export a CA-ready sales register.'],
      ['GSTR-3B preparation', 'Summarize taxable value, output tax and input credit.'],
      ['HSN summary', 'Group sales by HSN/SAC and GST rate.'],
      ['Reconciliation', 'Prepare a workspace for matching purchase data with provider reports.']
    ]
  },
  einvoice: {
    title: 'E-invoice',
    description: 'A safe integration boundary for IRN, signed QR and cancellation workflows.',
    cards: [
      ['Generate IRN', 'Connect an authorized provider before sending regulated data.'],
      ['IRN status', 'Monitor pending, generated, cancelled and failed requests.'],
      ['QR verification', 'Store provider responses and render compliant invoice QR data.'],
      ['Retry queue', 'Retry provider failures idempotently without duplicate invoices.']
    ]
  },
  eway: {
    title: 'E-way bill',
    description: 'Prepare transport details and connect an authorized e-way bill provider.',
    cards: [
      ['Transport details', 'Vehicle, transporter, distance and document information.'],
      ['Generate e-way bill', 'Provider-backed generation with explicit status tracking.'],
      ['Extend validity', 'Prepare extension requests for eligible shipments.'],
      ['Compliance history', 'Keep request, response and audit events together.']
    ]
  },
  team: {
    title: 'Team & permissions',
    description: 'Prepare role-based access for owners, managers, accountants and billing staff.',
    cards: [
      ['Owner', 'Full business, billing, compliance and settings access.'],
      ['Manager', 'Operational access with controlled approval actions.'],
      ['Accountant', 'Ledger, GST, reports and reconciliation access.'],
      ['Cashier', 'Create bills and record payments without admin settings.']
    ]
  },
  returns: {
    title: 'Sales returns & credit notes',
    description: 'Keep returns, credit notes and customer adjustments connected to the original sale. Provider submission remains an explicit compliance step.',
    cards: [
      ['Create credit note', 'Record returned items, taxable value, GST and the linked invoice.'],
      ['Return register', 'Review return reasons, quantities and customer balances.'],
      ['Adjust stock', 'Put eligible returned goods back into available inventory.'],
      ['Export adjustments', 'Prepare a clean register for accountant or GST review.']
    ]
  },
  documents: {
    title: 'Documents & exports',
    description: 'Keep business records easy to find and prepare clean exports for sharing or review.',
    cards: [
      ['Invoice archive', 'Search saved invoices by customer, number, date or payment status.'],
      ['CSV exports', 'Export sales, customers, products and tax summaries for review.'],
      ['Business documents', 'Keep agreement, registration and supporting files organized.'],
      ['Backup workspace', 'Create a local backup before moving to a production database.']
    ]
  }
};

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function attachQuickActions() {
  document.querySelectorAll('[data-quick-view]').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.quickView));
  });
  document.querySelectorAll('[data-quick-module]').forEach((button) => {
    button.addEventListener('click', () => renderModule(button.dataset.quickModule));
  });
}

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

const ACCOUNT_KEY = 'ledger-bloom-account-v1';

function getAccount() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
  } catch {
    return null;
  }
}

async function hashCredential(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function setAuth(username) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ username, signedInAt: new Date().toISOString() }));
}

function showAuthError(message) {
  authEls.error.textContent = message;
}

function showAuthStep(step) {
  authEls.loginStep.classList.toggle('hidden', step !== 'login');
  authEls.setupStep.classList.toggle('hidden', step !== 'setup');
  authEls.recoveryStep.classList.toggle('hidden', step !== 'recovery');
  showAuthError('');
}

function finishAuthentication(username) {
  setAuth(username);
  authEls.signedInUsername.textContent = username;
  authEls.screen.classList.add('hidden');
}

function initializeAuthentication() {
  const account = getAccount();
  const auth = getAuth();
  if (auth && account && auth.username === account.username) {
    finishAuthentication(account.username);
  } else {
    authEls.screen.classList.remove('hidden');
    showAuthStep(account ? 'login' : 'setup');
  }

  authEls.createAccountButton.addEventListener('click', async () => {
    const username = authEls.setupUsername.value.trim().toLowerCase();
    const password = authEls.setupPassword.value;
    if (!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(username)) {
      showAuthError('Username must be 4-32 characters using letters, numbers, dot, underscore or hyphen.');
      return;
    }
    if (password.length < 8 || password !== authEls.setupConfirmPassword.value) {
      showAuthError('Use a password of at least 8 characters and confirm it correctly.');
      return;
    }
    try {
      const passwordHash = await hashCredential(password);
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ username, passwordHash }));
      finishAuthentication(username);
    } catch (error) {
      console.error('Account creation failed.', error);
      showAuthError('Account setup failed in this browser. Check storage permissions and try again.');
    }
  });

  authEls.loginButton.addEventListener('click', async () => {
    const currentAccount = getAccount();
    const username = authEls.loginUsername.value.trim().toLowerCase();
    try {
      const passwordHash = await hashCredential(authEls.loginPassword.value);
      if (!currentAccount || username !== currentAccount.username || passwordHash !== currentAccount.passwordHash) {
        showAuthError('Incorrect username or password.');
        return;
      }
      finishAuthentication(username);
    } catch (error) {
      console.error('Sign-in failed.', error);
      showAuthError('Sign-in is unavailable in this browser. Check storage permissions and try again.');
    }
  });

  authEls.recoverAccountButton.addEventListener('click', async () => {
    const phone = authEls.recoveryPhone.value.replace(/\D/g, '');
    const email = authEls.recoveryEmail.value.trim().toLowerCase();
    const currentAccount = getAccount();
    if (!currentAccount || phone !== state.business.phone.replace(/\D/g, '') || email !== state.business.email.toLowerCase()) {
      showAuthError('The recovery phone or email does not match Business settings.');
      return;
    }
    const password = authEls.recoveryPassword.value;
    if (password.length < 8) {
      showAuthError('Use a new password of at least 8 characters.');
      return;
    }
    try {
      const passwordHash = await hashCredential(password);
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
        username: currentAccount.username,
        passwordHash
      }));
      showAuthError(`Password reset. Your username is "${currentAccount.username}".`);
    } catch (error) {
      console.error('Password recovery failed.', error);
      showAuthError('Password reset failed in this browser. Check storage permissions and try again.');
    }
    showAuthStep('login');
  });

  authEls.showSetupButton.addEventListener('click', () => showAuthStep('setup'));
  authEls.showRecoveryButton.addEventListener('click', () => showAuthStep('recovery'));
  authEls.backToLoginButton.addEventListener('click', () => showAuthStep('login'));
  authEls.backFromRecoveryButton.addEventListener('click', () => showAuthStep('login'));
  authEls.logoutButton.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    window.location.reload();
  });
  attachQuickActions();
}

function roundPaisa(value) {
  return Math.round((safeNumber(value) || 0) * 100);
}

function formatMoneyFromPaisa(amountInPaisa) {
  const total = safeNumber(amountInPaisa) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(total);
}

function formatSimpleMoney(value) {
  return formatMoneyFromPaisa(roundPaisa(value));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeState() {
  if (!state.business) state.business = structuredClone(DEFAULT_STATE.business);
  state.business = {
    ...structuredClone(DEFAULT_STATE.business),
    ...state.business,
    salesCoverage: state.business.salesCoverage || 'All India',
    billingModes: Array.isArray(state.business.billingModes) && state.business.billingModes.length
      ? state.business.billingModes
      : ['GST', 'non-GST']
  };
  if (!Array.isArray(state.products)) state.products = structuredClone(DEFAULT_STATE.products);
  if (!Array.isArray(state.customers)) state.customers = structuredClone(DEFAULT_STATE.customers);
  if (!Array.isArray(state.invoices)) state.invoices = [];
  if (!state.nextInvoiceNumber) state.nextInvoiceNumber = 1001;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch (error) {
    console.warn('State reset due to corrupt storage', error);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === viewId));
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewId));
}

function renderModule(moduleKey) {
  const module = moduleCatalog[moduleKey];
  if (!module) return;
  activeModule = moduleKey;
  document.getElementById('moduleTitle').textContent = module.title;
  document.getElementById('moduleDescription').textContent = module.description;
  document.getElementById('moduleCards').innerHTML = module.cards.map(([title, text]) => `
    <article class="module-card">
      <div class="feature-icon">✓</div>
      <h4>${title}</h4>
      <p>${text}</p>
      <span class="coming-badge">Workspace ready</span>
    </article>
  `).join('');
  showView('moduleView');
}

function openModal(type) {
  activeModal = type;
  els.modal.classList.remove('hidden');
  els.productForm.classList.toggle('hidden', type !== 'product');
  els.customerForm.classList.toggle('hidden', type !== 'customer');
  els.modalTitle.textContent = type === 'product' ? 'Add product' : 'Add customer';
}

function closeModal() {
  els.modal.classList.add('hidden');
  els.productForm.reset();
  els.customerForm.reset();
  activeModal = null;
}

function populateBusinessFields() {
  els.businessNameHeader.textContent = state.business.name;
  els.businessNameInput.value = state.business.name;
  els.businessPhoneInput.value = state.business.phone || '';
  els.businessEmailInput.value = state.business.email || '';
  els.businessGstinInput.value = state.business.gstin;
  els.businessStateInput.value = state.business.state;
  els.businessStateInputSettings.value = state.business.state;
  els.invoicePrefixInput.value = state.business.invoicePrefix;
  els.salesCoverageInput.value = state.business.salesCoverage || 'All India';
  els.billingModesInput.value = (state.business.billingModes || ['GST', 'non-GST']).join(' and ');
  els.upiIdInput.value = state.business.upiId || '';
  els.invoiceFooterInput.value = state.business.invoiceFooter || '';
  els.businessAddressInput.value = state.business.address || '';
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function validateGstin(gstin) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(gstin.trim());
}

function syncCustomerDetails() {
  const customer = state.customers.find((entry) => entry.id === els.invoiceCustomerSelect.value);
  if (!customer) return;

  els.customerGstinInput.value = customer.gstin || '';
  els.placeOfSupplyInput.value = customer.state || '';
  els.gstinStatus.textContent = customer.gstin
    ? (validateGstin(customer.gstin) ? 'GSTIN loaded and format verified.' : 'GSTIN loaded; please verify the format.')
    : 'No GSTIN saved. This customer can be billed as B2C.';
  els.gstinStatus.className = `field-hint ${customer.gstin && validateGstin(customer.gstin) ? 'success-text' : ''}`;
  updateProductPreview();
  renderInvoiceItems();
}

function updateProductPreview() {
  const product = state.products.find((entry) => entry.id === els.selectedProduct.value);
  if (!product) {
    els.productPreview.innerHTML = '<span>Select a product to see HSN, GST rate and live stock.</span>';
    return;
  }
  els.productPreview.innerHTML = `
    <strong>${product.name}</strong>
    <span>HSN/SAC ${product.hsnCode}</span>
    <span>${product.gstRate}% GST</span>
    <span>${product.stockQty} units available</span>
    <span>${formatSimpleMoney(product.sellingPrice)} rate</span>
  `;
}

function renderProductOptions() {
  const options = state.products
    .map((product) => `<option value="${product.id}">${product.name} (${product.stockQty} in stock)</option>`)
    .join('');
  els.selectedProduct.innerHTML = options || '<option value="">No products</option>';
}

function renderCustomerOptions() {
  const options = state.customers
    .map((customer) => `<option value="${customer.id}">${customer.name}</option>`)
    .join('');
  els.invoiceCustomerSelect.innerHTML = options || '<option value="">No customers</option>';
}

function renderProductsTable() {
  if (!state.products.length) {
    els.productsTableBody.innerHTML = '<tr><td colspan="7">No products added yet.</td></tr>';
    return;
  }

  els.productsTableBody.innerHTML = state.products
    .map((product) => `
      <tr>
        <td>${product.name}</td>
        <td>${product.sku}</td>
        <td>${product.hsnCode}</td>
        <td>${product.stockQty}</td>
        <td>${formatSimpleMoney(product.sellingPrice)}</td>
        <td>${product.gstRate}%</td>
        <td><button class="action-btn" data-delete-product="${product.id}">Delete</button></td>
      </tr>
    `)
    .join('');
}

function renderCustomersTable() {
  if (!state.customers.length) {
    els.customersTableBody.innerHTML = '<tr><td colspan="5">No customers added yet.</td></tr>';
    return;
  }

  els.customersTableBody.innerHTML = state.customers
    .map((customer) => `
      <tr>
        <td>${customer.name}</td>
        <td>${customer.phone || '-'}</td>
        <td>${customer.gstin || '-'}</td>
        <td>${customer.state}</td>
        <td><button class="action-btn" data-delete-customer="${customer.id}">Delete</button></td>
      </tr>
    `)
    .join('');
}

function calculateInvoiceSummary() {
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  invoiceItems.forEach((item) => {
    subtotal += item.amountPaisa;

    if (item.taxType === 'cgst') {
      cgst += item.cgstPaisa;
      sgst += item.sgstPaisa;
    } else {
      igst += item.igstPaisa;
    }
  });

  const discount = roundPaisa(els.discountInput.value || 0);
  const freight = roundPaisa(els.freightInput.value || 0);
  const roundOff = roundPaisa(els.roundOffInput.value || 0);
  const adjustedSubtotal = Math.max(0, subtotal - discount);
  const total = Math.max(0, adjustedSubtotal + cgst + sgst + igst + freight + roundOff);
  const paidValueInPaisa = roundPaisa(els.paidAmountInput.value || 0);
  const cappedPaid = Math.min(paidValueInPaisa, total);

  els.subtotalDisplay.textContent = formatMoneyFromPaisa(subtotal);
  els.cgstDisplay.textContent = formatMoneyFromPaisa(cgst);
  els.sgstDisplay.textContent = formatMoneyFromPaisa(sgst);
  els.igstDisplay.textContent = formatMoneyFromPaisa(igst);
  els.grandTotalDisplay.textContent = formatMoneyFromPaisa(total);
  els.balanceDisplay.textContent = formatMoneyFromPaisa(Math.max(0, total - cappedPaid));
  els.paidAmountInput.value = (cappedPaid / 100).toFixed(2);

  return { subtotal, discount, freight, roundOff, cgst, sgst, igst, total };
}

function renderInvoiceItems() {
  if (!invoiceItems.length) {
    els.invoiceItemsBody.innerHTML = '<tr><td colspan="7">No items added yet.</td></tr>';
    calculateInvoiceSummary();
    return;
  }

  els.invoiceItemsBody.innerHTML = invoiceItems
    .map((item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.hsnCode}</td>
        <td>${item.qty}</td>
        <td>${formatMoneyFromPaisa(item.ratePaisa)}</td>
        <td>${item.taxType === 'cgst' ? 'CGST+SGST' : 'IGST'}</td>
        <td>${formatMoneyFromPaisa(item.amountPaisa + (item.cgstPaisa || 0) + (item.sgstPaisa || 0) + (item.igstPaisa || 0))}</td>
        <td><button class="action-btn" data-remove-item="${item.id}">Remove</button></td>
      </tr>
    `)
    .join('');

  calculateInvoiceSummary();
}

function addInvoiceItem() {
  const productId = els.selectedProduct.value;
  const qty = safeNumber(els.itemQty.value);

  if (!productId) {
    alert('Please select a product.');
    return;
  }

  const product = state.products.find((entry) => entry.id === productId);
  if (!product) return;

  if (qty <= 0) {
    alert('Quantity must be greater than zero.');
    return;
  }

  const alreadyAdded = invoiceItems
    .filter((item) => item.productId === product.id)
    .reduce((sum, item) => sum + item.qty, 0);
  if (qty + alreadyAdded > product.stockQty) {
    alert(`Only ${product.stockQty} units available in stock.`);
    return;
  }

  const ratePaisa = roundPaisa(product.sellingPrice);
  const documentIsNonTaxable = els.documentTypeSelect.value === 'retail-invoice'
    || ['exempt', 'nil-rated', 'zero-rated'].includes(els.supplyTreatmentSelect.value);
  const taxMode = els.taxModeSelect.value;
  const grossPaisa = Math.round(ratePaisa * qty);
  const gstPercent = safeNumber(product.gstRate);
  const basePaisa = taxMode === 'inclusive' && !documentIsNonTaxable
    ? Math.round(grossPaisa * 100 / (100 + gstPercent))
    : grossPaisa;
  const gstPaisa = documentIsNonTaxable ? 0 : Math.max(0, grossPaisa - basePaisa);

  const customerId = els.invoiceCustomerSelect.value;
  const customer = state.customers.find((entry) => entry.id === customerId);
  const sameState = customer && customer.state && state.business.state && customer.state.trim().toLowerCase() === state.business.state.trim().toLowerCase();
  const taxType = sameState ? 'cgst' : 'igst';

  const item = {
    id: makeId('item'),
    name: product.name,
    productId: product.id,
    hsnCode: product.hsnCode,
    qty,
    ratePaisa,
    gstPercent,
    taxType,
    amountPaisa: basePaisa,
    cgstPaisa: sameState ? Math.round(gstPaisa / 2) : 0,
    sgstPaisa: sameState ? Math.round(gstPaisa / 2) : 0,
    igstPaisa: sameState ? 0 : gstPaisa
  };

  invoiceItems.push(item);
  els.itemQty.value = 1;
  renderInvoiceItems();
}

function saveInvoice() {
  if (!invoiceItems.length) {
    alert('Add at least one item before saving invoice.');
    return;
  }

  const customerId = els.invoiceCustomerSelect.value;
  const customer = state.customers.find((entry) => entry.id === customerId);
  if (!customer) {
    alert('Please select a customer.');
    return;
  }

  const summary = calculateInvoiceSummary();
  const paidAmount = roundPaisa(els.paidAmountInput.value || 0);
  const invoiceNumber = (els.invoiceNumber.value || `${state.business.invoicePrefix}-${state.nextInvoiceNumber}`).trim();

  const invoice = {
    id: makeId('inv'),
    invoiceNumber,
    date: new Date().toISOString(),
    customerId: customer.id,
    customerName: customer.name,
    customerGstin: els.customerGstinInput.value.trim().toUpperCase(),
    state: customer.state,
    documentType: els.documentTypeSelect.value,
    invoiceDate: els.invoiceDateInput.value,
    dueDate: els.dueDateInput.value,
    placeOfSupply: els.placeOfSupplyInput.value.trim(),
    supplyTreatment: els.supplyTreatmentSelect.value,
    reverseCharge: els.reverseChargeInput.checked,
    taxMode: els.taxModeSelect.value,
    subtotalPaisa: summary.subtotal,
    cgstPaisa: summary.cgst,
    sgstPaisa: summary.sgst,
    igstPaisa: summary.igst,
    totalPaisa: summary.total,
    paidPaisa: paidAmount,
    balancePaisa: Math.max(0, summary.total - paidAmount),
    paymentMode: els.paymentModeSelect.value,
    notes: els.invoiceNotesInput.value.trim(),
    items: invoiceItems.map((item) => ({ ...item }))
  };

  state.invoices.unshift(invoice);
  state.nextInvoiceNumber += 1;

  invoiceItems.forEach((item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    if (product) {
      const newQty = product.stockQty - item.qty;
      product.stockQty = Math.max(0, newQty);
    }
  });

  saveState();
  renderAll();
  invoiceItems = [];
  els.invoiceNumber.value = `${state.business.invoicePrefix}-${state.nextInvoiceNumber}`;
  els.paidAmountInput.value = 0;
  renderInvoiceItems();
  alert('Invoice saved successfully!');
}

function renderHomePage() {
  const promoEl = document.getElementById('promoCards');
  const featureEl = document.getElementById('featureCards');

  if (promoEl) {
    promoEl.innerHTML = promoCards.map((card) => `
      <article class="promo-card">
        <span class="promo-tag">${card.tag}</span>
        <h5>${card.title}</h5>
        <p>${card.text}</p>
      </article>
    `).join('');
  }

  if (featureEl) {
    featureEl.innerHTML = featureCards.map((card) => `
      <article class="feature-card">
        <div class="feature-icon">✓</div>
        <h5>${card.title}</h5>
        <p>${card.text}</p>
      </article>
    `).join('');
  }
}

function renderDashboard() {
  const totalSales = state.invoices.reduce((sum, invoice) => sum + invoice.totalPaisa, 0);
  const receivables = state.invoices.reduce((sum, invoice) => sum + invoice.balancePaisa, 0);
  const gstCollected = state.invoices.reduce((sum, invoice) => sum + invoice.cgstPaisa + invoice.sgstPaisa + invoice.igstPaisa, 0);
  const stockValue = state.products.reduce((sum, product) => sum + roundPaisa(product.sellingPrice) * Math.max(0, product.stockQty), 0);

  els.salesToday.textContent = formatMoneyFromPaisa(totalSales);
  els.receivables.textContent = formatMoneyFromPaisa(receivables);
  els.stockValue.textContent = formatMoneyFromPaisa(stockValue);
  els.gstCollected.textContent = formatMoneyFromPaisa(gstCollected);

  const recent = state.invoices.slice(0, 4);
  els.recentInvoices.innerHTML = recent.length
    ? recent.map((invoice) => `
        <div class="list-item">
          <div>
            <strong>${invoice.invoiceNumber}</strong>
            <small>${invoice.customerName}</small>
          </div>
          <div>
            <strong>${formatMoneyFromPaisa(invoice.totalPaisa)}</strong>
            <small>${new Date(invoice.date).toLocaleDateString()}</small>
          </div>
        </div>
      `).join('')
    : '<div class="list-item"><span>No invoices yet.</span></div>';

  const lowStock = state.products.filter((product) => product.stockQty <= 10);
  els.lowStockList.innerHTML = lowStock.length
    ? lowStock.map((product) => `
        <div class="list-item">
          <div>
            <strong>${product.name}</strong>
            <small>${product.sku}</small>
          </div>
          <span class="badge warn">${product.stockQty} left</span>
        </div>
      `).join('')
    : '<div class="list-item"><span>All stock levels are healthy.</span></div>';
}

function renderReports() {
  const register = state.invoices.slice(0, 8);
  els.salesRegisterList.innerHTML = register.length
    ? register.map((invoice) => `
        <div class="list-item">
          <div>
            <strong>${invoice.invoiceNumber}</strong>
            <small>${invoice.customerName}</small>
          </div>
          <div>
            <strong>${formatMoneyFromPaisa(invoice.totalPaisa)}</strong>
            <small>${invoice.balancePaisa > 0 ? 'Outstanding' : 'Paid'}</small>
          </div>
        </div>
      `).join('')
    : '<div class="list-item"><span>No sales history.</span></div>';

  const stock = state.products.map((product) => `
    <div class="list-item">
      <div>
        <strong>${product.name}</strong>
        <small>${product.stockQty} units</small>
      </div>
      <span class="badge ${product.stockQty <= 10 ? 'warn' : 'good'}">${product.stockQty <= 10 ? 'Low' : 'Healthy'}</span>
    </div>
  `).join('');

  els.stockStatusList.innerHTML = stock || '<div class="list-item"><span>No products.</span></div>';
}

function saveBusinessSettings() {
  state.business.name = els.businessNameInput.value.trim() || 'SVDF GST';
  state.business.phone = els.businessPhoneInput.value.replace(/\D/g, '').slice(0, 10);
  state.business.email = els.businessEmailInput.value.trim();
  state.business.gstin = els.businessGstinInput.value.trim();
  state.business.state = els.businessStateInputSettings.value.trim() || 'Tamil Nadu';
  state.business.invoicePrefix = (els.invoicePrefixInput.value || 'INV').trim().toUpperCase();
  state.business.salesCoverage = els.salesCoverageInput.value.trim() || 'All India';
  state.business.billingModes = ['GST', 'non-GST'];
  state.business.upiId = els.upiIdInput.value.trim();
  state.business.invoiceFooter = els.invoiceFooterInput.value.trim() || 'Thank you for your business';
  state.business.address = els.businessAddressInput.value.trim();
  saveState();
  populateBusinessFields();
  alert('Business settings saved.');
}

function attachEvents() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.module) {
        renderModule(button.dataset.module);
      } else if (button.dataset.view) {
        showView(button.dataset.view);
      }
    });
  });

  document.querySelectorAll('[data-open-workspace]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.openWorkspace || 'dashboardView';
      showView(target);
      if (target === 'billingView') {
        els.invoiceNumber.value = `${state.business.invoicePrefix}-${state.nextInvoiceNumber}`;
      }
    });
  });

  els.newInvoiceButton.addEventListener('click', () => {
    showView('billingView');
    els.invoiceNumber.value = `${state.business.invoicePrefix}-${state.nextInvoiceNumber}`;
  });

  els.addProductButton.addEventListener('click', () => openModal('product'));
  els.addCustomerButton.addEventListener('click', () => openModal('customer'));
  els.closeModalButton.addEventListener('click', closeModal);
  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) closeModal();
  });

  els.productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(els.productForm);
    const product = {
      id: makeId('p'),
      name: formData.get('name').toString().trim(),
      sku: formData.get('sku').toString().trim(),
      hsnCode: formData.get('hsnCode').toString().trim(),
      stockQty: safeNumber(formData.get('stockQty')),
      unit: formData.get('unit').toString(),
      purchasePrice: safeNumber(formData.get('purchasePrice')),
      sellingPrice: safeNumber(formData.get('sellingPrice')),
      mrp: safeNumber(formData.get('mrp')),
      category: formData.get('category').toString().trim() || 'General',
      description: formData.get('description').toString().trim(),
      gstRate: safeNumber(formData.get('gstRate'))
    };

    if (!product.name || !product.sku || !product.hsnCode) {
      alert('Please fill all required product details.');
      return;
    }

    state.products.push(product);
    saveState();
    renderAll();
    closeModal();
  });

  els.customerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(els.customerForm);
    const customer = {
      id: makeId('c'),
      name: formData.get('name').toString().trim(),
      phone: formData.get('phone').toString().trim(),
      gstin: formData.get('gstin').toString().trim(),
      state: formData.get('state').toString().trim()
    };

    if (!customer.name || !customer.state) {
      alert('Customer name and state are required.');
      return;
    }

    state.customers.push(customer);
    saveState();
    renderAll();
    closeModal();
  });

  els.addItemButton.addEventListener('click', addInvoiceItem);
  els.saveInvoiceButton.addEventListener('click', saveInvoice);
  els.invoiceCustomerSelect.addEventListener('change', syncCustomerDetails);
  els.fetchGstinButton.addEventListener('click', () => {
    const customer = state.customers.find((entry) => entry.id === els.invoiceCustomerSelect.value);
    if (!customer) return;
    const entered = els.customerGstinInput.value.trim().toUpperCase();
    if (!entered) {
      alert('This customer has no GSTIN saved. Add one in Customers first.');
      return;
    }
    customer.gstin = entered;
    saveState();
    syncCustomerDetails();
  });
  els.selectedProduct.addEventListener('change', updateProductPreview);
  [els.taxModeSelect, els.documentTypeSelect, els.supplyTreatmentSelect, els.discountInput, els.freightInput, els.roundOffInput, els.paidAmountInput]
    .forEach((control) => {
      control.addEventListener('input', renderInvoiceItems);
      control.addEventListener('change', renderInvoiceItems);
    });
  els.printInvoiceButton.addEventListener('click', () => window.print());

  els.saveSettingsButton.addEventListener('click', saveBusinessSettings);

  document.addEventListener('click', (event) => {
    const deleteProductButton = event.target.closest('[data-delete-product]');
    if (deleteProductButton) {
      const productId = deleteProductButton.dataset.deleteProduct;
      state.products = state.products.filter((product) => product.id !== productId);
      saveState();
      renderAll();
    }

    const deleteCustomerButton = event.target.closest('[data-delete-customer]');
    if (deleteCustomerButton) {
      const customerId = deleteCustomerButton.dataset.deleteCustomer;
      state.customers = state.customers.filter((customer) => customer.id !== customerId);
      saveState();
      renderAll();
    }

    const removeItemButton = event.target.closest('[data-remove-item]');
    if (removeItemButton) {
      const itemId = removeItemButton.dataset.removeItem;
      invoiceItems = invoiceItems.filter((item) => item.id !== itemId);
      renderInvoiceItems();
    }
  });

  els.paidAmountInput.addEventListener('input', () => {
    const value = Math.max(0, safeNumber(els.paidAmountInput.value));
    const totalPaisa = roundPaisa(document.getElementById('grandTotalDisplay').textContent.replace(/[^0-9.-]/g, ''));
    const maxPaid = totalPaisa / 100;
    els.paidAmountInput.value = Math.min(value, maxPaid).toFixed(2);
  });
}

function renderAll() {
  normalizeState();
  populateBusinessFields();
  renderHomePage();
  renderProductOptions();
  renderCustomerOptions();
  renderProductsTable();
  renderCustomersTable();
  renderDashboard();
  renderReports();
  if (!invoiceItems.length) {
    renderInvoiceItems();
  }
  els.invoiceNumber.value = `${state.business.invoicePrefix}-${state.nextInvoiceNumber}`;
  els.businessStateInput.value = state.business.state;
  if (!els.invoiceDateInput.value) els.invoiceDateInput.value = todayInputValue();
  if (!els.dueDateInput.value) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    els.dueDateInput.value = dueDate.toISOString().slice(0, 10);
  }
  syncCustomerDetails();
  updateProductPreview();
}

normalizeState();
saveState();
initializeAuthentication();
attachEvents();
renderAll();
showView('homeView');
