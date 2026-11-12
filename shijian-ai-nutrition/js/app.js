/* ============================================================
 * 食鉴 · AI 营养分析师 — 页面交互逻辑
 * 依赖：js/ai-api.js 提供的 analyzeFood() / chat() / AI_CONFIG
 * ============================================================ */

/* ---------- 全局状态 ---------- */
let currentReport = null;   // 最近一次分析结果
let currentImage = null;    // 最近上传的图片 Data URL

/* 今天的日期字符串（本地时区，作为摄入记录的 date 参数） */
const todayKey = () => {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
};

/* ---------- DOM 快捷获取 ---------- */
const $ = (id) => document.getElementById(id);

/* ============================================================
 * 1. 输入区：Tab 切换 + 图片上传（拖拽 / 粘贴 / 点击）
 * ============================================================ */

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $("panel-" + tab.dataset.tab).classList.add("active");
  });
});

const dropzone = $("dropzone");
const fileInput = $("file-input");
const previewImg = $("preview-img");

// 点击选择文件
dropzone.addEventListener("click", () => fileInput.click());
// 键盘可达性（无障碍）：回车/空格也能触发
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});
// 拖拽
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) loadImageFile(file);
});
// 粘贴（Ctrl+V 直接贴图，参考同类产品的体验）
document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) loadImageFile(item.getAsFile());
});
// 选择文件
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadImageFile(fileInput.files[0]);
});

/** 读取图片文件并显示预览（转 Data URL，供 AI 视觉接口使用） */
function loadImageFile(file) {
  if (!file.type.startsWith("image/")) { alert("请上传图片文件（JPG / PNG / WebP）"); return; }
  if (file.size > 10 * 1024 * 1024) { alert("图片超过 10MB，请压缩后重试"); return; }

  const reader = new FileReader();
  reader.onload = () => {
    currentImage = reader.result;   // Data URL: data:image/xxx;base64,...
    previewImg.src = currentImage;
    previewImg.hidden = false;
    $("dz-empty").hidden = true;
  };
  reader.readAsDataURL(file);
}

// 快捷示例 chips（仅文字面板）
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $("food-text").value = chip.textContent.trim();
  });
});

/* ============================================================
 * 2. 分析流程
 * ============================================================ */

$("analyze-btn").addEventListener("click", async () => {
  const activeTab = document.querySelector(".tab.active").dataset.tab;
  const text = $("food-text").value.trim();

  // 前置校验：至少要有一种输入
  if (activeTab === "image" && !currentImage) { alert("请先上传一张食物照片"); return; }
  if (activeTab === "text" && !text) { alert("请先描述你吃了什么"); return; }

  setAnalyzing(true);
  try {
    currentReport = await analyzeFood(
      activeTab === "image" ? { image: currentImage, text: text } : { text: text }
    );
    renderReport(currentReport);

    // 分析成功 → 上报一份到 MySQL 分析历史（失败不影响主流程）
    if (Auth.current()) {
      apiFetch("/api/history", {
        method: "POST",
        body: { source: activeTab, foodText: text, report: currentReport },
      }).catch(() => {});
    }
    $("demo-chip").hidden = !currentReport.demo;   // 演示数据时给个角标，避免误解
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    alert("分析失败：" + err.message);
  } finally {
    setAnalyzing(false);
  }
});

function setAnalyzing(on) {
  const btn = $("analyze-btn");
  btn.disabled = on;
  // 注意：$ 是 getElementById，类选择器要自己 querySelector，否则拿到 null
  const label = btn.querySelector(".btn-label");
  const loading = btn.querySelector(".btn-loading");
  if (label) label.hidden = on;
  if (loading) loading.hidden = !on;
}

/** 渲染分析报告 */
function renderReport(r) {
  // 健康评分环：r=50，周长 = 2πr ≈ 314
  const arc = $("score-arc");
  arc.style.strokeDashoffset = 314 - 314 * (r.score / 100);
  // 分数颜色语义：高分绿 / 中等琥珀 / 低分红
  arc.style.stroke = r.score >= 75 ? "#10b981" : r.score >= 50 ? "#f59e0b" : "#ef4444";
  animateNumber($("score-value"), r.score);
  $("score-label").textContent =
    r.score >= 75 ? "很棒，继续保持" : r.score >= 50 ? "中等，可以更好" : "需要调整啦";

  animateNumber($("calorie-value"), r.calories);
  $("calorie-note").textContent = "约占每日推荐摄入（2000 kcal）的 " +
    Math.round((r.calories / 2000) * 100) + "%";

  // 营养素条形图：以 60g（蛋白/脂肪）/150g（碳水）/30g（纤维）为满格刻度
  renderMacro($("bar-protein"), $("val-protein"), r.protein, 60, "g");
  renderMacro($("bar-carb"),     $("val-carb"),     r.carb,    150, "g");
  renderMacro($("bar-fat"),      $("val-fat"),      r.fat,     60, "g");
  renderMacro($("bar-fiber"),    $("val-fiber"),    r.fiber,   30, "g");

  // 食物清单
  $("food-list").innerHTML = r.foods
    .map((f) => `<li><b>${escapeHtml(f.name)}</b>　${escapeHtml(f.note || "")}</li>`)
    .join("") || "<li>未识别到具体食物</li>";

  $("ai-comment").textContent = r.comment || "（AI 未返回点评）";
}

function renderMacro(bar, val, num, full, unit) {
  bar.style.width = Math.min((num / full) * 100, 100) + "%";
  val.textContent = num + unit;
}

/** 数字滚动动画 */
function animateNumber(el, target) {
  const start = performance.now();
  const dur = 800;
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); // easeOutCubic
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ============================================================
 * 3. AI 分析记录（MySQL analysis_history）
 * ============================================================ */

/** 加载并渲染历史分析记录（登录后调用） */
async function loadHistory() {
  const list = $("history-list");
  if (!list) return;
  try {
    const data = await apiFetch("/api/history?limit=12");
    const items = data.items || [];
    list.innerHTML = items.length
      ? items.map((h) => `
          <div class="hist-card">
            <div class="hist-top"><b>${escapeHtml(h.food_text || "一次分析")}</b><span class="hist-score">${h.score ?? "—"}</span></div>
            <p class="hist-kcal">${Math.round(h.calories)} kcal · P${Math.round(h.protein)}g C${Math.round(h.carb)}g F${Math.round(h.fat)}g</p>
            <p class="hist-time">${String(h.created_at || "").replace("T", " ").slice(0, 16)}</p>
          </div>`).join("")
      : '<p class="hist-empty">还没有分析记录，去分析第一餐吧 🍽️</p>';
  } catch (e) {
    if (e.status !== 401) list.innerHTML = '<p class="hist-empty">分析记录加载失败，请稍后再试</p>';
  }
}

/* 「＋ 记入今日摄入」：把当前报告写进 MySQL 的 intake 表
 * （进度展示在「今日摄入」页 tracker.html） */
$("add-to-today").addEventListener("click", async () => {
  if (!currentReport) return;
  try {
    await apiFetch("/api/intake", {
      method: "POST",
      body: { date: todayKey(), name: currentReport.foods[0]?.name || "一餐", ...pickMacros(currentReport) },
    });
    alert("已记入今日摄入 ✅ 打开「今日摄入」页看看进度吧");
  } catch (e) {
    alert("保存到数据库失败：" + e.message);
  }
});

function pickMacros(r) {
  return { calories: r.calories, protein: r.protein, carb: r.carb, fat: r.fat };
}

/* 快捷提问推荐卡片：点击切到文字面板并填入示例 */
document.querySelectorAll("#quick-examples .quick-chip-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "text"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    $("panel-text").classList.add("active");
    $("food-text").value = card.textContent.trim().replace(/^\S+\s*/, "");
    $("food-text").focus();
    $("analyzer").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

/* ---------- 工具函数 ---------- */

/** 简单转义，防止食物名里出现 HTML 注入 */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---------- 初始化 ---------- */
Auth.ready().then(loadHistory);
