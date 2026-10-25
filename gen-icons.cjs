// 用 www 头像生成全套站点图标：192/512/maskable-512/apple-touch-180/favicon-32
// 用法：node gen-icons.js <avatar路径>
const path = require('path')
const fs = require('fs')

const av = process.argv[2]
if (!av || !fs.existsSync(av)) { console.error('avatar not found'); process.exit(1) }

let sharp
try {
  sharp = require(require('path').join(__dirname, 'node_modules', '.pnpm', 'sharp@0.33.5', 'node_modules', 'sharp'))
} catch (e) {
  console.error('sharp unavailable:', e.message)
  process.exit(2)
}

const out = path.join(__dirname, 'icons')
fs.mkdirSync(out, { recursive: true })

const square = async (size, name) => {
  await sharp(av).resize(size, size, { fit: 'cover' }).png().toFile(path.join(out, name))
  console.log('OK', name)
}

const maskable = async () => {
  // maskable 安全区：内容缩到 80% 居中，四周以头像边缘色铺底
  const buf = await sharp(av).resize(410, 410, { fit: 'cover' }).png().toBuffer()
  await sharp({ create: { width: 512, height: 512, channels: 3, background: '#f3cfe0' } })
    .composite([{ input: buf, gravity: 'center' }])
    .png().toFile(path.join(out, 'icon-maskable-512.png'))
  console.log('OK icon-maskable-512.png')
}

;(async () => {
  await square(192, 'icon-192.png')
  await square(512, 'icon-512.png')
  await square(180, 'apple-touch-icon.png')
  await square(32, 'favicon-32.png')
  await maskable()
})()
