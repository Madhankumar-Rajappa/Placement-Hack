// ============================================================
// PlacementOS — Weakness Hunter (Root Cause Diagnostic Engine)
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { weaknessService } from '../services/weakness.service';
import type { WeaknessPattern } from '../types';
import {
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../components/ui';

export default function WeaknessHunterPage() {
  const { user } = useAuth();
  const [weaknesses, setWeaknesses] = useState<WeaknessPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [quizResult, setQuizResult] = useState<{ isCorrect: boolean; explanation: string } | null>(null);

  useEffect(() => {
    loadWeaknesses();
  }, [user]);

  const loadWeaknesses = async () => {
    setLoading(true);
    try {
      const data = await weaknessService.getWeaknesses(user?.id || 'demo_user');
      setWeaknesses(data);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (w: WeaknessPattern) => {
    setActiveQuizId(w.id);
    setSelectedAnswer('');
    setQuizResult(null);
  };

  const handleSubmitQuiz = async (w: WeaknessPattern) => {
    if (!selectedAnswer) return;
    const res = await weaknessService.verifyWeakness(w.id, selectedAnswer);
    setQuizResult({ isCorrect: res.isCorrect, explanation: res.explanation });
    if (res.isCorrect) {
      loadWeaknesses();
    }
  };

  const activeCount = weaknesses.filter(w => w.status === 'active').length;
  const resolvedCount = weaknesses.filter(w => w.status === 'resolved').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wider mb-1">
            <span>Diagnostic Intelligence</span>
            <span>/</span>
            <span className="text-accent-light">Weakness Hunter</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            Weakness Hunter
            <span className="text-xs px-2.5 py-1 rounded-full bg-accent/20 text-accent-light border border-accent/30 font-semibold">
              Root-Cause Analyzer
            </span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Synthesizes assessment answers, coding attempts, and interview transcripts to pinpoint foundational root causes.
          </p>
        </div>

        <button
          onClick={async () => {
            await weaknessService.resetWeaknesses();
            loadWeaknesses();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-bg-card hover:bg-bg-tertiary border border-border text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
        >
          <RotateCcw size={14} />
          <span>Re-analyze Gaps</span>
        </button>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Active Root Gaps</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{activeCount}</p>
          <span className="text-xs text-text-muted">Targeted for intervention</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Verified & Resolved</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{resolvedCount}</p>
          <span className="text-xs text-text-muted">Passed verification test</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Diagnostic Confidence</span>
          <p className="text-2xl font-bold text-accent-light mt-1">88%</p>
          <span className="text-xs text-text-muted">Multi-modal pattern match</span>
        </div>
      </div>

      {/* Weakness Patterns List */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-text-muted">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-accent" />
            <p className="text-sm">Scanning across assessments and simulation transcripts...</p>
          </div>
        ) : (
          weaknesses.map((w) => (
            <div
              key={w.id}
              className={`p-6 sm:p-7 rounded-2xl border transition-all duration-200 ${
                w.status === 'resolved'
                  ? 'bg-bg-card/40 border-emerald-500/30'
                  : 'bg-bg-card border-border shadow-lg shadow-black/20'
              }`}
            >
              {/* Top Meta Line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      w.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {w.status === 'resolved' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-bg-secondary text-text-muted border border-border">
                      {w.category}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-text-primary mt-1">{w.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent-light font-semibold">
                    Confidence: {w.confidence_score}%
                  </span>
                  {w.status === 'resolved' && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      Resolved
                    </span>
                  )}
                </div>
              </div>

              {/* Root Cause Diagnosis Block */}
              <div className="mt-5 space-y-4">
                <div className="p-4 rounded-xl bg-bg-secondary border border-border space-y-2">
                  <h4 className="text-xs font-bold text-accent-light uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} /> Root Cause Synthesis
                  </h4>
                  <p className="text-sm font-medium text-text-primary leading-relaxed">{w.root_cause}</p>
                </div>

                {/* Evidence Strip */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Observed Assessment Evidence:
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {w.evidence.map((ev, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-text-secondary font-mono"
                      >
                        • {ev}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Intervention */}
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-accent-light">
                    <span className="uppercase tracking-wider">Recommended Intervention</span>
                    <span className="flex items-center gap-1 text-text-muted">
                      <Clock size={12} /> {w.recommended_intervention.estimated_time_minutes} min sprint
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary">
                    {w.recommended_intervention.action}
                  </p>
                  <p className="text-xs font-semibold text-text-primary pt-1">
                    Topic Focus: {w.recommended_intervention.curated_topic}
                  </p>
                </div>

                {/* Verification Test Card / Modal */}
                {w.status === 'active' && (
                  <div className="pt-2">
                    {activeQuizId !== w.id ? (
                      <button
                        onClick={() => handleStartQuiz(w)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-xs sm:text-sm shadow-md shadow-accent/20 transition-all"
                      >
                        <span>Take 1-Click Verification Test</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <div className="p-5 rounded-xl bg-bg-secondary border border-accent/40 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-accent-light uppercase tracking-wider">
                            Verification Quiz: Confirm Root Cause Fix
                          </span>
                          <button
                            onClick={() => setActiveQuizId(null)}
                            className="text-xs text-text-muted hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </div>

                        <p className="text-sm font-semibold text-text-primary leading-relaxed">
                          {w.verification_test.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {w.verification_test.options.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                                selectedAnswer === opt
                                  ? 'bg-accent/20 border-accent text-accent-light font-bold'
                                  : 'bg-bg-card border-border hover:border-border-focus text-text-secondary'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`quiz_${w.id}`}
                                value={opt}
                                checked={selectedAnswer === opt}
                                onChange={() => setSelectedAnswer(opt)}
                                className="text-accent"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>

                        {/* Quiz Feedback */}
                        {quizResult && (
                          <div
                            className={`p-3.5 rounded-lg border text-xs leading-relaxed space-y-1 ${
                              quizResult.isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-error/10 border-error/30 text-error'
                            }`}
                          >
                            <p className="font-bold">
                              {quizResult.isCorrect ? '✓ Correct! Root cause validated and marked resolved.' : '✗ Incorrect answer.'}
                            </p>
                            <p className="text-text-secondary text-[11px]">{quizResult.explanation}</p>
                          </div>
                        )}

                        {!quizResult?.isCorrect && (
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => handleSubmitQuiz(w)}
                              disabled={!selectedAnswer}
                              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-xs disabled:opacity-50 transition-all"
                            >
                              Submit Verification Answer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
