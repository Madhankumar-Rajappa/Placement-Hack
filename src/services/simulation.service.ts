// ============================================================
// PlacementOS — Simulation Service Layer
// ============================================================

import { supabase } from '../lib/supabase';
import { aiService } from './ai.service';
import type {
  Simulation,
  SimulationMode,
  SimulationRound,
  SimulationRoundType,
  SimulationQuestion,
  SimulationAnswer,
  AIAnswerEvaluation,
  CodingProblem,
  CodeEvaluationResult,
  SimulationReport,
} from '../types';

const STORAGE_KEY = 'placementos_active_simulation';
const HISTORY_KEY = 'placementos_simulation_history';

export const simulationService = {
  // ── Create and Initialize Simulation ─────────────────────────
  async createSimulation(params: {
    userId: string;
    targetRole: string;
    mode: SimulationMode;
    resumeProfile?: any;
    skillGaps?: string[];
  }): Promise<Simulation> {
    const { userId, targetRole, mode, resumeProfile, skillGaps } = params;

    let roundTypes: SimulationRoundType[] = [];
    if (mode === 'quick') {
      roundTypes = ['aptitude', 'technical', 'hr'];
    } else if (mode === 'technical') {
      roundTypes = ['coding', 'technical', 'project'];
    } else {
      roundTypes = ['aptitude', 'coding', 'technical', 'project', 'hr'];
    }

    const roundTitles: Record<SimulationRoundType, string> = {
      aptitude: 'Round 1: Quantitative & Logical Aptitude',
      coding: 'Round 2: Algorithmic Coding Challenge',
      technical: 'Round 3: Core Technical & CS Fundamentals',
      project: 'Round 4: Resume Project Architecture Deep-Dive',
      hr: 'Round 5: Behavioral, Culture & STAR Interview',
    };

    const roundTimeLimits: Record<SimulationRoundType, number> = {
      aptitude: 10,
      coding: 25,
      technical: 15,
      project: 15,
      hr: 10,
    };

    const simId = `sim_${Date.now()}`;
    const rounds: SimulationRound[] = [];

    // Pre-generate / prepare questions for rounds
    for (let i = 0; i < roundTypes.length; i++) {
      const type = roundTypes[i];
      const roundId = `round_${simId}_${type}`;
      let questions: SimulationQuestion[] = [];

      if (type === 'aptitude') {
        questions = await aiService.generateAptitudeQuestions({
          difficulty: 'medium',
          count: 4,
        });
      } else if (type === 'coding') {
        const problem = await aiService.generateCodingProblem({
          targetRole,
          weakSkills: skillGaps || ['DSA', 'Arrays'],
          difficulty: 'medium',
        });
        questions = [
          {
            id: `q_cod_${Date.now()}`,
            round_id: roundId,
            round_type: 'coding',
            question_text: `${problem.title}\n\n${problem.description}`,
            difficulty: problem.difficulty,
            context_data: problem as any,
            starter_code: problem.starter_code.python,
            expected_concepts: problem.expected_concepts,
            test_cases: problem.test_cases,
            order_index: 1,
          },
        ];
      } else {
        // Interview rounds (start with initial dynamic question)
        const step = await aiService.conductInterviewStep({
          roundType: type,
          targetRole,
          resumeProfile,
          skillGaps,
          history: [],
        });

        questions = [
          {
            id: `q_${type}_1_${Date.now()}`,
            round_id: roundId,
            round_type: type,
            question_text: step.question,
            difficulty: 'medium',
            context_data: { contextNotes: step.contextNotes, expectedPoints: step.expectedPoints },
            expected_concepts: step.expectedPoints,
            order_index: 1,
          },
        ];
      }

      rounds.push({
        id: roundId,
        simulation_id: simId,
        round_type: type,
        order_index: i + 1,
        title: roundTitles[type],
        status: i === 0 ? 'in_progress' : 'pending',
        score: null,
        max_score: 100,
        time_limit_minutes: roundTimeLimits[type],
        time_taken_seconds: 0,
        feedback: null,
        questions,
      });
    }

    const simulation: Simulation = {
      id: simId,
      user_id: userId,
      target_role: targetRole,
      mode,
      status: 'in_progress',
      overall_score: null,
      current_round_index: 0,
      total_rounds: rounds.length,
      started_at: new Date().toISOString(),
      completed_at: null,
      report: null,
      rounds,
      created_at: new Date().toISOString(),
    };

    // Save to LocalStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation));
    } catch {
      // ignore
    }

    // Attempt Supabase insert in background
    try {
      if (supabase) {
        await supabase.from('simulations').insert({
          id: simulation.id,
          user_id: userId,
          target_role: targetRole,
          mode,
          status: 'in_progress',
          total_rounds: rounds.length,
          current_round_index: 0,
          started_at: simulation.started_at,
        });
      }
    } catch (e) {
      console.warn('Simulation DB persistence offline, using local session state:', e);
    }

    return simulation;
  },

  // ── Get Active Simulation ────────────────────────────────────
  getActiveSimulation(): Simulation | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const sim = JSON.parse(data);
        if (sim.status === 'in_progress') return sim;
      }
    } catch {
      // ignore
    }
    return null;
  },

  // ── Save Simulation State ────────────────────────────────────
  saveSimulation(simulation: Simulation): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation));
    } catch {
      // ignore
    }
  },

  // ── Submit Aptitude Round ────────────────────────────────────
  async submitAptitudeAnswers(
    simulation: Simulation,
    roundIndex: number,
    answers: Record<string, string>,
    timeTakenSeconds: number
  ): Promise<Simulation> {
    const round = simulation.rounds[roundIndex];
    if (!round) return simulation;

    let correctCount = 0;
    round.questions.forEach(q => {
      const userAns = answers[q.id] || '';
      const isCorrect = userAns.trim().toLowerCase() === (q.correct_answer || '').trim().toLowerCase();
      if (isCorrect) correctCount++;

      q.answer = {
        id: `ans_${Date.now()}_${q.id}`,
        question_id: q.id,
        user_answer: userAns,
        score: isCorrect ? 100 : 0,
        is_correct: isCorrect,
        time_taken_seconds: Math.round(timeTakenSeconds / round.questions.length),
        created_at: new Date().toISOString(),
      };
    });

    const score = Math.round((correctCount / round.questions.length) * 100);
    round.score = score;
    round.status = 'completed';
    round.time_taken_seconds = timeTakenSeconds;
    round.feedback = `Scored ${score}% (${correctCount}/${round.questions.length} correct). Time taken: ${Math.floor(timeTakenSeconds / 60)}m ${timeTakenSeconds % 60}s.`;

    return this.advanceToNextRound(simulation);
  },

  // ── Submit Coding Solution ───────────────────────────────────
  async submitCodingSolution(
    simulation: Simulation,
    roundIndex: number,
    code: string,
    language: string,
    timeTakenSeconds: number
  ): Promise<{ simulation: Simulation; evaluation: CodeEvaluationResult }> {
    const round = simulation.rounds[roundIndex];
    const question = round?.questions[0];
    const problem: CodingProblem = question?.context_data as any;

    const evaluation = await aiService.evaluateCodeSubmission({
      problem: problem || ({} as any),
      code,
      language,
    });

    if (question) {
      question.answer = {
        id: `ans_cod_${Date.now()}`,
        question_id: question.id,
        user_answer: code,
        code_submission: code,
        score: evaluation.overall_score,
        is_correct: evaluation.passed_tests === evaluation.total_tests,
        time_taken_seconds: timeTakenSeconds,
        created_at: new Date().toISOString(),
      };
    }

    if (round) {
      round.score = evaluation.overall_score;
      round.status = 'completed';
      round.time_taken_seconds = timeTakenSeconds;
      round.feedback = `${evaluation.passed_tests}/${evaluation.total_tests} test cases passed. ${evaluation.approach_feedback}`;
    }

    const updated = this.advanceToNextRound(simulation);
    return { simulation: updated, evaluation };
  },

  // ── Process Interview Turn (Technical, Project, HR) ──────────
  async processInterviewTurn(
    simulation: Simulation,
    roundIndex: number,
    questionIndex: number,
    userAnswer: string,
    timeTakenSeconds: number
  ): Promise<{
    simulation: Simulation;
    evaluation: AIAnswerEvaluation;
    nextQuestion?: string;
    isRoundComplete: boolean;
  }> {
    const round = simulation.rounds[roundIndex];
    const question = round?.questions[questionIndex];
    if (!round || !question) throw new Error('Round or question not found');

    // 1. Evaluate user answer
    const evaluation = await aiService.evaluateInterviewAnswer({
      question: question.question_text,
      answer: userAnswer,
      roundType: round.round_type as any,
      context: question.context_data,
    });

    question.answer = {
      id: `ans_int_${Date.now()}`,
      question_id: question.id,
      user_answer: userAnswer,
      score: evaluation.overall_score,
      time_taken_seconds: timeTakenSeconds,
      ai_evaluation: evaluation,
      created_at: new Date().toISOString(),
    };

    // Max questions per interview round
    const maxQuestionsInRound = 3;
    const currentQCount = round.questions.length;

    let nextQuestion: string | undefined;
    let isRoundComplete = false;

    if (currentQCount < maxQuestionsInRound) {
      // Generate follow-up or next contextual question
      const history = round.questions.map(q => [
        { role: 'ai' as const, text: q.question_text },
        ...(q.answer ? [{ role: 'user' as const, text: q.answer.user_answer }] : []),
      ]).flat();

      const nextStep = await aiService.conductInterviewStep({
        roundType: round.round_type as any,
        targetRole: simulation.target_role,
        history,
        lastAnswer: userAnswer,
      });

      nextQuestion = nextStep.question;

      const newQ: SimulationQuestion = {
        id: `q_${round.round_type}_${currentQCount + 1}_${Date.now()}`,
        round_id: round.id,
        round_type: round.round_type,
        question_text: nextStep.question,
        difficulty: 'medium',
        context_data: { contextNotes: nextStep.contextNotes, expectedPoints: nextStep.expectedPoints },
        expected_concepts: nextStep.expectedPoints,
        order_index: currentQCount + 1,
      };

      round.questions.push(newQ);
    } else {
      // Round Complete
      isRoundComplete = true;
      const totalScore = round.questions.reduce((sum, q) => sum + (q.answer?.score || 0), 0);
      const avgScore = Math.round(totalScore / round.questions.length);

      round.score = avgScore;
      round.status = 'completed';
      round.time_taken_seconds = (round.time_taken_seconds || 0) + timeTakenSeconds;
      round.feedback = `Completed ${round.questions.length} questions. Average performance: ${avgScore}%. ${evaluation.improvement}`;

      this.advanceToNextRound(simulation);
    }

    this.saveSimulation(simulation);
    return { simulation, evaluation, nextQuestion, isRoundComplete };
  },

  // ── Advance Round / Finish Simulation ────────────────────────
  advanceToNextRound(simulation: Simulation): Simulation {
    const nextIdx = simulation.current_round_index + 1;
    if (nextIdx < simulation.rounds.length) {
      simulation.current_round_index = nextIdx;
      simulation.rounds[nextIdx].status = 'in_progress';
    } else {
      // Simulation Complete!
      simulation.status = 'completed';
      simulation.completed_at = new Date().toISOString();

      const completedRounds = simulation.rounds.filter(r => r.score !== null);
      const avgOverall = completedRounds.length > 0
        ? Math.round(completedRounds.reduce((acc, r) => acc + (r.score || 0), 0) / completedRounds.length)
        : 75;

      simulation.overall_score = avgOverall;
    }

    this.saveSimulation(simulation);
    return simulation;
  },

  // ── Generate & Finalize Full Report ──────────────────────────
  async finalizeSimulationReport(simulation: Simulation): Promise<SimulationReport> {
    const report = await aiService.generateSimulationReport({
      simulation,
      targetRole: simulation.target_role,
    });

    simulation.report = report;
    this.saveSimulation(simulation);

    // Save to historical reports
    try {
      const existingHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      existingHistory.unshift(simulation);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(existingHistory.slice(0, 10)));
    } catch {
      // ignore
    }

    return report;
  },

  // ── Get History ──────────────────────────────────────────────
  getSimulationHistory(): Simulation[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
};
