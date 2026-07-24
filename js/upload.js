/* ===== 学习记录页面 ===== */

const MAX_IMAGE_WIDTH = 1024;
const JPEG_QUALITY = 0.7;

async function renderUpload() {
  const container = document.getElementById('upload-content');
  const images = await dbGetAll('images');
  const subjects = await dbGetAll('subjects');
  const chapters = await dbGetAll('chapters');
  const todayLogs = await getTodayStudyLogs();

  // 今天已记录
  const todayImages = images.filter(img => img.date === todayStr());
  const todayLogSummary = todayLogs.length > 0
    ? todayLogs.map(l => {
        const sub = subjects.find(s => s.id === l.subjectId);
        const ch = chapters.find(c => c.id === l.chapterId);
        return `${sub ? sub.icon : ''} ${ch ? ch.name : '自由学习'} (${l.duration || 0}分钟)${l.notes ? ' - ' + l.notes : ''}`;
      }).join('<br>')
    : '';

  container.innerHTML = `
    <!-- 操作按钮 -->
    <div class="upload-actions">
      <button class="upload-btn" onclick="captureImage()">
        <span class="upload-btn-icon">📸</span>
        <span>拍照记录</span>
      </button>
      <button class="upload-btn" onclick="selectImage()">
        <span class="upload-btn-icon">🖼️</span>
        <span>从相册选择</span>
      </button>
    </div>

    <input type="file" id="camera-input" accept="image/*" capture="environment" style="display:none" onchange="handleImageSelect(event)">
    <input type="file" id="gallery-input" accept="image/*" style="display:none" onchange="handleImageSelect(event)">

    <!-- 手动打卡 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">✍️ 手动记录学习</span>
      </div>
      <div class="manual-log-form">
        <select id="log-subject" onchange="updateLogChapters()">
          <option value="">选择科目...</option>
          ${subjects.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}
        </select>
        <select id="log-chapter">
          <option value="">选择章节（可选）</option>
        </select>
        <input type="number" id="log-duration" placeholder="学习时长（分钟）" min="1" max="600" value="60">
        <textarea id="log-notes" placeholder="学到了什么？有什么疑问？（可选）"></textarea>
        <button class="btn btn-primary btn-block" onclick="submitManualLog()">💾 保存记录</button>
      </div>
    </div>

    <!-- 今日已记录 -->
    ${todayLogSummary ? `
    <div class="card">
      <div class="card-header"><span class="card-title">✅ 今日已记录</span></div>
      <div style="font-size:0.85rem;line-height:1.8">${todayLogSummary}</div>
    </div>` : ''}

    <!-- 生成 Claude 分析提示 -->
    ${todayImages.length > 0 ? `
    <div class="prompt-box">
      <div class="card-header" style="margin-bottom:8px">
        <span class="card-title">🤖 在 Claude Code 中分析</span>
      </div>
      <p style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:8px">
        复制下面的提示词，粘贴到 Claude Code 对话中，同时拖动今天拍的照片到对话框
      </p>
      <div class="prompt-text" id="analysis-prompt">${buildAnalysisPrompt(todayImages, subjects, chapters)}</div>
      <button class="btn btn-primary btn-block" onclick="copyPrompt()">📋 一键复制提示词</button>
    </div>` : ''}

    <!-- 导入 Claude 分析结果 -->
    <div class="card import-area">
      <div class="card-header"><span class="card-title">📥 导入分析结果</span></div>
      <p style="font-size:0.78rem;color:var(--color-text-secondary);margin-bottom:8px">
        支持创建新科目/章节（教材导入）或更新已有章节（错题分析）。粘贴 Claude 返回的 JSON：
      </p>
      <textarea id="import-json" placeholder='[{"chapterId": "math-2", "status": "in-progress", "masteryLevel": 2, "gaps": ["链式法则"], "suggestions": "建议..."}]'></textarea>
      <button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="importAnalysis()">📥 导入并更新知识图谱</button>
    </div>

    <!-- 照片墙 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <span class="card-title">🖼️ 照片记录 (${images.length})</span>
      </div>
      <div class="image-gallery" id="image-gallery">
        ${images.length === 0 ? '<div class="gallery-empty">还没有拍过照片</div>' :
          images.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30).map(img => `
          <div class="gallery-item" onclick="viewImage('${img.id}')">
            <img src="${img.thumbnailUrl || img.dataUrl}" alt="学习笔记" loading="lazy">
            <div class="gallery-item-date">${img.date}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildAnalysisPrompt(images, subjects, chapters) {
  const today = todayStr();
  const inProgress = chapters.filter(c => c.status !== 'unstarted').map(c => {
    const sub = subjects.find(s => s.id === c.subjectId);
    return `${sub ? sub.name : ''} - ${c.name} (${STATUS_MAP[c.status]?.label || '未知'})`;
  }).join('、');

  return `请分析我今天的考研学习笔记（共 ${images.length} 张照片）。

【我的背景】
- 学校：郑州大学工业工程专业
- 目标：浙江大学机械工程研究生（2027年12月考）
- 考试科目：数学一、英语一、政治、专业课
- 当前阶段：基础阶段

【当前学习进度】
${inProgress || '各科均未开始'}

【请按以下 JSON 格式返回分析结果】
[
  {
    "chapterId": "章节ID（如 math-2, en-1 等）",
    "identifiedSubject": "数学一",
    "identifiedChapter": "一元函数微分学",
    "correctness": "correct/partial/incorrect",
    "gaps": ["发现的知识漏洞"],
    "suggestions": "学习建议"
  }
]

章节ID参考：math-1~math-22（数学各章）, en-1~en-8（英语各模块）, pol-1~pol-5（政治）, maj-1（专业课）`;
}

async function captureImage() {
  document.getElementById('camera-input').click();
}

async function selectImage() {
  document.getElementById('gallery-input').click();
}

async function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showToast('正在压缩图片...');
    const compressed = await compressImage(file);
    const thumbnail = await createThumbnail(compressed);
    const imgRecord = {
      dataUrl: compressed,
      thumbnailUrl: thumbnail,
      date: todayStr(),
      analyzed: false
    };
    await saveToStore('images', imgRecord);
    showToast('照片已保存 ✅');
    await renderUpload();
  } catch (e) {
    showToast('图片处理失败，请重试');
    console.error(e);
  }
  event.target.value = '';
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > MAX_IMAGE_WIDTH) { h = (h / w) * MAX_IMAGE_WIDTH; w = MAX_IMAGE_WIDTH; }
        if (h > MAX_IMAGE_WIDTH) { w = (w / h) * MAX_IMAGE_WIDTH; h = MAX_IMAGE_WIDTH; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function createThumbnail(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function copyPrompt() {
  const text = document.getElementById('analysis-prompt').textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('提示词已复制 ✅ 请粘贴到 Claude Code'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('提示词已复制 ✅ 请粘贴到 Claude Code');
  }
}

async function submitManualLog() {
  const subjectId = document.getElementById('log-subject').value;
  const chapterId = document.getElementById('log-chapter').value;
  const duration = parseInt(document.getElementById('log-duration').value) || 0;
  const notes = document.getElementById('log-notes').value.trim();

  if (!subjectId) { showToast('请选择科目'); return; }
  if (duration <= 0) { showToast('请输入有效时长'); return; }

  const logEntry = {
    date: todayStr(),
    subjectId,
    chapterId: chapterId || null,
    duration,
    activityType: 'study',
    notes: notes || null,
    sourceImageIds: null
  };
  await saveToStore('studyLogs', logEntry);

  // 如果选了章节，更新章节状态
  if (chapterId) {
    const chapter = await dbGet('chapters', chapterId);
    if (chapter && chapter.status === 'unstarted') {
      chapter.status = 'beginning';
      chapter.masteryLevel = 1;
      chapter.lastReviewed = todayStr();
      chapter.nextReview = formatDate(addDays(new Date(), 1));
      chapter.reviewInterval = 1;
      chapter.reviewStage = 1;
      await saveToStore('chapters', chapter);
    }
  }

  // 清理表单
  document.getElementById('log-duration').value = 60;
  document.getElementById('log-notes').value = '';
  showToast(`已记录 ${duration} 分钟学习 ✅`);
  await renderUpload();
}

async function updateLogChapters() {
  const subjectId = document.getElementById('log-subject').value;
  const chapterSelect = document.getElementById('log-chapter');
  chapterSelect.innerHTML = '<option value="">选择章节（可选）</option>';
  if (!subjectId) return;
  const chapters = await getChaptersBySubject(subjectId);
  chapterSelect.innerHTML += chapters.map(c =>
    `<option value="${c.id}">${STATUS_MAP[c.status]?.emoji || '⬜'} ${c.name}</option>`
  ).join('');
}

async function viewImage(imageId) {
  const img = await dbGet('images', imageId);
  if (!img) return;
  const modal = document.getElementById('image-modal');
  document.getElementById('modal-image').src = img.dataUrl;
  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('image-modal').classList.add('hidden');
}

async function importAnalysis() {
  const raw = document.getElementById('import-json').value.trim();
  if (!raw) { showToast('请粘贴 Claude 返回的 JSON'); return; }
  try {
    const results = JSON.parse(raw);
    if (!Array.isArray(results)) throw new Error('需要数组格式');

    let created = 0;
    let updated = 0;

    for (const r of results) {
      // ---- 模式1：创建新科目 + 章节（教材导入）----
      if (r.subject && r.subject.name && r.subject.chapters) {
        await createSubjectFromImport(r.subject);
        created++;
        continue;
      }

      // ---- 模式2：更新已有章节（错题分析）----
      if (!r.chapterId) continue;
      const chapter = await dbGet('chapters', r.chapterId);
      if (!chapter) continue;

      if (r.status) chapter.status = r.status;
      if (r.masteryLevel !== undefined) chapter.masteryLevel = r.masteryLevel;
      chapter.lastReviewed = todayStr();
      const intervals = [0, 1, 3, 7, 14, 30];
      chapter.reviewStage = Math.min(5, (chapter.reviewStage || 0) + 1);
      chapter.reviewInterval = intervals[chapter.reviewStage] || 30;
      chapter.nextReview = formatDate(addDays(new Date(), chapter.reviewInterval));
      if (r.gaps || r.suggestions) {
        chapter.notes = (chapter.notes || '') + `\n[${todayStr()}] 薄弱点: ${(r.gaps || []).join(', ')}; 建议: ${r.suggestions || ''}`;
      }
      await saveToStore('chapters', chapter);
      updated++;
    }

    let msg = '';
    if (created > 0) msg += `创建 ${created} 个科目 ✅ `;
    if (updated > 0) msg += `更新 ${updated} 个章节 ✅`;
    if (!msg) msg = '没有可导入的数据';
    showToast(msg);
    document.getElementById('import-json').value = '';
    await renderUpload();
    await renderKnowledgeMap();
    await renderReview();
  } catch (e) {
    showToast('JSON 格式错误，请检查后重试');
    console.error(e);
  }
}

// 从导入 JSON 创建新科目和章节
async function createSubjectFromImport(sub) {
  const existing = await dbGetAll('subjects');
  const maxOrder = existing.reduce((max, s) => Math.max(max, s.order || 0), 0);

  const subject = {
    id: 'import-' + Date.now(),
    name: sub.name,
    icon: sub.icon || '📚',
    order: maxOrder + 1,
    color: sub.color || '#1a73e8'
  };
  await saveToStore('subjects', subject);

  // 创建章节
  for (let i = 0; i < sub.chapters.length; i++) {
    const chName = sub.chapters[i];
    const chapter = {
      id: subject.id + '-ch-' + (i + 1),
      subjectId: subject.id,
      name: chName,
      status: 'unstarted',
      masteryLevel: 0,
      reviewStage: 0
    };
    await saveToStore('chapters', chapter);
  }
}

// 更新提示词生成，教 Claude 输出正确格式
function buildAnalysisPrompt(images, subjects, chapters) {
  const today = todayStr();
  const inProgress = chapters.filter(c => c.status !== 'unstarted').map(c => {
    const sub = subjects.find(s => s.id === c.subjectId);
    return `${sub ? sub.name : ''} - ${c.name} (${STATUS_MAP[c.status]?.label || '未知'})`;
  }).join('、');

  // 现有科目列表
  const subjectList = subjects.map(s => `${s.icon} ${s.name} (ID: ${s.id})`).join('\n');
  const chapterList = chapters.slice(0, 20).map(c => {
    const sub = subjects.find(s => s.id === c.subjectId);
    return `${sub ? sub.name : ''} > ${c.name} (ID: ${c.id})`;
  }).join('\n');

  return `请分析我今天的考研学习笔记（共 ${images.length} 张照片）。

【我的背景】
- 目标：考研备考（2027年12月考）
- 当前阶段：基础阶段

【当前学习进度】
${inProgress || '各科均未开始'}

【已有科目】
${subjectList}

【已有章节（前20个）】
${chapterList}

【请按以下 JSON 格式返回】

## 如果是错题分析（更新已有章节）：
[
  {
    "chapterId": "章节ID（见上方已有章节列表）",
    "identifiedSubject": "科目名称",
    "identifiedChapter": "章节名称",
    "correctness": "correct/partial/incorrect",
    "gaps": ["发现的知识漏洞"],
    "suggestions": "学习建议"
  }
]

## 如果是导入教材（创建新科目和章节）：
[
  {
    "subject": {
      "name": "机械设计基础",
      "icon": "🔧",
      "color": "#2ecc71",
      "chapters": [
        "第一章 绪论",
        "第二章 机械零件设计概论",
        "第三章 连接",
        "...所有章节按顺序列出..."
      ]
    }
  }
]

两种格式可以混在同一个 JSON 数组里。请根据照片内容选择正确的格式。`;
}
