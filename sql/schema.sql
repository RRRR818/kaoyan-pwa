-- ============================================================
-- 考研助手 PWA - Supabase 数据库建表脚本
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================================

-- 1. 用户档案表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  target_school TEXT,
  target_major TEXT,
  exam_type TEXT,       -- '学硕' or '专硕'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 科目表（每用户独立）
CREATE TABLE subjects (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  "order" INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 3. 章节表（每用户独立，关联科目）
CREATE TABLE chapters (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'unstarted',
  mastery_level INTEGER DEFAULT 0,
  last_reviewed DATE,
  next_review DATE,
  review_interval INTEGER DEFAULT 0,
  review_stage INTEGER DEFAULT 0,
  notes TEXT,
  review_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 4. 学习日志表
CREATE TABLE study_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  subject_id TEXT,
  chapter_id TEXT,
  duration INTEGER DEFAULT 0,
  activity_type TEXT DEFAULT 'study',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 每日计划表
CREATE TABLE daily_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks JSONB DEFAULT '[]'::jsonb,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 6. 设置表
CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- 7. 图片记录表（base64 缩略图 + Storage 路径）
CREATE TABLE images (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  thumbnail_url TEXT,
  storage_path TEXT,
  analyzed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 分析结果表
CREATE TABLE analysis_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) - 所有表按 user_id 隔离
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_user_isolation" ON profiles
  FOR ALL USING (auth.uid() = id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_user_isolation" ON subjects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_user_isolation" ON chapters
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE study_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_logs_user_isolation" ON study_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_plans_user_isolation" ON daily_plans
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_user_isolation" ON settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images_user_isolation" ON images
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analysis_results_user_isolation" ON analysis_results
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 触发器：新用户注册时自动创建 profile
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
