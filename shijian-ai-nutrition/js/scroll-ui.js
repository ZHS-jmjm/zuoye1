/* ============================================================
 * 右侧圆点指示器（全站共用，纯原生 JS）
 *
 * 滚动方式：完全原生自由滚动（不劫持滚轮、不强制吸附）。
 * 圆点作用：高亮当前所在区块 + 点击平滑跳转到对应区块。
 * ============================================================ */
(() => {
  const wrap = document.getElementById("pageScroll");
  const blocks = [...document.querySelectorAll(".snap-block")];
  const dots = document.getElementById("dots");
  if (!wrap || !blocks.length || !dots) return;

  const NAV_H = 64;

  /* ---------- 圆点指示器 ---------- */
  const btns = blocks.map((b, i) => {
    const d = document.createElement("button");
    d.className = "dot";
    d.type = "button";
    d.title = b.dataset.blockName || "区块 " + (i + 1);
    d.setAttribute("aria-label", d.title);
    d.addEventListener("click", () => {
      setActive(i);
      wrap.scrollTo({ top: b.offsetTop - NAV_H, behavior: "smooth" }); // 平滑跳转，给固定导航让位
    });
    dots.appendChild(d);
    return d;
  });

  function setActive(i) {
    btns.forEach((d, j) => d.classList.toggle("active", j === i));
  }

  /* 视口中线落在哪个区块，哪个圆点就高亮（超高 / 超矮区块都适用） */
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) setActive(blocks.indexOf(e.target));
      }
    },
    { root: wrap, rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  blocks.forEach((b) => io.observe(b));

  setActive(0);
})();
