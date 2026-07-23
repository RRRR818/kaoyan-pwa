/* ===== 知识图谱页面 ===== */

const STATUS_MAP = {
  'unstarted':  { emoji: '⬜', label: '未开始', color: 'var(--color-unstarted)' },
  'beginning':  { emoji: '🔴', label: '刚开始', color: 'var(--color-beginning)' },
  'in-progress':{ emoji: '🟡', label: '进行中', color: 'var(--color-progress)' },
  'mastered':   { emoji: '🟢', label: '已掌握', color: 'var(--color-mastered)' },
  'expert':     { emoji: '✅', label: '精通',   color: 'var(--color-expert)' },
};

async function renderKnowledgeMap() {
  const container = document.getElementById('knowledge-content');
  const subjects = await dbGetAll('subjects');
  const chapters = await dbGetAll('chapters');

  if (!subjects.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-text">数据加载中...</div></div>';
    return;
  }

  container.innerHTML = subjects.map(sub => {
    const subChapters = chapters.filter(c => c.subjectId === sub.id);
    const started = subChapters.filter(c => c.status !== 'unstarted').length;
    const total = subChapters.length;
    const pct = total > 0 ? Math.round((started / total) * 100) : 0;

    return `
    <div class="subject-card">
      <div class="subject-card-header" onclick="toggleSubjectCard(this)">
        <div class="subject-info">
          <span class="subject-icon">${sub.icon}</span>
          <div>
            <div class="subject-name">${sub.name}</div>
            <div class="subject-progress">${started}/${total} 章节已开始 · ${pct}%</div>
          </div>
        </div>
        <span style="color:var(--color-text-secondary);font-size:0.85rem">▼</span>
      </div>
      <div class="subject-card-body">
        ${subChapters.map(c => {
          const st = STATUS_MAP[c.status] || STATUS_MAP['unstarted'];
          const hasReview = c.nextReview && c.status !== 'expert';
          return `
          <div class="chapter-row" onclick="quickUpdateChapter('${c.id}')">
            <span class="chapter-status">${st.emoji}</span>
            <span class="chapter-name">${c.name}</span>
            <div class="chapter-mastery">
              ${[1,2,3,4,5].map(n =>
                `<div class="mastery-dot ${(c.masteryLevel || 0) >= n ? 'filled' : ''}"
                  style="${(c.masteryLevel || 0) >= n ? 'background:' + sub.color : ''}"></div>`
              ).join('')}
            </div>
            ${hasReview ? `<span class="chapter-next-review">复习: ${c.nextReview}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  // 底部总览
  const totalAll = chapters.length;
  const startedAll = chapters.filter(c => c.status !== 'unstarted').length;
  const masteredAll = chapters.filter(c => c.status === 'mastered' || c.status === 'expert').length;

  container.insertAdjacentHTML('beforeend', `
    <div class="stats-row" style="margin-top:16px">
      <div class="stat-card">
        <div class="stat-value">${totalAll}</div>
        <div class="stat-label">总章节数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${startedAll}</div>
        <div class="stat-label">已开始</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${masteredAll}</div>
        <div class="stat-label">已掌握</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round((masteredAll/totalAll)*100)}%</div>
        <div class="stat-label">总进度</div>
      </div>
    </div>
  `);
}

function toggleSubjectCard(header) {
  const body = header.nextElementSibling;
  body.classList.toggle('open');
  const arrow = header.querySelector('span:last-child');
  if (arrow) {
    arrow.textContent = body.classList.contains('open') ? '▲' : '▼';
  }
}

async function quickUpdateChapter(chapterId) {
  const chapter = await dbGet('chapters', chapterId);
  if (!chapter) return;
  const statuses = ['unstarted', 'beginning', 'in-progress', 'mastered', 'expert'];
  const idx = statuses.indexOf(chapter.status);
  const next = statuses[Math.min(idx + 1, statuses.length - 1)];
  if (next === chapter.status) {
    showToast('已达到最高等级 ✅');
    return;
  }
  chapter.status = next;
  chapter.masteryLevel = statuses.indexOf(next);
  chapter.lastReviewed = todayStr();
  // 设置下次复习
  const intervals = [0, 1, 3, 7, 14, 30];
  chapter.reviewInterval = intervals[statuses.indexOf(next)] || 7;
  chapter.nextReview = formatDate(addDays(new Date(), chapter.reviewInterval));
  chapter.reviewStage = statuses.indexOf(next);

  await dbPut('chapters', chapter);
  // 添加学习日志
  await dbPut('studyLogs', {
    date: todayStr(),
    subjectId: chapter.subjectId,
    chapterId: chapter.id,
    duration: 0,
    activityType: 'study',
    notes: `快速标记: ${STATUS_MAP[next].label}`,
    sourceImageIds: null
  });
  await renderKnowledgeMap();
  showToast(`已更新: ${chapter.name} → ${STATUS_MAP[next].emoji} ${STATUS_MAP[next].label}`);
}
