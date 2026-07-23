/* ===== 复习提醒页面 ===== */

// SM-2 简化间隔复习算法
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];

async function renderReview() {
  const container = document.getElementById('review-content');
  const subjects = await dbGetAll('subjects');
  const overdue = await getOverdueReviews();
  const upcoming = await getUpcomingReviews(7);
  const today = todayStr();

  // 今天需要复习的（过期 + 今天）
  const todayReviews = overdue.concat(
    upcoming.filter(c => c.nextReview === today)
  );

  // 未来 7 天（不含今天）
  const futureReviews = upcoming.filter(c => c.nextReview > today);

  // 统计
  const all = await dbGetAll('chapters');
  const needReview = all.filter(c => c.nextReview && c.status !== 'expert');
  const overdueCount = overdue.length;

  container.innerHTML = `
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" style="background:#fff5f5">
        <div class="stat-value" style="color:#e74c3c">${overdueCount}</div>
        <div class="stat-label">已过期</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${todayReviews.length}</div>
        <div class="stat-label">今天待复习</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${needReview.length}</div>
        <div class="stat-label">复习队列中</div>
      </div>
    </div>

    <!-- 今天需要复习的 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📌 今天要复习 (${todayReviews.length})</span>
      </div>
      ${todayReviews.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">今天没有要复习的内容！</div></div>' :
        `<ul class="review-list">${todayReviews.map(c => {
          const sub = subjects.find(s => s.id === c.subjectId);
          const isOverdue = c.nextReview < today;
          return `
          <li class="review-item">
            <span class="review-date" style="color:${isOverdue ? '#e74c3c' : 'var(--color-text-secondary)'}">
              ${isOverdue ? '⚠️ 过期' : '今天'}
            </span>
            <span class="review-subject-dot" style="background:${sub ? sub.color : '#999'}"></span>
            <span class="review-chapter">${c.name}</span>
            <span class="review-interval">间隔 ${c.reviewInterval || 0} 天</span>
            <span class="review-stage-tag">第${c.reviewStage || 1}轮</span>
            <button class="btn btn-sm btn-primary review-action" onclick="doReview('${c.id}', true)">✓</button>
            <button class="btn btn-sm btn-secondary review-action" onclick="doReview('${c.id}', false)">✗</button>
          </li>`;
        }).join('')}</ul>`
      }
    </div>

    <!-- 未来 7 天 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📅 未来 7 天待复习 (${futureReviews.length})</span>
      </div>
      ${futureReviews.length === 0 ? '<div class="empty-state"><div class="empty-state-text">未来一周暂无计划</div></div>' :
        `<ul class="review-list">${futureReviews.slice(0, 15).map(c => {
          const sub = subjects.find(s => s.id === c.subjectId);
          return `
          <li class="review-item">
            <span class="review-date">${c.nextReview}</span>
            <span class="review-subject-dot" style="background:${sub ? sub.color : '#999'}"></span>
            <span class="review-chapter">${c.name}</span>
            <span class="review-interval">间隔 ${c.reviewInterval || 0} 天</span>
          </li>`;
        }).join('')}</ul>`
      }
      ${futureReviews.length > 15 ? `<div style="text-align:center;font-size:0.8rem;color:var(--color-text-secondary);padding:8px">还有 ${futureReviews.length - 15} 项...</div>` : ''}
    </div>

    <!-- 复习统计 -->
    <div class="card">
      <div class="card-header"><span class="card-title">📊 各科复习概览</span></div>
      ${subjects.map(sub => {
        const subChapters = all.filter(c => c.subjectId === sub.id);
        const reviewing = subChapters.filter(c => c.status !== 'unstarted' && c.status !== 'expert');
        const subOverdue = subChapters.filter(c => c.nextReview && c.nextReview < today && c.status !== 'expert');
        const pct = subChapters.length > 0 ? Math.round((subChapters.filter(c => c.status === 'mastered' || c.status === 'expert').length / subChapters.length) * 100) : 0;
        return `
        <div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:0.85rem">${sub.icon} ${sub.name}</span>
            <span style="font-size:0.75rem;color:var(--color-text-secondary)">复习中: ${reviewing.length} · 过期: ${subOverdue.length}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${pct}%;background:${sub.color}"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  // 更新 badge
  updateReviewBadge(overdueCount + todayReviews.length);
}

async function doReview(chapterId, passed) {
  const chapter = await dbGet('chapters', chapterId);
  if (!chapter) return;

  const today = todayStr();

  if (passed) {
    // 通过：晋级到下一个间隔
    chapter.reviewStage = Math.min(5, (chapter.reviewStage || 1) + 1);
    chapter.reviewInterval = REVIEW_INTERVALS[chapter.reviewStage];
    chapter.masteryLevel = Math.min(5, (chapter.masteryLevel || 1) + 1);
    // 如果达到最高阶段，标记为已掌握
    if (chapter.reviewStage >= 5) {
      chapter.status = 'mastered';
    }
  } else {
    // 未通过：重置到第一轮
    chapter.reviewStage = 1;
    chapter.reviewInterval = 1;
    chapter.masteryLevel = Math.max(0, (chapter.masteryLevel || 1) - 1);
  }

  chapter.lastReviewed = today;
  chapter.nextReview = formatDate(addDays(new Date(), chapter.reviewInterval));

  // 记录复习历史
  if (!chapter.reviewHistory) chapter.reviewHistory = [];
  chapter.reviewHistory.push({ date: today, score: passed ? 1 : 0 });

  await dbPut('chapters', chapter);

  // 添加学习日志
  await dbPut('studyLogs', {
    date: today,
    subjectId: chapter.subjectId,
    chapterId: chapter.id,
    duration: 15,
    activityType: 'review',
    notes: passed ? '复习通过 ✅' : '复习未通过，需重来 ❌',
    sourceImageIds: null
  });

  showToast(passed ? `复习通过 ✅ → 下次 ${chapter.nextReview}` : `需要重新复习 ❌ → 明天再来`);
  await renderReview();
}

function updateReviewBadge(count) {
  const badge = document.getElementById('review-badge');
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}
