/* ============================================================
 * 主页面（home.html）交互：欢迎语 + 今日概览
 * 数据来源：MySQL（后端 /api/intake、/api/auth/me）
 * ============================================================ */

(async () => {
  await Auth.requireLogin();          // 未登录会自动跳回登录页

  const session = Auth.current();
  if (!session) return;
  Auth.mountNavUser(document.getElementById("nav-user"));

  /* ---------- 欢迎语（按时段问候） ---------- */
  const h = new Date().getHours();
  const period = h < 6 ? "夜深了" : h < 11 ? "早上好" : h < 14 ? "中午好"
               : h < 18 ? "下午好" : h < 22 ? "晚上好" : "夜深了";
  document.getElementById("welcome-title").textContent =
    period + "，" + session.name + " 👋";

  /* ---------- 今日概览（与追踪页共用 MySQL 里同一份数据） ---------- */
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function getGoal() {
    const saved = Number(Auth.user && Auth.user.goal) || 2000;
    return Math.max(800, Math.min(6000, saved));
  }

  /* ---------- 区块3：今日餐食记录横向卡片 ---------- */
  const MEAL_ICONS = ["🍚", "🍜", "🍗", "🥗", "🐟", "🥛", "🍓", "🥟"];
  // 配图：按餐名匹配统一风格的轻食缩略图（在线生成资源，与今日摄入页一致）
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
  function renderMeals(meals) {
    const list = document.getElementById("rec-meals");
    const empty = document.getElementById("rec-meals-empty");
    if (!list || !empty) return;
    empty.hidden = meals.length > 0;
    list.innerHTML = meals.map((m, i) => `
      <div class="meal-card">
        <div class="meal-card-top">
          <img class="mini-thumb" src="${mealThumb(m.name)}" alt="${MEAL_ICONS[i % MEAL_ICONS.length]}">
          <div>
            <p class="meal-card-name">${String(m.name).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))}</p>
            <p class="meal-card-meta">P${Math.round(m.protein)}g · C${Math.round(m.carb)}g · F${Math.round(m.fat)}g</p>
          </div>
        </div>
        <p class="meal-card-kcal">${Math.round(m.calories)} <small>kcal</small></p>
      </div>`).join("");
  }

  async function renderOverview() {
    let log = { meals: [], calories: 0, protein: 0, carb: 0, fat: 0 };
    try {
      const data = await apiFetch("/api/intake?date=" + todayStr());
      for (const m of data.meals) {
        log.calories += Number(m.calories); log.protein += Number(m.protein);
        log.carb += Number(m.carb); log.fat += Number(m.fat);
      }
      renderMeals(data.meals);      // 同步刷新区块3的餐食卡片
    } catch { /* 后端没起来时保持 0 值，页面不白屏 */ }

    const goal = getGoal();
    const pct = Math.min((log.calories / goal) * 100, 100);

    document.getElementById("ov-calorie").textContent = Math.round(log.calories);
    document.getElementById("ov-goal").textContent = goal;
    const fill = document.getElementById("ov-fill");
    fill.style.width = pct + "%";
    fill.style.background = log.calories > goal
      ? "linear-gradient(90deg,#ef4444,#f87171)" : "";
    document.getElementById("ov-protein").textContent = Math.round(log.protein) + "g";
    document.getElementById("ov-carb").textContent = Math.round(log.carb) + "g";
    document.getElementById("ov-fat").textContent = Math.round(log.fat) + "g";

    // 运动中心同步：读取今日运动消耗（localStorage，由 exercise.js 写入）
    const d = new Date();
    const exKey = "shijian_exercise_" +
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    let ex = null;
    try { ex = JSON.parse(localStorage.getItem(exKey)); } catch { /* 忽略 */ }
    const exEl = document.getElementById("ov-exercise");
    if (ex && ex.burn > 0) {
      exEl.textContent = "🏃 今日运动消耗 " + Math.round(ex.burn) + " kcal，已计入热量额度";
      exEl.hidden = false;
    } else {
      exEl.hidden = true;
    }
  }

  renderOverview();
  // 从分析页返回主页时刷新数据（bfcache 场景）
  window.addEventListener("pageshow", renderOverview);
})();

/* ============================================================
 * 侧栏：饮水打卡（本地存储，按天记录）
 * ============================================================ */
(() => {
  const GOAL = 2000, STEP = 200, DEFAULT = 1200;
  const nowEl = document.getElementById("water-now");
  const fillEl = document.getElementById("water-fill");
  const btn = document.getElementById("water-add");
  if (!nowEl || !fillEl || !btn) return;

  const d = new Date();
  const key = "shijian_water_" + d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  let ml = Number(localStorage.getItem(key)) || DEFAULT;

  function render() {
    nowEl.textContent = ml;
    fillEl.style.width = Math.min((ml / GOAL) * 100, 100) + "%";
    btn.disabled = ml >= GOAL;
    btn.textContent = ml >= GOAL ? "今日目标已完成 🎉" : "＋ 记一杯 200ml";
  }

  btn.addEventListener("click", () => {
    ml = Math.min(GOAL, ml + STEP);
    localStorage.setItem(key, ml);
    render();
  });

  render();
})();