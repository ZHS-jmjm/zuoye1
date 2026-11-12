/* ============================================================
 * 食鉴 · AI 营养分析师 —— 后端服务（Express + MySQL）
 *
 * 启动：在 server 目录下执行  npm start   （或双击项目根目录的 启动.bat）
 * 访问：http://localhost:3000
 *
 * 职责：
 *   1. 托管整个前端静态网站（index/home/nutrition 三个页面）
 *   2. 提供 REST API：注册 / 登录 / 会话、今日摄入记录、每日目标、
 *      AI 分析历史 —— 数据全部落到 MySQL（shijian_nutrition 库）
 * ============================================================ */

const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

/* ---------- 读取同目录 .env 环境变量（零依赖实现，真实环境变量优先）
 * 必须在 require("./db") 之前执行，保证数据库/AI 配置都能读到 ---------- */
(function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
})();

const { pool, initDatabase, hashPassword, verifyPassword } = require("./db");

const PORT = 3000;
const SESSION_DAYS = 7;

const app = express();
app.use(express.json({ limit: "1mb" }));

/* ---------- CORS：允许页面从其他来源调用本后端 ----------
 * 页面可能不是由本后端托管的，比如 IntelliJ 内置预览（localhost:63342）、
 * 双击 HTML 文件（file://）——放行这些来源，登录和数据接口照常可用 */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ---------- 会话校验中间件：从 Authorization: Bearer <token> 解出当前用户 ---------- */
async function requireUser(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ ok: false, msg: "未登录" });

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.goal FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()`,
    [token]
  );
  if (!rows.length) return res.status(401).json({ ok: false, msg: "登录已过期，请重新登录" });
  req.user = rows[0];
  next();
}

/* ============================================================
 * 认证接口
 * ============================================================ */

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body.username || "").trim();
  const pw = String(req.body.password || "");
  if (name.length < 2) return res.json({ ok: false, msg: "用户名至少 2 个字符" });
  if (name.length > 50) return res.json({ ok: false, msg: "用户名最长 50 个字符" });
  if (pw.length < 6) return res.json({ ok: false, msg: "密码至少 6 位" });

  const [dup] = await pool.query("SELECT id FROM users WHERE username = ?", [name]);
  if (dup.length) return res.json({ ok: false, msg: "这个用户名已经被注册啦，换一个试试" });

  const [r] = await pool.query(
    "INSERT INTO users (username, password_hash, goal) VALUES (?, ?, 2000)",
    [name, hashPassword(pw)]
  );
  return res.json({ ok: true, token: await createSession(r.insertId), user: { username: name, goal: 2000 } });
});

app.post("/api/auth/login", async (req, res) => {
  const name = String(req.body.username || "").trim();
  const pw = String(req.body.password || "");

  const [rows] = await pool.query(
    "SELECT id, username, goal, password_hash FROM users WHERE username = ?",
    [name]
  );
  if (!rows.length) return res.json({ ok: false, msg: "用户名不存在，先注册一个吧" });
  const u = rows[0];
  if (!verifyPassword(pw, u.password_hash)) return res.json({ ok: false, msg: "密码不对，再想想？" });

  return res.json({ ok: true, token: await createSession(u.id), user: { username: u.username, goal: u.goal } });
});

/** 生成会话 token（随机 64 位十六进制）并写入 sessions 表，顺带清理过期会话 */
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))",
    [token, userId, SESSION_DAYS]
  );
  pool.query("DELETE FROM sessions WHERE expires_at <= NOW()").catch(() => {});
  return token;
}

app.post("/api/auth/logout", requireUser, async (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
  res.json({ ok: true });
});

/* 当前登录用户信息（含每日目标），页面加载时用它恢复登录态 */
app.get("/api/auth/me", requireUser, (req, res) => {
  res.json({ ok: true, user: { username: req.user.username, goal: req.user.goal } });
});

/* ---------- 每日热量目标 ---------- */
app.put("/api/goal", requireUser, async (req, res) => {
  const goal = Math.max(800, Math.min(6000, Number(req.body.goal) || 2000));
  await pool.query("UPDATE users SET goal = ? WHERE id = ?", [goal, req.user.id]);
  res.json({ ok: true, goal });
});

/* ============================================================
 * 今日摄入接口（每餐一行，与前端「单餐删除」交互对应）
 * ============================================================ */

/* GET /api/intake?date=2026-11-11 → 该日的所有餐次 */
app.get("/api/intake", requireUser, async (req, res) => {
  const date = normDate(req.query.date);
  const [rows] = await pool.query(
    `SELECT id, name, calories, protein, carb, fat
     FROM intake_meals WHERE user_id = ? AND meal_date = ? ORDER BY id`,
    [req.user.id, date]
  );
  res.json({ ok: true, meals: rows });
});

/* POST /api/intake {date, name, calories, protein, carb, fat} → 新增一餐 */
app.post("/api/intake", requireUser, async (req, res) => {
  const date = normDate(req.body.date);
  const name = String(req.body.name || "一餐").slice(0, 100);
  const num = (v) => Math.max(0, Number(v) || 0);

  const [r] = await pool.query(
    `INSERT INTO intake_meals (user_id, meal_date, name, calories, protein, carb, fat)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, date, name, num(req.body.calories), num(req.body.protein), num(req.body.carb), num(req.body.fat)]
  );
  res.json({
    ok: true,
    meal: { id: r.insertId, name, calories: num(req.body.calories), protein: num(req.body.protein), carb: num(req.body.carb), fat: num(req.body.fat) },
  });
});

/* DELETE /api/intake/:id → 删除单餐 */
app.delete("/api/intake/:id", requireUser, async (req, res) => {
  await pool.query("DELETE FROM intake_meals WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

/* ============================================================
 * AI 分析历史接口（分析成功后前端自动上报一份，方便回看/统计）
 * ============================================================ */

app.post("/api/history", requireUser, async (req, res) => {
  const r = req.body.report || {};
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  await pool.query(
    `INSERT INTO analysis_history
       (user_id, source, food_text, score, calories, protein, carb, fat, fiber, report)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      req.body.source === "image" ? "image" : "text",
      String(req.body.foodText || "").slice(0, 500) || null,
      num(r.score), num(r.calories), num(r.protein), num(r.carb), num(r.fat), num(r.fiber),
      JSON.stringify(r),
    ]
  );
  res.json({ ok: true });
});

app.get("/api/history", requireUser, async (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
  const [rows] = await pool.query(
    `SELECT id, source, food_text, score, calories, protein, carb, fat, fiber, created_at
     FROM analysis_history WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    [req.user.id, limit]
  );
  res.json({ ok: true, items: rows });
});

/* ============================================================
 * AI 接口中转（DeepSeek）—— API Key 只存在于本进程的环境变量里，
 * 前端只把对话内容 POST 到这里，浏览器中不存在任何密钥
 * ============================================================ */

const AI = {
  get key() { return process.env.AI_API_KEY || ""; },
  get baseURL() { return (process.env.AI_BASE_URL || "https://api.deepseek.com/v1").replace(/\/+$/, ""); },
  get model() { return process.env.AI_MODEL || "deepseek-flash"; },
  get maxTokens() { return Number(process.env.AI_MAX_TOKENS) || 3000; },
  get reasoningEffort() { return process.env.AI_REASONING_EFFORT || "low"; },
  get timeout() { return Number(process.env.AI_TIMEOUT) || 90000; },
};

/* GET /api/ai/status → 前端判断服务器是否配置了真实 AI（没配则走演示数据） */
app.get("/api/ai/status", (req, res) => {
  res.json({ ok: true, enabled: !!AI.key });
});

/* POST /api/ai/chat {messages:[...], wantJson?:bool} → 透传 DeepSeek 响应
 * messages 原样转发（OpenAI 兼容格式，含图片 content 数组），服务器不做内容理解 */
app.post("/api/ai/chat", requireUser, async (req, res) => {
  if (!AI.key) return res.status(503).json({ ok: false, msg: "AI 服务未配置：请在 server/.env 里填写 AI_API_KEY" });

  const messages = Array.isArray(req.body.messages) ? req.body.messages : null;
  if (!messages || !messages.length) return res.status(400).json({ ok: false, msg: "缺少 messages 参数" });
  const wantJson = !!req.body.wantJson;

  /* 推理模型偶尔把 max_tokens 预算耗光导致正文为空，空则翻倍预算重试一次 */
  for (let attempt = 0; attempt < 2; attempt++) {
    const body = {
      model: AI.model,
      messages,
      temperature: wantJson ? 0.3 : 0.6,
      max_tokens: AI.maxTokens * (attempt + 1),
      reasoning_effort: AI.reasoningEffort,
    };
    if (wantJson) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI.timeout);
    try {
      const resp = await fetch(AI.baseURL + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + AI.key },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("[AI 上游错误]", resp.status, errText.slice(0, 200));
        /* 只回状态码与简短提示，不透传上游原始报错（避免泄露账户信息） */
        const map = {
          401: "AI Key 无效或已失效，请联系管理员检查 server/.env",
          402: "AI 账户余额不足，请联系管理员充值",
          429: "AI 请求太频繁，请等几秒再试",
        };
        return res.status(502).json({
          ok: false,
          msg: "AI 接口返回 " + resp.status + (map[resp.status] ? "：" + map[resp.status] : ""),
        });
      }

      const json = await resp.json();
      const msg = json.choices && json.choices[0] && json.choices[0].message;
      if (msg && !String(msg.content || "").trim()) {
        if (attempt === 0) continue;
        return res.status(502).json({ ok: false, msg: "AI 只输出了思考过程没有答案，请换一种描述方式再试" });
      }
      return res.json(json);
    } catch (e) {
      if (e.name === "AbortError") {
        return res.status(504).json({ ok: false, msg: "AI 响应超时，网络或模型响应太慢，稍后再试" });
      }
      console.error("[AI 调用异常]", e.message);
      return res.status(502).json({ ok: false, msg: "AI 服务暂时不可用：" + e.message });
    } finally {
      clearTimeout(timer);
    }
  }
});

/* ---------- 工具：把任意日期输入规范成 YYYY-MM-DD ---------- */
function normDate(v) {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10);
}

/* ============================================================
 * 静态托管前端（server/ 的上一级就是网站根目录）
 * ============================================================ */
const ROOT = path.join(__dirname, "..");
app.use(express.static(ROOT));

/* 统一错误处理：数据库挂了等异常返回 500 JSON，前端能弹友好提示 */
app.use((err, req, res, next) => {
  console.error("[服务异常]", err.message);
  res.status(500).json({ ok: false, msg: "服务器出错了：" + err.message });
});

/* ============================================================
 * 启动：先自动建库建表，再监听端口
 * ============================================================ */
(async () => {
  try {
    await initDatabase();
    console.log("数据库 shijian_nutrition 就绪（表结构与演示账号已确认）");
  } catch (e) {
    console.error("数据库初始化失败：" + e.message);
    console.error("请检查 server/db.js 里的 MySQL 连接信息（host / 密码），以及 MySQL80 服务是否在运行。");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log("");
    console.log("  食鉴 · AI 营养分析师 后端已启动");
    console.log("  ➜  请用浏览器打开  http://localhost:" + PORT);
    console.log("  ➜  演示账号        test / 123456");
    console.log("");
  });
})();
