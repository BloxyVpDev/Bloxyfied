/* Bloxyfied shared logic. TEST BUILD: everything is stored in this browser's localStorage. */
const Bx = (() => {
  const K = { users: 'bloxyfied_users_v1', session: 'bloxyfied_session_v1', sales: 'bloxyfied_sales_v1', listings: 'bloxyfied_listings_v1' };
  const DAY = 86400000;
  const WELCOME_BX = 500; // free test Bx for every new account

  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const fmt = n => Number(n).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const PLANS = {
    basic:    { key: 'basic',    name: 'Purple Basic',   price: 1,  per: 'Day',   bx: 10,  days: 1,   color: '#a855f7', badge: 'Purple Basic badge' },
    premium:  { key: 'premium',  name: 'Purple Premium', price: 8,  per: 'Month', bx: 50,  days: 30,  color: '#fbbf24', badge: 'Purple Premium badge' },
    overlord: { key: 'overlord', name: 'Overlord Purple', price: 16, per: 'Year',  bx: 150, days: 365, color: '#ef4444', badge: 'Purple Overlord badge' }
  };

  const CATALOG = [
    { id: 'c1', name: 'Purple Crown', cat: 'Roblox', tag: 'Limited', price: 1250, icon: '👑' },
    { id: 'c2', name: 'Dark Blade', cat: 'In-Game', tag: 'Rare', price: 850, icon: '🗡️' },
    { id: 'c3', name: 'Red Valk', cat: 'Roblox', tag: 'Limited', price: 1800, icon: '🎩' },
    { id: 'c4', name: 'Speedy Car', cat: 'In-Game', tag: 'In-Game', price: 1200, icon: '🚗' },
    { id: 'c5', name: 'Classic Hoodie', cat: 'Bloxyfied Products', tag: 'Bloxyfied', price: 600, icon: '🧥' }
  ];

  /* ---------- password hashing (salted SHA-256) ---------- */
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const randSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  async function hashPw(pw, salt) {
    const data = new TextEncoder().encode(salt + ':' + pw);
    if (window.crypto && crypto.subtle) return hex(await crypto.subtle.digest('SHA-256', data));
    let h = 0; for (const c of salt + pw) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; // fallback (non-https)
  }

  /* ---------- accounts ---------- */
  async function register(username, password) {
    username = username.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Username must be 3-16 characters: letters, numbers or _');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const users = read(K.users, {}); const key = username.toLowerCase();
    if (users[key]) throw new Error('That username is already taken.');
    const salt = randSalt();
    users[key] = { username, salt, hash: await hashPw(password, salt), bx: WELCOME_BX, xp: 0, sub: null, trialUsed: false, inventory: [], createdAt: Date.now() };
    write(K.users, users); localStorage.setItem(K.session, key);
    return users[key];
  }
  async function login(username, password) {
    const users = read(K.users, {}); const key = username.trim().toLowerCase(); const u = users[key];
    if (!u || (await hashPw(password, u.salt)) !== u.hash) throw new Error('Incorrect username or password.');
    localStorage.setItem(K.session, key); return u;
  }
  function logout() { localStorage.removeItem(K.session); location.href = 'index.html'; }

  function update(fn) {
    const key = localStorage.getItem(K.session); const users = read(K.users, {}); const u = users[key];
    if (!u) return null;
    fn(u); users[key] = u; write(K.users, users); return u;
  }
  const activePlan = u => (u && u.sub && Date.now() < u.sub.start + u.sub.days * DAY) ? PLANS[u.sub.plan] : null;

  function accrue() { // credit daily subscription Bx
    return update(u => {
      if (!u.sub) return;
      const p = PLANS[u.sub.plan];
      const entitled = Math.min(u.sub.days, Math.floor((Date.now() - u.sub.start) / DAY) + 1);
      const owed = entitled - u.sub.claimed;
      if (owed > 0) { u.bx += owed * p.bx; u.sub.claimed = entitled; }
    });
  }
  function current() { return localStorage.getItem(K.session) ? accrue() : null; }
  function requireAuth() {
    const u = current();
    if (!u) { location.href = 'index.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html'); return null; }
    return u;
  }

  /* ---------- Bx / shop actions ---------- */
  const addBx = amount => update(u => { u.bx += amount; });
  function subscribe(planKey, trial = false) {
    update(u => {
      if (trial && u.trialUsed) throw new Error('Free trial already used on this account.');
      if (trial) u.trialUsed = true;
      u.sub = { plan: planKey, start: Date.now(), days: trial ? 3 : PLANS[planKey].days, claimed: 0, trial };
    });
    return accrue();
  }
  const listings = () => read(K.listings, []);
  const sales = () => read(K.sales, []);
  function addSale(item) { const s = sales(); s.unshift({ name: item.name, price: item.price, icon: item.icon, at: Date.now() }); write(K.sales, s.slice(0, 40)); }
  function buyItem(item) {
    const me = current();
    if (item.seller && me && item.seller.toLowerCase() === me.username.toLowerCase()) throw new Error('You cannot buy your own listing.');
    update(u => {
      if (u.bx < item.price) throw new Error('NOT_ENOUGH');
      u.bx -= item.price; u.xp += Math.max(1, Math.round(item.price / 10));
      u.inventory.push({ id: item.id, name: item.name, icon: item.icon, price: item.price, at: Date.now() });
    });
    addSale(item);
  }
  function addListing(l) {
    const me = current();
    const all = listings();
    all.unshift({ id: 'u' + Date.now(), name: l.name, cat: l.cat, tag: 'User', price: l.price, icon: l.cat === 'Roblox' ? '🧢' : l.cat === 'In-Game' ? '⚔️' : '🎁', seller: me.username });
    write(K.listings, all);
  }

  /* ---------- UI helpers ---------- */
  function toast(msg, type = '') {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }
  function modal(html) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal">' + html + '</div>';
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    return { el: bg.firstChild, close };
  }
  const badge = u => { const p = activePlan(u); return p ? `<span class="vbadge" style="--c:${p.color}" title="${esc(p.name)}">✓</span>` : ''; };
  const ago = t => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + 'm ago' : Math.round(m / 60) + 'h ago'; };

  return { PLANS, CATALOG, WELCOME_BX, fmt, esc, register, login, logout, current, requireAuth, update, activePlan, addBx, subscribe, listings, sales, buyItem, addListing, toast, modal, badge, ago };
})();
