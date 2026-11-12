/* ============================================================
 * 注册页交互（从登录页拆分出来的独立页面）
 * 注册成功 → 自动登录 → 进入主页面
 * ============================================================ */

Auth.redirectIfLoggedIn(); // 已登录直接进主页面

const $ = (id) => document.getElementById(id);

/* ---------- 提交（账号写入 MySQL users 表，走后端 API） ---------- */
$("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const name = $("username").value.trim();
  const pw = $("password").value;
  const pw2 = $("password2").value;

  if (name.length < 2) return showError("用户名至少 2 个字符");
  if (pw.length < 6) return showError("密码至少 6 位");
  if (pw !== pw2) return showError("两次输入的密码不一致");

  const submitBtn = $("submit-btn");
  submitBtn.disabled = true;
  try {
    const res = await Auth.register(name, pw);
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
