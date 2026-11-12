# 食鉴 · AI 营养分析师

网页开发比赛参赛作品 · 主题：AI 健康与生活服务

纯静态网站（HTML / CSS / 原生 JS，零依赖、零构建），双击 `index.html` 或任意静态服务器即可运行。

## 页面流转

```
登录页 index.html ──登录/注册成功──▶ 主页面 home.html ──功能入口──▶ AI 营养师 nutrition.html
      ▲                                                                     │
      └────────────────────────── 退出登录 ◀───────────────────────────────┘
```

- 未登录访问 `home.html` / `nutrition.html` 会自动跳回登录页（`Auth.requireLogin()`）
- 已登录再打开登录页会直接进主页面（`Auth.redirectIfLoggedIn()`）
- 演示账号：**test / 123456**，也可在登录页自行注册（账号存 localStorage，密码做 djb2 散列，仅演示用）

## 功能一览

| 模块 | 说明 |
|---|---|
| 登录 / 注册 | 左右分栏登录页，表单校验、错误提示、登录态保持与退出 |
| 主页面 | 按时段问候、今日热量/三大营养素概览、四张功能入口卡片 |
| AI 食物分析 | 图片上传（拖拽 / 粘贴 / 点击）+ 文字描述双输入，输出健康评分环、卡路里、三大营养素条形图、食物清单、AI 点评 |
| AI 营养师对话 | 结合「今日已摄入」上下文的一对一聊天 |
| 今日摄入追踪 | localStorage 本地记录，每日目标可调，超标变红，数据不出浏览器 |
| 其他 | 快捷示例、加载动画、无障碍（键盘可操作拖拽区）、移动端响应式、免责声明 |

## 如何接入真实 AI（重要）

已默认接好 **DeepSeek**，**Key 已内置，打开即用，不需要任何配置**。

### 当前实际配置（已填好）

```js
const AI_CONFIG = {
  useMock: false,
  baseURL: "https://api.deepseek.com/v1",   // DeepSeek
  apiKey:  "sk-2b12…",                       // 已内置
  model:   "deepseek-flash",                 // 支持 text + image，一个模型通吃
  maxTokens: 3000,
  reasoningEffort: "low",
  vision: { enabled: true, model: "deepseek-flash" },   // 图片识别复用同一个 Key
};
```

> ✅ **实测结论（2026-11-11）**：该账号的 `deepseek-flash`（DeepSeek-V4.1-Flash）是多模态模型，
> 输入支持 `["text","image"]`，**拍照识别和文字分析共用一个 Key**，不需要再配智谱。
> 该账号可用模型只有两个：`deepseek-flash`（图文）和 `deepseek-v4-pro`（纯文本）。

> ⚠️ **踩坑提醒**：`deepseek-flash` 是推理模型，会先输出一大段 `reasoning_content` 思维链，
> 这部分**也消耗 max_tokens**。max_tokens 设小了（实测 200）正文 `content` 会直接是空字符串。
> 代码里已把 `maxTokens` 设为 3000，并加了「正文为空则翻倍预算自动重试一次」的保护。

想换成自己的 Key，有两种方式：

**方式 A（推荐，现场演示也方便）**：打开「AI 营养师」页 → 右上角 `⚙️` → 粘贴 DeepSeek Key → 保存并生效。
Key 存本机 localStorage（`shijian_ai_config`），优先级高于代码里的默认值，随时可在弹窗里清除。

**方式 B（写进代码）**：编辑 `js/ai-api.js` 的 `AI_CONFIG.apiKey`。

### 各家服务对照表

| 服务 | baseURL | 支持图片的模型 |
|---|---|---|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-flash`（本项目在用，支持图文） |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4v-flash`（免费） |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` / `gpt-4o-mini` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-vl-plus` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k-vision-preview` |

### 工作原理

- 请求格式是 **OpenAI 兼容的 `/chat/completions`**，服务端无需任何改动
- `analyzeFood()` 通过 system 提示词强制 AI 返回固定 JSON（评分 / 热量 / 蛋白 / 碳水 / 脂肪 / 纤维 / 食物列表 / 点评），前端做了字段兜底校验
- 图片分析自动切到 `vision` 配置；文字分析与 `chat()` 走 `AI_CONFIG` 主配置
- `chat()` 会自动注入「今日摄入 + 目标热量」作为 system 上下文，AI 的回答因此能贴合用户实际饮食情况
- 没填 Key 时自动降级为演示数据（报告右上角会显示「演示数据」角标），保证演示不会白屏

### 安全提示

apiKey 写在前端只适合比赛与本地演示。正式上线请自建后端中转（把 `baseURL` 指向自己的服务器，密钥放服务端环境变量），避免密钥泄露被盗刷。

## 文件结构

```
webapp/
├── index.html        登录 / 注册页（网站入口）
├── home.html         主页面（问候 + 今日概览 + 功能导航）
├── nutrition.html    AI 营养师分页（分析 / 对话 / 追踪 / FAQ）
├── css/style.css     全部样式（绿色健康主题，CSS 变量集中在 :root 方便换肤）
├── image/            实拍素材（Hero、场景卡片、登录背景）
└── js/
    ├── ai-api.js     ⭐ AI 接口适配器（接入只需改这个文件）
    ├── app.js        营养师页交互（上传 / 渲染 / 聊天 / localStorage 追踪）
    ├── auth.js       登录态管理（注册 / 登录 / 守卫 / 退出）
    ├── login.js      登录页表单交互
    └── home.js       主页面问候与今日概览
```

## 免责声明

所有营养数据均为 AI 估算，仅供参考，不构成医学建议。
