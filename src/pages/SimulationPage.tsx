// ============================================================
// PlacementOS — AI Placement Simulator Page
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { simulationService } from '../services/simulation.service';
import { resumeService } from '../services/resume.service';
import { jobService } from '../services/job.service';
import type {
  Simulation,
  SimulationMode,
  SimulationRound,
  SimulationQuestion,
  CodingProblem,
  CodeEvaluationResult,
  AIAnswerEvaluation,
  SimulationReport,
} from '../types';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Mic,
  MicOff,
  Volume2,
  Send,
  Code2,
  Brain,
  Award,
  ChevronRight,
  ArrowLeft,
  FileCheck,
  Zap,
  Layers,
  Terminal,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { Card } from '../components/ui';

export default function SimulationPage() {
  const { user, profile } = useAuth();
  const [selectedMode, setSelectedMode] = useState<SimulationMode>('full');
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SimulationReport | null>(null);

  // Aptitude Round State
  const [aptitudeAnswers, setAptitudeAnswers] = useState<Record<string, string>>({});
  const [aptitudeTimer, setAptitudeTimer] = useState(600); // 10 mins

  // Coding Round State
  const [codingCode, setCodingCode] = useState('');
  const [codingLang, setCodingLang] = useState<'python' | 'javascript' | 'cpp'>('python');
  const [codeEval, setCodeEval] = useState<CodeEvaluationResult | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // Interview Rounds State (Tech, Project, HR)
  const [interviewInput, setInterviewInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isEvaluatingTurn, setIsEvaluatingTurn] = useState(false);
  const [latestEval, setLatestEval] = useState<AIAnswerEvaluation | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Timer Ref
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInterviewInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }

    // Check active simulation on load
    const active = simulationService.getActiveSimulation();
    if (active) {
      setSimulation(active);
      initRoundState(active);
    }
  }, []);

  const initRoundState = (sim: Simulation) => {
    const currentRound = sim.rounds[sim.current_round_index];
    if (!currentRound) return;

    if (currentRound.round_type === 'coding') {
      const prob: CodingProblem = currentRound.questions[0]?.context_data as any;
      if (prob?.starter_code) {
        setCodingCode(prob.starter_code[codingLang] || prob.starter_code.python || '');
      }
    }
  };

  const handleStartSimulation = async (modeToStart: SimulationMode = selectedMode) => {
    setLoading(true);
    setReport(null);
    try {
      const resume = await resumeService.getByUser(user?.id || '');
      const jobs = await jobService.getAll(user?.id || '');
      const targetJob = jobs.find((j) => j.is_target) || jobs[0];

      const sim = await simulationService.createSimulation({
        userId: user?.id || 'demo_user',
        targetRole: targetJob?.role || profile?.target_role || 'Software Engineer',
        mode: modeToStart,
        resumeProfile: resume?.analysis_json,
        skillGaps: ['DSA', 'Operating Systems', 'DBMS'],
      });

      setSimulation(sim);
      initRoundState(sim);
    } catch (e) {
      console.error('Failed to create simulation:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      }
    }
  };

  const playAIQuestionAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // ── Round 1: Submit Aptitude ──
  const handleAptitudeSubmit = async () => {
    if (!simulation) return;
    setLoading(true);
    const updated = await simulationService.submitAptitudeAnswers(
      simulation,
      simulation.current_round_index,
      aptitudeAnswers,
      600 - aptitudeTimer
    );
    setSimulation({ ...updated });
    initRoundState(updated);
    setLoading(false);

    if (updated.status === 'completed') {
      finalizeReport(updated);
    }
  };

  // ── Round 2: Submit Code ──
  const handleCodingSubmit = async () => {
    if (!simulation) return;
    setIsSubmittingCode(true);
    try {
      const result = await simulationService.submitCodingSolution(
        simulation,
        simulation.current_round_index,
        codingCode,
        codingLang,
        180
      );
      setCodeEval(result.evaluation);
      setSimulation({ ...result.simulation });
      initRoundState(result.simulation);

      if (result.simulation.status === 'completed') {
        finalizeReport(result.simulation);
      }
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // ── Round 3-5: Submit Interview Answer ──
  const handleInterviewSubmit = async () => {
    if (!simulation || !interviewInput.trim() || isEvaluatingTurn) return;
    const currentRound = simulation.rounds[simulation.current_round_index];
    const currentQIdx = currentRound.questions.length - 1;

    setIsEvaluatingTurn(true);
    try {
      const result = await simulationService.processInterviewTurn(
        simulation,
        simulation.current_round_index,
        currentQIdx,
        interviewInput,
        60
      );

      setLatestEval(result.evaluation);
      setInterviewInput('');
      setSimulation({ ...result.simulation });

      if (result.nextQuestion) {
        playAIQuestionAudio(result.nextQuestion);
      }

      if (result.simulation.status === 'completed') {
        finalizeReport(result.simulation);
      }
    } finally {
      setIsEvaluatingTurn(false);
    }
  };

  const finalizeReport = async (sim: Simulation) => {
    setLoading(true);
    const finalRep = await simulationService.finalizeSimulationReport(sim);
    setReport(finalRep);
    setLoading(false);
  };

  const currentRound = simulation?.rounds[simulation.current_round_index];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wider mb-1">
            <span>Adaptive AI Intelligence</span>
            <span>/</span>
            <span className="text-accent-light">Placement Simulator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            AI Placement Simulator
            <span className="text-xs px-2.5 py-1 rounded-full bg-accent/20 text-accent-light border border-accent/30 font-semibold">
              Phase 2
            </span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Simulate realistic multi-round placement drives with adaptive aptitude, live code evaluation, and contextual AI interviews.
          </p>
        </div>

        {simulation && simulation.status === 'in_progress' && (
          <button
            onClick={() => {
              if (confirm('Abandon current simulation?')) {
                setSimulation(null);
                setReport(null);
                localStorage.removeItem('placementos_active_simulation');
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-bg-card hover:bg-error/10 hover:text-error border border-border text-xs font-semibold text-text-muted transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reset Simulation</span>
          </button>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. START / MODE CONFIGURATION VIEW */}
      {/* ───────────────────────────────────────────────────────── */}
      {!simulation && !report && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Hero CTA Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-bg-card via-bg-card to-accent/10 border border-accent/30 shadow-xl relative overflow-hidden">
            <div className="max-w-2xl relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent-light text-xs font-semibold border border-accent/40">
                <Sparkles size={14} />
                Full End-to-End Recruitment Drive Simulation
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Test your skills under realistic placement conditions.
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                The simulator tailors each round to your claimed resume skills and identified gaps. Every answer is evaluated using strict rubric standards with intelligent follow-up inquiries.
              </p>
            </div>
          </div>

          {/* Simulation Mode Selector */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-text-primary">Choose Simulation Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Quick Simulation */}
              <div
                onClick={() => setSelectedMode('quick')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  selectedMode === 'quick'
                    ? 'bg-bg-card border-accent shadow-lg shadow-accent/15 ring-2 ring-accent/20'
                    : 'bg-bg-card/60 border-border hover:border-border-focus'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/30">
                      ~25 Minutes
                    </span>
                    <input
                      type="radio"
                      checked={selectedMode === 'quick'}
                      onChange={() => setSelectedMode('quick')}
                      className="text-accent"
                    />
                  </div>
                  <h4 className="text-base font-bold text-text-primary mt-3">Quick Simulation</h4>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    Rapid screening across essential rounds: Aptitude, Core Technical Interview, and HR evaluation.
                  </p>
                  <div className="mt-4 space-y-1.5 text-xs text-text-muted">
                    <div className="flex items-center gap-2">✓ Round 1: Aptitude (4 MCQs)</div>
                    <div className="flex items-center gap-2">✓ Round 3: Technical Fundamentals</div>
                    <div className="flex items-center gap-2">✓ Round 5: Behavioral & HR</div>
                  </div>
                </div>
              </div>

              {/* Technical Simulation */}
              <div
                onClick={() => setSelectedMode('technical')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  selectedMode === 'technical'
                    ? 'bg-bg-card border-accent shadow-lg shadow-accent/15 ring-2 ring-accent/20'
                    : 'bg-bg-card/60 border-border hover:border-border-focus'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/30">
                      ~35 Minutes
                    </span>
                    <input
                      type="radio"
                      checked={selectedMode === 'technical'}
                      onChange={() => setSelectedMode('technical')}
                      className="text-accent"
                    />
                  </div>
                  <h4 className="text-base font-bold text-text-primary mt-3">Technical Simulation</h4>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    Deep-dive technical evaluation covering Algorithmic Coding, Systems Fundamentals, and Resume Project Architecture.
                  </p>
                  <div className="mt-4 space-y-1.5 text-xs text-text-muted">
                    <div className="flex items-center gap-2">✓ Round 2: Coding Challenge</div>
                    <div className="flex items-center gap-2">✓ Round 3: CS Core & DB Concepts</div>
                    <div className="flex items-center gap-2">✓ Round 4: Project Architecture Probe</div>
                  </div>
                </div>
              </div>

              {/* Full Placement Simulation */}
              <div
                onClick={() => setSelectedMode('full')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  selectedMode === 'full'
                    ? 'bg-bg-card border-accent shadow-lg shadow-accent/15 ring-2 ring-accent/20'
                    : 'bg-bg-card/60 border-border hover:border-border-focus'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                      ~50 Minutes (Recommended)
                    </span>
                    <input
                      type="radio"
                      checked={selectedMode === 'full'}
                      onChange={() => setSelectedMode('full')}
                      className="text-accent"
                    />
                  </div>
                  <h4 className="text-base font-bold text-text-primary mt-3">Full Placement Simulation</h4>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    Complete 5-round recruitment drive recreating actual Tier-1 tech company placement procedures.
                  </p>
                  <div className="mt-4 space-y-1.5 text-xs text-text-muted">
                    <div className="flex items-center gap-2">✓ All 5 Recruitment Rounds</div>
                    <div className="flex items-center gap-2">✓ Detailed Cross-Round Rubric Report</div>
                    <div className="flex items-center gap-2">✓ Updates Verified Placement Twin</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Start CTA Button */}
            <div className="pt-4 flex justify-center sm:justify-start">
              <button
                onClick={() => handleStartSimulation(selectedMode)}
                disabled={loading}
                className="flex items-center gap-3 px-8 py-4 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-base shadow-xl shadow-accent/25 hover:shadow-accent/40 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Preparing Adaptive Simulation...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>Start Placement Simulation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. ACTIVE SIMULATION VIEW */}
      {/* ───────────────────────────────────────────────────────── */}
      {simulation && simulation.status === 'in_progress' && currentRound && (
        <div className="space-y-6">
          {/* Stepper Progress Bar */}
          <div className="p-4 rounded-xl bg-bg-card border border-border">
            <div className="flex items-center justify-between text-xs text-text-muted font-medium mb-3">
              <span>
                Round {simulation.current_round_index + 1} of {simulation.total_rounds}:{' '}
                <strong className="text-text-primary">{currentRound.title}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-accent-light font-semibold">
                <Clock size={13} />
                Time Limit: {currentRound.time_limit_minutes} mins
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {simulation.rounds.map((r, idx) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                    idx === simulation.current_round_index
                      ? 'bg-accent/15 border-accent text-accent-light shadow-sm'
                      : r.status === 'completed'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-bg-secondary border-border text-text-muted opacity-60'
                  }`}
                >
                  <div className="truncate">Round {idx + 1}</div>
                  <div className="text-[10px] font-normal uppercase mt-0.5 truncate">{r.round_type}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ──────────────── ROUND 1: APTITUDE ──────────────── */}
          {currentRound.round_type === 'aptitude' && (
            <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-6">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Round 1: Adaptive Aptitude Test</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Quantitative, Logical Reasoning, and Data Interpretation.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-bg-secondary border border-border text-xs font-bold text-accent-light">
                  {currentRound.questions.length} Questions
                </div>
              </div>

              <div className="space-y-6">
                {currentRound.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-bg-secondary border border-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-accent-light">Question {qIdx + 1}</span>
                      <span className="px-2 py-0.5 rounded bg-bg-card text-text-muted text-[11px] border border-border">
                        {q.category}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-text-primary leading-relaxed">{q.question_text}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {q.options?.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-colors ${
                            aptitudeAnswers[q.id] === opt
                              ? 'bg-accent/15 border-accent text-accent-light font-semibold'
                              : 'bg-bg-card border-border hover:border-border-focus text-text-secondary'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={opt}
                            checked={aptitudeAnswers[q.id] === opt}
                            onChange={() => setAptitudeAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                            className="text-accent"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  onClick={handleAptitudeSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-sm shadow-lg shadow-accent/25 transition-all disabled:opacity-50"
                >
                  <span>Submit Aptitude Round</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ──────────────── ROUND 2: CODING ──────────────── */}
          {currentRound.round_type === 'coding' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Problem Description Panel */}
              <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-4">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/30">
                    Round 2: Problem Solving
                  </span>
                  <span className="text-xs text-text-muted">Target: {simulation.target_role}</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {(currentRound.questions[0]?.context_data as any)?.title || 'Algorithmic Challenge'}
                  </h3>
                  <p className="text-xs text-accent-light font-medium mt-0.5">
                    Topic: {(currentRound.questions[0]?.context_data as any)?.topic || 'Data Structures'}
                  </p>
                </div>

                <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {(currentRound.questions[0]?.context_data as any)?.description}
                </div>

                {/* Constraints */}
                <div className="space-y-1.5 pt-2">
                  <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider">Constraints:</h5>
                  <ul className="text-xs text-text-secondary space-y-1 list-disc pl-4 font-mono">
                    {(currentRound.questions[0]?.context_data as any)?.constraints?.map((c: string, idx: number) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Examples */}
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider">Examples:</h5>
                  {(currentRound.questions[0]?.context_data as any)?.examples?.map((ex: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-bg-secondary border border-border text-xs font-mono space-y-1">
                      <div><strong className="text-text-primary">Input:</strong> {ex.input}</div>
                      <div><strong className="text-accent-light">Output:</strong> {ex.output}</div>
                      {ex.explanation && <div className="text-text-muted text-[11px]">Explanation: {ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Editor & Test Cases Panel */}
              <div className="p-6 rounded-2xl bg-bg-card border border-border flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-accent-light" />
                    <span className="text-xs font-bold text-text-primary">Code Solution</span>
                  </div>
                  <select
                    value={codingLang}
                    onChange={(e) => setCodingLang(e.target.value as any)}
                    className="bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                  >
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript (Node.js)</option>
                    <option value="cpp">C++ 20</option>
                  </select>
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={codingCode}
                  onChange={(e) => setCodingCode(e.target.value)}
                  placeholder="Write your algorithmic approach here..."
                  rows={14}
                  className="w-full bg-bg-primary border border-border rounded-xl p-4 font-mono text-xs text-text-primary leading-relaxed focus:outline-none focus:border-accent resize-none"
                />

                {/* Evaluation Feedback if present */}
                {codeEval && (
                  <div className="p-3.5 rounded-xl bg-bg-secondary border border-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-accent-light">Test Results</span>
                      <span className="font-bold text-emerald-400">
                        {codeEval.passed_tests} / {codeEval.total_tests} Tests Passed ({codeEval.overall_score}%)
                      </span>
                    </div>
                    <p className="text-text-secondary">{codeEval.approach_feedback}</p>
                    <p className="text-text-muted font-mono text-[11px]">{codeEval.complexity_feedback}</p>
                  </div>
                )}

                {/* Submit Code CTA */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleCodingSubmit}
                    disabled={isSubmittingCode || !codingCode.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-sm shadow-lg shadow-accent/25 transition-all disabled:opacity-50"
                  >
                    {isSubmittingCode ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Evaluating Test Cases...</span>
                      </>
                    ) : (
                      <>
                        <Code2 size={16} />
                        <span>Run & Submit Solution</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── ROUND 3-5: INTERVIEW (TECH, PROJECT, HR) ──────────────── */}
          {(currentRound.round_type === 'technical' ||
            currentRound.round_type === 'project' ||
            currentRound.round_type === 'hr') && (
            <div className="space-y-6">
              {/* Interview Stream Card */}
              <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-6">
                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-light">
                      <Brain size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-text-primary">{currentRound.title}</h3>
                      <p className="text-xs text-text-muted">Contextual AI Interviewer • Voice & Text Enabled</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent-light text-xs font-semibold">
                    Question {currentRound.questions.length} of 3
                  </div>
                </div>

                {/* Conversation History */}
                <div className="space-y-4">
                  {currentRound.questions.map((q, qIdx) => (
                    <div key={q.id} className="space-y-3">
                      {/* AI Question Bubble */}
                      <div className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-accent-light text-xs font-bold flex-shrink-0 mt-1">
                          AI
                        </div>
                        <div className="flex-1 p-4 rounded-2xl rounded-tl-none bg-bg-secondary border border-border space-y-2">
                          <p className="text-sm font-medium text-text-primary leading-relaxed">{q.question_text}</p>
                          <div className="flex items-center justify-between pt-1">
                            {q.expected_concepts && q.expected_concepts.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 text-[10px] text-text-muted">
                                <span className="font-semibold text-text-muted">Evaluates:</span>
                                {q.expected_concepts.slice(0, 3).map((c, cIdx) => (
                                  <span key={cIdx} className="px-1.5 py-0.5 rounded bg-bg-card border border-border">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => playAIQuestionAudio(q.question_text)}
                              className="text-text-muted hover:text-accent-light transition-colors"
                              title="Listen to question"
                            >
                              <Volume2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* User Answer Bubble if answered */}
                      {q.answer && (
                        <div className="flex gap-3 justify-end items-start pl-8">
                          <div className="max-w-[85%] p-4 rounded-2xl rounded-tr-none bg-accent/15 border border-accent/30 text-text-primary text-xs sm:text-sm leading-relaxed space-y-2">
                            <p className="whitespace-pre-wrap">{q.answer.user_answer}</p>

                            {/* Rubric Evaluation summary */}
                            {q.answer.ai_evaluation && (
                              <div className="mt-2 pt-2 border-t border-accent/20 text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-accent-light">AI Evaluation:</span>
                                  <span className="font-bold text-emerald-400">{q.answer.ai_evaluation.overall_score}%</span>
                                </div>
                                <p className="text-text-secondary text-[11px]">{q.answer.ai_evaluation.improvement}</p>
                              </div>
                            )}
                          </div>
                          <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                            You
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Current Turn Input Form */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Respond with your explanation (STAR framework recommended for behavioral):</span>
                    {speechSupported && (
                      <span className="text-accent-light flex items-center gap-1">
                        <Mic size={12} /> Microphone available
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <textarea
                      value={interviewInput}
                      onChange={(e) => setInterviewInput(e.target.value)}
                      placeholder="Type or speak your answer in detail..."
                      rows={4}
                      className="w-full bg-bg-secondary border border-border rounded-xl p-4 text-xs sm:text-sm text-text-primary leading-relaxed focus:outline-none focus:border-accent resize-none pr-12"
                    />

                    {/* Microphone button inside input */}
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={handleVoiceToggle}
                        className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${
                          isListening
                            ? 'bg-error text-white animate-pulse'
                            : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                        }`}
                        title={isListening ? 'Stop listening' : 'Start speaking'}
                      >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-text-muted">
                      {isListening ? (
                        <span className="text-error font-medium animate-pulse flex items-center gap-1.5">
                          ● Listening to your voice... Speak clearly
                        </span>
                      ) : (
                        <span>Text fallback active. Speech recognition is optional.</span>
                      )}
                    </div>

                    <button
                      onClick={handleInterviewSubmit}
                      disabled={isEvaluatingTurn || !interviewInput.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-xs sm:text-sm shadow-lg shadow-accent/25 transition-all disabled:opacity-50"
                    >
                      {isEvaluatingTurn ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>AI Evaluating Answer...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Answer</span>
                          <Send size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 3. SIMULATION COMPREHENSIVE REPORT VIEW */}
      {/* ───────────────────────────────────────────────────────── */}
      {report && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Summary Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-bg-card via-bg-card to-emerald-500/10 border border-emerald-500/30 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 uppercase tracking-wider">
                  Simulation Complete
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-2">
                  Placement Simulation Diagnostic Report
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  Target Role: <strong className="text-text-primary">{report.target_role}</strong> • Mode:{' '}
                  <strong className="text-text-primary uppercase">{report.mode}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 bg-bg-secondary/80 p-4 rounded-xl border border-border">
                <div className="text-right">
                  <span className="text-xs text-text-muted font-medium">Overall Score</span>
                  <div className="text-3xl font-extrabold text-accent-light">{report.overall_score}%</div>
                </div>
                <div className="h-10 w-[1px] bg-border"></div>
                <div>
                  <span className="text-xs text-text-muted font-medium">Twin Impact</span>
                  <div className="text-lg font-bold text-emerald-400">+{report.readiness_delta}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Round Breakdown Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Round-by-Round Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.round_summaries.map((rnd, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-primary">{rnd.title}</h4>
                    <span className="px-2.5 py-1 rounded-lg bg-bg-secondary text-accent-light font-bold text-xs border border-border">
                      {rnd.score}%
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-emerald-400 font-medium">
                      Highlights: {rnd.highlights.join(' • ')}
                    </div>
                    <div className="text-amber-400 font-medium">
                      Gap Detected: {rnd.gaps.join(' • ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strong Areas vs Critical Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-4">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle size={16} /> Strong Areas Demonstrated
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-text-secondary list-disc pl-5">
                {report.strong_areas.map((st, idx) => (
                  <li key={idx}>{st}</li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-4">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <AlertCircle size={16} /> Critical Gaps & Areas to Improve
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-text-secondary list-disc pl-5">
                {report.critical_gaps.map((gp, idx) => (
                  <li key={idx}>{gp}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Next Steps */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-4">
            <h4 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Award size={18} className="text-accent-light" /> Actionable Next Steps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {report.recommended_next_steps.map((step, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-bg-secondary border border-border text-xs text-text-secondary space-y-2">
                  <span className="font-bold text-accent-light">Step {idx + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Retake CTA */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => {
                setSimulation(null);
                setReport(null);
                localStorage.removeItem('placementos_active_simulation');
              }}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-sm shadow-xl shadow-accent/25 transition-all"
            >
              <RotateCcw size={16} />
              <span>Launch New Simulation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
