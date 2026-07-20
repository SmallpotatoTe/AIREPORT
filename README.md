# AI 日报采集 + DeepSeek 整理 + RAG 问答

这是一个完整的 Next.js 前后端项目，覆盖 AI 新闻采集、正文提取、质量过滤、DeepSeek 中文整理、按日期归档、本地 RAG 入库和大模型问答。

## 一键启动

1. 首次使用运行 `npm install`。
2. 复制 `.env.local.example` 为 `.env.local`，只在本地填写 DeepSeek/Kimi 密钥。
3. 双击 `start.bat`，或运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

4. 打开 `http://127.0.0.1:3000/`。

启动脚本会停止旧的本项目进程、清理开发缓存 `.next-dev`，再绑定 `0.0.0.0:3000`。开发缓存与生产构建目录已经隔离，运行 `npm run build` 不会再破坏正在运行的开发页面。

## 信源与质量规则

- OpenAI News、NVIDIA AI、Microsoft Research、AWS Machine Learning
- GitHub AI、Cloudflare AI、arXiv `cs.AI`
- 机器之心、AI 资讯速览
- Smol AI News、RadarAI
- RSS 优先；网页源继续抓取详情页正文。
- 拒绝标题党、短 teaser、占位文本、营销内容、非 AI 内容、重复 URL 和重复标题。
- DeepSeek 生成中文标题、中文摘要、关键词、分类、重要性、相关性和价值说明。
- 最终日报最多 12 条；如果高质量条目不足，不使用虚构新闻补位。

## 使用流程

1. 首页点击“抓取今日新闻”。
2. 按日期浏览中文日报卡片，点击卡片打开详情弹窗。
3. 详情默认显示中文标题和摘要，可切换真实原文标题与摘要。
4. 点击“加入知识库”把指定日期日报去重写入本地 RAG 库。
5. 在右侧助手提问；回答只依据命中的已入库日报，并展示来源链接。

## 数据与接口

- 日报、RAG 文档、采集日志：`data/store.json`
- 采集缓存：`data/collect-cache.json`
- 命令行采集摘要：`data/last-collect.json`
- `GET /api/daily`：读取按日期归档的日报
- `GET/POST /api/collect`：触发一次真实采集和 DeepSeek 整理
- `GET /api/rag`：读取知识库文档数量
- `POST /api/rag`：将指定日期日报加入知识库
- `POST /api/chat`：检索 RAG 后调用 DeepSeek/Kimi，并返回命中来源
- `GET /api/health`：健康检查

## 每天 08:00 自动采集与邮件

双击 `setup-schedule.bat` 即可注册当前用户的 Windows 定时任务。任务名为 `AI Agent Daily Collect`，每天 08:00 调用 `run-collect.bat`，依次执行：

1. 抓取并筛选 AI 新闻。
2. 使用 DeepSeek 生成中文标题、摘要和关键词。
3. 按 `YYYY-MM-DD` 保存到 `data/store.json`。
4. 生成 HTML 日报并通过 SMTP 发到指定邮箱。
5. 把运行结果追加到 `scheduled-collect.log`，把最近一次结果写入 `data/last-collect.json`。

在 `.env.local` 填写邮件配置：

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=发件邮箱
SMTP_PASS=邮箱授权码或应用专用密码
DAILY_EMAIL_TO=收件邮箱
DAILY_EMAIL_FROM=AI 日报 <发件邮箱>
```

QQ/163 邮箱应使用 SMTP 授权码，Gmail 应使用应用专用密码，不要填写网页登录密码。配置不完整时，采集和本地归档仍会正常执行，只会跳过邮件；同一天对同一收件人默认只发送一次。

也可以在 PowerShell 中重新注册任务：

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-schedule.ps1 -Time 08:00
```

任务支持“错过后尽快执行”、从睡眠唤醒、使用电池运行，并限制单次执行最多 1 小时。电脑彻底关机时无法执行，开机后 Windows 会尽快补跑。

## 历史日报存储

日报已经持久化到本地 `data/store.json`，不是浏览器临时数据。每次采集只替换同一天的日报，其他日期继续保留，当前默认保存最近 60 个日报日期。因此第二天仍可在首页日期归档中查看前一天的新闻；请勿删除 `data/store.json`，并建议定期备份 `data` 目录。
