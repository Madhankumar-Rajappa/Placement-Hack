// ============================================================
// PlacementOS — Assessment Service (Supabase + Resilient Local Cache)
// ============================================================

import { supabase } from '../lib/supabase';
import type {
  Assessment,
  AssessmentQuestion,
  AssessmentAttempt,
  AssessmentAnswer,
  AssessmentAnalysis,
  SkillCategory,
} from '../types';
import { aiService } from './ai.service';
import { SKILL_CATEGORY_LABELS } from '../types';

const getCategoryLabel = (cat: SkillCategory): string => {
  return SKILL_CATEGORY_LABELS[cat] || cat.toUpperCase();
};

const LOCAL_ASSESSMENTS_KEY = 'placementos_local_assessments';
const LOCAL_QUESTIONS_KEY = 'placementos_local_questions';
const LOCAL_ATTEMPTS_KEY = 'placementos_local_attempts';
const LOCAL_ANSWERS_KEY = 'placementos_local_answers';

function getLocal<T>(key: string): T[] {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : [];
  } catch {
    return [];
  }
}

function saveLocal<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const assessmentService = {
  async create(
    userId: string,
    category: SkillCategory,
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed',
    questionCount: number = 5
  ): Promise<Assessment> {
    // Get weak topics from previous attempts
    const weakTopics = await this.getWeakTopics(userId, category);

    // Generate questions via AI
    const generatedQuestions = await aiService.generateQuestions(
      category,
      questionCount,
      difficulty,
      weakTopics
    );

    const assessmentId = `ass_${Date.now()}`;
    const assessment: Assessment = {
      id: assessmentId,
      user_id: userId,
      title: `${getCategoryLabel(category)} Assessment`,
      skill_category: category,
      difficulty,
      total_questions: generatedQuestions.length,
      time_limit_minutes: Math.max(10, generatedQuestions.length * 3),
      is_adaptive: weakTopics.length > 0,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const questions: AssessmentQuestion[] = generatedQuestions.map((q, i) => ({
      id: `q_${assessmentId}_${i + 1}`,
      assessment_id: assessmentId,
      skill_id: category,
      question: q.question,
      question_type: 'mcq' as const,
      topic: q.topic,
      difficulty: q.difficulty,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      order_index: i + 1,
      created_at: new Date().toISOString(),
    }));

    // Save to local cache first
    const allAss = getLocal<Assessment>(LOCAL_ASSESSMENTS_KEY);
    allAss.unshift(assessment);
    saveLocal(LOCAL_ASSESSMENTS_KEY, allAss);

    const allQ = getLocal<AssessmentQuestion>(LOCAL_QUESTIONS_KEY);
    saveLocal(LOCAL_QUESTIONS_KEY, [...questions, ...allQ]);

    // Try saving to Supabase if table exists
    try {
      if (supabase) {
        const { data: dbAss, error: assErr } = await supabase
          .from('assessments')
          .insert({
            user_id: userId,
            title: assessment.title,
            skill_category: category,
            difficulty,
            total_questions: generatedQuestions.length,
            time_limit_minutes: assessment.time_limit_minutes,
            is_adaptive: assessment.is_adaptive,
            status: 'ready',
          })
          .select()
          .single();

        if (!assErr && dbAss) {
          const dbQuestions = generatedQuestions.map((q, i) => ({
            assessment_id: dbAss.id,
            skill_id: category,
            question: q.question,
            question_type: 'mcq' as const,
            topic: q.topic,
            difficulty: q.difficulty,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            order_index: i + 1,
          }));

          await supabase.from('assessment_questions').insert(dbQuestions);
          return dbAss as Assessment;
        }
      }
    } catch (e) {
      console.warn('Supabase assessments table offline, using local assessment:', e);
    }

    return assessment;
  },

  async getById(assessmentId: string): Promise<Assessment | null> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .maybeSingle();

        if (!error && data) return data as Assessment;
      }
    } catch {
      // ignore
    }

    const localList = getLocal<Assessment>(LOCAL_ASSESSMENTS_KEY);
    return localList.find(a => a.id === assessmentId) || null;
  },

  async getUserAssessments(userId: string): Promise<Assessment[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) return data as Assessment[];
      }
    } catch {
      // ignore
    }

    return getLocal<Assessment>(LOCAL_ASSESSMENTS_KEY);
  },

  async getQuestions(assessmentId: string): Promise<AssessmentQuestion[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('order_index');

        if (!error && data && data.length > 0) return data as AssessmentQuestion[];
      }
    } catch {
      // ignore
    }

    const localQ = getLocal<AssessmentQuestion>(LOCAL_QUESTIONS_KEY);
    const filtered = localQ.filter(q => q.assessment_id === assessmentId);
    if (filtered.length > 0) return filtered;

    // Default fallback questions for instant playability
    const defaultQs = await aiService.generateQuestions('dsa', 5, 'medium');
    return defaultQs.map((q, i) => ({
      id: `fallback_q_${i + 1}`,
      assessment_id: assessmentId,
      skill_id: 'dsa',
      question: q.question,
      question_type: 'mcq' as const,
      topic: q.topic,
      difficulty: q.difficulty,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      order_index: i + 1,
      created_at: new Date().toISOString(),
    }));
  },

  async startAttempt(userId: string, assessmentId: string): Promise<AssessmentAttempt> {
    const attemptId = `att_${Date.now()}`;
    const attempt: AssessmentAttempt = {
      id: attemptId,
      user_id: userId,
      assessment_id: assessmentId,
      started_at: new Date().toISOString(),
      completed_at: null,
      score: null,
      total_possible: 100,
      accuracy: null,
      time_taken_seconds: 0,
      status: 'in_progress',
      result_analysis: null,
      created_at: new Date().toISOString(),
    };

    const atts = getLocal<AssessmentAttempt>(LOCAL_ATTEMPTS_KEY);
    atts.unshift(attempt);
    saveLocal(LOCAL_ATTEMPTS_KEY, atts);

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('assessment_attempts')
          .insert({
            user_id: userId,
            assessment_id: assessmentId,
            started_at: attempt.started_at,
            total_possible: 100,
            status: 'in_progress',
          })
          .select()
          .single();

        if (!error && data) return data as AssessmentAttempt;
      }
    } catch {
      // ignore
    }

    return attempt;
  },

  async submitAnswer(
    attemptId: string,
    questionId: string,
    userAnswer: string,
    correctAnswer: string,
    timeTaken: number
  ): Promise<AssessmentAnswer> {
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const answerId = `ans_${Date.now()}`;
    const answer: AssessmentAnswer = {
      id: answerId,
      attempt_id: attemptId,
      question_id: questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      score: isCorrect ? 1 : 0,
      time_taken_seconds: timeTaken,
      ai_feedback: null,
      created_at: new Date().toISOString(),
    };

    const answers = getLocal<AssessmentAnswer>(LOCAL_ANSWERS_KEY);
    answers.push(answer);
    saveLocal(LOCAL_ANSWERS_KEY, answers);

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('assessment_answers')
          .insert({
            attempt_id: attemptId,
            question_id: questionId,
            user_answer: userAnswer,
            is_correct: isCorrect,
            score: isCorrect ? 1 : 0,
            time_taken_seconds: timeTaken,
          })
          .select()
          .single();

        if (!error && data) return data as AssessmentAnswer;
      }
    } catch {
      // ignore
    }

    return answer;
  },

  async completeAttempt(attemptId: string, assessmentId: string): Promise<AssessmentAttempt> {
    // Get answers from local or DB
    const allAnswers = getLocal<AssessmentAnswer>(LOCAL_ANSWERS_KEY);
    const answers = allAnswers.filter(a => a.attempt_id === attemptId);
    const questions = await this.getQuestions(assessmentId);

    const totalQuestions = questions.length || 5;
    const correctAnswers = answers.filter(a => a.is_correct).length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const totalTime = answers.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0);

    const evalQuestions = questions.map(q => {
      const ans = answers.find(a => a.question_id === q.id);
      return {
        question: q.question,
        correct_answer: q.correct_answer,
        user_answer: ans?.user_answer || '',
        topic: q.topic,
      };
    });

    const analysis = await aiService.evaluateAssessment(evalQuestions);

    const allAttempts = getLocal<AssessmentAttempt>(LOCAL_ATTEMPTS_KEY);
    let targetAttempt = allAttempts.find(a => a.id === attemptId);

    if (targetAttempt) {
      targetAttempt.completed_at = new Date().toISOString();
      targetAttempt.score = score;
      targetAttempt.accuracy = score;
      targetAttempt.time_taken_seconds = totalTime;
      targetAttempt.status = 'completed';
      targetAttempt.result_analysis = analysis;
      saveLocal(LOCAL_ATTEMPTS_KEY, allAttempts);
    } else {
      targetAttempt = {
        id: attemptId,
        user_id: 'current_user',
        assessment_id: assessmentId,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        score,
        total_possible: 100,
        accuracy: score,
        time_taken_seconds: totalTime,
        status: 'completed',
        result_analysis: analysis,
        created_at: new Date().toISOString(),
      };
      allAttempts.unshift(targetAttempt);
      saveLocal(LOCAL_ATTEMPTS_KEY, allAttempts);
    }

    try {
      if (supabase) {
        await supabase
          .from('assessment_attempts')
          .update({
            completed_at: targetAttempt.completed_at,
            score: targetAttempt.score,
            accuracy: targetAttempt.accuracy,
            time_taken_seconds: targetAttempt.time_taken_seconds,
            status: 'completed',
            result_analysis: analysis,
          })
          .eq('id', attemptId);
      }
    } catch {
      // ignore
    }

    return targetAttempt;
  },

  async getAttempts(userId: string, assessmentId?: string): Promise<AssessmentAttempt[]> {
    try {
      if (supabase) {
        let query = supabase
          .from('assessment_attempts')
          .select('*, assessment:assessments(*)')
          .eq('user_id', userId)
          .order('started_at', { ascending: false });

        if (assessmentId) {
          query = query.eq('assessment_id', assessmentId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) return data as AssessmentAttempt[];
      }
    } catch {
      // ignore
    }

    const localList = getLocal<AssessmentAttempt>(LOCAL_ATTEMPTS_KEY);
    return localList.filter(a => {
      const userMatch = a.user_id === userId || a.user_id === 'current_user';
      const assMatch = !assessmentId || a.assessment_id === assessmentId;
      return userMatch && assMatch;
    });
  },

  async getAttemptById(attemptId: string): Promise<AssessmentAttempt | null> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('assessment_attempts')
          .select('*')
          .eq('id', attemptId)
          .maybeSingle();

        if (!error && data) return data as AssessmentAttempt;
      }
    } catch {
      // ignore
    }

    const localList = getLocal<AssessmentAttempt>(LOCAL_ATTEMPTS_KEY);
    return localList.find(a => a.id === attemptId) || null;
  },

  async getAttemptAnswers(attemptId: string): Promise<AssessmentAnswer[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('assessment_answers')
          .select('*')
          .eq('attempt_id', attemptId);

        if (!error && data && data.length > 0) return data as AssessmentAnswer[];
      }
    } catch {
      // ignore
    }

    const localAnswers = getLocal<AssessmentAnswer>(LOCAL_ANSWERS_KEY);
    return localAnswers.filter(a => a.attempt_id === attemptId);
  },

  async getAttemptWithAnswers(attemptId: string): Promise<{
    attempt: AssessmentAttempt;
    answers: Array<AssessmentAnswer & { question: AssessmentQuestion }>;
  } | null> {
    const attempt = await this.getAttemptById(attemptId);
    if (!attempt) return null;

    const [answers, questions] = await Promise.all([
      this.getAttemptAnswers(attemptId),
      this.getQuestions(attempt.assessment_id),
    ]);

    const mapped = answers.map(ans => {
      const q = questions.find(qu => qu.id === ans.question_id);
      return {
        ...ans,
        question: q || {
          id: ans.question_id,
          assessment_id: attempt.assessment_id,
          skill_id: 'dsa',
          question: 'Assessment Question',
          question_type: 'mcq' as const,
          topic: 'General',
          difficulty: 'medium',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: ans.user_answer,
          explanation: 'Concept review',
          order_index: 1,
          created_at: new Date().toISOString(),
        },
      };
    });

    return { attempt, answers: mapped };
  },

  async getWeakTopics(userId: string, category: SkillCategory): Promise<string[]> {
    const attempts = await this.getAttempts(userId);
    const weakTopics: string[] = [];

    for (const attempt of attempts.slice(0, 5)) {
      if (attempt.result_analysis?.weaknesses) {
        weakTopics.push(...attempt.result_analysis.weaknesses);
      }
    }

    return [...new Set(weakTopics)];
  },

  async getAssessmentScores(userId: string): Promise<Map<string, number>> {
    const attempts = await this.getAttempts(userId);
    const scores = new Map<string, number>();
    for (const a of attempts) {
      if (a.status === 'completed' && a.score !== null) {
        const cat = (a as any).assessment?.skill_category || 'dsa';
        const existing = scores.get(cat) || 0;
        if ((a.score || 0) > existing) {
          scores.set(cat, a.score || 0);
        }
      }
    }
    return scores;
  },
};
