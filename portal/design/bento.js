// transit 门户 · 设计稿共享脚本（源自基准稿：分段控件滑块、数字滚动；追加：复制反馈、开关、模态开合）
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Apple 原生级平滑滑块
  document.querySelectorAll('[data-seg]').forEach(seg => {
    const thumb = seg.querySelector('.segmented-thumb');
    const update = () => {
      const activeBtn = seg.querySelector('button.active');
      if (activeBtn && thumb) {
        thumb.style.left = activeBtn.offsetLeft + 'px';
        thumb.style.width = activeBtn.offsetWidth + 'px';
      }
    };
    seg.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        update();
        const target = btn.dataset.show;
        if (target) {
          const group = seg.dataset.seg;
          document.querySelectorAll(`[data-pane="${group}"]`).forEach(p => { p.hidden = p.dataset.id !== target; });
        }
      });
    });
    update();
    window.addEventListener('resize', update);
  });

  // 润物细无声的数字滚动
  const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const fmt = v => prefix + (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US')) + suffix;
    if (reduce) { el.textContent = fmt(target); return; }
    let start = null;
    const dur = 1100;
    const step = time => {
      if (!start) start = time;
      const progress = Math.min((time - start) / dur, 1);
      el.textContent = fmt(target * easeOutExpo(progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // 复制按钮反馈（稿子里只做视觉反馈）
  document.querySelectorAll('[data-copy]').forEach(btn => {
    const label = btn.textContent;
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      btn.classList.add('done'); btn.textContent = '已复制';
      setTimeout(() => { btn.classList.remove('done'); btn.textContent = label; }, 1400);
    });
  });

  // 开关
  document.querySelectorAll('.toggle').forEach(t => t.addEventListener('click', () => t.classList.toggle('on')));

  // 模态开合
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
    const m = document.getElementById(b.dataset.open); if (m) m.hidden = false;
  }));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
    const m = b.closest('.modal-backdrop'); if (m) m.hidden = true;
  }));
  document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.hidden = true; }));
})();
