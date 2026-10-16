'use strict';
// SMS IT Agency — ছোট ব্যাকএন্ড (কোনো npm প্যাকেজ লাগে না)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PUB = path.join(__dirname, 'public'), UP = path.join(DATA, 'uploads'), DBF = path.join(DATA, 'db.json');
const PASS = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SECRET || crypto.createHash('sha256').update('sms-' + PASS).digest('hex');
const MAX_UP = 100 * 1024 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8' };
const MEDIA = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico', '.mp4', '.webm']);

fs.mkdirSync(UP, { recursive: true });
function save() { const t = DBF + '.tmp'; fs.writeFileSync(t, JSON.stringify(db, null, 1)); fs.renameSync(t, DBF); }
let db;
try { db = JSON.parse(fs.readFileSync(DBF, 'utf8')); }
catch { db = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8')); save(); }
['sections', 'items', 'pages', 'orders'].forEach(k => db[k] = db[k] || []);
db.settings = db.settings || {};

const F = {
  sections: 'title desc icon message orderable order enabled'.split(' '),
  items: 'section type title desc src poster alt w h featured facts order enabled'.split(' '),
  pages: 'slug title content inNav order enabled'.split(' ')
};
const SET_F = 'name slogan logo heroImage heroTitle heroLead aboutText whatsappNumber messengerUrl facebookPageUrl email youtube instagram tiktok defaultMessage'.split(' ');
const err = (status, message) => Object.assign(new Error(message), { status });
const id = () => crypto.randomBytes(5).toString('hex');

function pick(o, keys) {
  const r = {};
  for (const k of keys) {
    if (!(k in o)) continue;
    let v = o[k];
    if (typeof v === 'string') v = v.slice(0, 20000);
    else if (Array.isArray(v)) v = v.slice(0, 8).map(x => ({ v: String((x && x.v) || '').slice(0, 80), l: String((x && x.l) || '').slice(0, 120) }));
    else if (typeof v !== 'boolean' && typeof v !== 'number') continue;
    r[k] = v;
  }
  if (r.slug) r.slug = r.slug.trim().replace(/[\s\/#?%]+/g, '-');
  return r;
}

/* ---------- লগইন ---------- */
const sign = e => crypto.createHmac('sha256', SECRET).update(String(e)).digest('hex');
const mint = () => { const e = Date.now() + 7 * 864e5; return e + '.' + sign(e); };
function auth(req) {
  const [e, s] = (req.headers.authorization || '').replace(/^Bearer /, '').split('.');
  if (!PASS || !e || !s || +e < Date.now()) throw err(401, 'লগইন করুন');
  const a = Buffer.from(s), b = Buffer.from(sign(e));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw err(401, 'লগইন করুন');
}
const hits = new Map();
setInterval(() => hits.clear(), 36e5).unref();
function limit(key, max, ms) {
  const n = Date.now(), h = (hits.get(key) || []).filter(t => n - t < ms);
  if (h.length >= max) throw err(429, 'অনেকবার চেষ্টা হয়েছে, একটু পরে আবার করুন');
  h.push(n); hits.set(key, h);
}
const ipOf = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

/* ---------- হেল্পার ---------- */
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function body(req, max = 1e6) {
  return new Promise((ok, no) => {
    const c = []; let n = 0;
    req.on('data', d => { n += d.length; if (n > max) { no(err(413, 'ডেটা অনেক বড়')); req.destroy(); } else c.push(d); });
    req.on('end', () => { try { ok(c.length ? JSON.parse(Buffer.concat(c).toString('utf8')) : {}); } catch { no(err(400, 'ভুল ডেটা')); } });
    req.on('error', no);
  });
}
const byOrder = (a, b) => (a.order || 0) - (b.order || 0);
function publicData() {
  const on = x => x.enabled !== false, s = db.settings;
  return {
    settings: { ...s, social: { youtube: s.youtube || '', instagram: s.instagram || '', tiktok: s.tiktok || '' } },
    sections: db.sections.filter(on).sort(byOrder),
    items: db.items.filter(on).sort(byOrder),
    pages: db.pages.filter(on).sort(byOrder)
  };
}
function upload(req, u) {
  return new Promise((ok, no) => {
    const ext = path.extname(u.searchParams.get('name') || '').toLowerCase();
    if (!MEDIA.has(ext)) return no(err(400, 'এই ধরনের ফাইল আপলোড করা যাবে না (jpg, png, webp, gif, mp4, webm চলবে)'));
    const name = crypto.randomBytes(8).toString('hex') + ext, f = path.join(UP, name);
    const ws = fs.createWriteStream(f); let n = 0, bad = false;
    req.on('data', d => { n += d.length; if (n > MAX_UP && !bad) { bad = true; req.unpipe(ws); ws.destroy(); fs.unlink(f, () => {}); no(err(413, 'ফাইল ১০০MB-এর বেশি')); req.resume(); } });
    req.pipe(ws);
    ws.on('finish', () => { if (!bad) ok({ url: '/uploads/' + name }); });
    ws.on('error', no);
  });
}

/* ---------- API ---------- */
async function api(req, res, u, p) {
  const m = req.method, seg = p.split('/').filter(Boolean);
  if (p === '/api/site' && m === 'GET') return send(res, 200, publicData());

  if (p === '/api/orders' && m === 'POST') {
    limit('o' + ipOf(req), 8, 36e5);
    const b = await body(req, 2e4), t = (v, n) => String(v || '').trim().slice(0, n);
    if (b.website) return send(res, 200, { ok: true }); // স্প্যাম ফাঁদ
    const o = { id: id(), createdAt: new Date().toISOString(), name: t(b.name, 100), phone: t(b.phone, 30), email: t(b.email, 120), section: t(b.section, 40), message: t(b.message, 2000), status: 'new', note: '' };
    if (!o.name || o.phone.replace(/\D/g, '').length < 6) throw err(400, 'নাম ও সঠিক ফোন নম্বর দিন');
    const sec = db.sections.find(s => s.id === o.section);
    o.service = sec ? sec.title : 'অন্যান্য';
    db.orders.unshift(o); db.orders = db.orders.slice(0, 5000); save();
    return send(res, 200, { ok: true });
  }

  if (p === '/api/login' && m === 'POST') {
    limit('l' + ipOf(req), 10, 9e5);
    if (!PASS) throw err(503, 'সার্ভারে ADMIN_PASSWORD সেট করা হয়নি');
    const b = await body(req, 2e3), h = x => crypto.createHash('sha256').update(String(x || '')).digest();
    if (!crypto.timingSafeEqual(h(b.password), h(PASS))) throw err(401, 'পাসওয়ার্ড ভুল');
    return send(res, 200, { token: mint() });
  }

  if (seg[1] !== 'admin') throw err(404, 'পাওয়া যায়নি');
  auth(req);

  if (p === '/api/admin/all' && m === 'GET') return send(res, 200, db);
  if (p === '/api/admin/settings' && m === 'PUT') { Object.assign(db.settings, pick(await body(req), SET_F)); save(); return send(res, 200, db.settings); }
  if (p === '/api/admin/upload' && m === 'POST') return send(res, 200, await upload(req, u));
  if (p === '/api/admin/import' && m === 'POST') {
    const b = await body(req, 2e7);
    if (!b.settings || !Array.isArray(b.sections) || !Array.isArray(b.items)) throw err(400, 'এটি সঠিক ব্যাকআপ ফাইল নয়');
    db = { settings: b.settings, sections: b.sections, items: b.items, pages: b.pages || [], orders: b.orders || [] }; save();
    return send(res, 200, { ok: true });
  }

  const c = seg[2], rid = seg[3];
  if (c === 'orders') {
    const o = db.orders.find(x => x.id === rid);
    if (!o) throw err(404, 'অর্ডার পাওয়া যায়নি');
    if (m === 'PUT') {
      const b = await body(req, 1e4);
      if (['new', 'processing', 'done', 'cancelled'].includes(b.status)) o.status = b.status;
      if (typeof b.note === 'string') o.note = b.note.slice(0, 2000);
    } else if (m === 'DELETE') db.orders = db.orders.filter(x => x !== o);
    else throw err(405, 'অনুমোদিত নয়');
    save(); return send(res, 200, { ok: true });
  }
  if (!F[c]) throw err(404, 'পাওয়া যায়নি');
  const list = db[c];
  if (m === 'POST') {
    const b = pick(await body(req), F[c]);
    const rec = { id: c[0] + id(), ...b };
    if (c === 'sections') rec.id = (String(b.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 's') + '-' + id().slice(0, 4);
    list.push(rec); save(); return send(res, 200, rec);
  }
  const rec = list.find(x => x.id === rid);
  if (!rec) throw err(404, 'পাওয়া যায়নি');
  if (m === 'PUT') { Object.assign(rec, pick(await body(req), F[c])); save(); return send(res, 200, rec); }
  if (m === 'DELETE') {
    db[c] = list.filter(x => x !== rec);
    if (c === 'sections') db.items = db.items.filter(i => i.section !== rid);
    save(); return send(res, 200, { ok: true });
  }
  throw err(405, 'অনুমোদিত নয়');
}

/* ---------- স্ট্যাটিক ফাইল ---------- */
function serve(req, res, p) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let root = PUB, rel = p;
  if (p.startsWith('/uploads/')) { root = UP; rel = p.slice(8); }
  if (p === '/admin') rel = '/admin/index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(root, path.normalize(rel));
  if (!f.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('পাওয়া যায়নি'); }
    const ext = path.extname(f).toLowerCase(), long = /^\.(jpe?g|png|webp|gif|mp4|webm|ico)$/.test(ext);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': long ? 'public, max-age=604800' : 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(f).pipe(res);
  });
}

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
    if (p.startsWith('/api/')) return await api(req, res, u, p);
    serve(req, res, p);
  } catch (e) {
    if (!e.status) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'সার্ভারে সমস্যা হয়েছে' });
  }
}).listen(PORT, () => console.log('চালু: http://localhost:' + PORT + (PASS ? '' : '  (সতর্কতা: ADMIN_PASSWORD সেট নেই, অ্যাডমিন লগইন বন্ধ)')));
