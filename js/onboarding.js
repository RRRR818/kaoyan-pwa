/* ===== 引导页 ===== */

let onboardingStep = 0;
let onboardingData = {
  displayName: '',
  targetSchool: '',
  targetMajor: '',
  selectedSubjects: [],   // [{ id, name, icon, color, chapters: [...] }]
};

// 预设科目模板
const EXAM_SUBJECTS = [
  {
    id: 'math-1', name: '数学一', icon: '📐', color: '#e74c3c',
    chapters: ['函数、极限、连续', '一元函数微分学', '一元函数积分学', '向量代数和空间解析几何', '多元函数微分学', '多元函数积分学', '无穷级数', '常微分方程', '行列式', '矩阵', '向量', '线性方程组', '特征值与特征向量', '二次型', '随机事件和概率', '随机变量及其分布', '多维随机变量及其分布', '随机变量的数字特征', '大数定律和中心极限定理', '数理统计的基本概念', '参数估计', '假设检验']
  },
  {
    id: 'math-2', name: '数学二', icon: '📐', color: '#e74c3c',
    chapters: ['函数、极限、连续', '一元函数微分学', '一元函数积分学', '多元函数微分学', '多元函数积分学', '常微分方程', '行列式', '矩阵', '向量', '线性方程组', '特征值与特征向量', '二次型']
  },
  {
    id: 'math-3', name: '数学三', icon: '📐', color: '#e74c3c',
    chapters: ['函数、极限、连续', '一元函数微分学', '一元函数积分学', '多元函数微分学', '多元函数积分学', '无穷级数', '常微分方程', '行列式', '矩阵', '向量', '线性方程组', '特征值与特征向量', '二次型', '随机事件和概率', '随机变量及其分布', '多维随机变量及其分布', '随机变量的数字特征', '大数定律和中心极限定理', '数理统计的基本概念', '参数估计']
  },
  {
    id: 'english-1', name: '英语一', icon: '📖', color: '#3498db',
    chapters: ['词汇（大纲 5500）', '长难句分析', '阅读理解 Part A', '阅读理解 Part B（新题型）', '翻译（英译汉）', '完形填空', '小作文', '大作文']
  },
  {
    id: 'english-2', name: '英语二', icon: '📖', color: '#3498db',
    chapters: ['词汇（大纲 5500）', '长难句分析', '阅读理解 Part A', '阅读理解 Part B（新题型）', '翻译（英译汉）', '完形填空', '小作文', '大作文']
  },
  {
    id: 'politics', name: '政治', icon: '📰', color: '#e67e22',
    chapters: ['马克思主义基本原理', '毛泽东思想与中特理论', '中国近现代史纲要', '思想道德修养与法律基础', '形势与政策及当代世界经济']
  },
];

// 专业课颜色池
const MAJOR_COLORS = ['#2ecc71', '#9b59b6', '#1abc9c', '#e91e63', '#ff9800', '#00bcd4'];

async function renderOnboarding() {
  const container = document.getElementById('onboarding-content');
  const steps = [
    renderStepProfile,
    renderStepSubjects,
    renderStepChapters,
    renderStepConfirm
  ];

  container.innerHTML = steps[onboardingStep]();

  // 绑定事件
  if (onboardingStep === 1) bindSubjectEvents();
  if (onboardingStep === 2) bindChapterEvents();
}

function renderStepProfile() {
  return `
    <div class="onboarding-step-title">👋 欢迎！先来认识一下</div>
    <div class="onboarding-step-desc">这些信息帮助我们为你定制专属学习计划</div>
    <div class="auth-field">
      <label>你的昵称</label>
      <input type="text" id="ob-name" placeholder="例如：小明" value="${escHtml(onboardingData.displayName)}">
    </div>
    <div class="auth-field">
      <label>目标院校</label>
      <input type="text" id="ob-school" placeholder="例如：浙江大学" value="${escHtml(onboardingData.targetSchool)}">
    </div>
    <div class="auth-field">
      <label>目标专业</label>
      <input type="text" id="ob-major" placeholder="例如：机械工程" value="${escHtml(onboardingData.targetMajor)}">
    </div>
    <div class="onboarding-nav">
      <button class="btn btn-primary btn-block" onclick="onboardingNext()">下一步 →</button>
    </div>
  `;
}

function renderStepSubjects() {
  const items = EXAM_SUBJECTS.map(s => {
    const checked = onboardingData.selectedSubjects.some(ss => ss.id === s.id);
    return `
    <label class="onboarding-subject-item ${checked ? 'selected' : ''}">
      <input type="checkbox" value="${s.id}" ${checked ? 'checked' : ''} onchange="toggleSubject('${s.id}', this.checked)">
      <span class="onboarding-subject-icon">${s.icon}</span>
      <div class="onboarding-subject-info">
        <div class="onboarding-subject-name">${s.name}</div>
        <div class="onboarding-subject-variant">${s.chapters.length} 章节预置</div>
      </div>
    </label>`;
  }).join('');

  // 自定义专业课
  const customCount = onboardingData.selectedSubjects.filter(s => s.id.startsWith('custom-')).length;
  const customSubjects = onboardingData.selectedSubjects.filter(s => s.id.startsWith('custom-')).map((s, i) => `
    <div class="onboarding-subject-item selected" style="justify-content:space-between">
      <div style="display:flex;align-items:center;gap:12px;flex:1">
        <span class="onboarding-subject-icon">🔧</span>
        <div class="onboarding-subject-info">
          <div class="onboarding-subject-name">${escHtml(s.name)}</div>
        </div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="removeCustomSubject(${i})" style="flex-shrink:0">✕</button>
    </div>
  `).join('');

  return `
    <div class="onboarding-step-title">📚 选择你的考试科目</div>
    <div class="onboarding-step-desc">勾选你要考的科目（可多选）</div>
    <div class="onboarding-subjects">${items}</div>
    ${customSubjects ? `<div style="margin-top:12px">${customSubjects}</div>` : ''}
    <div id="custom-subject-form" style="display:none;margin-top:12px">
      <div class="auth-field">
        <input type="text" id="custom-subject-name" placeholder="输入专业课名称（如：机械设计基础）">
      </div>
      <button class="btn btn-sm btn-secondary" onclick="addCustomSubject()">+ 添加专业课</button>
    </div>
    <button class="btn btn-sm btn-secondary btn-block" style="margin-top:8px" onclick="showCustomSubjectForm()">🔧 + 添加自定义专业课</button>
    <div class="onboarding-nav">
      <button class="btn btn-secondary" onclick="onboardingPrev()">← 上一步</button>
      <button class="btn btn-primary" style="flex:1" onclick="onboardingNext()">下一步 →</button>
    </div>
  `;
}

function renderStepChapters() {
  if (!onboardingData.selectedSubjects.length) {
    onboardingPrev();
    return '';
  }

  const currentSub = onboardingData.selectedSubjects[0];
  const chapters = currentSub.chapters || [];
  return `
    <div class="onboarding-step-title">📝 确认章节结构</div>
    <div class="onboarding-step-desc">
      当前科目：<strong>${escHtml(currentSub.name)}</strong><br>
      你可以修改、添加或删除章节（每行一个章节名）
    </div>
    <div class="onboarding-chapter-input">
      <textarea id="ob-chapters">${chapters.join('\n')}</textarea>
      <div class="onboarding-chapter-hint">每行一个章节名称，共 ${chapters.length} 个章节</div>
    </div>
    <div class="onboarding-nav">
      <button class="btn btn-secondary" onclick="onboardingPrev()">← 上一步</button>
      <button class="btn btn-primary" style="flex:1" onclick="onboardingNext()">下一步 →</button>
    </div>
  `;
}

function renderStepConfirm() {
  const subs = onboardingData.selectedSubjects.map(s => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:0.85rem">
      <span>${s.icon}</span>
      <span style="flex:1">${escHtml(s.name)}</span>
      <span style="color:var(--color-text-secondary)">${s.chapters.length} 章</span>
    </div>
  `).join('');

  return `
    <div class="onboarding-step-title">✅ 确认你的学习档案</div>
    <div style="margin:16px 0;font-size:0.9rem;line-height:1.8">
      <div><strong>昵称：</strong>${escHtml(onboardingData.displayName) || '未填写'}</div>
      <div><strong>目标院校：</strong>${escHtml(onboardingData.targetSchool) || '未填写'}</div>
      <div><strong>目标专业：</strong>${escHtml(onboardingData.targetMajor) || '未填写'}</div>
    </div>
    <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin:12px 0">
      <div style="font-weight:600;margin-bottom:8px;font-size:0.9rem">考试科目（${onboardingData.selectedSubjects.length} 科）</div>
      ${subs}
    </div>
    <div class="onboarding-nav">
      <button class="btn btn-secondary" onclick="onboardingPrev()">← 上一步</button>
      <button class="btn btn-primary" style="flex:1" onclick="completeOnboarding()">🎉 完成设置，开始学习</button>
    </div>
  `;
}

// ---- 事件处理 ----

function bindSubjectEvents() {
  // 初始化自定义专业课表单
}

function bindChapterEvents() {
  // 章节编辑初始化
}

function toggleSubject(id, checked) {
  if (checked) {
    const template = EXAM_SUBJECTS.find(s => s.id === id);
    if (template) {
      onboardingData.selectedSubjects.push({
        ...template,
        chapters: [...template.chapters]
      });
    }
  } else {
    onboardingData.selectedSubjects = onboardingData.selectedSubjects.filter(s => s.id !== id);
  }
  renderOnboarding();
}

function showCustomSubjectForm() {
  document.getElementById('custom-subject-form').style.display = 'block';
}

function addCustomSubject() {
  const input = document.getElementById('custom-subject-name');
  const name = input.value.trim();
  if (!name) { showToast('请输入专业课名称'); return; }

  const idx = onboardingData.selectedSubjects.filter(s => s.id.startsWith('custom-')).length;
  const color = MAJOR_COLORS[idx % MAJOR_COLORS.length];

  onboardingData.selectedSubjects.push({
    id: `custom-${Date.now()}`,
    name: name,
    icon: '🔧',
    color: color,
    chapters: ['第1章', '第2章', '第3章']
  });

  input.value = '';
  document.getElementById('custom-subject-form').style.display = 'none';
  renderOnboarding();
}

function removeCustomSubject(index) {
  const customSubjects = onboardingData.selectedSubjects.filter(s => s.id.startsWith('custom-'));
  const toRemove = customSubjects[index];
  if (toRemove) {
    onboardingData.selectedSubjects = onboardingData.selectedSubjects.filter(s => s.id !== toRemove.id);
  }
  renderOnboarding();
}

function onboardingNext() {
  // Step 0 → 1: 读取 profile
  if (onboardingStep === 0) {
    onboardingData.displayName = document.getElementById('ob-name').value.trim();
    onboardingData.targetSchool = document.getElementById('ob-school').value.trim();
    onboardingData.targetMajor = document.getElementById('ob-major').value.trim();
    if (!onboardingData.displayName) { showToast('请填写昵称'); return; }
  }

  // Step 1 → 2: 检查是否选了科目
  if (onboardingStep === 1) {
    if (!onboardingData.selectedSubjects.length) { showToast('请至少选择一个科目'); return; }
    onboardingStep++;
    renderOnboarding();
    return;
  }

  // Step 2 → 3: 保存章节修改
  if (onboardingStep === 2) {
    const ta = document.getElementById('ob-chapters');
    if (ta) {
      const lines = ta.value.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length) {
        onboardingData.selectedSubjects[0].chapters = lines;
      }
    }
    onboardingStep++;
    renderOnboarding();
    return;
  }

  onboardingStep = Math.min(onboardingStep + 1, 3);
  renderOnboarding();
}

function onboardingPrev() {
  onboardingStep = Math.max(onboardingStep - 1, 0);
  renderOnboarding();
}

async function completeOnboarding() {
  const user = await getCurrentUser();
  const btn = document.querySelector('#onboarding-content .btn-primary:last-child');
  if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }

  try {
    // 保存 profile 到 Supabase
    if (user && typeof supabaseClient !== 'undefined') {
      await supabaseClient.from('profiles').upsert({
        id: user.id,
        display_name: onboardingData.displayName,
        target_school: onboardingData.targetSchool,
        target_major: onboardingData.targetMajor
      });
    }

    // 保存科目和章节
    for (let i = 0; i < onboardingData.selectedSubjects.length; i++) {
      const sub = onboardingData.selectedSubjects[i];
      const subjectRecord = {
        id: sub.id,
        name: sub.name,
        icon: sub.icon,
        order: i + 1,
        color: sub.color
      };
      await saveToStore('subjects', subjectRecord);

      // 保存章节
      for (let j = 0; j < sub.chapters.length; j++) {
        const chName = sub.chapters[j];
        const chapterRecord = {
          id: `${sub.id}-ch-${j + 1}`,
          subjectId: sub.id,
          name: chName,
          status: 'unstarted',
          masteryLevel: 0,
          reviewStage: 0
        };
        await saveToStore('chapters', chapterRecord);
      }
    }

    // 生成今日计划
    const plan = {
      date: todayStr(),
      tasks: onboardingData.selectedSubjects.map(s => ({
        subjectId: s.id,
        chapterId: null,
        description: `${s.name} 基础学习`,
        allocatedMinutes: s.id === 'politics' ? 0 : 90,
        completed: false
      })),
      totalMinutes: onboardingData.selectedSubjects.filter(s => s.id !== 'politics').length * 90
    };
    await saveToStore('dailyPlan', plan);

    // 标记已完成引导
    await setSetting('onboarding_done', true);

    showToast('设置完成！🎉');

    // 隐藏引导页，显示主界面
    document.getElementById('view-onboarding').classList.remove('active');
    document.getElementById('bottom-nav').classList.remove('hidden');
    document.getElementById('app-header').classList.remove('hidden');

    // 渲染
    await renderAuthStatus();
    await renderDashboard();

  } catch (e) {
    console.error('保存引导数据失败:', e);
    showToast('保存失败，请重试');
    if (btn) { btn.disabled = false; btn.textContent = '🎉 完成设置，开始学习'; }
  }
}

async function startOnboarding() {
  // 从用户菜单触发：重新设置目标/科目
  toggleUserMenu(); // 关闭菜单

  // 读取现有数据预填充
  const user = await getCurrentUser();
  if (user && typeof supabaseClient !== 'undefined') {
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      onboardingData.displayName = profile.display_name || '';
      onboardingData.targetSchool = profile.target_school || '';
      onboardingData.targetMajor = profile.target_major || '';
    }
  }
  const existingSubjects = await dbGetAll('subjects');
  if (existingSubjects.length) {
    onboardingData.selectedSubjects = existingSubjects.map(s => ({ ...s, chapters: [] }));
  }

  onboardingStep = 0;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-onboarding').classList.add('active');
  document.getElementById('bottom-nav').classList.add('hidden');
  await renderOnboarding();
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
