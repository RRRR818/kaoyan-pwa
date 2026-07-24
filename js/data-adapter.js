/* ===== 数据适配层 =====
 * 写入：同时写 Supabase（在线）和 IndexedDB（始终）
 * 读取：直接从 IndexedDB 读取（性能最优，离线可用）
 * 同步：登录时从 Supabase 拉取全量数据覆盖 IDB
 */

// ---- 映射：IDB store 名 → Supabase 表名 ----
const STORE_TO_TABLE = {
  'subjects':        'subjects',
  'chapters':        'chapters',
  'studyLogs':       'study_logs',
  'dailyPlan':       'daily_plans',
  'settings':        'settings',
  'images':          'images',
  'analysisResults': 'analysis_results'
};

// ---- 统一写入 ----

async function saveToStore(storeName, data) {
  // 先写 IndexedDB（必定成功，离线保险）
  const id = await dbPut(storeName, data);

  // 如果在线且有 Supabase，同步写入云端
  if (isOnline() && typeof supabaseClient !== 'undefined') {
    try {
      const tableName = STORE_TO_TABLE[storeName] || storeName;
      const user = await getCurrentUser();
      if (!user) return id;

      // 附加 user_id
      const row = { ...data, user_id: user.id };

      // daily_plans 表的 upsert key 是 (user_id, date)
      if (tableName === 'daily_plans') {
        await supabaseClient.from(tableName).upsert(row, { onConflict: 'user_id,date' });
      } else if (tableName === 'settings') {
        await supabaseClient.from(tableName).upsert(row, { onConflict: 'user_id,key' });
      } else if (tableName === 'subjects' || tableName === 'chapters') {
        // 这些表的 PK 是 (user_id, id)，id 由业务代码生成（如 'math-1'）
        await supabaseClient.from(tableName).upsert(row, { onConflict: 'user_id,id' });
      } else {
        await supabaseClient.from(tableName).upsert(row);
      }
    } catch (e) {
      console.warn('Supabase 写入失败，数据仅在本地:', e.message);
      await enqueueSyncOp(storeName, 'put', data);
    }
  } else if (isOnline() && typeof supabaseClient === 'undefined') {
    // Supabase 未配置，仅本地
  } else {
    // 离线 → 加入同步队列
    await enqueueSyncOp(storeName, 'put', data);
  }

  return id;
}

async function deleteFromStore(storeName, id) {
  await dbDelete(storeName, id);

  if (isOnline() && typeof supabaseClient !== 'undefined') {
    try {
      const tableName = STORE_TO_TABLE[storeName] || storeName;
      await supabaseClient.from(tableName).delete().eq('id', id);
    } catch (e) {
      await enqueueSyncOp(storeName, 'delete', { id });
    }
  } else if (!isOnline()) {
    await enqueueSyncOp(storeName, 'delete', { id });
  }
}

// ---- 离线同步队列 ----

async function enqueueSyncOp(storeName, operation, data) {
  try {
    await dbPut('syncQueue', {
      storeName,
      operation,
      data: JSON.stringify(data),
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn('同步队列入队失败:', e.message);
  }
}

async function flushSyncQueue() {
  if (!isOnline() || typeof supabaseClient === 'undefined') return;

  const queue = await dbGetAll('syncQueue');
  if (!queue.length) return;

  // 按时间排序
  queue.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  for (const item of queue) {
    try {
      const user = await getCurrentUser();
      if (!user) continue;

      const tableName = STORE_TO_TABLE[item.storeName] || item.storeName;
      const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      const row = { ...data, user_id: user.id };

      if (item.operation === 'put') {
        if (tableName === 'daily_plans') {
          await supabaseClient.from(tableName).upsert(row, { onConflict: 'user_id,date' });
        } else if (tableName === 'settings') {
          await supabaseClient.from(tableName).upsert(row, { onConflict: 'user_id,key' });
        } else if (tableName === 'subjects' || tableName === 'chapters') {
          await supabaseClient.from(tableName).upsert(row, { onConflict: 'user_id,id' });
        } else {
          await supabaseClient.from(tableName).upsert(row);
        }
      } else if (item.operation === 'delete') {
        await supabaseClient.from(tableName).delete().eq('id', data.id);
      }

      await dbDelete('syncQueue', item.id);
    } catch (e) {
      console.warn('同步项失败，停止冲洗:', e.message);
      break;
    }
  }
}

// ---- 从 Supabase 拉取全量数据 ----

async function pullAllFromSupabase() {
  if (!isOnline() || typeof supabaseClient === 'undefined') return;
  const user = await getCurrentUser();
  if (!user) return;

  const tables = ['subjects', 'chapters', 'study_logs', 'daily_plans', 'settings', 'images', 'analysis_results'];
  const storeNames = ['subjects', 'chapters', 'studyLogs', 'dailyPlan', 'settings', 'images', 'analysisResults'];

  for (let i = 0; i < tables.length; i++) {
    try {
      const { data, error } = await supabaseClient.from(tables[i]).select('*');
      if (error) { console.warn(`拉取 ${tables[i]} 失败:`, error.message); continue; }
      if (!data || !data.length) continue;

      for (const row of data) {
        const { user_id, created_at, ...clean } = row;
        await dbPut(storeNames[i], clean);
      }
    } catch (e) {
      console.warn(`拉取 ${tables[i]} 异常:`, e.message);
    }
  }

  await setSetting('last_sync', new Date().toISOString());
  console.log('✅ 从 Supabase 同步完成');
}

// ---- 网络监听 ----

function setupSyncListeners() {
  let wasOffline = !isOnline();

  window.addEventListener('online', async () => {
    if (wasOffline) {
      showToast('📡 网络恢复，正在同步...');
      await flushSyncQueue();
      await pullAllFromSupabase();
      showToast('✅ 同步完成');
    }
    wasOffline = false;
  });

  window.addEventListener('offline', () => {
    wasOffline = true;
    showToast('📡 已切换到离线模式');
  });
}
