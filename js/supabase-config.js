/* ===== Supabase 配置 ===== */
// 从 Supabase Dashboard → Settings → API 获取以下两个值
// Project URL: https://xxxxx.supabase.co
// anon public key: eyJhbGciOiJIUzI1NiIs...

const SUPABASE_URL = 'https://ultnsrirrswsramrhahk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdG5zcmlycnN3c3JhbXJoYWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4OTI5MTMsImV4cCI6MjEwMDQ2ODkxM30.0k__Zt-kvV7Hry-zUfNj5IvwwEGDNymYMDVWOWviG8Q';

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// ---- 认证辅助 ----

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ---- 在线状态检测 ----

function isOnline() {
  return navigator.onLine;
}
