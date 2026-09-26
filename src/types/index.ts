// ============================================================
// PlacementOS — Core Type Definitions
// ============================================================

// ── Database Entity Types ────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  college: string;
  degree: string;
  branch: string;
  graduation_year: number;
  cgpa: number | null;
  target_role: string;
  target_companies: string[];
  preferred_language: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  parsed_text: string | null;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_json: ResumeAnalysis | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  role: string;
  company: string;
  description: string;
  source_type: 'paste' | 'pdf';
  is_target: boolean;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_json: JobAnalysis | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
}

export interface StudentSkill {
  id: string;
  user_id: string;
  skill_id: string;
  source: 'resume' | 'assessment' | 'self_reported';
  claimed_level: number;
  verified_level: number | null;
  is_verified: boolean;
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
  skill?: Skill;
}

export interface JobSkill {
  id: string;
  job_id: string;
  skill_id: string;
  importance: 'required' | 'preferred' | 'nice_to_have';
  required_level: number;
  created_at: string;
  skill?: Skill;
}

export interface SkillGap {
  id: string;
  user_id: string;
  job_id: string;
  skill_id: string;
  current_level: number;
  required_level: number;
  gap_score: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  recommended_action: string;
  created_at: string;
  updated_at: string;
  skill?: Skill;
}

export interface Assessment {
  id: string;
  user_id: string;
  title: string;
  skill_category: SkillCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  total_questions: number;
  time_limit_minutes: number;
  is_adaptive: boolean;
  status: 'draft' | 'ready' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  skill_id: string;
  question: string;
  question_type: 'mcq' | 'short_answer' | 'coding';
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  order_index: number;
  created_at: string;
  skill?: Skill;
}

export interface AssessmentAttempt {
  id: string;
  user_id: string;
  assessment_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_possible: number;
  accuracy: number | null;
  time_taken_seconds: number | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  result_analysis: AssessmentAnalysis | null;
  created_at: string;
}

export interface AssessmentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean | null;
  score: number;
  time_taken_seconds: number;
  ai_feedback: string | null;
  created_at: string;
  question?: AssessmentQuestion;
}

export interface PreparationPlan {
  id: string;
  user_id: string;
  title: string;
  description: string;
  target_job_id: string | null;
  duration_days: number;
  daily_hours: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface PreparationTask {
  id: string;
  plan_id: string;
  title: string;
  skill_id: string | null;
  description: string;
  duration_minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  task_type: 'learn' | 'practice' | 'assess' | 'review' | 'project';
  priority: 'high' | 'medium' | 'low';
  day_number: number;
  order_index: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at: string | null;
  created_at: string;
  skill?: Skill;
}

export interface ProgressRecord {
  id: string;
  user_id: string;
  date: string;
  skill_category: SkillCategory;
  score: number;
  assessment_count: number;
  tasks_completed: number;
  study_minutes: number;
  created_at: string;
}

export interface AIInsight {
  id: string;
  user_id: string;
  insight_type: 'strength' | 'weakness' | 'recommendation' | 'trend' | 'warning';
  title: string;
  content: string;
  related_skill_id: string | null;
  priority: number;
  is_read: boolean;
  expires_at: string | null;
  created_at: string;
  skill?: Skill;
}

// ── Skill Categories ─────────────────────────────────────────

export type SkillCategory =
  | 'programming'
  | 'dsa'
  | 'algorithms'
  | 'database'
  | 'dbms'
  | 'operating_systems'
  | 'computer_networks'
  | 'oop'
  | 'system_design'
  | 'web_development'
  | 'cloud'
  | 'devops'
  | 'ai_ml'
  | 'communication'
  | 'problem_solving'
  | 'aptitude'
  | 'interview_skills'
  | 'project_knowledge';

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  programming: 'Programming',
  dsa: 'DSA',
  algorithms: 'Algorithms',
  database: 'Database',
  dbms: 'DBMS',
  operating_systems: 'Operating Systems',
  computer_networks: 'Computer Networks',
  oop: 'OOP',
  system_design: 'System Design',
  web_development: 'Web Development',
  cloud: 'Cloud',
  devops: 'DevOps',
  ai_ml: 'AI/ML',
  communication: 'Communication',
  problem_solving: 'Problem Solving',
  aptitude: 'Aptitude',
  interview_skills: 'Interview Skills',
  project_knowledge: 'Project Knowledge',
};

// ── AI Response Types ────────────────────────────────────────

export interface ResumeAnalysis {
  name: string;
  education: {
    degree: string;
    college: string;
    year: number;
    cgpa: number | null;
  }[];
  skills: {
    name: string;
    category: SkillCategory;
    proficiency: 'beginner' | 'intermediate' | 'advanced';
  }[];
  programming_languages: string[];
  frameworks: string[];
  tools: string[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
  }[];
  internships: {
    company: string;
    role: string;
    duration: string;
    description: string;
  }[];
  certifications: string[];
  achievements: string[];
  experience_years: number;
  soft_skills: string[];
}

export interface JobAnalysis {
  role: string;
  company: string;
  required_skills: {
    name: string;
    category: SkillCategory;
    importance: 'required' | 'preferred' | 'nice_to_have';
    level: number;
  }[];
  preferred_skills: {
    name: string;
    category: SkillCategory;
    level: number;
  }[];
  programming_languages: string[];
  frameworks: string[];
  cs_fundamentals: string[];
  soft_skills: string[];
  experience_requirements: string;
  responsibilities: string[];
}

export interface AssessmentAnalysis {
  overall_feedback: string;
  topic_performance: {
    topic: string;
    score: number;
    total: number;
    accuracy: number;
    feedback: string;
  }[];
  strengths: string[];
  weaknesses: string[];
  root_causes: string[];
  recommended_next_steps: string[];
}

export interface GeneratedQuestion {
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[];
  correct_answer: string;
  explanation: string;
  skill_category: SkillCategory;
}

// ── Readiness Score Types ────────────────────────────────────

export interface ReadinessScore {
  overall: number;
  components: ReadinessComponent[];
  explanation: string;
  last_updated: string;
}

export interface ReadinessComponent {
  category: SkillCategory;
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
}

export const DEFAULT_READINESS_WEIGHTS: Record<string, number> = {
  dsa: 0.20,
  cs_fundamentals: 0.20,
  programming: 0.15,
  projects: 0.15,
  communication: 0.10,
  aptitude: 0.10,
  interview_skills: 0.10,
};

// ── Placement Twin Types ─────────────────────────────────────

export interface PlacementTwin {
  readiness: ReadinessScore;
  strengths: { skill: string; score: number }[];
  critical_gaps: { skill: string; gap: number; reason: string }[];
  unverified_claims: { skill: string; claimed: number }[];
  recent_assessments: {
    title: string;
    score: number;
    date: string;
    category: SkillCategory;
  }[];
  streak: number;
  next_action: string;
}

// ── UI State Types ───────────────────────────────────────────

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// ── Auth Types ───────────────────────────────────────────────

export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
  college: string;
  degree: string;
  branch: string;
  graduation_year: number;
}

// ── Phase 2: Simulation Types ────────────────────────────────

export type SimulationMode = 'quick' | 'technical' | 'full';

export type SimulationRoundType =
  | 'aptitude'
  | 'coding'
  | 'technical'
  | 'project'
  | 'hr';

export type SimulationStatus = 'configured' | 'in_progress' | 'completed' | 'abandoned';

export interface Simulation {
  id: string;
  user_id: string;
  target_role: string;
  mode: SimulationMode;
  status: SimulationStatus;
  overall_score: number | null;
  current_round_index: number;
  total_rounds: number;
  started_at: string;
  completed_at: string | null;
  report: SimulationReport | null;
  rounds: SimulationRound[];
  created_at: string;
}

export interface SimulationRound {
  id: string;
  simulation_id: string;
  round_type: SimulationRoundType;
  order_index: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  score: number | null;
  max_score: number;
  time_limit_minutes: number;
  time_taken_seconds: number;
  feedback: string | null;
  questions: SimulationQuestion[];
}

export interface SimulationQuestion {
  id: string;
  round_id: string;
  round_type: SimulationRoundType;
  question_text: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[]; // for aptitude MCQs
  correct_answer?: string; // for aptitude MCQs
  explanation?: string;
  context_data?: Record<string, any>; // for project or tech interview context
  starter_code?: string; // for coding round
  expected_concepts?: string[];
  test_cases?: Array<{ input: string; expected_output: string; is_hidden?: boolean }>;
  order_index: number;
  answer?: SimulationAnswer;
}

export interface SimulationAnswer {
  id: string;
  question_id: string;
  user_answer: string;
  code_submission?: string;
  score: number;
  is_correct?: boolean;
  time_taken_seconds: number;
  ai_evaluation?: AIAnswerEvaluation;
  created_at: string;
}

export interface AIAnswerEvaluation {
  technical_accuracy: number; // 0-100
  concept_coverage: number; // 0-100
  clarity: number; // 0-100
  structure: number; // 0-100
  relevance: number; // 0-100
  completeness: number; // 0-100
  overall_score: number; // 0-100
  strengths: string[];
  missing_points: string[];
  improvement: string;
  follow_up_question?: string;
  confidence_indicator?: 'High' | 'Moderate' | 'Needs Reinforcement';
  disclaimer: string; // "AI evaluation — for preparation guidance"
}

export interface CodingProblem {
  id: string;
  title: string;
  description: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  expected_concepts: string[];
  starter_code: Record<string, string>; // e.g. { python: "...", javascript: "...", cpp: "..." }
  test_cases: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
}

export interface CodeEvaluationResult {
  passed_tests: number;
  total_tests: number;
  correctness_score: number;
  approach_feedback: string;
  complexity_feedback: string;
  edge_cases_feedback: string;
  overall_score: number;
  strengths: string[];
  improvements: string[];
}

export interface SimulationReport {
  overall_score: number;
  target_role: string;
  mode: SimulationMode;
  completed_at: string;
  time_taken_total_minutes: number;
  round_summaries: Array<{
    round_type: SimulationRoundType;
    title: string;
    score: number;
    weight: number;
    highlights: string[];
    gaps: string[];
  }>;
  technical_performance: {
    score: number;
    strengths: string[];
    weaknesses: string[];
  };
  coding_performance: {
    score: number;
    approach: string;
    efficiency: string;
  };
  communication_score: number;
  project_knowledge_score: number;
  hr_responses: {
    clarity_score: number;
    structure_score: number;
    key_feedback: string;
  };
  strong_areas: string[];
  improvement_areas: string[];
  critical_gaps: string[];
  recommended_next_steps: string[];
  questions_to_revisit: Array<{
    question: string;
    round_type: SimulationRoundType;
    user_answer: string;
    model_answer_highlights: string;
    key_takeaway: string;
  }>;
  readiness_delta: number;
}

// ── Phase 2: Weakness Hunter Types ───────────────────────────

export interface WeaknessPattern {
  id: string;
  user_id: string;
  title: string;
  category: SkillCategory;
  root_cause: string;
  evidence: string[];
  confidence_score: number; // e.g. 85
  affected_skills: string[];
  recommended_intervention: {
    action: string;
    estimated_time_minutes: number;
    curated_topic: string;
    practice_type: 'concept' | 'problem' | 'explanation';
  };
  verification_test: {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  };
  status: 'active' | 'resolved';
  identified_at: string;
}

// ── Phase 2: What-If Placement Simulator Types ───────────────

export interface WhatIfScenario {
  id: string;
  user_id: string;
  title: string;
  base_readiness: ReadinessScore;
  target_adjustments: Record<string, number>; // skill_name -> new_score
  projected_readiness: ReadinessScore;
  delta: number;
  top_roi_skills: Array<{
    skill: string;
    category: SkillCategory;
    current_score: number;
    target_score: number;
    readiness_impact_points: number;
    estimated_study_hours: number;
    roi_score: number; // impact per hour
    reason: string;
  }>;
  disclaimer: string;
}

// ── Phase 2: Placement Twin Timeline Types ───────────────────

export interface TwinTimelinePoint {
  id: string;
  date: string;
  timestamp: number;
  readiness: number;
  event_type: 'assessment' | 'simulation' | 'task_streak' | 'baseline';
  title: string;
  note: string;
  scores_by_category: Record<string, number>;
}

// ── Phase 2: AI Coach Types ──────────────────────────────────

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggested_actions?: Array<{
    label: string;
    action_type: 'navigate' | 'start_test' | 'study_topic' | 'simulate';
    payload: string;
  }>;
  timestamp: string;
}
