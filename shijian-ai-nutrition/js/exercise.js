/* ============================================================
 * 运动中心页逻辑（静态演示版：mock 数据 + localStorage 同步框架）
 *
 * 同步规则：运动消耗写入 localStorage（shijian_exercise_日期），
 * 首页 home.js 读取后展示「今日运动消耗」，计入热量额度。
 * 现为前端演示框架，后续接后端时把 pushSync() 换成接口调用即可。
 * ============================================================ */

/* ---------- 运动目录（分类快捷选择） ---------- */
const CATALOG = [
  { key: "daily", label: "🚶 日常活动", items: [
    { name: "饭后散步", icon: "🚶", min: 30, rate: 3.3 },
    { name: "爬楼梯", icon: "🪜", min: 10, rate: 6 },
    { name: "逛超市/菜市场", icon: "🛒", min: 30, rate: 2.7 },
    { name: "做家务", icon: "🧹", min: 20, rate: 3.5 },
  ]},
  { key: "cardio", label: "🏃 有氧", items: [
    { name: "慢骑", icon: "🚲", min: 40, rate: 4 },
    { name: "慢跑", icon: "🏃‍♂️", min: 30, rate: 8 },
    { name: "跳绳", icon: "🪢", min: 10, rate: 10 },
    { name: "游泳", icon: "🏊", min: 30, rate: 9 },
  ]},
  { key: "strength", label: "💪 力量", items: [
    { name: "深蹲", icon: "🏋️", min: 15, rate: 4 },
    { name: "俯卧撑", icon: "🤸", min: 10, rate: 3.6 },
    { name: "平板支撑", icon: "🧱", min: 3, rate: 2 },
    { name: "弹力带训练", icon: "🎗️", min: 15, rate: 3 },
  ]},
  { key: "relax", label: "🌙 放松", items: [
    { name: "居家拉伸", icon: "🧘", min: 15, rate: 2.6 },
    { name: "瑜伽", icon: "🕉️", min: 30, rate: 2.7 },
    { name: "八段锦", icon: "☯️", min: 20, rate: 2.3 },
    { name: "冥想呼吸", icon: "😌", min: 10, rate: 1 },
  ]},
];

const $ = (id) => document.getElementById(id);
const kcalOf = (item, min) => Math.round(item.rate * min);

/* ---------- 今日记录（mock 初始数据） ---------- */
let records = [
  { name: "饭后散步", icon: "🚶", min: 30, kcal: 100, time: "12:40" },
  { name: "居家拉伸", icon: "🧘", min: 15, kcal: 40, time: "15:20" },
  { name: "慢骑", icon: "🚲", min: 40, kcal: 160, time: "18:05" },
];

/* 本周已有消耗（周一~周日，mock；今天的槽位会被实时数据替换） */
const WEEK_MOCK = [180, 240, 0, 300, 120, 260, 0];
const WEEK_GOAL_DAYS = 5;
const todayIdx = () => (new Date().getDay() + 6) % 7;   // 周一 = 0

const totalBurn = () => records.reduce((s, r) => s + r.kcal, 0);
const totalMin  = () => records.reduce((s, r) => s + r.min, 0);

/* ---------- 渲染：概览四卡 ---------- */
function renderOverview() {
  const burn = totalBurn(), min = totalMin(), count = records.length;

  // 本周完成进度：本周（不含今天）消耗 > 0 的天数 + 今天有记录则 +1
  const idx = todayIdx();
  let done = 0;
  WEEK_MOCK.forEach((v, i) => { if (i !== idx && v > 0) done++; });
  if (count > 0) done++;
  const pct = Math.min(Math.round((done / WEEK_GOAL_DAYS) * 100), 100);

  $("bn-burn").textContent = burn;
  $("ov-min").textContent = min;
  $("ov-burn").textContent = burn;
  $("ov-count").textContent = count;
  $("ov-weekpct").textContent = pct;
  $("ov-weekfill").style.width = pct + "%";
  $("ov-weekfill").style.background =
    pct >= 100 ? "linear-gradient(90deg,#10b981,#a7f3d0)" : "";
  $("ov-weeknote").textContent = "本周目标：舒展 5 天（" + done + "/" + WEEK_GOAL_DAYS + "）";
}

/* ---------- 配图：按运动名匹配统一风格的轻生活缩略图（在线生成资源） ---------- */
const EXIMG = {
  walk: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=walking%20shoes%20on%20a%20park%20path%20with%20soft%20green%20grass%2C%20morning%20light%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square",
  stretch: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20pastel%20green%20yoga%20mat%20on%20a%20wooden%20floor%20near%20a%20bright%20window%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square",
  yoga: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20calm%20gentle%20home%20yoga%20stretch%20on%20a%20mat%2C%20cozy%20minimal%20room%2C%20soft%20light%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square",
  cycle: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20bicycle%20leaning%20on%20a%20green%20park%20fence%20in%20soft%20sunlight%2C%20soft%20natural%20daylight%2C%20low%20saturation%20pastel%20mint%20green%20tones%2C%20gentle%20film%20grain%2C%20clean%20minimal%2C%20fresh%20healing%20lifestyle&image_size=square"
};
function exThumb(name) {
  const s = String(name || "");
  if (/瑜伽|冥想/.test(s)) return EXIMG.yoga;
  if (/骑|单车/.test(s)) return EXIMG.cycle;
  if (/散步|走路|跑|跳绳|游泳|逛超市|爬楼梯/.test(s)) return EXIMG.walk;
  return EXIMG.stretch;
}

/* ---------- 渲染：今日记录列表 ---------- */
function renderRecords() {
  const list = $("rec-list"), empty = $("rec-empty");
  empty.hidden = records.length > 0;

  list.innerHTML = records.map((r, i) => `
    <div class="bg-white rounded-2xl shadow-sm border border-[#e5e7eb] px-5 py-4 min-w-[240px] lift cursor-pointer" data-del="${i}" title="点击删除这条记录">
      <div class="flex items-center gap-3">
        <img class="w-12 h-12 rounded-xl object-cover flex-none" src="${exThumb(r.name)}" alt="${r.icon}" style="box-shadow:0 2px 8px rgba(16,90,60,.15);">
        <div>
          <p class="text-[15px] font-bold text-gray-800">${r.name}</p>
          <p class="text-[12px] text-gray-400 mt-0.5">时长 ${r.min} 分钟 · ${r.time}</p>
        </div>
      </div>
      <p class="mt-3 text-[20px] font-bold" style="color:#059669;">${r.kcal} <span class="text-[12px] font-semibold text-gray-400">kcal</span></p>
    </div>`).join("");

  list.querySelectorAll("[data-del]").forEach((el) => {
    el.addEventListener("click", () => {
      const r = records.splice(Number(el.dataset.del), 1)[0];
      refresh();
      toast(`已删除「${r.name}」的记录`);
    });
  });
}

/* ---------- 渲染：分类标签 + 快捷选择 ---------- */
let curCat = CATALOG[0].key;

function renderTabs() {
  $("qtabs").innerHTML = CATALOG.map((c) =>
    `<button class="qtab ${c.key === curCat ? "active" : ""}" data-cat="${c.key}">${c.label}</button>`).join("");
  $("qtabs").querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => { curCat = btn.dataset.cat; renderTabs(); renderTags(); });
  });
}

function renderTags() {
  const cat = CATALOG.find((c) => c.key === curCat);
  $("qtags").innerHTML = cat.items.map((it) =>
    `<button class="qtag" data-add="${it.name}" data-icon="${it.icon}" data-min="${it.min}" data-rate="${it.rate}">
       ${it.icon} ${it.name} · ${it.min}分钟 · 约${kcalOf(it, it.min)}kcal</button>`).join("");
}

/* ---------- 添加记录（推荐卡片 / 快捷标签 / 弹窗共用） ---------- */
function addRecord(name, icon, min, rate) {
  const now = new Date();
  const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  records.push({ name, icon, min, kcal: kcalOf({ rate }, min), time });
  refresh();
  toast(`已记录：${name} ${min} 分钟 · 约 ${kcalOf({ rate }, min)} kcal 🌿`);
}

/* 推荐卡片与快捷标签：data-add 属性统一委托 */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-add]");
  if (el) addRecord(el.dataset.add, el.dataset.icon, Number(el.dataset.min), Number(el.dataset.rate));
});

/* ---------- 添加记录弹窗 ---------- */
(function initModal() {
  const opts = CATALOG.flatMap((c) => c.items)
    .map((it) => `<option value="${it.name}" data-rate="${it.rate}" data-icon="${it.icon}">${it.icon} ${it.name}</option>`)
    .join("");
  $("ex-select").innerHTML = opts;

  const modal = $("ex-modal");
  const preview = () => {
    const item = $("ex-select").selectedOptions[0];
    $("ex-kcal").textContent = kcalOf({ rate: Number(item.dataset.rate) }, Math.max(1, Number($("ex-min").value) || 1));
  };
  $("ex-select").addEventListener("change", preview);
  $("ex-min").addEventListener("input", preview);

  $("add-btn").addEventListener("click", () => { preview(); modal.hidden = false; });
  $("ex-cancel").addEventListener("click", () => { modal.hidden = true; });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.hidden = true; });

  $("ex-save").addEventListener("click", () => {
    const item = $("ex-select").selectedOptions[0];
    const min = Math.max(1, Number($("ex-min").value) || 1);
    addRecord(item.value, item.dataset.icon, min, Number(item.dataset.rate));
    modal.hidden = true;
  });
})();

/* ---------- 本周折线图（纯 SVG，简易） ---------- */
function renderChart() {
  const idx = todayIdx();
  const data = WEEK_MOCK.map((v, i) => (i === idx ? totalBurn() : v));
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  const W = 720, top = 42, bottom = 208, left = 50, step = 103;
  const maxY = Math.max(400, ...data);
  const x = (i) => left + i * step;
  const y = (v) => bottom - (v / maxY) * (bottom - top);

  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${bottom} ${pts} ${x(6)},${bottom}`;

  $("week-chart").innerHTML = `
    <defs>
      <linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="${area}" fill="url(#g-area)"/>
    <polyline points="${pts}" fill="none" stroke="#10b981" stroke-width="3"
              stroke-linecap="round" stroke-linejoin="round"/>
    ${data.map((v, i) => `
      <circle cx="${x(i)}" cy="${y(v)}" r="5" fill="#fff" stroke="#059669" stroke-width="2.5"/>
      <text x="${x(i)}" y="${y(v) - 14}" text-anchor="middle" font-size="12" fill="#059669" font-weight="600">${v}</text>
      <text x="${x(i)}" y="${bottom + 26}" text-anchor="middle" font-size="12.5"
            fill="${i === idx ? "#059669" : "#9ca3af"}" font-weight="${i === idx ? "700" : "400"}">${days[i]}${i === idx ? "（今天）" : ""}</text>
    `).join("")}
  `;

  const sum = data.reduce((s, v) => s + v, 0);
  const active = data.filter((v) => v > 0).length;
  $("week-summary").textContent =
    `这周已经动起来 ${active} 天，累计消耗约 ${sum} kcal —— 不追强度，舒服地坚持就很好 🌿`;
}

/* ---------- 同步框架：把今日消耗写进 localStorage，首页会读取 ---------- */
function pushSync() {
  const d = new Date();
  const key = "shijian_exercise_" +
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  localStorage.setItem(key, JSON.stringify({ burn: totalBurn(), minutes: totalMin(), times: records.length }));
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------- 初始化 ---------- */
function refresh() { renderOverview(); renderRecords(); renderChart(); pushSync(); }
renderTabs();
renderTags();
refresh();
