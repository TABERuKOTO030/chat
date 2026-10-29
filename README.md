# 悄悄话 HUSH · 端到端加密聊天 (PWA)
纯静态前端 + Supabase。所有内容（消息、图片、视频、语音、文件、昵称、头像、群名）在浏览器里用 Web Crypto 加密后才上传，服务器只存密文。

## 一次性设置
1. Supabase → SQL Editor → 运行 `supabase/schema.sql`（只新增 `chat_` 表、`chat-blobs` 私有存储桶、RLS、实时、阅后即焚定时清理）。
2. （可选，锁屏推送）部署 Edge Function：
   ```
   supabase functions deploy chat-push --project-ref wtkvkklhbjoiitfvkkne
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:你的邮箱 --project-ref wtkvkklhbjoiitfvkkne
   ```
   VAPID 公钥已写在 `config.js`；私钥不在仓库里。部署后把 `config.js` 的 `PUSH_READY` 改为 `true`。

## 加密设计
- 主密码 + 邮箱 → PBKDF2-SHA256 600,000 次 → 768 位：登录口令 / 私钥包裹密钥 KEK / 备份密钥（三段互相推不出）。
- 每人一对 ECDH P-256 身份密钥；私钥由 KEK 包裹（AES-256-GCM）后存云端 → 多设备同一密码可用。
- 每个对话一把随机 AES-256 会话密钥，用 "我的私钥 × 对方公钥 → HKDF" 分别包裹给每个成员；移出成员时换新密钥。
- 文件：每个文件一把随机密钥，密文放私有存储桶，密钥放在（加密的）消息里。
- 安全码：双方公钥的 SHA-256 → 60 位数字，当面核对防冒充。
- 局限：元数据（谁和谁、时间、大小）可见；无前向保密；未经审计；网页代码由 GitHub Pages 提供。

## 测试
`test/mock-server.js` 是模拟 Supabase（含 RLS/实时）的本地后端；`python3 test/e2e.py`（`bash test/run.sh`）用三个浏览器账号跑完整流程。`?mock=` 只在 localhost 生效。

第三方：supabase-js (MIT)、Fredoka / Abril Fatface / Noto Serif CJK (SIL OFL)。
