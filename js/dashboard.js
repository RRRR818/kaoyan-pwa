/* ===== 首页仪表盘 ===== */

async function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  const today = todayStr();
  const plan = await getTodayPlan();
  const logs = await getTodayStudyLogs();
  const overdue = await getOverdueReviews();
  const weakPoints = await getWeakestChapters(3);
  const subjects = await dbGetAll('subjects');

  // 计算今日完成度
  let completedTasks = 0;
  let totalTasks = 0;
  if (plan && plan.tasks) {
    totalTasks = plan.tasks.filter(t => t.allocatedMinutes > 0).length;
    completedTasks = plan.tasks.filter(t => t.completed && t.allocatedMinutes > 0).length;
  }

  // 计算今日已学习时间
  const studiedMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
  const dailyGoal = (await getSetting('dailyHours', 5)) * 60;

  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const timePct = dailyGoal > 0 ? Math.min(100, Math.round((studiedMinutes / dailyGoal) * 100)) : 0;

  // 进度环 SVG
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  container.innerHTML = `
    <!-- 进度卡片 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📊 今日进度</span>
        <span style="font-size:0.78rem;color:var(--color-text-secondary)">${today} ${weekdayName()}</span>
      </div>
      <div class="progress-ring-wrap">
        <svg class="progress-ring" viewBox="0 0 70 70">
          <circle class="progress-ring-circle" cx="35" cy="35" r="28"/>
          <circle class="progress-ring-fill" cx="35" cy="35" r="28"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          <text class="progress-ring-text" x="35" y="35">${pct}%</text>
        </svg>
        <div class="progress-detail">
          <div>任务完成 <span>${completedTasks}/${totalTasks}</span></div>
          <div style="margin-top:4px">
            学习时长 <span>${Math.floor(studiedMinutes/60)}h${studiedMinutes%60}m</span> / ${Math.floor(dailyGoal/60)}h${dailyGoal%60}m
            <div class="progress-bar" style="margin-top:6px">
              <div class="progress-bar-fill" style="width:${timePct}%;background:var(--color-primary)"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 今日任务 -->
    <div class="card">
      <div class="card-header"><span class="card-title">📋 今日任务</span></div>
      ${plan && plan.tasks ? plan.tasks.filter(t => t.allocatedMinutes > 0).map((t, i) => {
        const sub = subjects.find(s => s.id === t.subjectId);
        return `
          <div class="task-item">
            <button class="task-checkbox ${t.completed ? 'done' : ''}"
              onclick="toggleTask('${t.subjectId}', ${i})"
              style="font-family:var(--font-stack)"></button>
            <div class="task-info">
              <div class="task-name">${t.description}</div>
              <div class="task-meta">${sub ? sub.icon : ''} ${sub ? sub.name : t.subjectId} · ${t.allocatedMinutes}分钟</div>
            </div>
            <div class="task-subject-dot" style="background:${sub ? sub.color : '#999'}"></div>
          </div>`;
      }).join('') : '<div class="empty-state"><div class="empty-state-text">今日暂无计划</div></div>'}
    </div>

    <!-- 薄弱点 -->
    ${weakPoints.length > 0 ? `
    <div class="card">
      <div class="card-header"><span class="card-title">⚠️ 需要加强</span></div>
      ${weakPoints.map(c => {
        const sub = subjects.find(s => s.id === c.subjectId);
        return `
        <div class="weak-alert">
          <span class="weak-alert-icon">📌</span>
          <div>
            <strong>${sub ? sub.name : ''} - ${c.name}</strong>
            <div style="font-size:0.78rem;color:var(--color-text-secondary);margin-top:2px">
              掌握度 ${'★'.repeat(c.masteryLevel || 0)}${'☆'.repeat(5 - (c.masteryLevel || 0))}
              ${c.lastReviewed ? ` · 上次复习 ${daysBetween(c.lastReviewed, today)} 天前` : ' · 尚未复习'}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- 待复习提醒 -->
    ${overdue.length > 0 ? `
    <div class="card">
      <div class="card-header">
        <span class="card-title">🔔 待复习 (${overdue.length})</span>
      </div>
      ${overdue.slice(0, 5).map(c => {
        const sub = subjects.find(s => s.id === c.subjectId);
        return `
        <div class="task-item">
          <span>📝</span>
          <div class="task-info">
            <div class="task-name">${c.name}</div>
            <div class="task-meta">${sub ? sub.name : ''} · 原定 ${c.nextReview}</div>
          </div>
        </div>`;
      }).join('')}
      ${overdue.length > 5 ? `<div style="text-align:center;font-size:0.8rem;color:var(--color-text-secondary);padding:8px">还有 ${overdue.length - 5} 项...</div>` : ''}
    </div>` : `
    <div class="card">
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-text">暂无待复习内容，继续保持！</div>
      </div>
    </div>`}
  `;
}

async function toggleTask(subjectId, taskIndex) {
  const plan = await getTodayPlan();
  if (!plan || !plan.tasks) return;
  const task = plan.tasks[taskIndex];
  if (!task) return;
  task.completed = !task.completed;
  await saveToStore('dailyPlan', plan);
  await renderDashboard();
}

function weekdayName() {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[new Date().getDay()];
}
