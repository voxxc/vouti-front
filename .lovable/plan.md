

# Vouti.SPN — English Learning SaaS Platform (Full MVP)

## Architecture Overview

Follows the **Batink pattern**: isolated auth context (`SpnAuthContext`), dedicated DB tables (`spn_*`), routes at `/spn/*`, single-page layout with sidebar + drawer navigation.

```text
/spn              → Landing page
/spn/auth         → Login (classroom photo + vouti.spn logo)
/spn/dashboard    → Admin/Teacher/Student dashboard (role-based)
```

## Database Schema (Migration)

### Core Tables

```sql
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

-- User roles (separate table per security standard)
CREATE TABLE spn_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role spn_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);

-- Levels (Beginner A1, A2, Intermediate B1, etc.)
CREATE TABLE spn_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Modules (inside levels)
CREATE TABLE spn_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES spn_levels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Units (inside modules)
CREATE TABLE spn_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES spn_modules(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sections (inside units)
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

-- Points / gamification
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

-- Glossary entries
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

-- Comments (student questions inside lessons)
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

-- User mission progress
CREATE TABLE spn_user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES spn_daily_missions(id) ON DELETE CASCADE NOT NULL,
  current_value INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  mission_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, mission_id, mission_date)
);

-- Homework assignments (teacher → student)
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
```

### RLS Policies + Helper Function

```sql
CREATE OR REPLACE FUNCTION public.has_spn_role(_user_id UUID, _role spn_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM spn_user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Enable RLS on all tables, with policies for:
-- admin: full access
-- teacher: read all content + manage students they oversee
-- student: read content, write own progress/scores/comments
```

### Seed Data

```sql
-- Default achievements
INSERT INTO spn_achievements (name, description, icon, condition_type, condition_value) VALUES
('First Lesson', 'Complete your first lesson', '📚', 'sections_completed', 1),
('7 Day Streak', 'Study for 7 days in a row', '🔥', 'streak', 7),
('Vocabulary Master', 'Learn 100 words', '📖', 'words_learned', 100),
('Quiz Champion', 'Score 100% on 5 quizzes', '🏆', 'perfect_quizzes', 5),
('Listening Expert', 'Complete 20 listening exercises', '🎧', 'listening_completed', 20);

-- Default daily missions
INSERT INTO spn_daily_missions (name, description, target_value, points_reward, mission_type) VALUES
('Learn 10 words', 'Study 10 vocabulary words', 10, 10, 'words'),
('Complete 1 quiz', 'Finish any quiz', 1, 10, 'quiz'),
('Listen to 1 audio', 'Complete a listening exercise', 1, 5, 'listening'),
('Complete 1 lesson', 'Finish a full lesson section', 1, 15, 'section');
```

## Frontend Structure

### New Files

| File | Purpose |
|------|---------|
| `src/contexts/SpnAuthContext.tsx` | Auth context (like BatinkAuthContext) |
| `src/pages/SpnAuth.tsx` | Login page with classroom photo + vouti.spn branding |
| `src/pages/SpnDashboard.tsx` | Main single-page app with sidebar + drawer |
| `src/components/Spn/SpnSidebar.tsx` | Sidebar (Dashboard, Progress, Modules, Leaderboard, Achievements, Settings) |
| `src/components/Spn/AdminDashboard.tsx` | Admin analytics + user/content management |
| `src/components/Spn/StudentDashboard.tsx` | Student home with progress, streaks, missions |
| `src/components/Spn/TeacherDashboard.tsx` | Teacher view: student progress, homework, quiz results |
| `src/components/Spn/ModulesView.tsx` | Hierarchical browser: Level → Module → Unit → Sections |
| `src/components/Spn/SectionViewer.tsx` | Content renderer (text, audio, quiz, glossary, flashcards) |
| `src/components/Spn/LeaderboardView.tsx` | Points ranking |
| `src/components/Spn/AchievementsView.tsx` | Badges/trophies |
| `src/components/Spn/ProgressView.tsx` | Progress bars per module |
| `src/components/Spn/AdminLevelsManager.tsx` | CRUD for levels/modules/units/sections |
| `src/components/Spn/AdminUsersManager.tsx` | Create/edit users, assign levels |
| `src/components/Spn/QuizPlayer.tsx` | Interactive quiz (multiple choice, fill blank, etc.) |
| `src/components/Spn/FlashcardPlayer.tsx` | Spaced repetition flashcards |
| `src/components/Spn/GlossaryView.tsx` | Word list with meanings/examples |
| `src/components/LogoSpn.tsx` | vouti.spn logo component |

### Routing (in App.tsx)

```tsx
// SPN Routes — Isolated English Learning Platform
<Route path="/spn" element={<SpnLanding />} />
<Route path="/spn/auth" element={
  <SpnAuthProvider><SpnPublicRoute><SpnAuth /></SpnPublicRoute></SpnAuthProvider>
} />
<Route path="/spn/dashboard" element={
  <SpnAuthProvider><SpnProtectedRoute><SpnDashboard /></SpnProtectedRoute></SpnAuthProvider>
} />
```

### Login Page Design

- Left side (60%): Classroom photo with teacher (same layout as existing Auth.tsx)
- Logo: `vouti.spn` with red dot
- Slogan: "aqui você speak now!"
- Right side (40%): Login form (email + password)
- Tabs: Sign In / Sign Up (sign up includes full name + role selection for admin bootstrap)

### Single-Page Dashboard (Drawer Pattern)

All navigation happens within SpnDashboard via state, not URL changes:

```text
SpnDashboard
├── SpnSidebar (left)
│   ├── Dashboard
│   ├── My Progress
│   ├── Modules (expandable tree)
│   ├── Leaderboard
│   ├── Achievements
│   ├── [Admin] Manage Levels
│   ├── [Admin] Manage Users
│   ├── [Teacher] Students
│   └── Settings
└── Main Content (renders based on sidebar selection)
    └── Drawers open for detail views (section content, quiz, user edit, etc.)
```

## AI Features (Placeholder)

AI Conversation Trainer and Pronunciation Trainer will use Lovable AI Gateway via edge functions. These will be built as separate components in future iterations after the core platform is functional.

## What This MVP Includes

1. Full database schema (25+ tables) with RLS
2. Isolated SpnAuthContext with 3 roles
3. Login page with classroom branding
4. Admin: dashboard analytics, CRUD for levels/modules/units/sections, user management
5. Student: module browser, section viewer, quiz player, flashcards, glossary, progress tracking
6. Teacher: student monitoring, homework assignment, quiz results
7. Gamification: points, streaks, leaderboard, achievements, daily missions
8. Comments system inside lessons
9. Single-page architecture with sidebar + drawers

## Implementation Note

Due to the massive scope (~3000+ lines of new code), this will be implemented across the message. Some advanced features (AI Conversation, Pronunciation Trainer, Classroom Mode, Spaced Repetition algorithm) will need follow-up iterations.

