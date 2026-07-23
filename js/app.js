/* ===== 考研助手 PWA - 主应用 ===== */

// ---- 初始化 ----

async function initApp() {
  // 初始化数据库
  try {
    await openDB();
    await checkAndSeed();
  } catch (e) {
    console.error('数据库初始化失败:', e);
    showToast('数据加载失败，请刷新页面');
    return;
  }

  // 更新日期
  updateHeaderDate();

  // 设置导航事件
  setupNavigation();

  // 设置弹窗关闭
  document.getElementById('image-modal').querySelector('.modal-overlay').onclick = closeModal;
  document.getElementById('image-modal').querySelector('.modal-close').onclick = closeModal;

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (e) {
      console.log('SW 注册失败（开发环境正常）:', e.message);
    }
  }

  // 渲染首页
  await renderDashboard();

  // 更新复习 badge
  const overdue = await getOverdueReviews();
  const today = todayStr();
  const upcoming = await getUpcomingReviews(1);
  const todayCount = overdue.length + upcoming.filter(c => c.nextReview === today).length;
  updateReviewBadge(todayCount);
}

// ---- 路由与导航 ----

function setupNavigation() {
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const view = btn.dataset.view;
      await switchView(view);
    });
  });

  // Hash 路由
  window.addEventListener('hashchange', async () => {
    const view = location.hash.replace('#', '') || 'dashboard';
    await switchView(view);
  });

  // 初始路由
  const initialView = location.hash.replace('#', '') || 'dashboard';
  if (initialView !== 'dashboard') {
    switchView(initialView);
  }
}

async function switchView(view) {
  // 切换导航高亮
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  // 切换视图
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${view}`);
  if (target) {
    target.classList.add('active');
  }

  // 更新标题
  const titles = {
    dashboard: '📋 学习计划',
    knowledge: '🗺️ 知识图谱',
    upload: '📷 学习记录',
    review: '🔔 复习提醒'
  };
  document.getElementById('header-title').textContent = titles[view] || '考研助手';

  // 渲染对应视图
  switch (view) {
    case 'dashboard': await renderDashboard(); break;
    case 'knowledge': await renderKnowledgeMap(); break;
    case 'upload': await renderUpload(); break;
    case 'review': await renderReview(); break;
  }

  // 滚动到顶部
  document.getElementById('app-content').scrollTop = 0;
}

// ---- 工具函数 ----

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2000);
}

function updateHeaderDate() {
  const now = new Date();
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  document.getElementById('header-date').textContent =
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${days[now.getDay()]}`;
}

// ---- 启动 ----

document.addEventListener('DOMContentLoaded', initApp);
