/* ============================================================
 * 全局组件：虚拟食灵「禾禾」
 * 自包含脚本：注入样式 + DOM，所有页面只需引入一次
 * 纯原生 CSS 动画 + mock 数据，无后端依赖
 * 登录 / 注册页：隐藏浮窗，改为登录表单下方的内嵌食灵卡片
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- 全局样式 ---------- */
  var css = document.createElement("style");
  css.textContent =
    /* ---- 食灵禾禾 ---- */
    "#hl-mascot { position: fixed; right: 24px; bottom: 24px; z-index: 99999; width: 72px; user-select: none; -webkit-user-select: none; animation: hl-in .95s cubic-bezier(.22, .8, .25, 1) both; }" +
    "#hl-mascot * { box-sizing: border-box; }" +
    ".hl-mascot-btn { display: block; width: 72px; height: 72px; padding: 0; border: 0; background: transparent; cursor: inherit; transition: transform .25s ease; animation: hl-sway 3.4s ease-in-out infinite; transform-origin: 50% 90%; touch-action: none; }" +
    "#hl-mascot:hover .hl-mascot-btn { transform: translateY(-6px); animation-play-state: paused; }" +
    ".hl-mascot-btn svg { width: 100%; height: 100%; display: block; transform: scale(1.08); filter: drop-shadow(0 6px 14px rgba(45, 100, 60, .34)); }" +
    ".hl-breathe { animation: hl-breathe 2.8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }" +
    ".hl-eyes { animation: hl-blink 4.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }" +
    "@keyframes hl-in { 0% { opacity: 0; transform: translateY(22px) scale(.9); } 60% { opacity: 1; transform: translateY(-4px) scale(1.02); } 100% { opacity: 1; transform: translateY(0) scale(1); } }" +
    "@keyframes hl-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }" +
    "@keyframes hl-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }" +
    "@keyframes hl-blink { 0%, 91%, 100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }" +
    /* 悬停气泡 */
    ".hl-mascot-bubble { position: absolute; right: 80px; bottom: 40px; white-space: nowrap; background: #fff; color: #2f6b46; font-size: 12.5px; font-weight: 600; padding: 8px 13px; border-radius: 13px 13px 4px 13px; border: 1.5px solid #bfe8c8; box-shadow: 0 8px 20px rgba(50, 110, 70, .16); opacity: 0; transform: translateY(6px); pointer-events: none; transition: opacity .25s ease, transform .25s ease; }" +
    "#hl-mascot:hover .hl-mascot-bubble, #hl-mascot.hl-open .hl-mascot-bubble { opacity: 1; transform: translateY(0); }" +
    /* 点击面板 */
    ".hl-mascot-panel { position: absolute; right: 0; bottom: 86px; width: 212px; background: #fff; border: 1.5px solid #bfe8c8; border-radius: 18px; box-shadow: 0 14px 34px rgba(50, 110, 70, .2); padding: 14px; opacity: 0; transform: translateY(10px) scale(.96); pointer-events: none; transition: opacity .25s ease, transform .25s ease; }" +
    "#hl-mascot.hl-open .hl-mascot-panel { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }" +
    ".hl-panel-head { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }" +
    ".hl-panel-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(160deg, #e6f7e6, #bfe9c4); display: flex; align-items: center; justify-content: center; font-size: 19px; flex: none; }" +
    ".hl-panel-head strong { display: block; font-size: 14px; color: #27553a; }" +
    ".hl-panel-head p { margin: 2px 0 0; font-size: 11.5px; color: #6b8f77; }" +
    ".hl-panel-qi { background: #f2faf4; border-radius: 11px; padding: 9px 11px; margin-bottom: 10px; }" +
    ".hl-qi-label { display: flex; justify-content: space-between; font-size: 11.5px; color: #5a8a6a; font-weight: 600; margin-bottom: 6px; }" +
    ".hl-qi-bar { height: 7px; background: #ddefe2; border-radius: 99px; overflow: hidden; }" +
    ".hl-qi-bar i { display: block; height: 100%; width: 68%; background: linear-gradient(90deg, #7cc97e, #34a56b); border-radius: 99px; }" +
    ".hl-panel-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }" +
    ".hl-panel-actions button { border: 0; border-radius: 11px; padding: 8px 3px; font-size: 11.5px; font-weight: 700; font-family: inherit; transition: transform .2s ease, opacity .2s ease, filter .2s ease; cursor: inherit; }" +
    ".hl-panel-actions button:hover { transform: translateY(-2px); }" +
    ".hl-chat { background: linear-gradient(135deg, #34a56b, #2e8f5e); color: #fff; }" +
    ".hl-book { background: #eef8f0; color: #2f6b46; border: 1.5px solid #c9ead2 !important; }" +
    /* 未登录：按钮置灰，逻辑更严谨 */
    "#hl-mascot.hl-locked .hl-panel-actions button { opacity: .5; filter: grayscale(.65); }" +
    "#hl-mascot.hl-locked .hl-panel-actions button:hover { transform: none; }" +
    ".hl-lock-tip { display: none; margin: 9px 0 0; font-size: 11px; color: #8a9c91; text-align: center; }" +
    "#hl-mascot.hl-locked .hl-lock-tip { display: block; }" +
    /* 轻提示 */
    ".hl-toast { position: absolute; right: 0; bottom: 86px; white-space: nowrap; background: #27553a; color: #fff; font-size: 12px; padding: 9px 13px; border-radius: 11px; box-shadow: 0 10px 24px rgba(30, 70, 45, .3); opacity: 0; transform: translateY(8px); transition: opacity .25s ease, transform .25s ease; pointer-events: none; }" +
    ".hl-toast.hl-show { opacity: 1; transform: translateY(0); }" +
    /* 拖拽状态：暂停待机动画，避免位移打架 */
    "#hl-mascot.hl-dragging .hl-mascot-btn { animation: none !important; transform: none; }" +
    /* 面板朝向翻转：禾禾靠左时面板向右弹 */
    "#hl-mascot.hl-flip .hl-mascot-panel { right: auto; left: 0; }" +
    "#hl-mascot.hl-flip .hl-mascot-bubble { right: auto; left: 80px; border-radius: 13px 13px 13px 4px; }" +
    "#hl-mascot.hl-flip .hl-toast { right: auto; left: 0; }" +
    /* 小屏避让：缩小且不再挡右侧圆点 */
    "@media (max-width: 720px) { #hl-mascot { right: 14px; bottom: 14px; } .hl-mascot-btn { width: 60px; height: 60px; } .hl-mascot-bubble { right: 66px; bottom: 32px; } }";
  document.head.appendChild(css);

  /* ---------- 注入 DOM ---------- */
  var wrap = document.createElement("div");
  wrap.id = "hl-mascot";
  wrap.innerHTML =
    '<div class="hl-mascot-bubble">今天也要好好吃饭呀✨</div>' +
    '<button class="hl-mascot-btn" aria-label="食灵禾禾" title="禾禾">' +
      '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        "<defs><linearGradient id='hlG' x1='0' y1='0' x2='0' y2='1'>" +
        "<stop offset='0' stop-color='#e6f7e6'/><stop offset='1' stop-color='#b5e3b0'/></linearGradient></defs>" +
        "<g class='hl-breathe'>" +
          "<path d='M60 42 C60 32 60 27 60 21' stroke='#6fbf73' stroke-width='3.2' fill='none' stroke-linecap='round'/>" +
          "<path d='M60 24 C52 18 43 20 38 27 C47 30 56 29 60 24 Z' fill='#7cc97e'/>" +
          "<path d='M60 24 C68 18 77 20 82 27 C73 30 64 29 60 24 Z' fill='#8fd68f'/>" +
          "<ellipse cx='60' cy='72' rx='34' ry='32' fill='url(#hlG)' stroke='#8ccf8c' stroke-width='2.5'/>" +
          "<g class='hl-eyes'>" +
            "<ellipse cx='48' cy='66' rx='4.6' ry='5.4' fill='#3f4a3f'/>" +
            "<ellipse cx='72' cy='66' rx='4.6' ry='5.4' fill='#3f4a3f'/>" +
            "<circle cx='49.8' cy='64' r='1.7' fill='#fff'/><circle cx='73.8' cy='64' r='1.7' fill='#fff'/>" +
          "</g>" +
          "<circle cx='40' cy='74' r='4.2' fill='#f6c6c6' opacity='.55'/>" +
          "<circle cx='80' cy='74' r='4.2' fill='#f6c6c6' opacity='.55'/>" +
          "<path d='M54 76 Q60 82 66 76' stroke='#4a5a4a' stroke-width='2.6' fill='none' stroke-linecap='round'/>" +
        "</g>" +
      "</svg>" +
    "</button>" +
    '<div class="hl-mascot-panel" role="dialog" aria-label="禾禾面板">' +
      '<div class="hl-panel-head">' +
        '<span class="hl-panel-avatar">🌱</span>' +
        "<div><strong>禾禾</strong><p>我陪你一起好好吃饭</p></div>" +
      "</div>" +
      '<div class="hl-panel-qi">' +
        '<div class="hl-qi-label"><span>灵气值</span><span>68/100</span></div>' +
        '<div class="hl-qi-bar"><i></i></div>' +
      "</div>" +
      '<div class="hl-panel-actions">' +
        '<button class="hl-chat" type="button">💬 和禾禾聊天</button>' +
        '<button class="hl-book" type="button">📖 食材图鉴</button>' +
      "</div>" +
      '<p class="hl-lock-tip">登录后可用</p>' +
    "</div>" +
    '<div class="hl-toast">🌱 食材图鉴即将上线，敬请期待</div>';
  document.body.appendChild(wrap);

  /* ---------- 登录 / 注册页：隐藏浮窗，改为登录区内的白色食灵卡片 ---------- */
  var authTipTimer = null;

  function mountAuthCard() {
    var panel = document.querySelector(".login-panel");
    if (!panel || panel.querySelector(".hl-auth-card")) return;

    var card = document.createElement("div");
    card.className = "hl-auth-card";
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", "禾禾食灵");
    card.innerHTML =
      '<div class="hl-auth-ident">' +
        '<span class="hl-auth-avatar" aria-hidden="true">🌱</span>' +
        '<div class="hl-auth-text">' +
          "<strong>禾禾食灵</strong>" +
          "<p>登录后开启你的饮食陪伴</p>" +
        "</div>" +
      "</div>" +
      '<button class="hl-auth-btn" type="button" aria-disabled="true">🔒 登录后解锁</button>';
    panel.appendChild(card);

    var authBtn = card.querySelector(".hl-auth-btn");
    authBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      authBtn.textContent = "🌱 跳转失败，请登录";
      authBtn.classList.add("hl-auth-btn--tip");
      clearTimeout(authTipTimer);
      authTipTimer = setTimeout(function () {
        authBtn.textContent = "🔒 登录后解锁";
        authBtn.classList.remove("hl-auth-btn--tip");
      }, 1800);
    });
  }

  if (isAuthPage()) {
    wrap.style.display = "none";
    mountAuthCard();
  }

  /* ---------- 交互 ---------- */
  var btn = wrap.querySelector(".hl-mascot-btn");
  var panel = wrap.querySelector(".hl-mascot-panel");
  var toast = wrap.querySelector(".hl-toast");
  var toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("hl-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("hl-show"); }, 1800);
  }

  /* 登录态判断：token 存在与否（同步、无竞态；真正的过期校验由后端完成） */
  function isLogged() {
    try { return !!localStorage.getItem("shijian_token"); } catch (err) { return false; }
  }

  /* 登录页 / 注册页：禾禾一律不允许触发页面跳转 */
  function isAuthPage() {
    return document.body.classList.contains("login-body");
  }

  /* 面板朝向：禾禾靠左半屏时向右弹，防止面板溢出屏幕 */
  function updateFlip() {
    var rect = wrap.getBoundingClientRect();
    wrap.classList.toggle("hl-flip", rect.left < 240);
  }

  /* 未登录（或停在登录/注册页）：面板按钮置灰 */
  function syncLock() {
    wrap.classList.toggle("hl-locked", isAuthPage() || !isLogged());
  }
  syncLock();
  window.addEventListener("pageshow", syncLock);

  /* ---------- 可拖拽换位（区分拖拽与点击） ---------- */
  var dragState = null;   // { sx, sy, left, top, moved }
  var justDragged = false;

  function onDragMove(e) {
    if (!dragState) return;
    var dx = e.clientX - dragState.sx;
    var dy = e.clientY - dragState.sy;
    if (!dragState.moved && dx * dx + dy * dy < 36) return; // 位移 < 6px 视为点击
    if (!dragState.moved) {
      dragState.moved = true;
      wrap.classList.add("hl-dragging");
      wrap.style.right = "auto";
      wrap.style.bottom = "auto";
    }
    var w = wrap.offsetWidth || 80;
    var h = wrap.offsetHeight || 80;
    var x = Math.min(Math.max(dragState.left + dx, 8), window.innerWidth - w - 8);
    var y = Math.min(Math.max(dragState.top + dy, 8), window.innerHeight - h - 8);
    wrap.style.left = x + "px";
    wrap.style.top = y + "px";
    updateFlip();
  }

  function endDrag() {
    if (!dragState) return;
    if (dragState.moved) justDragged = true;
    dragState = null;
    wrap.classList.remove("hl-dragging");
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", endDrag);
    document.removeEventListener("pointercancel", endDrag);
  }

  btn.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    var rect = wrap.getBoundingClientRect();
    dragState = { sx: e.clientX, sy: e.clientY, left: rect.left, top: rect.top, moved: false };
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  });

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (justDragged) { justDragged = false; return; } // 拖拽松手不弹面板
    updateFlip();
    wrap.classList.toggle("hl-open");
  });

  // 点击页面其他位置收起面板
  document.addEventListener("click", function (e) {
    if (wrap.classList.contains("hl-open") && !wrap.contains(e.target)) {
      wrap.classList.remove("hl-open");
    }
  });

  // 登录页/注册页一律禁止跳转；其余页面须已登录
  wrap.querySelector(".hl-chat").addEventListener("click", function (e) {
    e.stopPropagation();
    if (isAuthPage() || !isLogged()) {
      showToast("🌱 跳转失败，请登录");
      return;
    }
    // 站内跳转打标记（与 auth.js 的站内导航判定一致）
    try { sessionStorage.setItem("shijian_nav", String(Date.now())); } catch (err) {}
    location.href = "chat.html";
  });

  wrap.querySelector(".hl-book").addEventListener("click", function (e) {
    e.stopPropagation();
    showToast("🌱 食材图鉴即将上线，敬请期待");
  });
})();
