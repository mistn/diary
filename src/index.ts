import { Hono } from 'hono'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

type Env = { DB: D1Database; ADMIN_PASSWORD: string; IMG: R2Bucket; TURNSTILE_SECRET: string; CF_ANALYTICS_TOKEN?: string }
const app = new Hono<{ Bindings: Env }>()

const TS_SITEKEY = '0x4AAAAAAExa5Ov0_uA6CYMF'

// 设置 secret CF_ANALYTICS_TOKEN 后自动挂 Cloudflare Web Analytics
let analyticsTag = ''
// CSP 作为消毒之外的第二道防线：即使 sanitize 被绕过，也拿不到外域脚本执行权
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')
app.use('*', async (c, next) => {
  analyticsTag = c.env.CF_ANALYTICS_TOKEN ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${c.env.CF_ANALYTICS_TOKEN}"}'></script>` : ''
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Content-Security-Policy', CSP)
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  if (new URL(c.req.url).protocol === 'https:') c.header('Strict-Transport-Security', 'max-age=31536000')
})

// CSRF：所有写操作校验来源。浏览器跨站提交必带 Origin（或 Sec-Fetch-Site），
// 同站提交 Origin 与本站 host 一致；原生客户端（安卓 App / curl）不带这些头，直接放行。
// cookie 本身是 SameSite=Lax，这里再加一层，防老浏览器 / 子域场景的漏网。
app.use('*', async (c, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) return next()
  const site = c.req.header('Sec-Fetch-Site')
  if (site && site !== 'same-origin' && site !== 'none') return c.text('cross-site request blocked', 403)
  const origin = c.req.header('Origin')
  if (origin) {
    let ok = false
    try { ok = new URL(origin).host === new URL(c.req.url).host } catch { ok = false }
    if (!ok) return c.text('cross-site request blocked', 403)
  }
  return next()
})

const css = `*{margin:0;padding:0;box-sizing:border-box}:root{--bg:#fff;--fg:#1a1a1a;--strong:#111;--muted:#999;--line:#eee;--codebg:#f6f6f6;--qbg:#fafafa;--qfg:#555;--td:#333;--field:#bbb;--accent:#d63384;--ease:cubic-bezier(.4,0,.2,1);--easeout:cubic-bezier(.16,1,.3,1);--grid:#00000007;--glow:#ee72b208}html{scrollbar-gutter:stable;color-scheme:light;scroll-behavior:smooth;background-color:var(--bg);background-image:linear-gradient(to right,var(--grid) 1px,transparent 1px),linear-gradient(to bottom,var(--grid) 1px,transparent 1px);background-size:40px 40px;background-attachment:fixed;transition:background-color .3s}html[data-theme="dark"]{color-scheme:dark;--bg:#151515;--fg:#d4d4d4;--strong:#d4d4d4;--muted:#777;--line:#2a2a2a;--codebg:#262626;--qbg:#1c1c1c;--qfg:#9a9a9a;--td:#b5b5b5;--field:#3a3a3a;--accent:#ee72b2;--grid:#ffffff09;--glow:#ee72b21c}@media(prefers-color-scheme:dark){html:not([data-theme="light"]){color-scheme:dark;--bg:#151515;--fg:#d4d4d4;--strong:#d4d4d4;--muted:#777;--line:#2a2a2a;--codebg:#262626;--qbg:#1c1c1c;--qfg:#9a9a9a;--td:#b5b5b5;--field:#3a3a3a;--accent:#ee72b2;--grid:#ffffff09;--glow:#ee72b21c}}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif;background-color:transparent;background-image:radial-gradient(ellipse 90% 40% at 50% 100%,var(--glow),transparent 70%);background-attachment:fixed;color:var(--fg);max-width:700px;margin:0 auto;padding:32px 18px;line-height:1.9;letter-spacing:.02em;transition:color .3s}header{position:relative;border-bottom:2px solid var(--accent);padding-bottom:16px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center;animation:rise .5s var(--easeout) both}header a{color:var(--strong);text-decoration:none}header h1{font-size:21px;letter-spacing:.08em;line-height:1}nav{display:flex;align-items:center;gap:12px}nav a{font-size:14px;line-height:1;display:flex;align-items:center;height:22px;text-decoration:none;transition:color .2s}nav a:hover{color:var(--accent);text-decoration:underline;text-underline-offset:3px}nav button,#searchbox button{background:none;border:none;padding:0;cursor:pointer;color:var(--fg);display:flex;align-items:center;justify-content:center}#sbtn,#theme{width:22px;height:22px;opacity:.8;transition:opacity .2s}#sbtn:hover,#theme:hover{opacity:1;background:none;border-color:transparent;color:var(--accent)}#sbtn:focus:not(:focus-visible),#theme:focus:not(:focus-visible){outline:none}#theme{position:relative}#theme svg{position:absolute;inset:0;margin:auto;transition:opacity .3s,transform .35s}#theme .i-sun{opacity:0;transform:rotate(90deg) scale(.4)}#theme .i-moon{opacity:1;transform:none}html[data-theme="dark"] #theme .i-sun{opacity:1;transform:none}html[data-theme="dark"] #theme .i-moon{opacity:0;transform:rotate(-90deg) scale(.4)}@media(prefers-color-scheme:dark){html:not([data-theme="light"]) #theme .i-sun{opacity:1;transform:none}html:not([data-theme="light"]) #theme .i-moon{opacity:0;transform:rotate(-90deg) scale(.4)}}#searchbox{position:absolute;right:0;top:46px;z-index:9;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);opacity:0;transform:translateY(-6px) scale(.98);transition:opacity .18s ease,transform .18s ease;pointer-events:none}#searchbox.open{opacity:1;transform:none;pointer-events:auto}#searchbox form{flex-direction:row;gap:6px;margin:0}#searchbox input{width:210px;padding:8px 10px;font-size:14px;flex:1}#searchbox button{width:32px;align-self:stretch}article{padding:12px 0;border:none}article h2{font-size:17px;margin:4px 0}time{font-size:12px;color:var(--muted);letter-spacing:.04em}.md{font-size:16px;line-height:2;color:var(--fg)}.md h1{font-size:22px;margin:24px 0 12px;border-bottom:1px solid var(--line);padding-bottom:8px}.md h2{font-size:19px;margin:22px 0 10px}.md h3{font-size:16px;margin:18px 0 8px}.md p{margin:14px 0}.md li{margin:6px 0 6px 20px}.md li:has(input[type="checkbox"]){list-style:none;margin-left:0}.md li input[type="checkbox"]{margin-right:6px;vertical-align:middle;width:auto}.md a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}.md code{background:var(--codebg);padding:2px 5px;font-size:13px;border-radius:3px}.md pre{background:var(--codebg);padding:14px;overflow:auto;border-radius:6px;line-height:1.6}.md pre code{background:none;padding:0}.md img{max-width:100%;border-radius:4px;margin:12px 0}.md blockquote{border-left:3px solid var(--accent);padding:6px 14px;margin:14px 0;color:var(--qfg);background:var(--qbg)}.md hr{border:none;border-top:1px solid var(--line);margin:20px 0}form{display:flex;flex-direction:column;gap:14px;max-width:100%}label{display:flex;flex-direction:column;gap:6px;font-size:13px}input:not([type="checkbox"]),textarea{border:1px solid var(--field);padding:10px;font:inherit;width:100%;border-radius:4px;background:none;color:inherit;transition:border-color .2s}input:focus,textarea:focus{outline:none;border-color:var(--accent)}input[type="checkbox"]{width:auto;accent-color:var(--accent)}textarea{min-height:420px;resize:vertical}button{border:1px solid var(--strong);background:var(--bg);color:var(--fg);padding:8px 20px;cursor:pointer;align-self:flex-start;border-radius:4px}button:hover{background:var(--accent);border-color:var(--accent);color:#fff}.md table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;line-height:1.7;display:block;overflow-x:auto;white-space:nowrap}.md th,.md td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left}.md th{border-bottom:2px solid var(--strong);white-space:nowrap}.md td{color:var(--td)}.ann{border-top:1px solid var(--line);margin-top:28px;padding-top:16px}.gb{padding:14px 0;border-bottom:1px solid var(--line)}.gb:last-of-type{border-bottom:none}.gb-meta{font-size:12px;color:var(--muted);margin-bottom:2px}.gb-meta span{margin-right:4px}.gb-body{white-space:pre-wrap;word-break:break-word;color:var(--fg)}.cf-turnstile{margin:2px 0}::selection{background:var(--accent);color:#fff}@keyframes rise{0%{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}article{animation:rise .55s var(--easeout) both}article:nth-of-type(2){animation-delay:.07s}article:nth-of-type(3){animation-delay:.14s}article:nth-of-type(4){animation-delay:.21s}article:nth-of-type(n+5){animation-delay:.28s}.ann{animation:rise .55s var(--easeout) .12s both}.morep{animation:rise .55s var(--easeout) .2s both}.pill{display:inline-flex;align-items:center;background:var(--codebg);border:1px solid transparent;border-radius:999px;padding:8px 18px;color:var(--fg);text-decoration:none;transition:all .3s var(--ease)}.pill:hover{color:var(--accent);border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 20px #ee72b22b;text-decoration:none}::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:var(--field);border-radius:5px}::-webkit-scrollbar-thumb:hover{background:var(--muted)}::-webkit-scrollbar-track{background:transparent}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}`

const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

// 站点按北京时间（UTC+8）显示与取"今天"：D1 存的是 UTC ISO，直接切字符串会差 8 小时
const TZ_OFFSET = 8 * 3600000
const bj = (d: Date | string | number = new Date()) => new Date(new Date(d).getTime() + TZ_OFFSET)
const bjDate = (d: Date | string | number = new Date()) => bj(d).toISOString().slice(0, 10)
const bjStamp = (d: Date | string | number = new Date()) => bj(d).toISOString().slice(0, 16).replace('T', ' ')

// 白名单消毒：标签/属性/scheme 三重限制，脚本、事件、iframe、style、svg 一律剥掉
// 注意：a 不放 name（DOM clobbering），带 target 的链接强制补 rel，防反向标签劫持
const mdSanitize = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'input', 'del', 's']),
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
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
  transformTags: {
    a: (tagName: string, attribs: Record<string, string>) => {
      const attrs = { ...attribs }
      if (attrs.target) { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer' }
      return { tagName, attribs: attrs }
    },
  },
}
// 留言更严：只允许站内 /img/ 图片（访客本来就传不了图，外链图会被当追踪像素），
// 所有链接加 rel="nofollow ugc"，防外链图泄 IP + 防垃圾外链
const gbSanitize = {
  ...mdSanitize,
  transformTags: {
    a: (tagName: string, attribs: Record<string, string>) => {
      const attrs = { ...attribs }
      attrs.rel = 'nofollow ugc noopener noreferrer'
      if (attrs.target) attrs.target = '_blank'
      return { tagName, attribs: attrs }
    },
  },
  exclusiveFilter: (frame: any) => frame.tag === 'img' && !/^\/img\//.test(frame.attribs.src || ''),
}
const renderMd = async (md: string, breaks = false, cfg: any = mdSanitize) => sanitizeHtml(String(await marked.parse(md, breaks ? { breaks: true } : undefined)), cfg).replace(/<img /g, '<img loading="lazy" decoding="async" ')
const layout = (title: string, body: string, og?: { desc?: string; image?: string }) => `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>${og ? `<meta property="og:title" content="${esc(title)}"><meta property="og:type" content="article">${og.image ? `<meta property="og:image" content="${esc(og.image)}">` : ''}<meta property="og:description" content="${esc(og.desc || '')}">` : ''}<meta name="description" content="${esc(og?.desc || '日记：一些日子里的事。')}">${analyticsTag}<link rel="alternate" type="application/rss+xml" title="日记 RSS" href="/rss.xml"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#ffffff"><meta name="theme-color" media="(prefers-color-scheme:dark)" content="#151515"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><link rel="icon" type="image/png" href="/pwa/favicon-32.png"><link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png"><style>${css}</style><header><h1><a href="/">日记</a></h1><nav><a href="/guestbook">留言</a><a href="/admin">写</a><a href="/rss.xml">RSS</a><button id="sbtn" type="button" aria-label="搜索" title="搜索"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg></button><button id="theme" type="button" aria-label="切换明暗" title="切换明暗"><svg class="i-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path></svg><svg class="i-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"></path></svg></button></nav><div id="searchbox"><form method="get" action="/"><input id="sinput" name="q" placeholder="搜索日记，回车" autocomplete="off"><button type="submit" aria-label="搜索"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg></button></form></div></header><main>${body}</main><script>var sb=document.getElementById('searchbox'),si=document.getElementById('sinput');document.getElementById('sbtn').onclick=function(e){e.stopPropagation();var open=sb.classList.toggle('open');if(open){var m=location.search.match(/[?&]q=([^&]*)/);if(m&&!si.value)si.value=decodeURIComponent(m[1].replace(/\\+/g,' '));si.focus()}};sb.onclick=function(e){e.stopPropagation()};si.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();si.form.requestSubmit()}});document.addEventListener('click',function(e){if(sb.classList.contains('open')&&!sb.contains(e.target))sb.classList.remove('open')});document.addEventListener('keydown',function(e){if(e.key==='Escape')sb.classList.remove('open')});var tb=document.getElementById('theme');tb.onclick=function(){var sys=matchMedia('(prefers-color-scheme: dark)').matches;var eff=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':sys;var n=eff?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}};if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}</script>`

// 建表只在 isolate 内跑一次：否则每个请求都要多打 5~6 次 D1 DDL（ALTER 还会抛错）
let ensured = false
const ensure = async (db: D1Database) => {
  if (ensured) return
  await db.prepare(`CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, date TEXT NOT NULL, kind TEXT DEFAULT 'diary', visible INTEGER DEFAULT 1)`).run()
  try { await db.prepare(`ALTER TABLE entries ADD COLUMN kind TEXT DEFAULT 'diary'`).run() } catch {}
  try { await db.prepare(`ALTER TABLE entries ADD COLUMN visible INTEGER DEFAULT 1`).run() } catch {}
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_date_id ON entries(date DESC, id DESC)`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS guestbook (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, iphash TEXT NOT NULL DEFAULT '', created TEXT NOT NULL)`).run()
  try { await db.prepare(`ALTER TABLE guestbook ADD COLUMN token_hash TEXT`).run() } catch {}
  ensured = true
}

const getCookie = (c: any, k: string) => (c.req.header('Cookie') || '').split('; ').find((x: string) => x.startsWith(k + '='))?.split('=')[1] || ''
const hashHex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('')
// 一次性删除 token：32 位 hex，库里只存哈希，明文只给访客本人
const randToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('')
const eqSecret = (a: string, b: string) => {
  const A = new TextEncoder().encode(a), B = new TextEncoder().encode(b)
  if (A.length !== B.length) return false
  let d = 0
  for (let i = 0; i < A.length; i++) d |= A[i] ^ B[i]
  return d === 0
}
// 密码哈希在每个请求里会算两次，缓存在 isolate 内（密码轮换后 key 变了自然失效）
let pwCache = { pw: '', hash: '' }
const adminHash = async (pw: string) => {
  if (pwCache.pw === pw && pwCache.hash) return pwCache.hash
  const h = await hashHex(pw)
  pwCache = { pw, hash: h }
  return h
}
// 密码未配置时一律拒绝（fail-closed），避免线上漏设 secret 导致后台裸奔
const isAuth = async (c: any) => {
  if (!c.env.ADMIN_PASSWORD) return false
  const expect = await adminHash(c.env.ADMIN_PASSWORD)
  const cookie = getCookie(c, 'auth')
  if (cookie && (await eqSecret(cookie, expect))) return true
  const bearer = (c.req.header('Authorization') || '').replace('Bearer ', '')
  if (bearer && (await eqSecret(await hashHex(bearer), expect))) return true
  const x = c.req.header('X-Auth')
  if (x && (await eqSecret(await hashHex(x), expect))) return true
  return false
}

// 本地开发（127.0.0.1/localhost）没配 secret 时放行，方便调试；线上漏配 secret 一律拒绝（fail-closed）
const isLocalReq = (c: any) => {
  const h = new URL(c.req.url).hostname
  return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]'
}
const verifyTurnstile = async (c: any, token: string) => {
  if (!c.env.TURNSTILE_SECRET) return isLocalReq(c)
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
  // 顺手清掉过期记录，避免表无限增长
  if (row && Date.now() - row.last > 600000) {
    await db.prepare(`DELETE FROM login_fail WHERE ip=?`).bind(ip).run()
    return true
  }
  return !(row && row.count >= 5)
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

// 内容风控：IP 限速挡不住的（代理池换 IP），用内容侧规则兜一层
// 1) 链接数上限  2) 关键词黑名单  3) 24h 内完全相同内容（跨 IP 生效）  4) 全站小时总量兜底
const GB_MAX_LINKS = 2
const GB_BANNED = ['加微信', '加vx', '加qq', '代购', '博彩', '菠菜', '开奖', '刷单', '返利', '优惠券', '贷款', '办证', '裸聊', '约炮', 'usdt', '兼职日结', '点击链接', '免费领取']
const gbModerate = async (db: D1Database, body: string) => {
  if ((body.match(/https?:\/\//gi) || []).length > GB_MAX_LINKS) return '链接有点多，最多 2 个'
  const low = body.toLowerCase()
  if (GB_BANNED.some(k => low.includes(k))) return '内容里有不合适的关键词，换个说法吧'
  const norm = low.replace(/\s+/g, '')
  // 太短的留言（"谢谢""好看"）不做查重，否则不同人发同一句会被误伤
  if (norm.length >= 6) {
    const { results } = await db.prepare(`SELECT body FROM guestbook WHERE created > ? LIMIT 300`).bind(new Date(Date.now() - 86400000).toISOString()).all() as any
    if ((results as any[]).some(r => String(r.body).toLowerCase().replace(/\s+/g, '') === norm)) return '这条内容已经发过了'
  }
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM guestbook WHERE created > ?`).bind(new Date(Date.now() - 3600000).toISOString()).first() as any
  if ((row?.n || 0) >= 30) return '留言板这会儿有点忙，稍后再试'
  return ''
}

app.get('/login', async c => {
  if (await isAuth(c)) return c.redirect('/admin')
  c.header('X-Robots-Tag', 'noindex, nofollow')
  c.header('Cache-Control', 'no-store')
  return c.html(layout('登录', `<form method="post" action="/login" style="max-width:340px;margin:60px auto"><label style="gap:8px">密码<input name="password" type="password" required autofocus style="border:1px solid #111;border-radius:4px;padding:12px"></label><div class="cf-turnstile" data-sitekey="${TS_SITEKEY}"></div></form><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`))
})
app.post('/login', async c => {
  if (!c.env.ADMIN_PASSWORD) return c.text('admin disabled: ADMIN_PASSWORD not set', 403)
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  if (!(await loginGate(c.env.DB, ip))) return c.html(layout('登录', `<p style="color:#c00">尝试次数过多，请 10 分钟后再试</p><p><a href="/login">重试</a></p>`))
  const f = await c.req.parseBody()
  if (!await verifyTurnstile(c, String(f['cf-turnstile-response'] || ''))) return c.html(layout('登录', `<p style="color:#c00">人机校验失败</p><p><a href="/login">重试</a></p>`))
  if (!(await eqSecret(await hashHex(String(f.password || '')), await adminHash(c.env.ADMIN_PASSWORD)))) {
    await loginFail(c.env.DB, ip)
    return c.html(layout('登录', `<p style="color:#c00">密码错误</p><p><a href="/login">重试</a></p>`))
  }
  await loginClear(c.env.DB, ip)
  return new Response(null, { status: 302, headers: { 'Location': '/admin', 'Set-Cookie': `auth=${await adminHash(c.env.ADMIN_PASSWORD)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` } })
})
// 退出登录改成 POST：GET 会被 <img src="/logout"> 这类跨站请求强制登出
const clearAuth = (loc: string) => new Response(null, { status: 302, headers: { 'Location': loc, 'Set-Cookie': `auth=; Path=/; Max-Age=0` } })
app.post('/logout', c => clearAuth('/'))
app.get('/logout', c => c.html(layout('退出登录', `<form method="post" action="/logout" style="margin:60px auto;max-width:320px"><p style="font-size:15px;margin-bottom:16px">确定退出登录？</p><button>退出</button></form><p style="margin-top:16px;font-size:14px"><a href="/">回首页</a></p>`)))

app.use('/admin*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  c.header('X-Robots-Tag', 'noindex, nofollow')
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
    const total = ((await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM entries WHERE (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\') ${vis}`).bind(pat, pat).first()) as any)?.n || 0
    const { results } = await c.env.DB.prepare(`SELECT * FROM entries WHERE (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\') ${vis}ORDER BY date DESC, id DESC LIMIT 50`).bind(pat, pat).all() as any
    const list = (await Promise.all((results as any[]).map(r => articleHtml(r, admin)))).join('')
    const head = `<p style="font-size:13px;color:#666;margin-bottom:14px">搜索「${esc(kw)}」：共 ${total} 篇${total > results.length ? `，显示最新 ${results.length} 篇` : ''} · <a href="/">返回全部</a></p>`
    return c.html(layout('搜索：' + kw, head + (list || '<p style="color:#999">没有匹配的日记</p>')))
  }
  const before = Number(c.req.query('before') || 0)
  const bd = (c.req.query('bd') || '').trim()
  let rows: any[]
  if (Number.isFinite(before) && before > 0) {
    // 游标必须和排序键一致：按 (date, id) 一起翻，否则补写的旧日记会永远翻不到
    const cursor = bd ? `(date < ? OR (date = ? AND id < ?))` : `id < ?`
    const sql = admin ? `SELECT * FROM entries WHERE ${cursor} ORDER BY date DESC, id DESC LIMIT ?` : `SELECT * FROM entries WHERE visible=1 AND ${cursor} ORDER BY date DESC, id DESC LIMIT ?`
    const args: any[] = bd ? [bd, bd, before, PAGE_SIZE + 1] : [before, PAGE_SIZE + 1]
    rows = ((await c.env.DB.prepare(sql).bind(...args).all()).results || []) as any[]
  } else {
    const sql = admin ? `SELECT * FROM entries ORDER BY date DESC, id DESC LIMIT ?` : `SELECT * FROM entries WHERE visible=1 ORDER BY date DESC, id DESC LIMIT ?`
    rows = ((await c.env.DB.prepare(sql).bind(PAGE_SIZE + 1).all()).results || []) as any[]
  }
  const hasMore = rows.length > PAGE_SIZE
  const page = rows.slice(0, PAGE_SIZE)
  const list = (await Promise.all(page.map(r => articleHtml(r, admin)))).join('')
  const last = page[page.length - 1]
  const more = hasMore ? `<p class="morep" style="margin-top:24px;text-align:center"><a class="pill" href="/?before=${last.id}&bd=${encodeURIComponent(String(last.date))}">更早的日记 →</a></p>` : ``
  const empty = Number.isFinite(before) && before > 0
    ? `<p>没有更早的日记了，<a href="/">回首页</a></p>`
    : `<p>还没有日记，<a href="/admin">写第一篇</a></p>`
  const today = bjDate()
  const mmdd = today.slice(5, 10)
  const ann = ((await c.env.DB.prepare(`SELECT id, title, date FROM entries WHERE strftime('%m-%d', date) = ? AND date < ? ${admin ? '' : 'AND visible=1'} ORDER BY date DESC LIMIT 10`).bind(mmdd, today.slice(0, 4) + '-01-01').all()).results || []) as any[]
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
  let ogImage: string | undefined
  if (imgm) { try { ogImage = new URL(imgm[1], origin).href } catch { ogImage = undefined } }
  const og = { desc: plain || String(r.title || r.date || ''), image: ogImage }
  const admin = isAdmin ? `<div style="margin-top:16px;font-size:13px"><a href="/admin/edit/${r.id}">编辑</a><span style="margin:0 8px;color:#ccc">·</span><form method="post" action="/admin/delete/${r.id}" style="display:inline" onsubmit="return confirm('删除?')"><button style="background:none;border:none;color:#999;text-decoration:underline;cursor:pointer;padding:0;font:inherit;font-size:13px">删除</button></form></div>` : ``
  const showTitle = r.title && r.title !== r.date
  return c.html(layout(r.title || r.date || '日记', `<article><time>${esc(r.date)}</time>${showTitle ? `<h2>${esc(r.title)}</h2>` : ''}${r.visible ? '' : `<p style="font-size:12px;color:#999">仅自己可见</p>`}<div class="md">${html}</div>${admin}</article><p><a href="/">← 返回</a></p>`, og))
})

app.get('/guestbook', async c => {
  await ensure(c.env.DB)
  const admin = await isAuth(c)
  const { results } = await c.env.DB.prepare(`SELECT id, name, body, created FROM guestbook ORDER BY id DESC LIMIT 200`).all() as any
  const gbTotal = (((await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM guestbook`).first()) as any)?.n) || 0
  const items = (await Promise.all((results as any[]).map(async g => {
    const del = admin ? ` · <form method="post" action="/guestbook/delete/${g.id}" style="display:inline" onsubmit="return confirm('删除这条留言?')"><button style="background:none;border:none;padding:0;color:#c00;text-decoration:underline;cursor:pointer;font:inherit;font-size:12px">删除</button></form>` : ``
    return `<article class="gb" data-gb="${g.id}"><div class="gb-meta"><span>${esc(g.name || '匿名')} · ${esc(bjStamp(g.created))}</span>${del}</div><div class="md">${await renderMd(g.body, true, gbSanitize)}</div></article>`
  }))).join('')
  const body = `<form method="post" action="/guestbook" style="gap:12px;margin-bottom:28px;padding:16px;border:1px solid var(--line);border-radius:8px"><label style="gap:4px">称呼（可空）<input name="name" maxlength="20" placeholder="匿名也可以"></label><label style="gap:4px">留言<textarea name="body" required maxlength="500" placeholder="说点什么吧，支持 Markdown（500 字以内）" style="min-height:110px"></textarea></label><input name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0"><div class="cf-turnstile" data-sitekey="${TS_SITEKEY}"></div><button>送出留言</button></form><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><p style="font-size:13px;color:var(--muted);margin-bottom:6px">共 ${gbTotal} 条留言${gbTotal > results.length ? `（仅显示最新 ${results.length} 条）` : ''}</p>${items || '<p style="color:var(--muted)">还没有留言，来说第一句吧</p>'}<script>(function(){var own={};try{own=JSON.parse(localStorage.getItem('gb_own')||'{}')}catch(e){}Object.keys(own).forEach(function(id){var el=document.querySelector('[data-gb="'+id+'"]');if(!el)return;var s=el.querySelector('.gb-meta span');if(!s)return;var a=document.createElement('a');a.href='#';a.textContent='删除';a.style.cssText='color:#c00;text-decoration:underline;font-size:12px;margin-left:6px';a.onclick=function(e){e.preventDefault();if(!confirm('删除这条留言?'))return;var fd=new FormData();fd.append('t',own[id]);fetch('/guestbook/selfdelete/'+id,{method:'POST',body:fd}).then(function(){location.reload()},function(){location.reload()})};s.appendChild(a)})})()</script>`
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
  const iphash = await hashHex(ip + ':' + (c.env.ADMIN_PASSWORD || 'gb'))
  if (!await verifyTurnstile(c, String(f['cf-turnstile-response'] || ''))) return c.html(layout('留言', `<p style="color:#c00">人机校验失败</p><p><a href="/guestbook">重试</a></p>`), 403)
  const gate = await gbGate(c.env.DB, iphash)
  if (!gate.ok) return c.html(layout('留言', `<p style="color:#c00">${gate.msg}</p><p><a href="/guestbook">返回</a></p>`), 429)
  const mod = await gbModerate(c.env.DB, body)
  if (mod) return c.html(layout('留言', `<p style="color:#c00">${esc(mod)}</p><p><a href="/guestbook">返回</a></p>`), 400)
  // 访客自删：生成一次性 token，库里只存哈希，明文交给访客浏览器（localStorage + 成功页按钮）
  const token = randToken()
  const res = await c.env.DB.prepare(`INSERT INTO guestbook (name, body, iphash, created, token_hash) VALUES (?,?,?,?,?)`).bind(name, body, iphash, new Date().toISOString(), await hashHex(token)).run() as any
  const id = String(res?.meta?.last_row_id ?? '')
  return c.html(layout('留言已送出', `<p style="margin:18px 0 12px">留言已送出，谢谢。</p><p style="font-size:13px;color:var(--muted);line-height:2">这台设备上，你刚发的那条后面会多一个「删除」；换了设备或清了浏览器数据就没了，要反悔用下面这个按钮，或者跟我说一声。</p><form method="post" action="/guestbook/selfdelete/${id}" style="margin:20px 0"><input type="hidden" name="t" value="${token}"><button style="border-color:#c00;color:#c00">删除这条留言</button></form><p style="font-size:14px"><a href="/guestbook">返回留言板</a></p><script>try{var o=JSON.parse(localStorage.getItem('gb_own')||'{}');o[${JSON.stringify(id)}]=${JSON.stringify(token)};var k=Object.keys(o);if(k.length>50)delete o[k[0]];localStorage.setItem('gb_own',JSON.stringify(o))}catch(e){}</script>`))
})

app.post('/guestbook/delete/:id', async c => {
  await ensure(c.env.DB)
  if (!(await isAuth(c))) return c.redirect('/login')
  await c.env.DB.prepare(`DELETE FROM guestbook WHERE id=?`).bind(c.req.param('id')).run()
  return c.redirect('/guestbook')
})

// 访客自删：token 比对通过才删，只删自己那一条
app.post('/guestbook/selfdelete/:id', async c => {
  await ensure(c.env.DB)
  const id = c.req.param('id')
  const f = await c.req.parseBody()
  const t = String(f.t || '')
  if (!t) return c.text('missing token', 400)
  const row = await c.env.DB.prepare(`SELECT token_hash FROM guestbook WHERE id=?`).bind(id).first() as any
  if (!row) return c.html(layout('留言', `<p style="color:#c00">这条留言已经不在了</p><p><a href="/guestbook">返回留言板</a></p>`), 404)
  if (!row.token_hash || !eqSecret(await hashHex(t), String(row.token_hash))) return c.html(layout('留言', `<p style="color:#c00">删除凭证不对，可能不是这台设备发的</p><p><a href="/guestbook">返回留言板</a></p>`), 403)
  await c.env.DB.prepare(`DELETE FROM guestbook WHERE id=?`).bind(id).run()
  return c.redirect('/guestbook')
})

app.get('/admin', async c => {
  return c.html(layout('写日记', `<form method="post" action="/admin"><input type="hidden" name="kind" value="diary"><label>标题（可空）<input name="title" placeholder="不填只显示日期"></label><label>日期<input name="date" type="date" value="${bjDate()}"></label><div style="display:flex;gap:16px;font-size:13px"><label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" name="visible" checked> 公开</label></div><div style="font-size:13px;color:#666"><div>图片 <input type="file" id="imgfile" accept="image/*"></div><label style="flex-direction:row;align-items:center;gap:6px;margin-top:8px;font-size:13px"><input type="checkbox" id="towebp" checked> 压缩成 webp（长边1600）</label><span id="imgmsg" style="font-size:12px;color:#999;margin-left:8px"></span></div><label>正文 (Markdown)</label><div style="display:flex;gap:16px;align-items:center;font-size:13px;margin:-8px 0 0"><button type="button" id="tab-write" style="background:none;border:none;padding:0;text-decoration:underline;text-underline-offset:3px;font-weight:bold;align-self:auto">写</button><button type="button" id="tab-prev" style="background:none;border:none;padding:0;color:#999;align-self:auto">预览</button><span id="prevmsg" style="font-size:12px;color:#999"></span></div><textarea id="content" name="content" required placeholder="# 今天&#10;&#10;- 做了什么..."></textarea><div id="preview" class="md" style="display:none;border:1px solid #eee;border-radius:4px;padding:14px;min-height:200px"></div><button>保存</button><p style="font-size:12px;color:#999;margin-top:8px"><a href="/admin/images">图片管理</a> · <form method="post" action="/logout" style="display:inline"><button style="background:none;border:none;padding:0;color:#999;text-decoration:underline;cursor:pointer;font:inherit;font-size:12px">退出登录</button></form></p></form><script>
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
    if (wantWebp && f.type !== 'image/webp' && f.type !== 'image/gif') {
      try { up = await compress(f) } catch (err) {
        // 压缩失败不再直接阻断上传：浏览器能显示的格式退回原图，其余（HEIC/HEIF 等）给出明确提示
        var okTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];
        if (okTypes.indexOf(f.type) < 0) throw new Error('浏览器解不开这张图（' + (f.type || '未知格式') + '），HEIC/HEIF 请先转成 JPG 再传');
        up = f;
      }
    }
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
  const date = String(f.date || bjDate())
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
    if (wantWebp && f.type !== 'image/webp' && f.type !== 'image/gif') {
      try { up = await compress(f) } catch (err) {
        // 压缩失败不再直接阻断上传：浏览器能显示的格式退回原图，其余（HEIC/HEIF 等）给出明确提示
        var okTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];
        if (okTypes.indexOf(f.type) < 0) throw new Error('浏览器解不开这张图（' + (f.type || '未知格式') + '），HEIC/HEIF 请先转成 JPG 再传');
        up = f;
      }
    }
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
  const key = `${bjDate()}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  await c.env.IMG.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  return c.json({ ok: true, url: `/img/${key}` })
})

const imagesWithUsage = async (env: Env) => {
  // 日记正文 + 留言正文都要扫，否则只被留言引用的图会被当成"未引用"清理掉
  const { results } = await env.DB.prepare(`SELECT content FROM entries`).all() as any
  const { results: gbs } = await env.DB.prepare(`SELECT body FROM guestbook`).all() as any
  const used = new Map<string, number>()
  const re = /\/img\/([0-9a-zA-Z\-\/._]+)/g
  for (const r of [...(results as any[]), ...(gbs as any[]).map(g => ({ content: g.body }))]) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(String(r.content || ''))) !== null) used.set(m[1], (used.get(m[1]) || 0) + 1)
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
    return `<figure style="width:150px;margin:0"><a href="/img/${esc(o.key)}" target="_blank" rel="noopener"><img src="/img/${esc(o.key)}" loading="lazy" decoding="async" alt="${esc(name)}" style="width:150px;height:110px;object-fit:cover;border:1px solid #eee;border-radius:4px;background:#f6f6f6;display:block"></a><figcaption style="font-size:12px;color:#666;margin-top:4px;word-break:break-all;line-height:1.5">${esc(name)}<br><span style="color:#999">${fmt(o.size)} · ${bjDate(o.uploaded)}</span><br>${tag} · <form method="post" action="/admin/images/delete" style="display:inline" onsubmit="return confirm('${msg}')"><input type="hidden" name="key" value="${esc(o.key)}"><button style="background:none;border:none;padding:0;color:#c00;text-decoration:underline;cursor:pointer;font:inherit;font-size:12px">删除</button></form></figcaption></figure>`
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
  // R2 支持批量删除，500 一批，避免逐张打网络往返撞上 Worker 时长上限
  const keys = objs.filter(o => !used.has(o.key) && !o.key.startsWith('pwa/')).map(o => o.key)
  for (let i = 0; i < keys.length; i += 500) await c.env.IMG.delete(keys.slice(i, i + 500))
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
  h.set('X-Robots-Tag', 'noindex')
  h.set('ETag', obj.httpEtag)
  return new Response(obj.body, { headers: h })
})

const rss = async (db: D1Database, url: string) => {
  await ensure(db)
  const { results } = await db.prepare(`SELECT * FROM entries WHERE visible=1 ORDER BY date DESC, id DESC LIMIT 20`).all() as any
  const items = (await Promise.all((results as any[]).map(async r => {
    const link = `${url}/w/${r.id}`
    const pub = new Date(r.date).toUTCString()
    const body = (await renderMd(r.content)).replaceAll('src="/', `src="${url}/`).replaceAll('href="/', `href="${url}/`).replaceAll(']]>', ']]&gt;')
    return `<item><title>${esc(r.title || r.date)}</title><link>${link}</link><guid>${link}</guid><pubDate>${pub}</pubDate><description><![CDATA[${body}]]></description></item>`
  }))).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>日记</title><link>${url}</link><description>diary</description><language>zh-CN</language>${items}</channel></rss>`
}

app.get('/rss.xml', async c => {
  const url = new URL(c.req.url).origin
  return new Response(await rss(c.env.DB, url), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
})
app.get('/feed', c => c.redirect('/rss.xml'))

app.get('/robots.txt', c => {
  const origin = new URL(c.req.url).origin
  return new Response(`User-agent: *\nDisallow: /admin\nDisallow: /login\nDisallow: /logout\nDisallow: /api/\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } })
})
app.get('/sitemap.xml', async c => {
  await ensure(c.env.DB)
  const origin = new URL(c.req.url).origin
  const { results } = await c.env.DB.prepare(`SELECT id, date FROM entries WHERE visible=1 ORDER BY date DESC, id DESC LIMIT 5000`).all() as any
  const urls = (results as any[]).map(r => `<url><loc>${origin}/w/${r.id}</loc><lastmod>${esc(String(r.date))}</lastmod></url>`).join('')
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc><changefreq>daily</changefreq></url><url><loc>${origin}/guestbook</loc><changefreq>weekly</changefreq></url>${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
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
    { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }))

// 改 SW 缓存逻辑时同步 bump V，否则老客户端不更新
const swJs = `const V='diary-v3';
const MAXP=40;      // 最多缓存 40 个页面（FIFO 淘汰）
const MAXI=120;     // 最多缓存 120 张图
const MAXB=500000;  // 单张图超过 500KB 不缓存
const OFFLINE='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>离线</title><body style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:32px 18px;line-height:1.9"><h1>日记</h1><p>现在没有网络，显示的是上次缓存的内容，联网后再试。</p><p><a href="/">返回首页</a></p></body></html>';
async function trim(name,max){
  const c=await caches.open(name);
  const ks=await c.keys();
  for(let i=0;i<ks.length-max;i++)await c.delete(ks[i])
}
async function put(name,req,res,max){
  const c=await caches.open(name);
  await c.put(req,res);
  await trim(name,max)
}
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.indexOf(V)!==0).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.indexOf('/admin')===0||u.pathname.indexOf('/api/')===0||u.pathname==='/sw.js')return;
  if(e.request.mode==='navigate'){
    e.respondWith((async()=>{
      try{
        const r=await fetch(e.request);
        if(r.ok&&!u.search)e.waitUntil(put(V+'-p',e.request,r.clone(),MAXP));
        return r
      }catch(err){
        return (await caches.match(e.request))||new Response(OFFLINE,{headers:{'Content-Type':'text/html;charset=utf-8'}})
      }
    })());
    return
  }
  if(u.pathname.indexOf('/img/')===0){
    e.respondWith((async()=>{
      const m=await caches.match(e.request);
      if(m)return m;
      const r=await fetch(e.request);
      const len=Number(r.headers.get('content-length')||0);
      if(r.ok&&len<MAXB)e.waitUntil(put(V+'-i',e.request,r.clone(),MAXI));
      return r
    })())
  }
});`

app.get('/sw.js', c => new Response(swJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' } }))

app.use('/api/*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Headers', 'Authorization, X-Auth, Content-Type')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Max-Age', '86400')
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
  if (!(await eqSecret(await hashHex(p), await adminHash(c.env.ADMIN_PASSWORD)))) {
    await loginFail(c.env.DB, ip)
    return c.json({ ok: false }, 401)
  }
  await loginClear(c.env.DB, ip)
  return c.json({ ok: true })
})
app.get('/api/entries', async c => {
  await ensure(c.env.DB)
  const admin = await isAuth(c)
  const { results } = await c.env.DB.prepare(`SELECT id,title,date,content,kind,visible FROM entries ORDER BY date DESC, id DESC`).all()
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
  await c.env.DB.prepare(`INSERT INTO entries (title,content,date,kind,visible) VALUES (?,?,?,?,?)`).bind(String(b.title || '').trim(), b.content, b.date || bjDate(), kind, visible).run()
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

// 兜底：未捕获异常和 404 都给个能点的页面，别白屏
app.notFound(c => c.html(layout('找不到', `<p style="font-size:15px">这个页面不存在</p><p style="font-size:14px;margin-top:10px"><a href="/">回首页</a></p>`), 404))
app.onError((err, c) => {
  console.error('unhandled', err)
  return c.html(layout('出错了', `<p style="font-size:15px;color:#c00">服务器开小差了</p><p style="font-size:14px;margin-top:10px"><a href="/">回首页</a></p>`), 500)
})

export default app
