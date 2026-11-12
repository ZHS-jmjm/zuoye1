/* ============================================================
 * 今日摄入页（tracker.html）
 * 由原 nutrition.html 追踪区拆分而来，数据存 MySQL：
 *  - 今日热量进度 + 概览四卡（含运动中心同步行）
 *  - 餐食记录列表（可删除单条）
 *  - 营养周报：近 7 天每日摄入柱状图（查数据库，非 mock）
 * ============================================================ */
(async () => {
  await Auth.requireLogin();
  Auth.mountNavUser(document.getElementById("nav-user"));

  const $ = (id) => document.getElementById(id);

  /* ---------- 工具 ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function getGoal() {
    return Math.max(800, Math.min(6000, Number($("goal-input").value) || 2000));
  }

  /* ---------- 今日摄入缓存 ---------- */
  let todayLog = { meals: [], calories: 0, protein: 0, carb: 0, fat: 0 };

  async function loadTodayLog() {
    try {
      const data = await apiFetch("/api/intake?date=" + todayKey());
      todayLog = { meals: data.meals, calories: 0, protein: 0, carb: 0, fat: 0 };
      for (const m of todayLog.meals) {
        todayLog.calories += Number(m.calories); todayLog.protein += Number(m.protein);
        todayLog.carb += Number(m.carb); todayLog.fat += Number(m.fat);
      }
      if (Auth.user) $("goal-input").value = Auth.user.goal;   // 回填每日目标
    } catch (e) {
      if (e.status !== 401) console.warn("加载今日摄入失败：" + e.message);
    }
    renderTracker();
  }

  /* ---------- 每日目标修改 ---------- */
  $("goal-input").addEventListener("change", async () => {
    try {
      const data = await apiFetch("/api/goal", { method: "PUT", body: { goal: getGoal() } });
      if (Auth.user) Auth.user.goal = data.goal;
      renderTracker();
    } catch (e) {
      alert("保存目标失败：" + e.message);
    }
  });

  /* ---------- 渲染：进度条 + 概览四卡 + 餐食列表 ---------- */
  function renderTracker() {
    const log = todayLog;
    const goal = getGoal();
    const pct = Math.min((log.calories / goal) * 100, 100);

    // 进度条（超标变红）
    $("tracker-fill").style.width = pct + "%";
    $("tracker-fill").style.background =
      log.calories > goal ? "linear-gradient(90deg,#ef4444,#f87171)" : "";
    $("tracker-text").textContent =
      "今日已摄入 " + Math.round(log.calories) + " / " + goal + " kcal";

    // 概览四卡
    $("ov-calorie").textContent = Math.round(log.calories);
    $("ov-goal").textContent = goal;
    $("ov-fill").style.width = pct + "%";
    $("ov-fill").style.background =
      log.calories > goal ? "linear-gradient(90deg,#ef4444,#f87171)" : "";
    $("ov-protein").textContent = Math.round(log.protein) + "g";
    $("ov-carb").textContent = Math.round(log.carb) + "g";
    $("ov-fat").textContent = Math.round(log.fat) + "g";

    // 运动中心同步行（localStorage，由 exercise.js 写入）
    const exKey = "shijian_exercise_" + todayKey();
    let ex = null;
    try { ex = JSON.parse(localStorage.getItem(exKey)); } catch { /* 忽略 */ }
    const exEl = $("ov-exercise");
    if (ex && ex.burn > 0) {
      exEl.textContent = "🏃 今日运动消耗 " + Math.round(ex.burn) + " kcal，已计入热量额度";
      exEl.hidden = false;
    } else {
      exEl.hidden = true;
    }

    // 营养素小结 + 餐食列表
    $("tracker-macros").innerHTML =
      "<span>蛋白质 " + Math.round(log.protein) + "g</span>" +
      "<span>碳水 " + Math.round(log.carb) + "g</span>" +
      "<span>脂肪 " + Math.round(log.fat) + "g</span>";

    // 配图：按餐名关键词匹配统一风格的轻食缩略图（在线生成资源）
    const IMG = {
      oats: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20bowl%20of%20oatmeal%20porridge%20with%20banana%20slices%20on%20a%20wooden%20table%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square",
      rice: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20home-style%20bowl%20of%20steamed%20rice%20with%20stir-fried%20green%20vegetables%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square",
      veggie: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20fresh%20green%20salad%20bowl%20with%20cucumber%20and%20lettuce%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square",
      protein: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=steamed%20chicken%20breast%20with%20broccoli%20and%20tofu%20on%20a%20light%20plate%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square",
      fruit: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=green%20apple%2C%20kiwi%20and%20grapes%20on%20a%20mint%20plate%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square"
    };
    function mealThumb(name) {
      const s = String(name || "");
      if (/燕麦|麦片|粥|牛奶|酸奶|豆浆|面包|三明治|坚果/.test(s)) return IMG.oats;
      if (/饭|面|粉|饺|包|馒头|馄|汉堡|披萨|意面|寿司/.test(s)) return IMG.rice;
      if (/鸡|肉|鱼|虾|蟹|蛋|豆腐|牛|排|羊/.test(s)) return IMG.protein;
      if (/果|瓜|莓|橙|柚|桃|葡萄|芒果|菠萝|椰/.test(s)) return IMG.fruit;
      return IMG.veggie;
    }

    $("meal-list").innerHTML = log.meals.length
      ? log.meals.map((m, i) =>
          `<li><span><img class="mini-thumb" src="${mealThumb(m.name)}" alt="">${escapeHtml(m.name)}　<b>${Math.round(m.calories)} kcal</b></span>` +
          `<button class="meal-del" data-i="${i}">删除</button></li>`).join("")
      : '<li class="meal-empty">还没有记录，先去分析一餐吧 👆</li>';

    // 删除单条记录（同步删除 MySQL 里对应那一行）
    document.querySelectorAll(".meal-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = Number(btn.dataset.i);
        const m = todayLog.meals[i];
        if (!m) return;
        try { await apiFetch("/api/intake/" + m.id, { method: "DELETE" }); }
        catch (e) { return alert("删除失败：" + e.message); }
        todayLog.meals.splice(i, 1);
        todayLog.calories -= m.calories; todayLog.protein -= m.protein;
        todayLog.carb -= m.carb; todayLog.fat -= m.fat;
        renderTracker();
      });
    });
  }

  /* ---------- 营养周报：近 7 天每日摄入（查 MySQL） ---------- */
  async function loadWeek() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        key: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
        label: (d.getMonth() + 1) + "/" + d.getDate(),
        today: i === 0,
        kcal: 0,
      });
    }
    await Promise.all(days.map(async (day) => {
      try {
        const data = await apiFetch("/api/intake?date=" + day.key);
        day.kcal = (data.meals || []).reduce((s, m) => s + Number(m.calories), 0);
      } catch { /* 保持 0 */ }
    }));
    renderWeek(days);
  }

  function renderWeek(days) {
    const W = 720, top = 40, bottom = 196, left = 60, step = 100, bw = 44;
    const maxY = Math.max(500, ...days.map((d) => d.kcal));
    const cx = (i) => left + i * step;
    const y = (v) => bottom - (v / maxY) * (bottom - top);

    $("week-chart").innerHTML = days.map((d, i) => {
      const h = Math.max(d.kcal > 0 ? 6 : 2, bottom - y(d.kcal));
      return `
        <rect class="hist-bar" x="${cx(i) - bw / 2}" y="${bottom - h}" width="${bw}" height="${h}" rx="8"
              fill="${d.today ? "#10b981" : "#a7f3d0"}"/>
        <text x="${cx(i)}" y="${bottom - h - 10}" text-anchor="middle" font-size="12.5"
              fill="${d.today ? "#059669" : "#9ca3af"}" font-weight="${d.today ? "700" : "400"}">${Math.round(d.kcal)}</text>
        <text x="${cx(i)}" y="${bottom + 24}" text-anchor="middle" font-size="12.5"
              fill="${d.today ? "#059669" : "#9ca3af"}" font-weight="${d.today ? "700" : "400"}">${d.label}${d.today ? "（今天）" : ""}</text>`;
    }).join("");

    const total = days.reduce((s, d) => s + d.kcal, 0);
    const active = days.filter((d) => d.kcal > 0).length;
    const avg = active ? Math.round(total / active) : 0;
    $("week-summary").textContent =
      `近 7 天有 ${active} 天有记录，日均摄入约 ${avg} kcal，总摄入 ${Math.round(total)} kcal —— 三餐规律就很棒，慢慢来 🌿`;
  }

  /* ---------- 初始化 ---------- */
  await loadTodayLog();
  loadWeek();
  window.addEventListener("pageshow", loadTodayLog);
})();
