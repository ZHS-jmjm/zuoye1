/* ============================================================
 * 登录页交互（只负责登录；注册已拆分到 register.html）
 * ============================================================ */

Auth.redirectIfLoggedIn(); // 已登录直接进主页面

const $ = (id) => document.getElementById(id);

/* ---------- 提交（账号密码存在 MySQL，走后端 API） ---------- */
$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const name = $("username").value.trim();
  const pw = $("password").value;
  if (!name || !pw) return showError("请输入用户名和密码");

  const submitBtn = $("submit-btn");
  submitBtn.disabled = true;
  try {
    const res = await Auth.login(name, pw);
    if (!res.ok) return showError(res.msg);
    try { sessionStorage.setItem("shijian_nav", String(Date.now())); } catch (e) {}
    location.replace("home.html");
  } finally {
    submitBtn.disabled = false;
  }
});

function showError(msg) {
  const el = $("form-error");
  el.textContent = msg;
  el.hidden = false;
}
function hideError() { $("form-error").hidden = true; }
