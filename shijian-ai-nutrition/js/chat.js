/* ============================================================
 * 营养师对话页（chat.html）
 * 由原 nutrition.html 对话区拆分而来，逻辑不变：
 *  - 对话上下文会带上今天已摄入的情况（MySQL /api/intake）
 * ============================================================ */
(async () => {
  await Auth.requireLogin();

  const $ = (id) => document.getElementById(id);
  const chatMessages = $("chat-messages");
  const chatHistory = []; // {role, content}

  /* ---------- 今日摄入缓存（给 AI 的上下文用） ---------- */
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  async function loadTodayLog() {
    const log = { meals: [], calories: 0, protein: 0, carb: 0, fat: 0 };
    try {
      const data = await apiFetch("/api/intake?date=" + todayKey());
      for (const m of data.meals) {
        log.calories += Number(m.calories); log.protein += Number(m.protein);
        log.carb += Number(m.carb); log.fat += Number(m.fat);
      }
    } catch { /* 后端没起来时保持 0 值 */ }
    return log;
  }

  function getGoal() {
    return Math.max(800, Math.min(6000, Number(Auth.user && Auth.user.goal) || 2000));
  }

  /** 把今日摄入情况整理成给 AI 的上下文 */
  function buildTodayContext(log) {
    if (!log.meals.length) return "";
    return "已摄入 " + log.calories + " kcal，蛋白质 " + log.protein +
      "g，碳水 " + log.carb + "g，脂肪 " + log.fat + "g；用户目标 " + getGoal() + " kcal/天。";
  }

  /* ---------- 对话 ---------- */
  function sendChat(todayLog) {
    const input = $("chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    appendMsg("user", text);
    chatHistory.push({ role: "user", content: text });

    // 打字中占位
    const typing = appendMsg("ai", "正在思考…");
    typing.classList.add("typing");

    // 注入当前摄入上下文，让 AI 知道用户今天吃了多少
    const context = buildTodayContext(todayLog);
    const historyWithContext = context
      ? [{ role: "system", content: "用户今日摄入参考信息：" + context }, ...chatHistory]
      : [...chatHistory];

    chat(historyWithContext)
      .then((reply) => {
        typing.remove();
        appendMsg("ai", reply);
        chatHistory.push({ role: "assistant", content: reply });
      })
      .catch((err) => {
        typing.remove();
        appendMsg("ai", "出了点小问题：" + err.message);
      });
  }

  function appendMsg(role, content) {
    const div = document.createElement("div");
    div.className = "msg msg-" + role;
    div.textContent = content;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  /* ---------- 事件绑定 ---------- */
  $("chat-send").addEventListener("click", () => sendChat(window.__todayLog));
  $("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat(window.__todayLog);
  });

  // 快捷话术：点一下直接发送
  document.querySelectorAll(".chat-quick").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("chat-input").value = btn.dataset.q;
      sendChat(window.__todayLog);
    });
  });

  /* ---------- 初始化 ---------- */
  window.__todayLog = await loadTodayLog();
  window.addEventListener("pageshow", async () => { window.__todayLog = await loadTodayLog(); });
})();
