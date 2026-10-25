import { Hono } from 'hono'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

type Env = { DB: D1Database; ADMIN_PASSWORD: string; IMG: R2Bucket; TURNSTILE_SECRET: string; CF_ANALYTICS_TOKEN?: string }
const app = new Hono<{ Bindings: Env }>()

const TS_SITEKEY = '0x4AAAAAAExa5Ov0_uA6CYMF'

// 设置 secret CF_ANALYTICS_TOKEN 后自动挂 Cloudflare Web Analytics
let analyticsTag = ''
app.use('*', async (c, next) => {
  analyticsTag = c.env.CF_ANALYTICS_TOKEN ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${c.env.CF_ANALYTICS_TOKEN}"}'></script>` : ''
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
})

const css = `*{margin:0;padding:0;box-sizing:border-box}:root{--bg:#fff;--fg:#1a1a1a;--strong:#111;--muted:#999;--line:#eee;--codebg:#f6f6f6;--qbg:#fafafa;--qfg:#555;--td:#333;--field:#bbb;--accent:#d63384;--ease:cubic-bezier(.4,0,.2,1);--easeout:cubic-bezier(.16,1,.3,1);--grid:#00000007;--glow:#ee72b208}html{scrollbar-gutter:stable;color-scheme:light;scroll-behavior:smooth;background-color:var(--bg);background-image:linear-gradient(to right,var(--grid) 1px,transparent 1px),linear-gradient(to bottom,var(--grid) 1px,transparent 1px);background-size:40px 40px;background-attachment:fixed;transition:background-color .3s}html[data-theme="dark"]{color-scheme:dark;--bg:#151515;--fg:#d4d4d4;--strong:#d4d4d4;--muted:#777;--line:#2a2a2a;--codebg:#262626;--qbg:#1c1c1c;--qfg:#9a9a9a;--td:#b5b5b5;--field:#3a3a3a;--accent:#ee72b2;--grid:#ffffff09;--glow:#ee72b21c}@media(prefers-color-scheme:dark){html:not([data-theme="light"]){color-scheme:dark;--bg:#151515;--fg:#d4d4d4;--strong:#d4d4d4;--muted:#777;--line:#2a2a2a;--codebg:#262626;--qbg:#1c1c1c;--qfg:#9a9a9a;--td:#b5b5b5;--field:#3a3a3a;--accent:#ee72b2;--grid:#ffffff09;--glow:#ee72b21c}}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif;background-color:transparent;background-image:radial-gradient(ellipse 90% 40% at 50% 100%,var(--glow),transparent 70%);background-attachment:fixed;color:var(--fg);max-width:700px;margin:0 auto;padding:32px 18px;line-height:1.9;letter-spacing:.02em;transition:color .3s}header{position:relative;border-bottom:2px solid var(--accent);padding-bottom:16px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center;animation:rise .5s var(--easeout) both}header a{color:var(--strong);text-decoration:none}header h1{font-size:21px;letter-spacing:.08em;line-height:1}nav{display:flex;align-items:center;gap:12px}nav a{font-size:14px;line-height:1;display:flex;align-items:center;height:22px;text-decoration:none;transition:color .2s}nav a:hover{color:var(--accent);text-decoration:underline;text-underline-offset:3px}nav button,#searchbox button{background:none;border:none;padding:0;cursor:pointer;color:var(--fg);display:flex;align-items:center;justify-content:center}#sbtn,#theme{width:22px;height:22px;opacity:.8;transition:opacity .2s}#sbtn:hover,#theme:hover{opacity:1;background:none;border-color:transparent;color:var(--accent)}#sbtn:focus:not(:focus-visible),#theme:focus:not(:focus-visible){outline:none}#theme{position:relative}#theme svg{position:absolute;inset:0;margin:auto;transition:opacity .3s,transform .35s}#theme .i-sun{opacity:0;transform:rotate(90deg) scale(.4)}#theme .i-moon{opacity:1;transform:none}html[data-theme="dark"] #theme .i-sun{opacity:1;transform:none}html[data-theme="dark"] #theme .i-moon{opacity:0;transform:rotate(-90deg) scale(.4)}@media(prefers-color-scheme:dark){html:not([data-theme="light"]) #theme .i-sun{opacity:1;transform:none}html:not([data-theme="light"]) #theme .i-moon{opacity:0;transform:rotate(-90deg) scale(.4)}}#searchbox{position:absolute;right:0;top:46px;z-index:9;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);opacity:0;transform:translateY(-6px) scale(.98);transition:opacity .18s ease,transform .18s ease;pointer-events:none}#searchbox.open{opacity:1;transform:none;pointer-events:auto}#searchbox form{flex-direction:row;gap:6px;margin:0}#searchbox input{width:210px;padding:8px 10px;font-size:14px;flex:1}#searchbox button{width:32px;align-self:stretch}article{padding:12px 0;border:none}article h2{font-size:17px;margin:4px 0}time{font-size:12px;color:var(--muted);letter-spacing:.04em}.md{font-size:16px;line-height:2;color:var(--fg)}.md h1{font-size:22px;margin:24px 0 12px;border-bottom:1px solid var(--line);padding-bottom:8px}.md h2{font-size:19px;margin:22px 0 10px}.md h3{font-size:16px;margin:18px 0 8px}.md p{margin:14px 0}.md li{margin:6px 0 6px 20px}.md li:has(input[type="checkbox"]){list-style:none;margin-left:0}.md li input[type="checkbox"]{margin-right:6px;vertical-align:middle;width:auto}.md a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}.md code{background:var(--codebg);padding:2px 5px;font-size:13px;border-radius:3px}.md pre{background:var(--codebg);padding:14px;overflow:auto;border-radius:6px;line-height:1.6}.md pre code{background:none;padding:0}.md img{max-width:100%;border-radius:4px;margin:12px 0}.md blockquote{border-left:3px solid var(--accent);padding:6px 14px;margin:14px 0;color:var(--qfg);background:var(--qbg)}.md hr{border:none;border-top:1px solid var(--line);margin:20px 0}form{display:flex;flex-direction:column;gap:14px;max-width:100%}label{display:flex;flex-direction:column;gap:6px;font-size:13px}input:not([type="checkbox"]),textarea{border:1px solid var(--field);padding:10px;font:inherit;width:100%;border-radius:4px;background:none;color:inherit;transition:border-color .2s}input:focus,textarea:focus{outline:none;border-color:var(--accent)}input[type="checkbox"]{width:auto;accent-color:var(--accent)}textarea{min-height:420px;resize:vertical}button{border:1px solid var(--strong);background:var(--bg);color:var(--fg);padding:8px 20px;cursor:pointer;align-self:flex-start;border-radius:4px}button:hover{background:var(--accent);border-color:var(--accent);color:#fff}.md table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;line-height:1.7;display:block;overflow-x:auto;white-space:nowrap}.md th,.md td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left}.md th{border-bottom:2px solid var(--strong);white-space:nowrap}.md td{color:var(--td)}.ann{border-top:1px solid var(--line);margin-top:28px;padding-top:16px}.gb{padding:14px 0;border-bottom:1px solid var(--line)}.gb:last-of-type{border-bottom:none}.gb-meta{font-size:12px;color:var(--muted);margin-bottom:2px}.gb-meta span{margin-right:4px}.gb-body{white-space:pre-wrap;word-break:break-word;color:var(--fg)}.cf-turnstile{margin:2px 0}::selection{background:var(--accent);color:#fff}@keyframes rise{0%{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}article{animation:rise .55s var(--easeout) both}article:nth-of-type(2){animation-delay:.07s}article:nth-of-type(3){animation-delay:.14s}article:nth-of-type(4){animation-delay:.21s}article:nth-of-type(n+5){animation-delay:.28s}.ann{animation:rise .55s var(--easeout) .12s both}.morep{animation:rise .55s var(--easeout) .2s both}.pill{display:inline-flex;align-items:center;background:var(--codebg);border:1px solid transparent;border-radius:999px;padding:8px 18px;color:var(--fg);text-decoration:none;transition:all .3s var(--ease)}.pill:hover{color:var(--accent);border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 20px #ee72b22b;text-decoration:none}::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:var(--field);border-radius:5px}::-webkit-scrollbar-thumb:hover{background:var(--muted)}::-webkit-scrollbar-track{background:transparent}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}`

const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const mdSanitize = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'input', 'del', 's']),
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'loading', 'decoding', 'width', 'height'],
    input: ['type', 'checked', 'disabled'],
    code: ['class'],
    span: ['class'],
    div: ['class'],
    th: ['align'],
    td: ['align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
}
const renderMd = async (md: string, breaks = false) => sanitizeHtml(String(await marked.parse(md, breaks ? { breaks: true } : undefined)), mdSanitize).replace(/<img /g, '<img loading="lazy" decoding="async" ')
const layout = (title: string, body: string, og?: { desc?: string; image?: string }) => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>${og ? `<meta property="og:title" content="${esc(title)}"><meta property="og:type" content="article">${og.image ? `<meta property="og:image" content="${esc(og.image)}">` : ''}<meta property="og:description" content="${esc(og.desc || '')}">` : ''}${analyticsTag}<link rel="alternate" type="application/rss+xml" title="日记 RSS" href="/rss.xml"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#ffffff"><meta name="theme-color" media="(prefers-color-scheme:dark)" content="#151515"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><link rel="icon" type="image/png" href="/img/pwa/favicon-32.png"><link rel="apple-touch-icon" href="/img/pwa/apple-touch-icon.png"><style>${css}</style><header><h1><a href="/">日记</a></h1><nav><a href="/guestbook">留言</a><a href="/admin">写</a><a href="/rss.xml">RSS</a><button id="sbtn" type="button" aria-label="搜索" title="搜索"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg></button><button id="theme" type="button" aria-label="切换明暗" title="切换明暗"><svg class="i-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path></svg><svg class="i-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"></path></svg></button></nav><div id="searchbox"><form method="get" action="/"><input id="sinput" name="q" placeholder="搜索日记，回车" autocomplete="off"><button type="submit" aria-label="搜索"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg></button></form></div></header><main>${body}</main><script>var sb=document.getElementById('searchbox'),si=document.getElementById('sinput');document.getElementById('sbtn').onclick=function(e){e.stopPropagation();var open=sb.classList.toggle('open');if(open){var m=location.search.match(/[?&]q=([^&]*)/);if(m&&!si.value)si.value=decodeURIComponent(m[1].replace(/\\+/g,' '));si.focus()}};sb.onclick=function(e){e.stopPropagation()};si.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();si.form.requestSubmit()}});document.addEventListener('click',function(e){if(sb.classList.contains('open')&&!sb.contains(e.target))sb.classList.remove('open')});document.addEventListener('keydown',function(e){if(e.key==='Escape')sb.classList.remove('open')});var tb=document.getElementById('theme');tb.onclick=function(){var sys=matchMedia('(prefers-color-scheme: dark)').matches;var eff=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':sys;var n=eff?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}};if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}</script>`

const ensure = async (db: D1Database) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, date TEXT NOT NULL, kind TEXT DEFAULT 'diary', visible INTEGER DEFAULT 1)`).run()
  try { await db.prepare(`ALTER TABLE entries ADD COLUMN kind TEXT DEFAULT 'diary'`).run() } catch {}
  try { await db.prepare(`ALTER TABLE entries ADD COLUMN visible INTEGER DEFAULT 1`).run() } catch {}
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_date_id ON entries(date DESC, id DESC)`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS guestbook (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, iphash TEXT NOT NULL DEFAULT '', created TEXT NOT NULL)`).run()
}

const getCookie = (c: any, k: string) => (c.req.header('Cookie') || '').split('; ').find((x: string) => x.startsWith(k + '='))?.split('=')[1] || ''
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('')
const eqSecret = (a: string, b: string) => {
  const A = new TextEncoder().encode(a), B = new TextEncoder().encode(b)
  if (A.length !== B.length) return false
  let d = 0
  for (let i = 0; i < A.length; i++) d |= A[i] ^ B[i]
  return d === 0
}
// 密码未配置时一律拒绝（fail-closed），避免线上漏设 secret 导致后台裸奔
const isAuth = async (c: any) => {
  if (!c.env.ADMIN_PASSWORD) return false
  const expect = await sha256(c.env.ADMIN_PASSWORD)
  const cookie = getCookie(c, 'auth')
  if (cookie && (await eqSecret(cookie, expect))) return true
  const bearer = (c.req.header('Authorization') || '').replace('Bearer ', '')
  if (bearer && (await eqSecret(await sha256(bearer), expect))) return true
  const x = c.req.header('X-Auth')
  if (x && (await eqSecret(await sha256(x), expect))) return true
  return false
}

const verifyTurnstile = async (c: any, token: string) => {
  if (!c.env.TURNSTILE_SECRET) return true
  if (!token) return false
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(c.env.TURNSTILE_SECRET)}&response=${encodeURIComponent(token)}`
  })
  const j = await r.json() as any
  return j.success === true
}

// 登录限速：同一 IP 10 分钟内失败 5 次后锁定，成功登录清零
const loginGate = async (db: D1Database, ip: string) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS login_fail (ip TEXT PRIMARY KEY, count INTEGER NOT NULL, last INTEGER NOT NULL)`).run()
  const row = await db.prepare(`SELECT count, last FROM login_fail WHERE ip=?`).bind(ip).first() as any
  return !(row && Date.now() - row.last < 600000 && row.count >= 5)
}
const loginFail = async (db: D1Database, ip: string) => {
  const now = Date.now()
  await db.prepare(`INSERT INTO login_fail (ip, count, last) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET count = CASE WHEN ? - last > 600000 THEN 1 ELSE count + 1 END, last = ?`).bind(ip, now, now, now).run()
}
const loginClear = async (db: D1Database, ip: string) => db.prepare(`DELETE FROM login_fail WHERE ip=?`).bind(ip).run()

// 留言限速：同一 IP 60 秒 1 条、24 小时 10 条（按 IP 哈希查留言表自身，不建新表）
const gbGate = async (db: D1Database, iphash: string) => {
  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const { results } = await db.prepare(`SELECT created FROM guestbook WHERE iphash=? AND created > ? ORDER BY id DESC LIMIT 12`).bind(iphash, dayAgo).all() as any
  if ((results as any[]).length >= 10) return { ok: false, msg: '今天留言次数用完了，明天再来吧' }
  const last = (results as any[])[0]
  if (last && Date.now() - new Date(last.created).getTime() < 60000) return { ok: false, msg: '发送太频繁了，歇一分钟再发' }
  return { ok: true }
}

app.get('/login', async c => {
  if (await isAuth(c)) return c.redirect('/admin')
  return c.html(layout('登录', `<form method="post" action="/login" style="max-width:340px;margin:60px auto"><label style="gap:8px">密码<input name="password" type="password" required autofocus style="border:1px solid #111;border-radius:4px;padding:12px"></label><div class="cf-turnstile" data-sitekey="${TS_SITEKEY}"></div></form><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`))
})
app.post('/login', async c => {
  if (!c.env.ADMIN_PASSWORD) return c.text('admin disabled: ADMIN_PASSWORD not set', 403)
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  if (!(await loginGate(c.env.DB, ip))) return c.html(layout('登录', `<p style="color:#c00">尝试次数过多，请 10 分钟后再试</p><p><a href="/login">重试</a></p>`))
  const f = await c.req.parseBody()
  if (!await verifyTurnstile(c, String(f['cf-turnstile-response'] || ''))) return c.html(layout('登录', `<p style="color:#c00">人机校验失败</p><p><a href="/login">重试</a></p>`))
  if (!(await eqSecret(await sha256(String(f.password || '')), await sha256(c.env.ADMIN_PASSWORD)))) {
    await loginFail(c.env.DB, ip)
    return c.html(layout('登录', `<p style="color:#c00">密码错误</p><p><a href="/login">重试</a></p>`))
  }
  await loginClear(c.env.DB, ip)
  return new Response(null, { status: 302, headers: { 'Location': '/admin', 'Set-Cookie': `auth=${await sha256(c.env.ADMIN_PASSWORD)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` } })
})
app.get('/logout', c => new Response(null, { status: 302, headers: { 'Location': '/', 'Set-Cookie': `auth=; Path=/; Max-Age=0` } }))

app.use('/admin*', async (c, next) => {
  if (await isAuth(c)) return next()
  return c.redirect('/login')
})

const PAGE_SIZE = 20

const articleHtml = async (r: any, admin: boolean) => {
  const html = await renderMd(r.content)
  const ctl = admin ? `<p style="font-size:13px"><a href="/admin/edit/${r.id}">编辑</a> · <a href="/w/${r.id}">详情</a></p>` : ``
  const showTitle = r.title && r.title !== r.date
  const head = showTitle ? `<h2>${esc(r.title)}${r.visible ? '' : '（私密）'}</h2>` : (r.visible ? '' : `<p style="font-size:12px;color:#999">私密</p>`)
  return `<article><time>${esc(r.date)}</time>${head}<div class="md">${html}</div>${ctl}</article>`
}

app.get('/', async c => {
  await ensure(c.env.DB)
  const admin = await isAuth(c)
  const kw = (c.req.query('q') || '').trim()
  if (kw) {
    const pat = '%' + kw.replace(/[\\%_]/g, ch => '\\' + ch) + '%'
    const vis = admin ? '' : 'AND visible=1 '
    const { results } = await c.env.DB.prepare(`SELECT * FROM entries WHERE (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\') ${vis}ORDER BY id DESC LIMIT 50`).bind(pat, pat).all() as any
    const list = (await Promise.all((results as any[]).map(r => articleHtml(r, admin)))).join('')
    const head = `<p style="font-size:13px;color:#666;margin-bottom:14px">搜索「${esc(kw)}」：${results.length} 篇结果 · <a href="/">返回全部</a></p>`
    return c.html(layout('搜索：' + kw, head + (list || '<p style="color:#999">没有匹配的日记</p>')))
  }
  const before = Number(c.req.query('before') || 0)
  let rows: any[]
  if (Number.isFinite(before) && before > 0) {
    const sql = admin ? `SELECT * FROM entries WHERE id < ? ORDER BY date DESC, id DESC LIMIT ?` : `SELECT * FROM entries WHERE visible=1 AND id < ? ORDER BY date DESC, id DESC LIMIT ?`
    rows = ((await c.env.DB.prepare(sql).bind(before, PAGE_SIZE + 1).all()).results || []) as any[]
  } else {
    const sql = admin ? `SELECT * FROM entries ORDER BY date DESC, id DESC LIMIT ?` : `SELECT * FROM entries WHERE visible=1 ORDER BY date DESC, id DESC LIMIT ?`
    rows = ((await c.env.DB.prepare(sql).bind(PAGE_SIZE + 1).all()).results || []) as any[]
  }
  const hasMore = rows.length > PAGE_SIZE
  const page = rows.slice(0, PAGE_SIZE)
  const list = (await Promise.all(page.map(r => articleHtml(r, admin)))).join('')
  const more = hasMore ? `<p class="morep" style="margin-top:24px;text-align:center"><a class="pill" href="/?before=${page[page.length - 1].id}">更早的日记 →</a></p>` : ``
  const empty = Number.isFinite(before) && before > 0
    ? `<p>没有更早的日记了，<a href="/">回首页</a></p>`
    : `<p>还没有日记，<a href="/admin">写第一篇</a></p>`
  const today = new Date()
  const mmdd = today.toISOString().slice(5, 10)
  const ann = ((await c.env.DB.prepare(`SELECT id, title, date FROM entries WHERE strftime('%m-%d', date) = ? AND date < ? ${admin ? '' : 'AND visible=1'} ORDER BY date DESC LIMIT 10`).bind(mmdd, today.toISOString().slice(0, 4) + '-01-01').all()).results || []) as any[]
  const annHtml = ann.length ? `<section class="ann"><p style="font-size:13px;color:#999;margin-bottom:8px">历史上的今天 · ${mmdd}</p><ul style="list-style:none">${ann.map(a => `<li style="margin:6px 0"><a href="/w/${a.id}">${esc(a.title || a.date)}</a> <span style="color:#999;font-size:12px">${esc(String(a.date).slice(0, 4))}</span></li>`).join('')}</ul></section>` : ''
  return c.html(layout('日记', list + annHtml + more || empty))
})

app.get('/d', c => c.redirect('/', 302))

app.get('/w/:id', async c => {
  await ensure(c.env.DB)
  const id = c.req.param('id')
  const r = await c.env.DB.prepare(`SELECT * FROM entries WHERE id=?`).bind(id).first() as any
  if (!r) return c.notFound()
  const isAdmin = await isAuth(c)
  if (!r.visible && !isAdmin) return c.notFound()
  const html = await renderMd(r.content)
  const origin = new URL(c.req.url).origin
  const plain = String(r.content).replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*`~]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const imgm = String(r.content).match(/!\[[^\]]*\]\(([^)\s]+)/)
  const og = { desc: plain || String(r.title || r.date || ''), image: imgm ? new URL(imgm[1], origin).href : undefined }
  const admin = isAdmin ? `<div style="margin-top:16px;font-size:13px"><a href="/admin/edit/${r.id}">编辑</a><span style="margin:0 8px;color:#ccc">·</span><form method="post" action="/admin/delete/${r.id}" style="display:inline" onsubmit="return confirm('删除?')"><button style="background:none;border:none;color:#999;text-decoration:underline;cursor:pointer;padding:0;font:inherit;font-size:13px">删除</button></form></div>` : ``
  const showTitle = r.title && r.title !== r.date
  return c.html(layout(r.title || r.date || '日记', `<article><time>${esc(r.date)}</time>${showTitle ? `<h2>${esc(r.title)}</h2>` : ''}${r.visible ? '' : `<p style="font-size:12px;color:#999">仅自己可见</p>`}<div class="md">${html}</div>${admin}</article><p><a href="/">← 返回</a></p>`, og))
})

app.get('/guestbook', async c => {
  await ensure(c.env.DB)
  const admin = await isAuth(c)
  const { results } = await c.env.DB.prepare(`SELECT id, name, body, created FROM guestbook ORDER BY id DESC LIMIT 200`).all() as any
  const items = (await Promise.all((results as any[]).map(async g => {
    const del = admin ? ` · <form method="post" action="/guestbook/delete/${g.id}" style="display:inline" onsubmit="return confirm('删除这条留言?')"><button style="background:none;border:none;padding:0;color:#c00;text-decoration:underline;cursor:pointer;font:inherit;font-size:12px">删除</button></form>` : ``
    return `<article class="gb"><div class="gb-meta"><span>${esc(g.name || '匿名')} · ${esc(String(g.created).slice(0, 16).replace('T', ' '))}</span>${del}</div><div class="md">${await renderMd(g.body, true)}</div></article>`
  }))).join('')
  const body = `<form method="post" action="/guestbook" style="gap:12px;margin-bottom:28px;padding:16px;border:1px solid var(--line);border-radius:8px"><label style="gap:4px">称呼（可空）<input name="name" maxlength="20" placeholder="匿名也可以"></label><label style="gap:4px">留言<textarea name="body" required maxlength="500" placeholder="说点什么吧，支持 Markdown（500 字以内）" style="min-height:110px"></textarea></label><input name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0"><div class="cf-turnstile" data-sitekey="${TS_SITEKEY}"></div><button>送出留言</button></form><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><p style="font-size:13px;color:var(--muted);margin-bottom:6px">${(results as any[]).length} 条留言</p>${items || '<p style="color:var(--muted)">还没有留言，来说第一句吧</p>'}`
  return c.html(layout('留言板', body))
})

app.post('/guestbook', async c => {
  await ensure(c.env.DB)
  const f = await c.req.parseBody()
  if (String(f.hp || '')) return c.redirect('/guestbook')
  const body = String(f.body || '').trim()
  const name = String(f.name || '').trim().slice(0, 20)
  if (!body || body.length > 500) return c.text('invalid', 400)
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  const iphash = await sha256(ip + ':' + (c.env.ADMIN_PASSWORD || 'gb'))
  if (!await verifyTurnstile(c, String(f['cf-turnstile-response'] || ''))) return c.html(layout('留言', `<p style="color:#c00">人机校验失败</p><p><a href="/guestbook">重试</a></p>`), 403)
  const gate = await gbGate(c.env.DB, iphash)
  if (!gate.ok) return c.html(layout('留言', `<p style="color:#c00">${gate.msg}</p><p><a href="/guestbook">返回</a></p>`), 429)
  await c.env.DB.prepare(`INSERT INTO guestbook (name, body, iphash, created) VALUES (?,?,?,?)`).bind(name, body, iphash, new Date().toISOString()).run()
  return c.redirect('/guestbook')
})

app.post('/guestbook/delete/:id', async c => {
  await ensure(c.env.DB)
  if (!(await isAuth(c))) return c.redirect('/login')
  await c.env.DB.prepare(`DELETE FROM guestbook WHERE id=?`).bind(c.req.param('id')).run()
  return c.redirect('/guestbook')
})

app.get('/admin', async c => {
  return c.html(layout('写日记', `<form method="post" action="/admin"><input type="hidden" name="kind" value="diary"><label>标题（可空）<input name="title" placeholder="不填只显示日期"></label><label>日期<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><div style="display:flex;gap:16px;font-size:13px"><label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" name="visible" checked> 公开</label></div><div style="font-size:13px;color:#666"><div>图片 <input type="file" id="imgfile" accept="image/*"></div><label style="flex-direction:row;align-items:center;gap:6px;margin-top:8px;font-size:13px"><input type="checkbox" id="towebp" checked> 压缩成 webp（长边1600）</label><span id="imgmsg" style="font-size:12px;color:#999;margin-left:8px"></span></div><label>正文 (Markdown)</label><div style="display:flex;gap:16px;align-items:center;font-size:13px;margin:-8px 0 0"><button type="button" id="tab-write" style="background:none;border:none;padding:0;text-decoration:underline;text-underline-offset:3px;font-weight:bold;align-self:auto">写</button><button type="button" id="tab-prev" style="background:none;border:none;padding:0;color:#999;align-self:auto">预览</button><span id="prevmsg" style="font-size:12px;color:#999"></span></div><textarea id="content" name="content" required placeholder="# 今天&#10;&#10;- 做了什么..."></textarea><div id="preview" class="md" style="display:none;border:1px solid #eee;border-radius:4px;padding:14px;min-height:200px"></div><button>保存</button><p style="font-size:12px;color:#999;margin-top:8px"><a href="/admin/images">图片管理</a> · <a href="/logout">退出登录</a></p></form><script>
const ta = document.getElementById('content');
const fi = document.getElementById('imgfile');
const msg = document.getElementById('imgmsg');
function insertText(t) {
  const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, s) + t + ta.value.slice(e);
  ta.focus();
}
function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1600;
      let w = img.width, h = img.height;
      if (w > max || h > max) {
        const r = Math.min(max / w, max / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob((b) => b ? resolve(new File([b], file.name.replace(/\\.[^.]+$/, '') + '.webp', { type: 'image/webp' })) : reject(new Error('compress failed')), 'image/webp', 0.82);
    };
    img.onerror = () => reject(new Error('decode failed'));
    img.src = url;
  });
}
fi.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  msg.textContent = '上传中...';
  try {
    let up = f;
    const wantWebp = document.getElementById('towebp').checked;
    if (wantWebp && f.type !== 'image/webp' && f.type !== 'image/gif') up = await compress(f);
    const fd = new FormData();
    fd.append('file', up, up.name || 'img');
    const r = await fetch('/admin/upload', { method: 'POST', body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || ('http ' + r.status));
    insertText('\\n![](' + j.url + ')\\n');
    msg.textContent = '已插入 ' + j.url;
    e.target.value = '';
    ta.dispatchEvent(new Event('input'));
    if (typeof updatePreview === 'function' && typeof mode !== 'undefined' && mode === 'prev') updatePreview();
  } catch (err) { msg.textContent = '失败: ' + err.message; }
});
const pv = document.getElementById('preview');
const tabW = document.getElementById('tab-write');
const tabP = document.getElementById('tab-prev');
const prevmsg = document.getElementById('prevmsg');
let mode = 'write';
let deb = null;
function setMode(m) {
  mode = m;
  const isPrev = m === 'prev';
  pv.style.display = isPrev ? 'block' : 'none';
  ta.style.display = isPrev ? 'none' : 'block';
  tabW.style.fontWeight = isPrev ? 'normal' : 'bold';
  tabW.style.color = isPrev ? '#999' : '#111';
  tabW.style.textDecoration = 'underline';
  tabP.style.fontWeight = isPrev ? 'bold' : 'normal';
  tabP.style.color = isPrev ? '#111' : '#999';
  tabP.style.textDecoration = 'underline';
  if (isPrev) updatePreview();
}
async function updatePreview() {
  const md = ta.value.trim();
  if (!md) { pv.innerHTML = '<p style="color:#999;font-size:13px">还没有内容</p>'; return; }
  prevmsg.textContent = '渲染中...';
  try {
    const r = await fetch('/admin/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: ta.value }) });
    pv.innerHTML = await r.text();
    prevmsg.textContent = '';
  } catch (err) { prevmsg.textContent = '预览失败'; }
}
tabW.addEventListener('click', () => setMode('write'));
tabP.addEventListener('click', () => setMode('prev'));
ta.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { if (mode === 'prev') updatePreview(); }, 500); });
const DKEY = 'draft:' + location.pathname;
const fq = (n) => document.querySelector('[name="' + n + '"]');
let draftOff = false;
let draftT = null;
function draftData() {
  return { title: fq('title') ? fq('title').value : '', date: fq('date') ? fq('date').value : '', visible: fq('visible').checked, content: ta.value };
}
function draftWrite() {
  try { localStorage.setItem(DKEY, JSON.stringify(draftData())); } catch (e) {}
}
function draftSave(now) {
  if (draftOff) return;
  if (draftT) clearTimeout(draftT);
  if (now) draftWrite(); else draftT = setTimeout(draftWrite, 400);
}
ta.addEventListener('input', () => draftSave(false));
fq('title').addEventListener('input', () => draftSave(false));
fq('date').addEventListener('input', () => draftSave(false));
fq('visible').addEventListener('change', () => draftSave(false));
addEventListener('pagehide', () => draftSave(true));
document.querySelector('form').addEventListener('submit', () => { draftOff = true; try { localStorage.removeItem(DKEY); } catch (e) {} });
(function draftRestore() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch (e) {}
  if (!d || (!d.content && !d.title)) return;
  if (d.content === ta.value && (!fq('title') || d.title === fq('title').value)) return;
  if (d.title && fq('title')) fq('title').value = d.title;
  if (d.date && fq('date')) fq('date').value = d.date;
  if (typeof d.visible === 'boolean') fq('visible').checked = d.visible;
  if (d.content) ta.value = d.content;
  const dm = document.createElement('p');
  dm.style.cssText = 'font-size:12px;color:#999;margin:0 0 8px';
  dm.textContent = '已恢复上次未保存的草稿，';
  const da = document.createElement('a');
  da.href = '#';
  da.textContent = '丢弃';
  da.style.color = '#999';
  da.addEventListener('click', (e) => { e.preventDefault(); draftOff = true; try { localStorage.removeItem(DKEY); } catch (err) {} location.reload(); });
  dm.appendChild(da);
  ta.parentNode.insertBefore(dm, ta);
})();
</script>`))
})

app.post('/admin', async c => {
  await ensure(c.env.DB)
  const f = await c.req.parseBody()
  const kind = 'diary'
  const visible = f.visible ? 1 : 0
  const date = String(f.date || new Date().toISOString().slice(0,10))
  const title = String(f.title || '').trim()
  const content = String(f.content || '').trim()
  if (!content) return c.text('content required', 400)
  await c.env.DB.prepare(`INSERT INTO entries (title,content,date,kind,visible) VALUES (?,?,?,?,?)`).bind(title, content, date, kind, visible).run()
  return c.redirect('/')
})

app.post('/admin/preview', async c => {
  if (!(await isAuth(c))) return c.text('unauthorized', 401)
  const b: any = await c.req.json().catch(async () => await c.req.parseBody())
  const md = String(b.content ?? b.md ?? '')
  const html = await renderMd(md)
  return c.html(String(html))
})

app.get('/admin/edit/:id', async c => {
  await ensure(c.env.DB)
  const r = await c.env.DB.prepare(`SELECT * FROM entries WHERE id=?`).bind(c.req.param('id')).first() as any
  if (!r) return c.notFound()
  return c.html(layout('编辑', `<form method="post" action="/admin/edit/${r.id}"><input type="hidden" name="kind" value="diary"><label>标题（可空）<input name="title" value="${esc(r.title || '')}"></label><label>日期<input name="date" type="date" value="${esc(r.date)}"></label><div style="display:flex;gap:16px;font-size:13px"><label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" name="visible"${r.visible === 0 ? '' : ' checked'}> 公开</label></div><div style="font-size:13px;color:#666"><div>图片 <input type="file" id="imgfile" accept="image/*"></div><label style="flex-direction:row;align-items:center;gap:6px;margin-top:8px;font-size:13px"><input type="checkbox" id="towebp" checked> 压缩成 webp（长边1600）</label><span id="imgmsg" style="font-size:12px;color:#999;margin-left:8px"></span></div><label>正文 (Markdown)</label><div style="display:flex;gap:16px;align-items:center;font-size:13px;margin:-8px 0 0"><button type="button" id="tab-write" style="background:none;border:none;padding:0;text-decoration:underline;text-underline-offset:3px;font-weight:bold;align-self:auto">写</button><button type="button" id="tab-prev" style="background:none;border:none;padding:0;color:#999;align-self:auto">预览</button><span id="prevmsg" style="font-size:12px;color:#999"></span></div><textarea id="content" name="content" required>${esc(r.content)}</textarea><div id="preview" class="md" style="display:none;border:1px solid #eee;border-radius:4px;padding:14px;min-height:200px"></div><button>更新</button></form><script>
const ta = document.getElementById('content');
const fi = document.getElementById('imgfile');
const msg = document.getElementById('imgmsg');
function insertText(t) {
  const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, s) + t + ta.value.slice(e);
  ta.focus();
}
function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1600;
      let w = img.width, h = img.height;
      if (w > max || h > max) {
        const r = Math.min(max / w, max / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob((b) => b ? resolve(new File([b], file.name.replace(/\\.[^.]+$/, '') + '.webp', { type: 'image/webp' })) : reject(new Error('compress failed')), 'image/webp', 0.82);
    };
    img.onerror = () => reject(new Error('decode failed'));
    img.src = url;
  });
}
fi.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  msg.textContent = '上传中...';
  try {
    let up = f;
    const wantWebp = document.getElementById('towebp').checked;
    if (wantWebp && f.type !== 'image/webp' && f.type !== 'image/gif') up = await compress(f);
    const fd = new FormData();
    fd.append('file', up, up.name || 'img');
    const r = await fetch('/admin/upload', { method: 'POST', body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || ('http ' + r.status));
    insertText('\\n![](' + j.url + ')\\n');
    msg.textContent = '已插入 ' + j.url;
    e.target.value = '';
    ta.dispatchEvent(new Event('input'));
    if (typeof updatePreview === 'function' && typeof mode !== 'undefined' && mode === 'prev') updatePreview();
  } catch (err) { msg.textContent = '失败: ' + err.message; }
});
const pv = document.getElementById('preview');
const tabW = document.getElementById('tab-write');
const tabP = document.getElementById('tab-prev');
const prevmsg = document.getElementById('prevmsg');
let mode = 'write';
let deb = null;
function setMode(m) {
  mode = m;
  const isPrev = m === 'prev';
  pv.style.display = isPrev ? 'block' : 'none';
  ta.style.display = isPrev ? 'none' : 'block';
  tabW.style.fontWeight = isPrev ? 'normal' : 'bold';
  tabW.style.color = isPrev ? '#999' : '#111';
  tabW.style.textDecoration = 'underline';
  tabP.style.fontWeight = isPrev ? 'bold' : 'normal';
  tabP.style.color = isPrev ? '#111' : '#999';
  tabP.style.textDecoration = 'underline';
  if (isPrev) updatePreview();
}
async function updatePreview() {
  const md = ta.value.trim();
  if (!md) { pv.innerHTML = '<p style="color:#999;font-size:13px">还没有内容</p>'; return; }
  prevmsg.textContent = '渲染中...';
  try {
    const r = await fetch('/admin/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: ta.value }) });
    pv.innerHTML = await r.text();
    prevmsg.textContent = '';
  } catch (err) { prevmsg.textContent = '预览失败'; }
}
tabW.addEventListener('click', () => setMode('write'));
tabP.addEventListener('click', () => setMode('prev'));
ta.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { if (mode === 'prev') updatePreview(); }, 500); });
const DKEY = 'draft:' + location.pathname;
const fq = (n) => document.querySelector('[name="' + n + '"]');
let draftOff = false;
let draftT = null;
function draftData() {
  return { title: fq('title') ? fq('title').value : '', date: fq('date') ? fq('date').value : '', visible: fq('visible').checked, content: ta.value };
}
function draftWrite() {
  try { localStorage.setItem(DKEY, JSON.stringify(draftData())); } catch (e) {}
}
function draftSave(now) {
  if (draftOff) return;
  if (draftT) clearTimeout(draftT);
  if (now) draftWrite(); else draftT = setTimeout(draftWrite, 400);
}
ta.addEventListener('input', () => draftSave(false));
fq('title').addEventListener('input', () => draftSave(false));
fq('date').addEventListener('input', () => draftSave(false));
fq('visible').addEventListener('change', () => draftSave(false));
addEventListener('pagehide', () => draftSave(true));
document.querySelector('form').addEventListener('submit', () => { draftOff = true; try { localStorage.removeItem(DKEY); } catch (e) {} });
(function draftRestore() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch (e) {}
  if (!d || (!d.content && !d.title)) return;
  if (d.content === ta.value && (!fq('title') || d.title === fq('title').value)) return;
  if (d.title && fq('title')) fq('title').value = d.title;
  if (d.date && fq('date')) fq('date').value = d.date;
  if (typeof d.visible === 'boolean') fq('visible').checked = d.visible;
  if (d.content) ta.value = d.content;
  const dm = document.createElement('p');
  dm.style.cssText = 'font-size:12px;color:#999;margin:0 0 8px';
  dm.textContent = '已恢复上次未保存的草稿，';
  const da = document.createElement('a');
  da.href = '#';
  da.textContent = '丢弃';
  da.style.color = '#999';
  da.addEventListener('click', (e) => { e.preventDefault(); draftOff = true; try { localStorage.removeItem(DKEY); } catch (err) {} location.reload(); });
  dm.appendChild(da);
  ta.parentNode.insertBefore(dm, ta);
})();
</script>`))
})

app.post('/admin/edit/:id', async c => {
  await ensure(c.env.DB)
  const f = await c.req.parseBody()
  const kind = 'diary'
  const visible = f.visible ? 1 : 0
  await c.env.DB.prepare(`UPDATE entries SET title=?,content=?,date=?,kind=?,visible=? WHERE id=?`).bind(String(f.title || '').trim(), String(f.content), String(f.date), kind, visible, c.req.param('id')).run()
  return c.redirect('/')
})

app.post('/admin/delete/:id', async c => {
  await ensure(c.env.DB)
  await c.env.DB.prepare(`DELETE FROM entries WHERE id=?`).bind(c.req.param('id')).run()
  return c.redirect('/')
})

app.post('/admin/upload', async c => {
  if (!(await isAuth(c))) return c.json({ ok: false, error: 'unauthorized' }, 401)
  if (!c.env.IMG) return c.json({ ok: false, error: 'R2 not bound, check wrangler.toml' }, 500)
  const f = await c.req.parseBody()
  const file = f.file as unknown as File
  if (!file || typeof (file as any).arrayBuffer !== 'function') return c.json({ ok: false, error: 'no file' }, 400)
  if (!file.type.startsWith('image/')) return c.json({ ok: false, error: 'not image' }, 400)
  if (file.type === 'image/svg+xml') return c.json({ ok: false, error: 'svg not allowed' }, 400)
  if (file.size > 10 * 1024 * 1024) return c.json({ ok: false, error: 'too large, max 10MB' }, 400)
  const ext = file.type.includes('webp') ? 'webp' : file.type.includes('png') ? 'png' : file.type.includes('gif') ? 'gif' : 'jpg'
  const key = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  await c.env.IMG.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  return c.json({ ok: true, url: `/img/${key}` })
})

const imagesWithUsage = async (env: Env) => {
  const { results } = await env.DB.prepare(`SELECT content FROM entries`).all() as any
  const used = new Map<string, number>()
  for (const r of results as any[]) {
    const re = /\/img\/([0-9a-zA-Z\-\/._]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(String(r.content))) !== null) used.set(m[1], (used.get(m[1]) || 0) + 1)
  }
  const objs: any[] = []
  let cursor: string | undefined
  do {
    const page = await env.IMG.list(cursor ? { cursor } : {})
    for (const o of page.objects) objs.push(o)
    cursor = page.truncated ? (page as any).cursor : undefined
  } while (cursor && objs.length < 2000)
  objs.sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime())
  return { objs, used }
}

app.get('/admin/images', async c => {
  if (!c.env.IMG) return c.text('R2 not bound', 500)
  await ensure(c.env.DB)
  const { objs, used } = await imagesWithUsage(c.env)
  const fmt = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB'
  const unused = objs.filter(o => !used.has(o.key) && !o.key.startsWith('pwa/')).length
  const cards = objs.map(o => {
    const n = used.get(o.key) || 0
    const isPwa = o.key.startsWith('pwa/')
    const tag = isPwa
      ? '<span style="color:#b45309">PWA 图标（manifest 引用）</span>'
      : n > 0
        ? `<span style="color:#b45309">被 ${n} 篇日记引用</span>`
        : '<span style="color:#999">未被引用</span>'
    const msg = isPwa
      ? '这是 PWA 应用图标，删除后安装的应用图标会失效，确定删除？'
      : n > 0
        ? `该图片被 ${n} 篇日记引用，删除后日记里的图片将无法显示，确定删除？`
        : '确定删除该图片？'
    const name = o.key.split('/').pop()
    return `<figure style="width:150px;margin:0"><a href="/img/${esc(o.key)}" target="_blank" rel="noopener"><img src="/img/${esc(o.key)}" loading="lazy" decoding="async" alt="${esc(name)}" style="width:150px;height:110px;object-fit:cover;border:1px solid #eee;border-radius:4px;background:#f6f6f6;display:block"></a><figcaption style="font-size:12px;color:#666;margin-top:4px;word-break:break-all;line-height:1.5">${esc(name)}<br><span style="color:#999">${fmt(o.size)} · ${(o.uploaded as Date).toISOString().slice(0, 10)}</span><br>${tag} · <form method="post" action="/admin/images/delete" style="display:inline" onsubmit="return confirm('${msg}')"><input type="hidden" name="key" value="${esc(o.key)}"><button style="background:none;border:none;padding:0;color:#c00;text-decoration:underline;cursor:pointer;font:inherit;font-size:12px">删除</button></form></figcaption></figure>`
  }).join('')
  const cleanBtn = unused > 0 ? `<div style="margin:0 0 16px"><form method="post" action="/admin/images/cleanup" style="display:inline" onsubmit="return confirm('确定删除全部 ${unused} 张未被引用的图片？不可恢复！')"><button style="background:none;border:none;padding:0;color:#c00;text-decoration:underline;cursor:pointer;font:inherit;font-size:13px">一键清理未引用（${unused}）</button></form></div>` : ''
  const body = `<p style="font-size:13px;color:#666;margin-bottom:16px">共 ${objs.length} 张图片，其中 ${unused} 张未被任何日记引用${objs.length >= 2000 ? '（仅显示最新 2000 张）' : ''} · <a href="/admin">← 写日记</a></p>${cleanBtn}<div style="display:flex;flex-wrap:wrap;gap:14px">${cards || '<p style="color:#999">还没有图片</p>'}</div>`
  return c.html(layout('图片管理', body))
})

app.post('/admin/images/delete', async c => {
  const f = await c.req.parseBody()
  const key = String(f.key || '')
  if (!key || key.includes('..')) return c.text('bad key', 400)
  await c.env.IMG.delete(key)
  return c.redirect('/admin/images')
})

app.post('/admin/images/cleanup', async c => {
  if (!c.env.IMG) return c.text('R2 not bound', 500)
  await ensure(c.env.DB)
  const { objs, used } = await imagesWithUsage(c.env)
  for (const o of objs) {
    if (!used.has(o.key) && !o.key.startsWith('pwa/')) await c.env.IMG.delete(o.key)
  }
  return c.redirect('/admin/images')
})

app.get('/img/*', async c => {
  if (!c.env.IMG) return c.text('R2 not bound', 500)
  const key = c.req.path.replace(/^\/img\//, '')
  if (!key || key.includes('..')) return c.text('bad key', 400)
  const obj = await c.env.IMG.get(key)
  if (!obj) return c.text('not found', 404)
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('Cache-Control', 'public, max-age=31536000, immutable')
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('ETag', obj.httpEtag)
  return new Response(obj.body, { headers: h })
})

const rss = async (db: D1Database, url: string) => {
  await ensure(db)
  const { results } = await db.prepare(`SELECT * FROM entries WHERE visible=1 ORDER BY id DESC LIMIT 20`).all() as any
  const items = (await Promise.all((results as any[]).map(async r => {
    const link = `${url}/w/${r.id}`
    const pub = new Date(r.date).toUTCString()
    const body = (await renderMd(r.content)).replaceAll('src="/', `src="${url}/`).replaceAll('href="/', `href="${url}/`).replaceAll(']]>', ']]&gt;')
    return `<item><title>${esc(r.title || r.date)}</title><link>${link}</link><guid>${link}</guid><pubDate>${pub}</pubDate><description><![CDATA[${body}]]></description></item>`
  }))).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>日记</title><link>${url}</link><description>diary</description>${items}</channel></rss>`
}

app.get('/rss.xml', async c => {
  const url = new URL(c.req.url).origin
  return new Response(await rss(c.env.DB, url), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
})
app.get('/feed', c => c.redirect('/rss.xml'))

app.get('/favicon.ico', async c => {
  if (!c.env.IMG) return c.text('R2 not bound', 500)
  const obj = await c.env.IMG.get('pwa/favicon-32.png')
  if (!obj) return c.text('not found', 404)
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('Cache-Control', 'public, max-age=86400')
  h.set('X-Content-Type-Options', 'nosniff')
  return new Response(obj.body, { headers: h })
})

app.get('/manifest.webmanifest', c => new Response(JSON.stringify({
  id: '/',
  name: '日记',
  short_name: '日记',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#ee72b2',
  icons: [
    { src: '/img/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/img/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/img/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }))

// 改 SW 缓存逻辑时同步 bump V，否则老客户端不更新
const swJs = `const V='diary-v1';const OFFLINE='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>离线</title><body style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:32px 18px;line-height:1.9"><h1>日记</h1><p>现在没有网络，显示的是上次缓存的内容，联网后再试。</p><p><a href="/">返回首页</a></p></body></html>';self.addEventListener('install',e=>{self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(cache=>cache.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(m=>m||new Response(OFFLINE,{headers:{'Content-Type':'text/html;charset=utf-8'}}))));return}if(u.pathname.indexOf('/img/')===0){e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(cache=>cache.put(e.request,c))}return r})))}});`
app.get('/sw.js', c => new Response(swJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' } }))

app.use('/api/*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Headers', 'Authorization, X-Auth, Content-Type')
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  await next()
})
app.post('/api/login', async c => {
  const b: any = await c.req.json().catch(async () => await c.req.parseBody())
  if (!c.env.ADMIN_PASSWORD) return c.json({ ok: false, error: 'disabled' }, 403)
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  if (!(await loginGate(c.env.DB, ip))) return c.json({ ok: false, error: 'too many attempts' }, 429)
  if (!await verifyTurnstile(c, String(b['cf-turnstile-response'] || ''))) return c.json({ ok: false, error: 'turnstile' }, 403)
  const p = String(b.password || b.auth || '')
  if (!(await eqSecret(await sha256(p), await sha256(c.env.ADMIN_PASSWORD)))) {
    await loginFail(c.env.DB, ip)
    return c.json({ ok: false }, 401)
  }
  await loginClear(c.env.DB, ip)
  return c.json({ ok: true })
})
app.get('/api/entries', async c => {
  await ensure(c.env.DB)
  const admin = await isAuth(c)
  const { results } = await c.env.DB.prepare(`SELECT id,title,date,content,kind,visible FROM entries ORDER BY id DESC`).all()
  return c.json((results as any[]).filter(r => r.visible || admin))
})
app.get('/api/entries/:id', async c => {
  await ensure(c.env.DB)
  const r = await c.env.DB.prepare(`SELECT * FROM entries WHERE id=?`).bind(c.req.param('id')).first() as any
  if (!r) return c.json({ error: 'not found' }, 404)
  if (!r.visible && !(await isAuth(c))) return c.json({ error: 'not found' }, 404)
  return c.json(r)
})
app.post('/api/entries', async c => {
  if (!(await isAuth(c))) return c.json({ error: 'unauthorized' }, 401)
  await ensure(c.env.DB)
  const b: any = await c.req.json()
  const kind = 'diary'
  const visible = b.visible ? 1 : 0
  await c.env.DB.prepare(`INSERT INTO entries (title,content,date,kind,visible) VALUES (?,?,?,?,?)`).bind(String(b.title || '').trim(), b.content, b.date || new Date().toISOString().slice(0,10), kind, visible).run()
  return c.json({ ok: true })
})
app.put('/api/entries/:id', async c => {
  if (!(await isAuth(c))) return c.json({ error: 'unauthorized' }, 401)
  await ensure(c.env.DB)
  const b: any = await c.req.json()
  const kind = 'diary'
  const visible = b.visible ? 1 : 0
  await c.env.DB.prepare(`UPDATE entries SET title=?,content=?,date=?,kind=?,visible=? WHERE id=?`).bind(String(b.title || '').trim(), b.content, b.date, kind, visible, c.req.param('id')).run()
  return c.json({ ok: true })
})
app.delete('/api/entries/:id', async c => {
  if (!(await isAuth(c))) return c.json({ error: 'unauthorized' }, 401)
  await ensure(c.env.DB)
  await c.env.DB.prepare(`DELETE FROM entries WHERE id=?`).bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

export default app
