/* ===== 考研助手 PWA - 主应用 ===== */

// ---- 认证状态 ----
let authMode = 'login'; // 'login' | 'register'

// ---- 初始化 ----

async function initApp() {
  // 检查 Supabase SDK 是否已加载
  if (typeof supabaseClient === 'undefined') {
    console.warn('Supabase SDK 未加载，使用纯本地模式');
  }

  // 检查是否已登录
  const session = await getSession();

  if (session) {
    // 已登录 → 初始化主应用
    await initMainApp();
  } else {
    // 未登录 → 显示登录页
    showAuthView();
  }

  // 监听网络状态变化
  window.addEventListener('online', () => {
    showToast('网络已恢复 🌐');
  });
  window.addEventListener('offline', () => {
    showToast('已切换到离线模式 📡');
  });

  // 监听认证状态变化
  if (typeof supabaseClient !== 'undefined') {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await initMainApp();
      } else if (event === 'SIGNED_OUT') {
        showAuthView();
      }
    });
  }
}

// ---- 初始化主应用（登录后）----

async function initMainApp() {
  // 初始化数据库
  try {
    await openDB();
    await checkAndSeed();
  } catch (e) {
    console.error('数据库初始化失败:', e);
    showToast('数据加载失败，请刷新页面');
    return;
  }

  // 从 Supabase 拉取云端数据
  await pullAllFromSupabase();

  // 冲洗离线队列
  await flushSyncQueue();

  // 设置网络监听
  setupSyncListeners();

  // 检查是否需要引导（首次登录且无数据）
  const onboardingDone = await getSetting('onboarding_done', false);
  const subjects = await dbGetAll('subjects');
  const needOnboarding = !onboardingDone && !subjects.length;

  if (needOnboarding) {
    document.getElementById('view-auth').classList.remove('active');
    document.getElementById('view-onboarding').classList.add('active');
    await renderOnboarding();
    return;
  }

  // 隐藏登录视图和引导视图，显示主界面
  document.getElementById('view-auth').classList.remove('active');
  document.getElementById('view-onboarding').classList.remove('active');
  document.getElementById('bottom-nav').classList.remove('hidden');
  document.getElementById('app-header').classList.remove('hidden');

  // 更新日期
  updateHeaderDate();

  // 渲染用户状态条
  await renderAuthStatus();

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

// ---- 认证视图 ----

function showAuthView() {
  // 隐藏主界面元素
  document.getElementById('app-header').classList.add('hidden');
  document.getElementById('bottom-nav').classList.add('hidden');

  // 隐藏所有主视图
  document.querySelectorAll('.view:not(#view-auth)').forEach(v => v.classList.remove('active'));

  // 显示登录视图
  document.getElementById('view-auth').classList.add('active');

  // 重置表单
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-display-name').value = '';

  updateAuthUI();
}

function updateAuthUI() {
  const isRegister = authMode === 'register';
  document.getElementById('auth-subtitle').textContent = isRegister ? '创建新账号' : '登录你的账号';
  document.getElementById('auth-submit-btn').textContent = isRegister ? '注 册' : '登 录';
  document.getElementById('auth-switch-text').textContent = isRegister ? '已有账号？' : '还没有账号？';
  document.getElementById('auth-switch-btn').textContent = isRegister ? '返回登录' : '注册新账号';
  document.getElementById('auth-display-name-field').style.display = isRegister ? 'block' : 'none';
  document.getElementById('auth-error').classList.add('hidden');
}

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuthUI();
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const displayName = document.getElementById('auth-display-name').value.trim();
  const errorEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit-btn');

  if (!email || !password) {
    showAuthError('请填写邮箱和密码');
    return;
  }

  if (password.length < 6) {
    showAuthError('密码至少需要 6 位');
    return;
  }

  if (typeof supabaseClient === 'undefined') {
    showAuthError('未连接到服务器，请使用"跳过登录"模式');
    return;
  }

  btn.disabled = true;
  btn.textContent = '处理中...';

  try {
    if (authMode === 'register') {
      if (!displayName) {
        showAuthError('请填写昵称');
        btn.disabled = false;
        updateAuthUI();
        return;
      }
      // 注册
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName }
        }
      });
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          showAuthError('该邮箱已注册，请切换到登录模式');
        } else {
          showAuthError(error.message);
        }
        btn.disabled = false;
        updateAuthUI();
        return;
      }
      // 更新 profile
      if (data.user) {
        await supabaseClient.from('profiles').upsert({
          id: data.user.id,
          display_name: displayName
        });
      }
      showToast('注册成功！请查收邮箱验证邮件（也可直接登录）');
      // 切回登录模式
      authMode = 'login';
      updateAuthUI();
    } else {
      // 登录
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showAuthError('邮箱或密码错误');
        } else if (error.message.includes('Email not confirmed')) {
          showAuthError('邮箱未验证，请检查邮箱中的验证链接');
        } else {
          showAuthError(error.message);
        }
        btn.disabled = false;
        updateAuthUI();
        return;
      }
      // 登录成功 → initMainApp 由 onAuthStateChange 触发
    }
  } catch (e) {
    console.error('认证错误:', e);
    showAuthError('连接失败: ' + (e.message || '未知错误'));
  }

  btn.disabled = false;
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function skipAuth() {
  // 跳过登录，使用 IndexedDB 本地模式
  authMode = 'login';
  await initMainApp();
}

// ---- 用户状态条 ----

async function renderAuthStatus() {
  let user = null;
  let profile = null;

  try {
    user = await getCurrentUser();
    if (user) {
      const { data } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
      profile = data;
    }
  } catch (e) {
    // 离线或未配置 Supabase
  }

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '本地用户';
  const school = profile?.target_school || '未设置目标院校';
  const initial = displayName.charAt(0).toUpperCase();

  // 移除旧的状态条
  const old = document.getElementById('auth-status');
  if (old) old.remove();

  const statusHTML = `
    <div id="auth-status">
      <div class="user-avatar">${initial}</div>
      <div class="user-info">
        <div class="user-name">${displayName}</div>
        <div class="user-detail">${school}</div>
      </div>
      ${user ? `
      <div class="user-menu-wrapper">
        <button class="btn btn-sm btn-secondary" onclick="toggleUserMenu()" style="font-size:0.75rem">☰</button>
        <div class="user-menu-overlay" id="user-menu-overlay" onclick="toggleUserMenu()"></div>
        <div class="user-menu-dropdown" id="user-menu-dropdown">
          <button class="user-menu-item" onclick="startOnboarding()">✏️ 修改目标/科目</button>
          <button class="user-menu-item danger" onclick="handleLogout()">🚪 退出登录</button>
        </div>
      </div>` : ''}
    </div>
  `;

  const dashboard = document.getElementById('view-dashboard');
  const existingTitle = dashboard.querySelector('.section-title');
  if (existingTitle) {
    existingTitle.insertAdjacentHTML('beforebegin', statusHTML);
  }
}

function toggleUserMenu() {
  const overlay = document.getElementById('user-menu-overlay');
  const dropdown = document.getElementById('user-menu-dropdown');
  if (overlay && dropdown) {
    overlay.classList.toggle('open');
    dropdown.classList.toggle('open');
  }
}

async function handleLogout() {
  if (typeof supabaseClient !== 'undefined') {
    await supabaseClient.auth.signOut();
  }
  // onAuthStateChange 会自动调用 showAuthView
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
