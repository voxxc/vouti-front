
-- SPN (Speak Now) Platform - Full Schema

-- Roles enum
CREATE TYPE spn_role AS ENUM ('admin', 'teacher', 'student');

-- User profiles
CREATE TABLE spn_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles
CREATE TABLE spn_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role spn_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Levels
CREATE TABLE spn_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Modules
CREATE TABLE spn_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES spn_levels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Units
CREATE TABLE spn_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES spn_modules(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sections
CREATE TABLE spn_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES spn_units(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('word_bank','grammar','explanation','listening','practice','homework','quiz','glossary','flashcards')),
  content JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student level assignments
CREATE TABLE spn_student_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level_id UUID REFERENCES spn_levels(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, level_id)
);

-- Progress tracking
CREATE TABLE spn_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES spn_sections(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  score INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, section_id)
);

-- Points
CREATE TABLE spn_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Streaks
CREATE TABLE spn_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Achievements
CREATE TABLE spn_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  condition_type TEXT NOT NULL,
  condition_value INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User achievements
CREATE TABLE spn_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES spn_achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Glossary
CREATE TABLE spn_glossary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES spn_units(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz questions
CREATE TABLE spn_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES spn_sections(id) ON DELETE CASCADE NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice','fill_blank','order_sentence','translation','listening')),
  question TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  audio_url TEXT,
  sort_order INT DEFAULT 0
);

-- Quiz attempts
CREATE TABLE spn_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES spn_sections(id) ON DELETE CASCADE NOT NULL,
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  answers JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Comments
CREATE TABLE spn_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES spn_sections(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES spn_comments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily missions
CREATE TABLE spn_daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_value INT DEFAULT 1,
  points_reward INT DEFAULT 5,
  mission_type TEXT NOT NULL
);

-- User missions
CREATE TABLE spn_user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES spn_daily_missions(id) ON DELETE CASCADE NOT NULL,
  current_value INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  mission_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, mission_id, mission_date)
);

-- Homework
CREATE TABLE spn_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_by UUID REFERENCES auth.users(id) NOT NULL,
  unit_id UUID REFERENCES spn_units(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Homework submissions
CREATE TABLE spn_homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES spn_homework(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  grade INT,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(homework_id, user_id)
);

-- Helper function
CREATE OR REPLACE FUNCTION public.has_spn_role(_user_id UUID, _role spn_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM spn_user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_spn_profiles_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_spn_profiles_updated_at
  BEFORE UPDATE ON spn_profiles
  FOR EACH ROW EXECUTE FUNCTION update_spn_profiles_updated_at();

-- Enable RLS on all tables
ALTER TABLE spn_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_student_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE spn_homework_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- spn_profiles: users read own, admin reads all
CREATE POLICY "Users can read own profile" ON spn_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read all profiles" ON spn_profiles FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher can read all profiles" ON spn_profiles FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'teacher'));
CREATE POLICY "Users can update own profile" ON spn_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert own profile" ON spn_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can manage all profiles" ON spn_profiles FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- spn_user_roles: admin manages, users read own
CREATE POLICY "Users can read own roles" ON spn_user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage roles" ON spn_user_roles FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert first role" ON spn_user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Content tables: authenticated can read, admin can manage
CREATE POLICY "Authenticated can read levels" ON spn_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage levels" ON spn_levels FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read modules" ON spn_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage modules" ON spn_modules FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read units" ON spn_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage units" ON spn_units FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read sections" ON spn_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage sections" ON spn_sections FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- Student levels
CREATE POLICY "Users can read own level" ON spn_student_levels FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage student levels" ON spn_student_levels FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher can read student levels" ON spn_student_levels FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'teacher'));

-- Progress: users own, admin/teacher read all
CREATE POLICY "Users can manage own progress" ON spn_progress FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read all progress" ON spn_progress FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher can read all progress" ON spn_progress FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'teacher'));

-- Points
CREATE POLICY "Users can read own points" ON spn_points FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own points" ON spn_points FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can manage points" ON spn_points FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "All can read points for leaderboard" ON spn_points FOR SELECT TO authenticated USING (true);

-- Streaks
CREATE POLICY "Users can manage own streak" ON spn_streaks FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read streaks" ON spn_streaks FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- Achievements: read all, admin manage
CREATE POLICY "Authenticated can read achievements" ON spn_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage achievements" ON spn_achievements FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- User achievements
CREATE POLICY "Users can read own achievements" ON spn_user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own achievements" ON spn_user_achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can manage achievements" ON spn_user_achievements FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "All can read user achievements" ON spn_user_achievements FOR SELECT TO authenticated USING (true);

-- Glossary
CREATE POLICY "Authenticated can read glossary" ON spn_glossary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage glossary" ON spn_glossary FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- Quiz questions
CREATE POLICY "Authenticated can read quiz questions" ON spn_quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage quiz questions" ON spn_quiz_questions FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- Quiz attempts
CREATE POLICY "Users can manage own attempts" ON spn_quiz_attempts FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read all attempts" ON spn_quiz_attempts FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher can read all attempts" ON spn_quiz_attempts FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'teacher'));

-- Comments
CREATE POLICY "Authenticated can read comments" ON spn_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON spn_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own comments" ON spn_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage comments" ON spn_comments FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- Daily missions: read all
CREATE POLICY "Authenticated can read missions" ON spn_daily_missions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage missions" ON spn_daily_missions FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- User missions
CREATE POLICY "Users can manage own missions" ON spn_user_missions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read user missions" ON spn_user_missions FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'admin'));

-- Homework
CREATE POLICY "Authenticated can read homework" ON spn_homework FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage homework" ON spn_homework FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher can manage homework" ON spn_homework FOR ALL TO authenticated USING (has_spn_role(auth.uid(), 'teacher'));

-- Homework submissions
CREATE POLICY "Users can manage own submissions" ON spn_homework_submissions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read submissions" ON spn_homework_submissions FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher can read submissions" ON spn_homework_submissions FOR SELECT TO authenticated USING (has_spn_role(auth.uid(), 'teacher'));
CREATE POLICY "Teacher can update submissions" ON spn_homework_submissions FOR UPDATE TO authenticated USING (has_spn_role(auth.uid(), 'teacher'));

-- Seed data
INSERT INTO spn_achievements (name, description, icon, condition_type, condition_value) VALUES
('First Lesson', 'Complete your first lesson', '📚', 'sections_completed', 1),
('7 Day Streak', 'Study for 7 days in a row', '🔥', 'streak', 7),
('Vocabulary Master', 'Learn 100 words', '📖', 'words_learned', 100),
('Quiz Champion', 'Score 100% on 5 quizzes', '🏆', 'perfect_quizzes', 5),
('Listening Expert', 'Complete 20 listening exercises', '🎧', 'listening_completed', 20);

INSERT INTO spn_daily_missions (name, description, target_value, points_reward, mission_type) VALUES
('Learn 10 words', 'Study 10 vocabulary words', 10, 10, 'words'),
('Complete 1 quiz', 'Finish any quiz', 1, 10, 'quiz'),
('Listen to 1 audio', 'Complete a listening exercise', 1, 5, 'listening'),
('Complete 1 lesson', 'Finish a full lesson section', 1, 15, 'section');
