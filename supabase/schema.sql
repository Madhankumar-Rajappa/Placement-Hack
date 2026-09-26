-- ============================================================
-- PlacementOS — Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '',
  degree TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  graduation_year INTEGER NOT NULL DEFAULT 2025,
  cgpa NUMERIC(4,2),
  target_role TEXT DEFAULT '',
  target_companies TEXT[] DEFAULT '{}',
  preferred_language TEXT DEFAULT 'English',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── Resumes ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resumes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  parsed_text TEXT,
  analysis_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Jobs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Software Engineer',
  company TEXT NOT NULL DEFAULT 'Company',
  description TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'paste'
    CHECK (source_type IN ('paste', 'pdf')),
  is_target BOOLEAN DEFAULT FALSE,
  analysis_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Skills (Taxonomy) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  difficulty TEXT DEFAULT 'intermediate'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Student Skills ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'resume'
    CHECK (source IN ('resume', 'assessment', 'self_reported')),
  claimed_level INTEGER DEFAULT 0,
  verified_level INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  last_assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id, source)
);

-- ── Job Skills ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  importance TEXT NOT NULL DEFAULT 'required'
    CHECK (importance IN ('required', 'preferred', 'nice_to_have')),
  required_level INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, skill_id)
);

-- ── Skill Gaps ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skill_gaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 0,
  required_level INTEGER NOT NULL DEFAULT 0,
  gap_score INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  reason TEXT DEFAULT '',
  recommended_action TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assessments ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  skill_category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'mixed'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'mixed')),
  total_questions INTEGER NOT NULL DEFAULT 5,
  time_limit_minutes INTEGER NOT NULL DEFAULT 15,
  is_adaptive BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assessment Questions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq'
    CHECK (question_type IN ('mcq', 'short_answer', 'coding')),
  topic TEXT NOT NULL DEFAULT 'General',
  difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assessment Attempts ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  total_possible INTEGER NOT NULL DEFAULT 100,
  accuracy INTEGER,
  time_taken_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  result_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assessment Answers ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN,
  score INTEGER DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Preparation Plans ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS preparation_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  duration_days INTEGER NOT NULL DEFAULT 7,
  daily_hours NUMERIC(3,1) DEFAULT 2.0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Preparation Tasks ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS preparation_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES preparation_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  skill_id TEXT,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  task_type TEXT NOT NULL DEFAULT 'learn'
    CHECK (task_type IN ('learn', 'practice', 'assess', 'review', 'project')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  day_number INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Progress Records ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS progress_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  skill_category TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  assessment_count INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  study_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, skill_category)
);

-- ── AI Insights ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL DEFAULT 'recommendation'
    CHECK (insight_type IN ('strength', 'weakness', 'recommendation', 'trend', 'warning')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  priority INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Skills table is public read
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills are publicly readable" ON skills FOR SELECT USING (true);

-- ── Profile policies ─────────────────────────────────────────

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Resume policies ──────────────────────────────────────────

CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Job policies ─────────────────────────────────────────────

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);

-- ── Student Skills policies ──────────────────────────────────

CREATE POLICY "Users can view own student_skills"
  ON student_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own student_skills"
  ON student_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own student_skills"
  ON student_skills FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Job Skills policies ──────────────────────────────────────
-- Job skills are readable by job owner

CREATE POLICY "Users can view own job_skills"
  ON job_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_skills.job_id AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own job_skills"
  ON job_skills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_skills.job_id AND jobs.user_id = auth.uid()
    )
  );

-- ── Skill Gap policies ──────────────────────────────────────

CREATE POLICY "Users can view own skill_gaps"
  ON skill_gaps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill_gaps"
  ON skill_gaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill_gaps"
  ON skill_gaps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skill_gaps"
  ON skill_gaps FOR DELETE
  USING (auth.uid() = user_id);

-- ── Assessment policies ──────────────────────────────────────

CREATE POLICY "Users can view own assessments"
  ON assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Assessment Questions policies ────────────────────────────
-- Questions readable by assessment owner

CREATE POLICY "Users can view own assessment_questions"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments WHERE assessments.id = assessment_questions.assessment_id AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own assessment_questions"
  ON assessment_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments WHERE assessments.id = assessment_questions.assessment_id AND assessments.user_id = auth.uid()
    )
  );

-- ── Assessment Attempts policies ─────────────────────────────

CREATE POLICY "Users can view own attempts"
  ON assessment_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON assessment_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON assessment_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Assessment Answers policies ──────────────────────────────

CREATE POLICY "Users can view own answers"
  ON assessment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts WHERE assessment_attempts.id = assessment_answers.attempt_id AND assessment_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own answers"
  ON assessment_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_attempts WHERE assessment_attempts.id = assessment_answers.attempt_id AND assessment_attempts.user_id = auth.uid()
    )
  );

-- ── Preparation Plans policies ───────────────────────────────

CREATE POLICY "Users can view own plans"
  ON preparation_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON preparation_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON preparation_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Preparation Tasks policies ───────────────────────────────

CREATE POLICY "Users can view own tasks"
  ON preparation_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM preparation_plans WHERE preparation_plans.id = preparation_tasks.plan_id AND preparation_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tasks"
  ON preparation_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM preparation_plans WHERE preparation_plans.id = preparation_tasks.plan_id AND preparation_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tasks"
  ON preparation_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM preparation_plans WHERE preparation_plans.id = preparation_tasks.plan_id AND preparation_plans.user_id = auth.uid()
    )
  );

-- ── Progress Records policies ────────────────────────────────

CREATE POLICY "Users can view own progress"
  ON progress_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON progress_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can upsert own progress"
  ON progress_records FOR UPDATE
  USING (auth.uid() = user_id);

-- ── AI Insights policies ─────────────────────────────────────

CREATE POLICY "Users can view own insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON ai_insights FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Seed Skill Taxonomy
-- ============================================================

INSERT INTO skills (name, category, description, difficulty) VALUES
  ('Data Structures', 'dsa', 'Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Hash Tables', 'intermediate'),
  ('Algorithms', 'algorithms', 'Sorting, Searching, Dynamic Programming, Greedy, Backtracking', 'intermediate'),
  ('Graph Algorithms', 'dsa', 'BFS, DFS, Dijkstra, Kruskal, Prim, Topological Sort', 'advanced'),
  ('Dynamic Programming', 'dsa', 'Memoization, Tabulation, Optimization Problems', 'advanced'),
  ('Recursion', 'dsa', 'Recursive thinking, Base cases, Stack overflow, Tail recursion', 'intermediate'),
  ('Python', 'programming', 'Python programming language', 'beginner'),
  ('JavaScript', 'programming', 'JavaScript/TypeScript programming', 'intermediate'),
  ('Java', 'programming', 'Java programming language', 'intermediate'),
  ('C++', 'programming', 'C++ programming language', 'intermediate'),
  ('SQL', 'database', 'Structured Query Language', 'intermediate'),
  ('Normalization', 'dbms', 'Database normalization 1NF through BCNF', 'intermediate'),
  ('Transactions', 'dbms', 'ACID properties, concurrency control, locking', 'intermediate'),
  ('Indexing', 'dbms', 'B-Trees, Hash indexes, clustered vs non-clustered', 'advanced'),
  ('Process Management', 'operating_systems', 'Processes, Threads, Scheduling, Synchronization', 'intermediate'),
  ('Memory Management', 'operating_systems', 'Paging, Segmentation, Virtual Memory, Page Replacement', 'intermediate'),
  ('File Systems', 'operating_systems', 'File allocation, directory structure, disk scheduling', 'intermediate'),
  ('OSI Model', 'computer_networks', 'Seven layers of network communication', 'beginner'),
  ('TCP/IP', 'computer_networks', 'Transport and Internet protocols', 'intermediate'),
  ('HTTP/HTTPS', 'computer_networks', 'Web protocols, REST, status codes', 'intermediate'),
  ('OOP Concepts', 'oop', 'Encapsulation, Inheritance, Polymorphism, Abstraction', 'intermediate'),
  ('Design Patterns', 'oop', 'Singleton, Factory, Observer, Strategy, etc.', 'advanced'),
  ('SOLID Principles', 'oop', 'Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion', 'advanced'),
  ('System Design', 'system_design', 'Scalability, Load Balancing, Caching, Database Design', 'advanced'),
  ('React', 'web_development', 'React.js frontend framework', 'intermediate'),
  ('Node.js', 'web_development', 'Node.js backend runtime', 'intermediate'),
  ('REST APIs', 'web_development', 'RESTful API design and implementation', 'intermediate'),
  ('AWS', 'cloud', 'Amazon Web Services', 'intermediate'),
  ('Docker', 'devops', 'Containerization with Docker', 'intermediate'),
  ('Git', 'devops', 'Version control with Git', 'beginner'),
  ('Machine Learning', 'ai_ml', 'ML algorithms, training, evaluation', 'advanced'),
  ('Communication', 'communication', 'Technical and professional communication', 'intermediate'),
  ('Problem Solving', 'problem_solving', 'Analytical and logical problem solving', 'intermediate'),
  ('Quantitative Aptitude', 'aptitude', 'Numbers, percentages, probability, algebra', 'intermediate'),
  ('Logical Reasoning', 'aptitude', 'Patterns, deductions, analytical reasoning', 'intermediate'),
  ('Interview Skills', 'interview_skills', 'Technical interviews, HR interviews, behavioral questions', 'intermediate'),
  ('Project Presentation', 'project_knowledge', 'Presenting and explaining projects effectively', 'intermediate')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Storage Bucket
-- ============================================================
-- Run this in Supabase Dashboard > Storage:
-- Create bucket named "resumes" with:
--   - Public: false
--   - File size limit: 5MB
--   - Allowed MIME types: application/pdf

-- Storage policies (run in SQL editor):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false)
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "Users can upload own resumes"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own resumes"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own resumes"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- PHASE 2: AI PLACEMENT SIMULATOR & ADAPTIVE INTELLIGENCE
-- ============================================================

-- ── Simulations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL DEFAULT 'Software Engineer',
  mode TEXT NOT NULL DEFAULT 'full' CHECK (mode IN ('quick', 'technical', 'full')),
  status TEXT NOT NULL DEFAULT 'configured' CHECK (status IN ('configured', 'in_progress', 'completed', 'abandoned')),
  overall_score INTEGER,
  current_round_index INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 5,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Simulation Rounds ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_rounds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  round_type TEXT NOT NULL CHECK (round_type IN ('aptitude', 'coding', 'technical', 'project', 'hr')),
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  score INTEGER,
  max_score INTEGER NOT NULL DEFAULT 100,
  time_limit_minutes INTEGER NOT NULL DEFAULT 20,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Simulation Questions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES simulation_rounds(id) ON DELETE CASCADE,
  round_type TEXT NOT NULL CHECK (round_type IN ('aptitude', 'coding', 'technical', 'project', 'hr')),
  question_text TEXT NOT NULL,
  category TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  context_data JSONB,
  starter_code TEXT,
  expected_concepts TEXT[] DEFAULT '{}',
  test_cases JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Simulation Answers ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES simulation_questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL DEFAULT '',
  code_submission TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  ai_evaluation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Weakness Insights & Root Causes ───────────────────────────
CREATE TABLE IF NOT EXISTS weakness_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  evidence TEXT[] NOT NULL DEFAULT '{}',
  confidence_score INTEGER NOT NULL DEFAULT 85,
  affected_skills TEXT[] NOT NULL DEFAULT '{}',
  recommended_intervention JSONB NOT NULL,
  verification_test JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  identified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── What-If Scenarios ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS what_if_scenarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Readiness Simulation',
  base_readiness JSONB NOT NULL,
  target_adjustments JSONB NOT NULL,
  projected_readiness JSONB NOT NULL,
  delta NUMERIC(4,1) NOT NULL DEFAULT 0.0,
  top_roi_skills JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Twin Timeline ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS twin_timeline (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('assessment', 'simulation', 'task_streak', 'baseline')),
  title TEXT NOT NULL,
  note TEXT DEFAULT '',
  readiness INTEGER NOT NULL,
  scores_by_category JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI Coach Conversations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  suggested_actions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Phase 2 Row Level Security (RLS) ──────────────────────────

ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE weakness_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE what_if_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE twin_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulations" ON simulations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own simulations" ON simulations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own simulations" ON simulations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own rounds" ON simulation_rounds FOR SELECT
  USING (EXISTS (SELECT 1 FROM simulations WHERE simulations.id = simulation_rounds.simulation_id AND simulations.user_id = auth.uid()));
CREATE POLICY "Users can manage own rounds" ON simulation_rounds FOR ALL
  USING (EXISTS (SELECT 1 FROM simulations WHERE simulations.id = simulation_rounds.simulation_id AND simulations.user_id = auth.uid()));

CREATE POLICY "Users can view own questions" ON simulation_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM simulation_rounds 
    JOIN simulations ON simulations.id = simulation_rounds.simulation_id 
    WHERE simulation_rounds.id = simulation_questions.round_id AND simulations.user_id = auth.uid()
  ));
CREATE POLICY "Users can manage own questions" ON simulation_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM simulation_rounds 
    JOIN simulations ON simulations.id = simulation_rounds.simulation_id 
    WHERE simulation_rounds.id = simulation_questions.round_id AND simulations.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own answers" ON simulation_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM simulation_questions 
    JOIN simulation_rounds ON simulation_rounds.id = simulation_questions.round_id
    JOIN simulations ON simulations.id = simulation_rounds.simulation_id
    WHERE simulation_questions.id = simulation_answers.question_id AND simulations.user_id = auth.uid()
  ));
CREATE POLICY "Users can manage own answers" ON simulation_answers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM simulation_questions 
    JOIN simulation_rounds ON simulation_rounds.id = simulation_questions.round_id
    JOIN simulations ON simulations.id = simulation_rounds.simulation_id
    WHERE simulation_questions.id = simulation_answers.question_id AND simulations.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own weaknesses" ON weakness_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own weaknesses" ON weakness_insights FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own what_if" ON what_if_scenarios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own what_if" ON what_if_scenarios FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own timeline" ON twin_timeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own timeline" ON twin_timeline FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own coach msgs" ON coach_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own coach msgs" ON coach_conversations FOR ALL USING (auth.uid() = user_id);
