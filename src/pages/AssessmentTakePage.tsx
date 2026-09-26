// ============================================================
// PlacementOS — Assessment Taking Page
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Card, Spinner, PageLoader, ProgressBar, PriorityBadge,
} from '../components/ui';
import {
  Clock, ChevronRight, CheckCircle2, XCircle,
  Brain, ArrowLeft, Award, TrendingUp,
} from 'lucide-react';
import { assessmentService } from '../services/assessment.service';
import type { Assessment, AssessmentQuestion, AssessmentAttempt, AssessmentAnalysis } from '../types';

type Phase = 'loading' | 'ready' | 'in_progress' | 'submitting' | 'results';

export default function AssessmentTakePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  const timerRef = useRef<number | null>(null);
  const qTimerRef = useRef<number | null>(null);

  // Results state
  const [results, setResults] = useState<{
    attempt: AssessmentAttempt;
    answers: Array<{ question: AssessmentQuestion; user_answer: string; is_correct: boolean }>;
  } | null>(null);

  useEffect(() => {
    if (user && id) loadAssessment();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (qTimerRef.current) clearInterval(qTimerRef.current);
    };
  }, [user, id]);

  const loadAssessment = async () => {
    if (!id) return;
    try {
      const [a, q] = await Promise.all([
        assessmentService.getById(id),
        assessmentService.getQuestions(id),
      ]);

      if (!a) {
        navigate('/assessment');
        return;
      }

      setAssessment(a);
      setQuestions(q);

      if (a.status === 'completed') {
        // Load existing results
        const attempts = await assessmentService.getAttempts(user!.id, id);
        if (attempts.length > 0) {
          const attemptData = await assessmentService.getAttemptWithAnswers(attempts[0].id);
          if (attemptData) {
            setResults({
              attempt: attemptData.attempt,
              answers: attemptData.answers.map(a => ({
                question: a.question,
                user_answer: a.user_answer,
                is_correct: a.is_correct || false,
              })),
            });
            setPhase('results');
            return;
          }
        }
      }

      setPhase('ready');
    } catch (err) {
      console.error('Load error:', err);
      navigate('/assessment');
    }
  };

  const startAssessment = async () => {
    if (!user || !assessment) return;
    try {
      const att = await assessmentService.startAttempt(user.id, assessment.id);
      setAttempt(att);
      setPhase('in_progress');
      setCurrentIndex(0);
      setTimer(0);
      setQuestionTimer(0);

      // Start timers
      timerRef.current = window.setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
      qTimerRef.current = window.setInterval(() => {
        setQuestionTimer(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Start error:', err);
    }
  };

  const submitAnswer = async () => {
    if (!attempt || !selectedOption) return;
    const question = questions[currentIndex];

    // Save answer
    try {
      await assessmentService.submitAnswer(
        attempt.id,
        question.id,
        selectedOption,
        question.correct_answer,
        questionTimer
      );
    } catch (err) {
      console.error('Submit answer error:', err);
    }

    answers.set(question.id, selectedOption);
    setAnswers(new Map(answers));
    setSelectedOption(null);
    setQuestionTimer(0);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Complete assessment
      await finishAssessment();
    }
  };

  const finishAssessment = async () => {
    if (!attempt || !assessment) return;
    setPhase('submitting');

    if (timerRef.current) clearInterval(timerRef.current);
    if (qTimerRef.current) clearInterval(qTimerRef.current);

    try {
      const completedAttempt = await assessmentService.completeAttempt(attempt.id, assessment.id);
      
      // Build results
      const resultAnswers = questions.map(q => ({
        question: q,
        user_answer: answers.get(q.id) || '',
        is_correct: (answers.get(q.id) || '').trim().toLowerCase() === q.correct_answer.trim().toLowerCase(),
      }));

      setResults({
        attempt: completedAttempt,
        answers: resultAnswers,
      });
      setPhase('results');
    } catch (err) {
      console.error('Complete error:', err);
      setPhase('results');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (phase === 'loading') return <PageLoader message="Loading assessment..." />;

  // ── Ready Phase ──────────────────────────────────────────

  if (phase === 'ready') {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <button onClick={() => navigate('/assessment')} className="btn btn-ghost btn-sm mb-6">
          <ArrowLeft size={14} /> Back to Assessments
        </button>
        <Card accent className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mx-auto mb-6">
            <Brain size={32} className="text-accent-light" />
          </div>
          <h2 className="text-xl font-bold mb-2">{assessment?.title}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-text-muted mb-6">
            <span>{questions.length} questions</span>
            <span>•</span>
            <span>{assessment?.time_limit_minutes} min</span>
            <span>•</span>
            <span className="capitalize">{assessment?.difficulty}</span>
          </div>
          {assessment?.is_adaptive && (
            <p className="text-xs text-accent-light mb-4">
              ✦ Adaptive — Questions are focused on your weak areas
            </p>
          )}
          <button onClick={startAssessment} className="btn btn-primary btn-lg">
            Start Assessment
          </button>
        </Card>
      </div>
    );
  }

  // ── In Progress Phase ────────────────────────────────────

  if (phase === 'in_progress' || phase === 'submitting') {
    const question = questions[currentIndex];

    if (phase === 'submitting') {
      return (
        <div className="max-w-xl mx-auto text-center py-20 animate-fade-in">
          <Spinner size={40} className="text-accent mx-auto mb-4" />
          <p className="text-lg font-semibold">Evaluating your performance...</p>
          <p className="text-sm text-text-muted mt-2">AI is analyzing your answers</p>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="flex items-center gap-1 text-sm text-text-muted">
              <Clock size={14} />
              {formatTime(timer)}
            </span>
          </div>
          <ProgressBar value={currentIndex + 1} max={questions.length} />
        </div>

        {/* Question */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge badge-accent">{question.topic}</span>
            <span className="badge badge-info">{question.difficulty}</span>
          </div>
          <h3 className="text-lg font-semibold leading-relaxed mb-6">
            {question.question}
          </h3>

          {/* Options */}
          {question.options && (
            <div className="space-y-3">
              {question.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(option)}
                  className={`w-full text-left p-4 rounded-lg border transition-all
                    ${selectedOption === option
                      ? 'border-accent bg-accent-muted/20 text-text-primary'
                      : 'border-border bg-bg-input text-text-secondary hover:border-border-light hover:bg-bg-elevated'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${selectedOption === option ? 'border-accent bg-accent' : 'border-border'}`}
                    >
                      {selectedOption === option && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <span className="text-xs text-text-muted">
            ⏱ Question time: {formatTime(questionTimer)}
          </span>
          <button
            onClick={submitAnswer}
            disabled={!selectedOption}
            className="btn btn-primary"
          >
            {currentIndex < questions.length - 1 ? (
              <><span>Next</span><ChevronRight size={16} /></>
            ) : (
              <><span>Finish</span><CheckCircle2 size={16} /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Results Phase ────────────────────────────────────────

  if (phase === 'results' && results) {
    const analysis = results.attempt.result_analysis as AssessmentAnalysis | null;
    const score = results.attempt.score || 0;
    const correct = results.answers.filter(a => a.is_correct).length;
    const total = results.answers.length;

    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <button onClick={() => navigate('/assessment')} className="btn btn-ghost btn-sm mb-6">
          <ArrowLeft size={14} /> Back to Assessments
        </button>

        {/* Score Card */}
        <Card accent className="text-center py-8 mb-6">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4
            ${score >= 70 ? 'bg-success-muted' : score >= 40 ? 'bg-warning-muted' : 'bg-error-muted'}`}
          >
            <span
              className={`text-3xl font-bold
              ${score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-error'}`}
            >
              {score}%
            </span>
          </div>
          <h2 className="text-xl font-bold mb-2">Assessment Complete</h2>
          <p className="text-text-muted">
            {correct} of {total} correct • Time: {formatTime(results.attempt.time_taken_seconds || 0)}
          </p>
        </Card>

        {/* AI Analysis */}
        {analysis && (
          <div className="space-y-4 mb-6">
            <Card>
              <CardHeader title="AI Performance Analysis" icon={Brain} />
              <p className="text-sm text-text-secondary mb-4">{analysis.overall_feedback}</p>

              {/* Topic Performance */}
              {analysis.topic_performance && analysis.topic_performance.length > 0 && (
                <div className="space-y-3 mb-4">
                  {analysis.topic_performance.map((tp, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{tp.topic}</span>
                        <span className={tp.accuracy >= 70 ? 'text-success' : tp.accuracy >= 40 ? 'text-warning' : 'text-error'}>
                          {tp.score}/{tp.total} ({tp.accuracy}%)
                        </span>
                      </div>
                      <ProgressBar
                        value={tp.accuracy}
                        color={tp.accuracy >= 70 ? 'var(--color-success)' : tp.accuracy >= 40 ? 'var(--color-warning)' : 'var(--color-error)'}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Root causes */}
              {analysis.root_causes && analysis.root_causes.length > 0 && (
                <div className="p-3 rounded-lg bg-bg-input mb-4">
                  <p className="text-xs font-semibold text-text-muted uppercase mb-2">Root Causes</p>
                  {analysis.root_causes.map((cause, i) => (
                    <p key={i} className="text-sm text-text-secondary mb-1">• {cause}</p>
                  ))}
                </div>
              )}

              {/* Next steps */}
              {analysis.recommended_next_steps && analysis.recommended_next_steps.length > 0 && (
                <div className="p-3 rounded-lg bg-accent-muted/10">
                  <p className="text-xs font-semibold text-accent-light uppercase mb-2">Recommended Next Steps</p>
                  {analysis.recommended_next_steps.map((step, i) => (
                    <p key={i} className="text-sm text-text-secondary mb-1">{i + 1}. {step}</p>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Answer Review */}
        <h3 className="text-base font-semibold mb-4">Answer Review</h3>
        <div className="space-y-3">
          {results.answers.map((a, i) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                {a.is_correct ? (
                  <CheckCircle2 size={20} className="text-success mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle size={20} className="text-error mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">{a.question.question}</p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-text-muted">Your answer:</span>{' '}
                      <span className={a.is_correct ? 'text-success' : 'text-error'}>{a.user_answer || '(not answered)'}</span>
                    </p>
                    {!a.is_correct && (
                      <p>
                        <span className="text-text-muted">Correct:</span>{' '}
                        <span className="text-success">{a.question.correct_answer}</span>
                      </p>
                    )}
                    {a.question.explanation && (
                      <p className="text-xs text-text-muted mt-2 p-2 bg-bg-input rounded">
                        💡 {a.question.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={() => navigate('/assessment')} className="btn btn-secondary">
            Back to Assessments
          </button>
          <button onClick={() => navigate('/skill-gap')} className="btn btn-primary">
            <TrendingUp size={16} /> View Updated Skill Gaps
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function CardHeader({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} className="text-accent-light" />
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
  );
}
