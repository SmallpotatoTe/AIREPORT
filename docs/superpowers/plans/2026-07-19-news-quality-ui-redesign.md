# AI 日报新闻质量与界面重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建真实正文驱动、可过滤评分、由 DeepSeek 结构化整理的 AI 日报，并把前端重做为简洁的新闻与 RAG 工作台。

**Architecture:** 使用可配置的信源适配器发现候选链接，统一正文提取器读取详情页，确定性质量管线完成过滤、去重和评分，再由 DeepSeek 输出中英双语结构化结果。Next.js API 只返回 JSON 和分信源状态，React 页面按日期加载持久化日报并通过弹窗阅读详情。

**Tech Stack:** Next.js 14、React 18、TypeScript、Node.js test runner、Cheerio、OpenAI-compatible DeepSeek API、本地 JSON 持久化。

---

### Task 1: 新闻质量模型与测试
- [ ] 为正文长度、垃圾模式、AI 相关性、评分和去重写失败测试。
- [ ] 新增双语字段、分类、质量分、信源级别与采集状态类型。
- [ ] 实现纯函数质量模块并运行定向测试。

### Task 2: 信源适配与正文提取
- [ ] 为 RSS、JSON-LD、`article` 与链接发现写失败测试。
- [ ] 配置官方信源、专业媒体与线索信源的权重、语言和配额。
- [ ] 使用 Cheerio 实现候选发现、详情正文和发布时间提取。

### Task 3: 采集与 DeepSeek 整理
- [ ] 测试失败信源不生成兜底、短正文过滤、去重与上限。
- [ ] 重构为“发现 → 详情 → 过滤评分 → DeepSeek → 配额排序”。
- [ ] DeepSeek 使用严格 JSON，失败条目跳过并记录状态。
- [ ] 采集 API 始终返回 JSON。

### Task 4: 持久化与 RAG 兼容
- [ ] 测试旧日报迁移、双语详情和 RAG 中文内容。
- [ ] 读取旧数据时补齐字段并使用原子写入。
- [ ] 详情 API 返回中英文摘要，RAG 文档包含来源信息。

### Task 5: 行为优先日报界面
- [ ] 删除长篇说明、重复统计和底部展开详情。
- [ ] 实现顶栏操作、日期导航、新闻卡片、RAG 侧栏和弹窗。
- [ ] 默认显示中文，原文模式使用真实原文标题与摘要。
- [ ] 完成响应式、加载态、空状态和错误状态。

### Task 6: 端到端验证
- [ ] 运行 `npm test` 和 `npm run build`。
- [ ] 使用代理端口 19145 执行真实采集。
- [ ] 使用 `start.bat` 启动并验证页面与 API。
- [ ] 更新 README。
