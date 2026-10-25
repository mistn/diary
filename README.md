# Diary · 极简日记

`Hono + D1 + R2 + marked` 服务端渲染 Markdown，部署在 **Cloudflare Workers**（`diary.miuarc.com`）。

- 阅读：`/` 日记全文流（20 篇一页，`?before=` 翻更早），右上角 🔍 弹出悬浮搜索（全文检索 `?q=`），底部「历史上的今天」，右上角明暗切换（默认跟随系统、记忆偏好），阅读页无框架（`/d` 跳 `/`，仅兼容老链接；图标来自 Feather，MIT）
- 详情：`/w/:id` 带 OG 分享卡（标题 / 正文摘要 / 首图），微信、推特分享有预览
- 写作：`/admin` 写 Markdown，标题可空（不填只显示日期），支持编辑/删除，存 `D1`；草稿自动保存（localStorage，误关可恢复，保存成功自动清除）
- 可见：公开勾掉即私密，列表/详情/RSS/搜索 全不可见，登录后自己可见
- 图片：`/admin` 选图上传 `R2`，自动压 webp（长边 1600）并插到光标处，前台懒加载；`/admin/images` 图片管理（预览、引用检测、删除、一键清理未引用）
- 预览：`/admin` 写/预览切换；鉴权：`/admin*` 需登录（`ADMIN_PASSWORD`），登录限速（同 IP 10 分钟错 5 次锁 10 分钟），Markdown 输出经 sanitize-html 消毒；其余公开
- 订阅：`/rss.xml` `/feed`；渲染：标题、列表、任务列表、代码块、引用、图片、表格
- 统计：配置 secret `CF_ANALYTICS_TOKEN` 后自动挂 Cloudflare Web Analytics，不配则无
- PWA：`/manifest.webmanifest` + `/sw.js`，手机浏览器打开可“安装到主屏幕”，页面与图片离线可读（图标在 R2 `pwa/`，源文件在 `icons/`）
- 主题：黑白极简 + Happy Sugar Life 品牌粉点缀（暗色用原色 `#ee72b2`，浅色链接用加深版 `#d63384` 保证白底可读）；网格底纹、底部微光、列表渐入、胶囊按钮等动效与氛围均参考 `dp-intro-vue`
- App：原生安卓端在 `diary-android/` 目录，对接 `/api/*`

## 本地

```bash
pnpm install
pnpm dev  # http://127.0.0.1:8787
npx wrangler d1 execute weekly --local --file ./seed.sql  # 示例数据
```

`.dev.vars`（不提交）：`ADMIN_PASSWORD=你的密码`。**密码不能为空**——后台是 fail-closed 设计，没配密码等于后台直接禁用（防线上漏配 secret 裸奔）。

## 部署

push 到 `main` 自动部署（`deploy.yml`：构建 → `wrangler deploy` → 同步密钥到 Worker）。改密码只改 GitHub Secrets 里的 `ADMIN_PASSWORD` 再 push 即生效。

Secrets 统一配在仓库 **Settings → Secrets and variables → Actions**：

| Secret | 用途 | 必填 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | 部署 + 备份。用 "Edit Cloudflare Workers" 模板建，再手动加一行：帐户 / D1 / 读取 | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | 部署 + 备份。Cloudflare 后台链接里那串 account id | ✅ |
| `ADMIN_PASSWORD` | 后台登录密码，deploy.yml 自动同步为 Worker secret（printf 传，别带换行） | ✅ |
| `TURNSTILE_SECRET` | 登录人机校验，deploy.yml 自动同步 | ✅ |
| `WEBDAV_URL` / `WEBDAV_USERNAME` / `WEBDAV_PASSWORD` | 每周自动备份到 WebDAV（backup.yml）；URL 末尾不要斜杠 | ✅ |
| `CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics 统计脚本，deploy.yml 检测到才同步；不配则站上无统计 | ⭕ 可选 |

首次建站：`npx wrangler d1 create weekly`（id 填进 `wrangler.toml`）+ `npx wrangler r2 bucket create diary-img`，表由代码 `ensure()` 自动建。

## 备份

- 本地：`pnpm run backup`，产物在 `backup/YYYY-MM-DD/`（不进 git）
- 云端：每周一 02:00 自动备到 WebDAV，只留最近 8 份

## 目录

```
src/index.ts                  # 路由 + 渲染 + 上传/预览
scripts/backup.mjs            # 本地备份
.github/workflows/deploy.yml  # 自动部署
.github/workflows/backup.yml  # 云端备份
wrangler.toml                 # Worker + D1 + R2
seed.sql                      # 示例数据
icons/                        # PWA 图标源文件（已上传 R2 pwa/）
```

改样式：编辑 `src/index.ts` 的 `css`，`pnpm dev` 看效果。
