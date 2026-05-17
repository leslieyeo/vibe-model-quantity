# vibeModelQuantity

> 本地、单人、跨多个 AI 编程客户端的 token 用量 dashboard。
> 编辑设计 × 终端美学,数学手算验证,明确标注"按官方 API 计价"。
>
> Local, single-user, multi-client AI coding token dashboard. Editorial × terminal aesthetic, hand-verified math, explicit retail-API-rate disclosure.

---

## 它做什么 / What it does

读你硬盘上各个 AI 编程客户端留下的对话日志,按 **会话 / 模型 / 项目 / 天** 维度聚合 token 用量和成本,展示在 localhost 浏览器里。**全程本地**——不上云、不登录、不上传。

Reads conversation logs left on disk by AI coding clients, aggregates token usage and cost by **session / model / project / day**, and shows it in your browser at `localhost`. **Everything stays local** — no cloud, no login, no upload.

支持回答这些问题:

- 我今天/这周/这个月 token 烧了多少?(零售 API 等价金额)
- Opus 4.7、GPT-5、Qwen 各占多少比例?
- 哪个 repo / cwd 最费 token?
- 缓存命中率多高?省了多少?
- 月底按当前速度会冲到多少?
- 上个月哪几个 session 最贵?

---

## 产品功能 / Features

### 6 个视图

| 视图 | 内容 |
|---|---|
| **Overview** 概览 | 大字号 H1 + 5 个 KPI(SPEND / TOKENS / SESSIONS / CACHE HIT / TOP MODEL)+ 客户端每日花费 stacked bar + Top 模型表(带 sparkline)+ Token 构成 donut + 最近会话 + 24×7 hour heatmap |
| **Models** 模型 | 花费 treemap + 全模型表(input / cache_read / output / reasoning 拆分、cache %、$/1M 报价、sparkline trend) |
| **Clients** 客户端 | 每个 CLI 一张卡片(花费 + token + 14 天 micro-bar + top model)+ 跨客户端 LineChart |
| **Projects** 项目 | 按 cwd / repo 聚合的排行表(sparkline + share %) |
| **Sessions** 会话 | 全部会话流,带 client + project 筛选;点开右侧 drawer 看 receipt(token 分桶柱状 + 定价细节) |
| **Budget** 预算 | 月度预算条 + 累计 vs on-pace 双线 + projection(月底 / 季度 / 全年估算) |

### 5 个客户端的真实数据接入

| Client | 数据源 | 状态 |
|---|---|---|
| **Claude Code** | `~/.claude/projects/*/<session>.jsonl` | ✅ 真解析,**按本地日历日切分**(跨天对话不会全归首日) |
| **Codex CLI** | `~/.codex/sessions/<Y>/<M>/<D>/rollout-*.jsonl` + `archived_sessions/` | ✅ 真解析,**已修 cache 双算 bug** |
| **Hermes** | `~/.vibeusage/tracker/hermes.usage.jsonl` | ✅ 真解析(需装 vibeusage Hermes plugin),provider-aware 区分 Anthropic / OpenAI 风格 |
| **Gemini CLI** | n/a | Stub — Gemini CLI 不把 token 写到磁盘 |
| **OpenClaw** | n/a | 仅安装检测 stub |

### 设计

- **3 套主题**:paper(Hermès 米色)、ink(暗色)、terminal(CRT 琥珀绿)
- **4 个 accent 色**:orange / ink / moss / crimson
- **3 档密度**:comfy / tight / dense
- **字体**:Instrument Serif(标题)+ Geist(UI)+ Geist Mono(数据)
- **配色**:灰阶为主,一抹 burnt orange,无紫色渐变 / 卡通插画 / emoji 装饰

### i18n + 个性化

- **EN / 中文** 双语,localStorage 记忆选择
- 软文案翻译(标题、描述、菜单),mono UI 标签保持英文(终端美学)
- 主题 / accent / 密度 / 月度预算 / 区间 / 语言 全部 localStorage 持久化

### 透明性

- **所有 $ 显式标注「按官方 API 计价」**:Overview / Budget H1 下方橙色描边方框,KPI / 头部 stat 后缀 `· API`
- 内嵌**「钱是怎么算的」**说明框:明确写"如果你订了 Claude Max / ChatGPT Pro,这数字跟你账单无关"
- 报价表写在 [src/lib/parsers/pricing.ts](src/lib/parsers/pricing.ts),按 Anthropic / OpenAI / Google 公开档位

---

## 优势 / Why this over alternatives

### vs [vibeusage](https://github.com/victorGPT/vibeusage)

| | vibeusage | 我们 |
|---|---|---|
| Token 数 | ✅ 同源 | ✅ 同源 |
| **Codex cache 双算** | ⚠ 可能(后端黑盒) | ✅ 已修(v0.1.1.0) |
| **Claude cache write 25% 升价** | ⚠ schema 没 `cache_creation` 字段 | ✅ 4 桶分开,upcharge 算对 |
| **价格表来源** | OpenRouter live | Anthropic / OpenAI 官方公开价 |
| **$ 含义透明** | 单一数字,缺标注 | 明确「按官方 API 计价」+ 长说明框 |
| **按 project / cwd 聚合** | ❌ 没这维度 | ✅ |
| **可视化深度** | 月度趋势 + KPI | treemap + heatmap + receipt drawer + sparkline |
| 客户端覆盖度 | 7 个 | 3 个真 + 2 个 stub |

### vs [CodexBar](https://github.com/steipete/CodexBar)

| | CodexBar | 我们 |
|---|---|---|
| **形态** | macOS 菜单栏原生 app | localhost Web dashboard |
| **侧重** | 实时配额 + reset 倒计时(*"我现在能不能烧"*) | 回顾性深度分析(*"钱花在了哪"*) |
| 客户端覆盖度 | **29+** 个 provider(Cursor / Copilot / Augment / Manus / ...) | 3 真 + 2 stub |
| **Project 维度** | ❌ | ✅ |
| **历史可视化** | 菜单栏小组件,空间有限 | 全屏 dashboard + 6 视图 + 编辑设计感 |
| Cache 数学验证 | 后端黑盒 | 手算逐项验证($0.8908 = $0.8908 ✅) |
| 安装 | `brew install --cask steipete/tap/codexbar` | `git clone + npm run dev` |

**简言之**:CodexBar 是**广告牌**(挂菜单栏一眼扫,29 个 provider),我们是**账本**(全屏深度回顾,3 个 provider 拆到 session)。两个不冲突可以并存——一个挂菜单栏看实时,一个开浏览器看月度复盘。

---

## 怎么用 / How to use

### 安装 / Install

```bash
git clone https://github.com/leslieyeo/vibe-model-quantity.git
cd vibe-model-quantity
npm install
```

### 启动 / Run

```bash
npm run dev
# 默认 http://localhost:3000(被占用时自动 :3001)
```

首次加载需 ~1.3s,会扫 `~/.claude/projects`、`~/.codex/sessions`、`~/.vibeusage/tracker` 三个目录。每次刷新都会重新解析(无缓存,v1.1 todo)。

### 使用界面

- **顶部范围 tabs**:Today / 7 days / MTD / 30 days / 60 days
- **左侧 nav**:6 视图切换
- **右下「Tweaks」浮窗**:主题 / accent / 密度 / 语言 / 月度预算
- **点击会话行**:右侧滑出 drawer,看 receipt + token 拆分

### 终端对账(不用打开浏览器看数据)

```bash
# 查 API
curl -s http://localhost:3001/api/sessions | jq '.diagnostics'

# 跟 vibeusage 本地数据对账(已在 /tmp/vmq-cmp.sh)
bash /tmp/vmq-cmp.sh 2026-05-17
```

### 想看真实订阅成本

**Dashboard 上的 $ 是按官方 API 价折算的"等价金额",不是你订阅账单。**

如果你订了 Claude Max($200/月)或 ChatGPT Pro:
- 实际你扣 ~$6.7/天(月费 ÷ 30)
- Dashboard 上的 $X/day 是「如果走 API 你会付多少」,把它当作**「你从套餐里榨出多少价值」**而不是「你花了多少」

如果你用 API key 直接调:
- Dashboard 上的 $ ≈ 你的实际账单(误差只来自价格表更新滞后)

---

## 技术栈 / Stack

- **Next.js 16**(App Router + Turbopack)
- **React 19**
- **TypeScript** + `tsc --noEmit` 通过 + ESLint 通过
- **Tailwind 4**(用 `@theme` CSS-based config)
- **next-intl 4**(en / zh,无 URL routing)
- **图表**:raw SVG(自写 Sparkline / StackedBarChart / LineChart / HourHeatmap / Treemap-squarified / Donut),零图表库依赖
- **字体**:`next/font/google` 加载 Instrument Serif + Geist + Geist Mono
- **数据存储**:运行时全在内存,API 路由每次重新解析磁盘

---

## 已知限制 / Known limitations

- **无缓存**:每次 `/api/sessions` 请求都重新扫所有 `.jsonl`(166 sessions 约 1.3s)。v1.1 加 mtime cache。
- **无 mobile 适配**:< 900px 视口排版会错乱。桌面工具优先,移动是 v2 feature(见 [TODOS.md](TODOS.md))。
- **无自动化测试**:v1 opt-out 了(`.gstack/no-test-bootstrap`),靠手工 QA + 数学手算验证。v1.x 会补 vitest。
- **Gemini CLI / OpenClaw** 无 token 数据接入(数据源不存在或机器未装)。
- **大文件保护**:Claude `.jsonl` > 100MB / Codex > 150MB 自动跳过(防 OOM)。
- **NOW Proxy 模式**:`getNow()` 每次属性访问重新求值,理论上有 React render 一致性风险——实际测试无问题,但未来移到 useState 更稳。

完整列表见 [TODOS.md](TODOS.md)。

---

## 路线图 / Roadmap

### v1.x(近期)

- API 缓存(mtime 增量解析,1.3s → < 50ms)
- 非空断言加固(多个 `Array.find(...)!` 改 safe fallback)
- JSONL 流式读取(stream + readline,而非 readFile 整体进内存)
- 加更多客户端 parser:Cursor / Aider / Continue / Cline / Windsurf / Copilot
- 移动端响应式
- Live wall-clock + 真 file watcher(让 "Tailing logs" 不再是装饰)

### v2(远期)

- **订阅成本模式**:加 toggle,把 $ 按订阅月费摊销显示
- **排行榜**(代码已 scaffold 在 `src/lib/leaderboard.ts`,目前 hidden):跨用户对比,需要后端 + auth
- **菜单栏 widget**(可选,Tauri 路线)
- **真 transcript 写入 drawer**(目前是 placeholder)

---

## 版本 / Status

当前:**v0.1.4.0**。详见 [CHANGELOG.md](CHANGELOG.md)。

---

## License

[MIT](LICENSE) — fork it, ship it, change it. Just keep the copyright notice.

如果对你有用,star 一下让作者知道。Issue / PR 都欢迎。
