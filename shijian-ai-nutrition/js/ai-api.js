/* ============================================================
 * AI 接口适配器
 * ============================================================
 * 【安全架构】API Key 保存在服务器端环境变量（server/.env 的 AI_API_KEY），
 *   前端代码和浏览器里不存在任何密钥。
 *   前端只做一件事：把对话内容 POST 给后端 /api/ai/chat，
 *   由后端携带 Key 调用 DeepSeek 并把结果转发回来。
 *
 * 【当前配置：DeepSeek】文本分析 + 营养师对话 + 图片识别 → 全部走
 *   deepseek-flash 一个模型（支持 ["text","image"] 多模态输入）。
 *   换模型 / 换 Key：只改服务器上的 server/.env，前端无需动任何代码。
 * ============================================================ */

/* 与 auth.js 的 API_BASE 保持一致逻辑（独立命名避免全局冲突）：
   页面不是从后端 (:3000) 打开时，改发 localhost:3000 */
const AI_API_BASE =
  location.host && location.host !== "localhost:3000" && location.host !== "127.0.0.1:3000"
    ? "http://localhost:3000"
    : "";

const AI_CONFIG = {
  // 请求超时（毫秒）。推理模型 + 图片较慢，给 90 秒
  timeout: 90000,
};

/* 服务器是否配置了真实 AI（探测一次后缓存；未配置 → 自动降级演示数据） */
let _aiEnabled = null;
async function aiEnabled() {
  if (_aiEnabled !== null) return _aiEnabled;
  try {
    const resp = await fetch(AI_API_BASE + "/api/ai/status");
    const json = await resp.json();
    _aiEnabled = !!json.enabled;
  } catch {
    _aiEnabled = false; // 后端都没启动，直接走演示数据
  }
  return _aiEnabled;
}

/* ------------------------------------------------------------
 * 分析报告的统一数据格式
 * {
 *   score:number  calories:number  protein:number
 *   carb:number   fat:number       fiber:number
 *   foods:[{ name, note }]
 *   comment:string
 * }
 * ---------------------------------------------------------- */

const ANALYZE_SYSTEM_PROMPT =
  "你是一位专业的营养分析师。请分析用户提供的餐食（图片或文字描述），" +
  "识别其中所有食物并估算营养。你必须且只能返回一个 JSON 对象，不要输出任何其他文字，" +
  "格式为：{\"score\":0-100的整数健康评分,\"calories\":总热量kcal,\"protein\":蛋白质克数," +
  "\"carb\":碳水克数,\"fat\":脂肪克数,\"fiber\":膳食纤维克数," +
  "\"foods\":[{\"name\":\"食物名\",\"note\":\"份量或备注\"}]," +
  "\"comment\":\"50-120字的通俗点评与改进建议，语气友好\"}。" +
  "评分标准：营养均衡、低油低糖高纤维为高分；高油高糖低纤维为低分。";

const CHAT_SYSTEM_PROMPT =
  "你是「食鉴」App 的 AI 营养师，语气亲切、专业、简洁，用中文回答。" +
  "回答控制在 200 字以内，给出可执行的建议。涉及疾病时提醒用户咨询专业医生。";

/**
 * 分析一餐
 * @param {{image?: string, text?: string}} input
 * @returns {Promise<object>} 分析报告
 */
async function analyzeFood(input) {
  if (!(await aiEnabled())) return { ...mockAnalyze(input), demo: true };

  // 图片输入走多模态 content 数组，deepseek-flash 自带视觉能力
  const content = [];
  if (input.image) content.push({ type: "image_url", image_url: { url: input.image } });
  content.push({ type: "text", text: input.text || "请分析这张照片里的食物营养。" });

  const resp = await callChatAPI([
    { role: "system", content: ANALYZE_SYSTEM_PROMPT },
    { role: "user", content: content },
  ], true);

  if (resp.__demo) return { ...mockAnalyze(input), demo: true };

  // callChatAPI 返回的是整个 API 响应，这里要取出 message.content 再解析成对象
  const msg = (resp.choices && resp.choices[0] && resp.choices[0].message) || {};
  const data = parseJsonLoose(msg.content);

  return {
    score:    Number(data.score)    || 0,
    calories: Number(data.calories) || 0,
    protein:  Number(data.protein)  || 0,
    carb:     Number(data.carb)     || 0,
    fat:      Number(data.fat)      || 0,
    fiber:    Number(data.fiber)    || 0,
    foods:    Array.isArray(data.foods) ? data.foods : [],
    comment:  String(data.comment || ""),
  };
}

/**
 * 宽松解析模型返回的 JSON：
 * 兼容 ```json 代码块、前后多余文字、中文全角引号等常见跑偏情况
 */
function parseJsonLoose(text) {
  let s = String(text || "").trim();
  if (!s) return {};
  // 去掉 ```json ... ``` 包裹
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // 截取第一个 { 到最后一个 }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    return JSON.parse(s);
  } catch {
    // 兜底：中文引号 / 尾逗号
    try {
      return JSON.parse(
        s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, "$1")
      );
    } catch {
      throw new Error("AI 返回的内容不是合法 JSON，请重试一次");
    }
  }
}

/**
 * AI 营养师对话
 * @param {{role:"user"|"assistant"|"system", content:string}[]} history
 * @returns {Promise<string>}
 */
async function chat(history) {
  if (!(await aiEnabled())) return mockChat(history);

  const messages = [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...history];
  const data = await callChatAPI(messages, false);
  if (data.__demo) return mockChat(history);
  return data.choices[0].message.content;
}

/**
 * 底层请求：POST 后端中转 /api/ai/chat（Key 在服务器端，前端零接触）
 * 空正文重试（翻倍 max_tokens）逻辑在后端完成，前端只发一次
 * @param {Array} messages OpenAI 兼容消息数组（含图片 content）
 * @param {boolean} wantJson 是否要求 JSON 输出
 */
async function callChatAPI(messages, wantJson) {
  const token = localStorage.getItem("shijian_token");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

  try {
    const resp = await fetch(AI_API_BASE + "/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify({ messages, wantJson }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const json = await resp.json().catch(() => ({}));
      // 503 = 服务器没配 AI Key → 回落到演示模式
      if (resp.status === 503) return { __demo: true };
      throw new Error(json.msg || "AI 服务出错（" + resp.status + "）");
    }

    return await resp.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("请求超时了，网络或模型响应太慢，稍后再试");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================
 * Mock 演示数据（服务器未配置 AI_API_KEY 或后端未启动时使用，无需联网）
 * ============================================================ */

const MOCK_DB = [
  {
    keys: ["奶茶", "珍珠"],
    report: {
      score: 28, calories: 480, protein: 6, carb: 82, fat: 14, fiber: 1,
      foods: [{ name: "珍珠奶茶（大杯全糖）", note: "约 650ml" }],
      comment: "这杯奶茶糖分和精制碳水都偏高，一杯就占了全天推荐添加糖的 2 倍多 😅 建议改成三分糖、去奶盖，或换无糖茶底加少量鲜奶。解馋可以，别当日常饮料哦。",
    },
  },
  {
    keys: ["番茄", "炒蛋", "盖饭"],
    report: {
      score: 74, calories: 620, protein: 18, carb: 88, fat: 20, fiber: 4,
      foods: [
        { name: "米饭", note: "约 200g" },
        { name: "番茄炒蛋", note: "2 个蛋 + 1 个番茄，用油约 15g" },
      ],
      comment: "整体不错！番茄炒蛋提供优质蛋白和番茄红素，但米饭略多、用油也偏高。建议米饭减到 150g、炒菜少放 5g 油，再加一份焯水的绿叶菜会更均衡。",
    },
  },
  {
    keys: ["韭菜", "盒子"],
    report: {
      score: 52, calories: 560, protein: 14, carb: 62, fat: 28, fiber: 5,
      foods: [{ name: "韭菜盒子", note: "2 个，煎制" }],
      comment: "韭菜盒子纤维不错，但煎制的皮吸油较多，脂肪占比偏高。搭配一碗小米粥或凉拌黄瓜，既解腻又能补足这一餐的水溶性纤维。",
    },
  },
  {
    keys: ["牛肉面", "卤蛋", "青菜"],
    report: {
      score: 68, calories: 720, protein: 32, carb: 96, fat: 22, fiber: 6,
      foods: [
        { name: "牛肉面", note: "面条约 300g，牛肉约 60g" },
        { name: "卤蛋", note: "1 个" },
        { name: "小青菜", note: "约 80g" },
        { name: "豆浆", note: "半杯约 120ml" },
      ],
      comment: "这餐蛋白质给得很到位，牛肉 + 卤蛋 + 豆浆组合不错 👍 但一碗面的碳水接近 100g，汤底的钠也偏高——面汤少喝两口，青菜可以再加量。",
    },
  },
  {
    keys: ["鸡胸肉", "沙拉", "健身"],
    report: {
      score: 92, calories: 420, protein: 42, carb: 28, fat: 12, fiber: 8,
      foods: [
        { name: "煎鸡胸肉", note: "约 150g" },
        { name: "混合蔬菜沙拉", note: "生菜、番茄、黄瓜等" },
        { name: "橄榄油油醋汁", note: "约 10ml" },
      ],
      comment: "教科书级别的一餐！高蛋白、适量碳水、好油脂、纤维充足 💪 如果今晚有力量训练，可以在训练前 1 小时加半根香蕉补充快碳。",
    },
  },
];

const MOCK_FALLBACK = {
  score: 60, calories: 500, protein: 18, carb: 60, fat: 18, fiber: 4,
  foods: [{ name: "识别的混合餐食", note: "演示数据" }],
  comment: "（当前为演示模式）服务器尚未配置 AI Key：管理员在 server/.env 里填写 AI_API_KEY 后，这里会显示针对你这一餐的真实 AI 点评。",
};

function mockAnalyze(input) {
  const text = (input.text || "") + "（图片模式演示）";
  const hit = MOCK_DB.find((item) => item.keys.some((k) => text.includes(k)));
  return new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(hit ? hit.report : MOCK_FALLBACK)), 1200)
  );
}

function mockChat(history) {
  const last = (history[history.length - 1] || {}).content || "";
  let reply;
  if (last.includes("预算") || last.includes("剩") || last.includes("热量")) {
    reply = "以演示数据估算：你今天已记录约 0 kcal，还剩约 2000 kcal 预算 🍚\n建议晚餐分配：主食 1 拳（杂粮饭更佳）+ 蛋白质 1 掌（鱼/虾/鸡胸）+ 蔬菜 2 拳，这样到睡前既饱又不超标。";
  } else if (last.includes("减肥") || last.includes("瘦")) {
    reply = "减脂的核心是热量缺口 + 足够蛋白质保住肌肉 💪\n建议：每日缺口 300-500 kcal，蛋白质按体重 × 1.2-1.5g 摄入，主食换成杂粮，先吃菜再吃肉最后吃主食，饱腹感会好很多。";
  } else if (last.includes("健身") || last.includes("训练")) {
    reply = "训练前 1-1.5 小时：快碳 + 少量蛋白（香蕉、面包）；\n训练后 30-60 分钟内：蛋白质 20-30g + 适量碳水（鸡胸肉饭、蛋 + 牛奶）帮助恢复。训练日总热量可以比休息日多 200-300 kcal。";
  } else {
    reply = "这个问题我可以从营养角度聊聊（当前为演示模式）～\n服务器在 server/.env 里配置 AI_API_KEY 后，我会结合你的真实饮食记录给出个性化建议。你可以先试试问我：「今天还剩多少热量预算？」";
  }
  return new Promise((resolve) => setTimeout(() => resolve(reply), 800));
}
