/* ═══════════════════════════════════════════════════
   DIGIVA CORE — Shared state, auth, users, config
   Loaded by every page
═══════════════════════════════════════════════════ */

/* ── Default site config (overridden by admin) ── */
const DEFAULT_CFG = {
  siteName:    'Digiva',
  tagline:     'Enter any product model. AI researches, writes, and builds a ready-to-use A4 portrait datasheet automatically.',
  email:       'benzekri1khalil@gmail.com',
  freeCreds:   3,
  bgColor:     '#060D1A',
  accentColor: '#2E9CFF',
  apiKey:      '',
  socialLi:    '',
  socialIg:    '',
  socialTt:    '',
  planLinks:   { starter:'', pro:'', business:'' },
  promoCodes:  { TEST2024:10, KHALIL:99, VIP100:50, DIGIVA50:25 },
  plans: [
    { name:'Starter',      price:9,  credits:10,  link:'', feats:['10 datasheets','All product types','A4 portrait format','Valid 12 months'] },
    { name:'Professional', price:29, credits:50,  link:'', feats:['50 datasheets','All product types','Custom branding','5 languages','History'] },
    { name:'Business',     price:79, credits:200, link:'', feats:['200 datasheets','All types','Custom branding','Bulk CSV','Priority support','White-label'] },
  ],
  notifEmail: 'benzekri1khalil@gmail.com',
};

/* ── Load / save config ── */
function getCfg() {
  const saved = localStorage.getItem('dg_cfg');
  return saved ? Object.assign({}, DEFAULT_CFG, JSON.parse(saved)) : Object.assign({}, DEFAULT_CFG);
}
function saveCfg(update) {
  const cfg = getCfg();
  Object.assign(cfg, update);
  localStorage.setItem('dg_cfg', JSON.stringify(cfg));
  return cfg;
}

/* ── Users DB (localStorage for now — upgrade to Supabase later) ── */
function getUsers() { return JSON.parse(localStorage.getItem('dg_users') || '[]'); }
function saveUsers(users) { localStorage.setItem('dg_users', JSON.stringify(users)); }

function registerUser(name, email, password) {
  const users = getUsers();
  if (users.find(u => u.email === email)) return { ok: false, msg: 'Email already registered.' };
  const user = {
    id: 'u_' + Date.now(),
    name, email,
    passwordHash: simpleHash(password),
    role: 'user',
    credits: getCfg().freeCreds || 3,
    createdAt: new Date().toISOString(),
    verified: false,
    verifyToken: Math.random().toString(36).slice(2),
    history: [],
    messages: [],
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.passwordHash === simpleHash(password));
  if (!user) return { ok: false, msg: 'Wrong email or password.' };
  sessionStorage.setItem('dg_session', JSON.stringify({ id: user.id, role: user.role }));
  return { ok: true, user };
}

function currentUser() {
  const s = sessionStorage.getItem('dg_session');
  if (!s) return null;
  const { id } = JSON.parse(s);
  return getUsers().find(u => u.id === id) || null;
}

function currentRole() {
  const s = sessionStorage.getItem('dg_session');
  if (!s) return null;
  return JSON.parse(s).role;
}

function updateUser(id, update) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  Object.assign(users[idx], update);
  saveUsers(users);
  // Refresh session if it's the current user
  const s = sessionStorage.getItem('dg_session');
  if (s && JSON.parse(s).id === id) {
    sessionStorage.setItem('dg_session', JSON.stringify({ id, role: users[idx].role }));
  }
}

function logout() {
  sessionStorage.removeItem('dg_session');
  window.location.href = 'login.html';
}

/* ── Messages ── */
function getMessages() { return JSON.parse(localStorage.getItem('dg_msgs') || '[]'); }
function saveMessage(from, email, subject, body) {
  const msgs = getMessages();
  msgs.unshift({ id: 'm_' + Date.now(), from, email, subject, body, time: new Date().toISOString(), read: false });
  localStorage.setItem('dg_msgs', JSON.stringify(msgs));
}
function markRead(id) {
  const msgs = getMessages();
  const m = msgs.find(m => m.id === id);
  if (m) m.read = true;
  localStorage.setItem('dg_msgs', JSON.stringify(msgs));
}

/* ── Stats ── */
function getStats() {
  const users = getUsers();
  const msgs  = getMessages();
  const allHistory = users.flatMap(u => u.history || []);
  const today = new Date().toDateString();
  return {
    totalUsers:    users.length,
    totalGen:      allHistory.length,
    todayGen:      allHistory.filter(h => new Date(h.time).toDateString() === today).length,
    totalMessages: msgs.length,
    unreadMsgs:    msgs.filter(m => !m.read).length,
    revenue:       allHistory.length * 0.5, // rough estimate
    byCategory:    groupBy(allHistory, h => h.category || 'Unknown'),
    byDay:         last7days(allHistory),
  };
}
function groupBy(arr, fn) {
  return arr.reduce((acc, item) => { const k = fn(item); acc[k] = (acc[k]||0)+1; return acc; }, {});
}
function last7days(allHistory) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const label = d.toLocaleDateString('en',{weekday:'short'});
    const count = allHistory.filter(h => new Date(h.time).toDateString()===d.toDateString()).length;
    days.push({ label, count });
  }
  return days;
}

/* ── Simple hash (not cryptographic, just for demo) ── */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h.toString(16);
}

/* ── Admin check ── */
function requireAdmin() {
  const role = currentRole();
  if (role !== 'admin' && role !== 'worker') {
    window.location.href = 'login.html';
  }
}
function requireAuth() {
  if (!currentUser()) window.location.href = 'login.html';
}

/* ── Toast (shared) ── */
function showToast(msg, type) {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id='toast-container'; c.style.cssText='position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(c); }
  const el = document.createElement('div');
  const icon = type==='ok'?'✅':type==='err'?'❌':'ℹ️';
  el.style.cssText = 'background:#0D1E34;color:#E8F4FF;font-size:13px;padding:12px 18px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:10px;border:1px solid '+(type==='ok'?'rgba(34,197,94,.4)':type==='err'?'rgba(239,68,68,.4)':'rgba(46,156,255,.4)')+';max-width:320px;animation:slideIn .3s ease';
  el.innerHTML = '<span style="font-size:18px;flex-shrink:0">'+icon+'</span>'+msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
