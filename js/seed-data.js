/* ===== 初始数据播种 ===== */
// 数据来源：memory/knowledge-map.md + memory/study-plan.md

const SEED_SUBJECTS = [
  { id: 'math',    name: '数学一', icon: '📐', order: 1, color: '#e74c3c' },
  { id: 'english', name: '英语一', icon: '📖', order: 2, color: '#3498db' },
  { id: 'politics',name: '政治',   icon: '📰', order: 3, color: '#e67e22' },
  { id: 'major',   name: '专业课', icon: '🔧', order: 4, color: '#2ecc71' },
];

const SEED_CHAPTERS = [
  // ---- 数学一 ----
  { id: 'math-1',  subjectId: 'math', name: '函数、极限、连续', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-2',  subjectId: 'math', name: '一元函数微分学', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-3',  subjectId: 'math', name: '一元函数积分学', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-4',  subjectId: 'math', name: '向量代数和空间解析几何', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-5',  subjectId: 'math', name: '多元函数微分学', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-6',  subjectId: 'math', name: '多元函数积分学', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-7',  subjectId: 'math', name: '无穷级数', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-8',  subjectId: 'math', name: '常微分方程', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-9',  subjectId: 'math', name: '行列式', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-10', subjectId: 'math', name: '矩阵', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-11', subjectId: 'math', name: '向量', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-12', subjectId: 'math', name: '线性方程组', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-13', subjectId: 'math', name: '特征值与特征向量', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-14', subjectId: 'math', name: '二次型', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-15', subjectId: 'math', name: '随机事件和概率', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-16', subjectId: 'math', name: '随机变量及其分布', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-17', subjectId: 'math', name: '多维随机变量及其分布', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-18', subjectId: 'math', name: '随机变量的数字特征', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-19', subjectId: 'math', name: '大数定律和中心极限定理', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-20', subjectId: 'math', name: '数理统计的基本概念', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-21', subjectId: 'math', name: '参数估计', status: 'unstarted', masteryLevel: 0 },
  { id: 'math-22', subjectId: 'math', name: '假设检验', status: 'unstarted', masteryLevel: 0 },

  // ---- 英语一 ----
  { id: 'en-1', subjectId: 'english', name: '词汇（大纲 5500）', status: 'unstarted', masteryLevel: 0 },
  { id: 'en-2', subjectId: 'english', name: '长难句分析', status: 'unstarted', masteryLevel: 0 },
  { id: 'en-3', subjectId: 'english', name: '阅读理解 Part A', status: 'unstarted', masteryLevel: 0 },
  { id: 'en-4', subjectId: 'english', name: '阅读理解 Part B（新题型）', status: 'unstarted', masteryLevel: 0 },
  { id: 'en-5', subjectId: 'english', name: '翻译（英译汉）', status: 'unstarted', masteryLevel: 0 },
  { id: 'en-6', subjectId: 'english', name: '完形填空', status: 'unstarted', masteryLevel: 0 },
  { id: 'en-7', subjectId: 'english', name: '小作文', status: 'unstarted', masteryLevel: 0 },
  { id: 'en-8', subjectId: 'english', name: '大作文', status: 'unstarted', masteryLevel: 0 },

  // ---- 政治 ----
  { id: 'pol-1', subjectId: 'politics', name: '马克思主义基本原理', status: 'unstarted', masteryLevel: 0 },
  { id: 'pol-2', subjectId: 'politics', name: '毛泽东思想与中特理论', status: 'unstarted', masteryLevel: 0 },
  { id: 'pol-3', subjectId: 'politics', name: '中国近现代史纲要', status: 'unstarted', masteryLevel: 0 },
  { id: 'pol-4', subjectId: 'politics', name: '思想道德修养与法律基础', status: 'unstarted', masteryLevel: 0 },
  { id: 'pol-5', subjectId: 'politics', name: '形势与政策及当代世界经济', status: 'unstarted', masteryLevel: 0 },

  // ---- 专业课（待确认具体科目后细化） ----
  { id: 'maj-1', subjectId: 'major', name: '待确认-科目未定', status: 'unstarted', masteryLevel: 0 },
];

// 初始化每日计划模板（根据 study-plan.md）
function generateDailyPlanTemplate() {
  return {
    date: todayStr(),
    tasks: [
      { subjectId: 'math',    chapterId: null, description: '数学一基础学习',        allocatedMinutes: 120, completed: false },
      { subjectId: 'english', chapterId: null, description: '英语词汇 / 阅读训练',    allocatedMinutes: 90,  completed: false },
      { subjectId: 'major',   chapterId: null, description: '专业课教材通读',          allocatedMinutes: 90,  completed: false },
      { subjectId: 'politics',chapterId: null, description: '政治（2027秋季开始）',    allocatedMinutes: 0,   completed: false },
    ],
    totalMinutes: 300,
  };
}

// 播种检查与执行
async function checkAndSeed() {
  const seeded = await getSetting('seeded');
  if (seeded) return;

  // 如果用户已登录且有 Supabase，数据会从云端拉取，不需要本地播种
  let hasRemoteData = false;
  if (isOnline() && typeof supabase !== 'undefined') {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { data } = await supabase.from('subjects').select('id').limit(1);
        if (data && data.length > 0) hasRemoteData = true;
      }
    } catch (e) { /* 忽略 */ }
  }

  if (hasRemoteData) {
    // 云端有数据，标记已播种（数据会在 pullAllFromSupabase 中拉取）
    await setSetting('seeded', true);
    return;
  }

  // 离线/跳过登录模式 → 用硬编码默认数据播种
  for (const s of SEED_SUBJECTS) { await saveToStore('subjects', s); }
  for (const c of SEED_CHAPTERS) { await saveToStore('chapters', c); }

  const plan = await getTodayPlan();
  if (!plan) {
    await saveToStore('dailyPlan', generateDailyPlanTemplate());
  }

  await setSetting('dailyHours', 5);
  await setSetting('seeded', true);
}
