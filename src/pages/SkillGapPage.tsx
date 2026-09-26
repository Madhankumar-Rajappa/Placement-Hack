// ============================================================
// PlacementOS — Deep Skill Gap Diagnostic & Action Hub
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  PageHeader, Card, CardHeader, Spinner, PageLoader,
  ProgressBar, PriorityBadge, ReadinessCircle,
} from '../components/ui';
import {
  GitCompareArrows, RefreshCw, Target, AlertTriangle,
  CheckCircle2, ArrowRight, Brain, Zap, Briefcase,
  BookOpen, Play, Calendar, ShieldCheck, Flame,
  TrendingUp, Sparkles, AlertCircle, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { resumeService } from '../services/resume.service';
import { jobService, PRESET_TARGET_JOBS } from '../services/job.service';
import { assessmentService } from '../services/assessment.service';
import { skillGapService } from '../services/skillgap.service';
import type { SkillGap, ReadinessScore, Job, SkillCategory } from '../types';

export default function SkillGapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
  const [targetJob, setTargetJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'unverified' | 'ready'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get target job or fallback to default
      let activeJob = await jobService.getTargetJob(user.id);
      if (!activeJob) {
        activeJob = await jobService.selectPresetRole(user.id, 0);
      }
      setTargetJob(activeJob);

      const jobsList = await jobService.getAll(user.id);
      setAllJobs(jobsList);

      const resume = await resumeService.getByUser(user.id);
      const assessmentScores = await assessmentService.getAssessmentScores(user.id);

      let existingGaps = await skillGapService.getGaps(user.id, activeJob.id);
      
      // Auto-generate gaps if none exist yet
      if (existingGaps.length === 0 && activeJob.analysis_json) {
        existingGaps = await skillGapService.generateGaps(
          user.id,
          activeJob.id,
          resume?.analysis_json || null,
          activeJob.analysis_json,
          assessmentScores
        );
      }

      const readinessScore = skillGapService.calculateReadiness(
        existingGaps,
        assessmentScores,
        resume?.analysis_json || null
      );

      setGaps(existingGaps);
      setReadiness(readinessScore);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTargetJob = async (job: Job) => {
    if (!user) return;
    setGenerating(true);
    try {
      await jobService.setAsTarget(user.id, job.id);
      setTargetJob(job);

      const resume = await resumeService.getByUser(user.id);
      const assessmentScores = await assessmentService.getAssessmentScores(user.id);

      let jobAnalysis = job.analysis_json;
      if (!jobAnalysis && job.description) {
        jobAnalysis = await jobService.analyze(job.id, job.description);
      }

      const newGaps = await skillGapService.generateGaps(
        user.id,
        job.id,
        resume?.analysis_json || null,
        jobAnalysis || PRESET_TARGET_JOBS[0].analysis,
        assessmentScores
      );

      const readinessScore = skillGapService.calculateReadiness(
        newGaps,
        assessmentScores,
        resume?.analysis_json || null
      );

      setGaps(newGaps);
      setReadiness(readinessScore);
    } catch (err: any) {
      setError(err.message || 'Failed to switch target job');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectPreset = async (index: number) => {
    if (!user) return;
    setGenerating(true);
    try {
      const presetJob = await jobService.selectPresetRole(user.id, index);
      setTargetJob(presetJob);

      const resume = await resumeService.getByUser(user.id);
      const assessmentScores = await assessmentService.getAssessmentScores(user.id);

      const newGaps = await skillGapService.generateGaps(
        user.id,
        presetJob.id,
        resume?.analysis_json || null,
        presetJob.analysis_json || PRESET_TARGET_JOBS[index].analysis,
        assessmentScores
      );

      const readinessScore = skillGapService.calculateReadiness(
        newGaps,
        assessmentScores,
        resume?.analysis_json || null
      );

      setGaps(newGaps);
      setReadiness(readinessScore);
    } catch (err: any) {
      setError(err.message || 'Failed to select preset');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !targetJob) return;
    setGenerating(true);
    setError('');

    try {
      const [resume, assessmentScores] = await Promise.all([
        resumeService.getByUser(user.id),
        assessmentService.getAssessmentScores(user.id),
      ]);

      let jobAnalysis = targetJob.analysis_json;
      if (!jobAnalysis && targetJob.description) {
        jobAnalysis = await jobService.analyze(targetJob.id, targetJob.description);
      }

      const newGaps = await skillGapService.generateGaps(
        user.id,
        targetJob.id,
        resume?.analysis_json || null,
        jobAnalysis || PRESET_TARGET_JOBS[0].analysis,
        assessmentScores
      );

      const readinessScore = skillGapService.calculateReadiness(
        newGaps,
        assessmentScores,
        resume?.analysis_json || null
      );

      setGaps(newGaps);
      setReadiness(readinessScore);
    } catch (err: any) {
      setError(err.message || 'Failed to generate gaps');
    } finally {
      setGenerating(false);
    }
  };

  const mapSkillToCategory = (skillName: string): SkillCategory => {
    const s = skillName.toLowerCase();
    if (s.includes('algorithm') || s.includes('dsa') || s.includes('tree') || s.includes('graph') || s.includes('array')) return 'dsa';
    if (s.includes('dbms') || s.includes('sql') || s.includes('database') || s.includes('postgres')) return 'dbms';
    if (s.includes('operating') || s.includes('os') || s.includes('thread') || s.includes('concurrency')) return 'operating_systems';
    if (s.includes('network') || s.includes('tcp') || s.includes('http')) return 'computer_networks';
    if (s.includes('oop') || s.includes('object')) return 'oop';
    if (s.includes('aptitude') || s.includes('quant') || s.includes('logical')) return 'aptitude';
    if (s.includes('communication') || s.includes('interview') || s.includes('star')) return 'communication';
    return 'programming';
  };

  if (loading) return <PageLoader message="Analyzing Placement Twin skill gaps..." />;

  // Filter logic
  const filteredGaps = gaps.filter(g => {
    if (filter === 'critical') return g.priority === 'critical' || g.priority === 'high';
    if (filter === 'unverified') return g.reason.includes('unverified') || g.reason.includes('Claimed');
    if (filter === 'ready') return g.gap_score === 0 || g.current_level >= g.required_level;
    return true;
  });

  const criticalCount = gaps.filter(g => g.priority === 'critical').length;
  const highCount = gaps.filter(g => g.priority === 'high').length;
  const unverifiedCount = gaps.filter(g => g.reason.includes('unverified') || g.reason.includes('Claimed')).length;
  const readyCount = gaps.filter(g => g.gap_score === 0 || g.current_level >= g.required_level).length;

  const chartData = gaps.slice(0, 7).map(g => ({
    name: g.skill_id.length > 14 ? g.skill_id.substring(0, 12) + '..' : g.skill_id,
    current: g.current_level,
    required: g.required_level,
    gap: g.gap_score,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Skill Gap & Placement Twin Diagnostic"
        subtitle="Precision AI analysis of where you stand today and an actionable roadmap to close every gap"
        action={
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="btn btn-primary flex items-center gap-2"
          >
            {generating ? (
              <><Spinner size={16} /> Recalculating...</>
            ) : (
              <><RefreshCw size={16} /> Recalculate Gaps</>
            )}
          </button>
        }
      />

      {error && (
        <Card className="border-error/30 bg-error-muted/10">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-error mt-0.5" />
            <p className="text-sm text-text-primary">{error}</p>
          </div>
        </Card>
      )}

      {/* Target Role Selector Bar */}
      <Card className="border-accent/30 bg-gradient-to-r from-bg-card via-bg-card to-accent-muted/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-muted text-accent-light">
              <Briefcase size={22} />
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Active Target Benchmark</p>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                {targetJob?.role || 'Software Development Engineer (SDE-1)'}
                <span className="text-xs font-normal text-text-muted">at {targetJob?.company || 'Target Product Tech'}</span>
              </h3>
            </div>
          </div>

          {/* Quick Target Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted hidden sm:inline">Switch Role:</span>
            <button
              onClick={() => handleSelectPreset(0)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                targetJob?.role.includes('SDE')
                  ? 'bg-accent text-white border-accent font-semibold shadow-md'
                  : 'bg-bg-input text-text-muted border-border hover:text-text-primary hover:border-accent'
              }`}
            >
              SDE-1
            </button>
            <button
              onClick={() => handleSelectPreset(1)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                targetJob?.role.includes('Full Stack')
                  ? 'bg-accent text-white border-accent font-semibold shadow-md'
                  : 'bg-bg-input text-text-muted border-border hover:text-text-primary hover:border-accent'
              }`}
            >
              Full Stack
            </button>
            <button
              onClick={() => handleSelectPreset(2)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                targetJob?.role.includes('AI') || targetJob?.role.includes('Machine')
                  ? 'bg-accent text-white border-accent font-semibold shadow-md'
                  : 'bg-bg-input text-text-muted border-border hover:text-text-primary hover:border-accent'
              }`}
            >
              AI / ML
            </button>
            <button
              onClick={() => navigate('/jobs')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-bg-input border border-border text-text-muted hover:text-text-primary flex items-center gap-1"
            >
              Custom <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 1. WHERE WE ARE (CURRENT PLACEMENT READINESS OVERVIEW)   */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-accent-muted text-accent-light">
            <Brain size={16} />
          </div>
          <h2 className="text-base font-bold text-text-primary">1. Where You Are Today (Readiness Diagnostic)</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Readiness Index Card */}
          <Card className="flex flex-col items-center justify-center text-center p-6 bg-bg-card/90">
            <ReadinessCircle score={readiness?.overall || 0} size={130} strokeWidth={10} />
            <h3 className="text-base font-bold text-text-primary mt-4">Verified Readiness Score</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-xs">
              {readiness?.overall && readiness.overall >= 75
                ? '🟢 Interview Ready! You match the hiring bar for major tech drives.'
                : readiness?.overall && readiness.overall >= 50
                ? '🟡 Moderate Gap. Targeted practice in 2-3 key areas will bring you to interview readiness.'
                : '🔴 Action Needed. Several core foundational requirements require study and assessment.'}
            </p>
            <div className="mt-4 pt-4 border-t border-border w-full flex justify-between text-xs text-text-muted">
              <span>Target Bar: <strong className="text-text-primary">85%</strong></span>
              <span>Gap: <strong className="text-warning">{Math.max(0, 85 - (readiness?.overall || 0))}%</strong></span>
            </div>
          </Card>

          {/* 6-Pillar Breakdown Bars */}
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
            <div>
              <CardHeader
                title="6-Pillar Placement Readiness Breakdown"
                icon={Layers}
                subtitle="Calculated from resume claims, diagnostic assessments, and test results"
              />
              <div className="space-y-3 mt-4">
                {readiness?.components.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-text-primary">{c.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted">Weight: {Math.round(c.weight * 100)}%</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                            c.score >= 70 ? 'bg-success-muted text-success' :
                            c.score >= 50 ? 'bg-warning-muted text-warning' : 'bg-error-muted text-error'
                          }`}
                        >
                          {c.score}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      value={c.score}
                      color={c.score >= 70 ? 'var(--color-success)' : c.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)'}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-text-muted mt-4 pt-3 border-t border-border flex items-center gap-1.5">
              <Sparkles size={12} className="text-accent-light" />
              {readiness?.explanation}
            </p>
          </Card>
        </div>

        {/* Quick Diagnostic Tally Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setFilter('critical')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filter === 'critical'
                ? 'bg-error-muted/20 border-error'
                : 'bg-bg-card border-border hover:border-error/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-error uppercase tracking-wider">Critical Gaps</span>
              <Flame size={16} className="text-error" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">{criticalCount + highCount}</p>
            <p className="text-[11px] text-text-muted mt-0.5">High priority study areas</p>
          </div>

          <div
            onClick={() => setFilter('unverified')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filter === 'unverified'
                ? 'bg-warning-muted/20 border-warning'
                : 'bg-bg-card border-border hover:border-warning/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-warning uppercase tracking-wider">Claimed Unverified</span>
              <AlertCircle size={16} className="text-warning" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">{unverifiedCount}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Require assessment proof</p>
          </div>

          <div
            onClick={() => setFilter('ready')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filter === 'ready'
                ? 'bg-success-muted/20 border-success'
                : 'bg-bg-card border-border hover:border-success/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-success uppercase tracking-wider">Verified Strengths</span>
              <ShieldCheck size={16} className="text-success" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">{readyCount}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Meet or exceed target bar</p>
          </div>

          <div
            onClick={() => setFilter('all')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filter === 'all'
                ? 'bg-accent-muted/20 border-accent'
                : 'bg-bg-card border-border hover:border-accent/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-accent-light uppercase tracking-wider">Total Evaluated</span>
              <Target size={16} className="text-accent-light" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">{gaps.length}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Required skills tracked</p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. HOW TO IMPROVE (PRESCRIPTIVE ACTION ROADMAP)          */}
      {/* ======================================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-success-muted text-success">
              <TrendingUp size={16} />
            </div>
            <h2 className="text-base font-bold text-text-primary">
              2. How to Improve (Prescriptive AI Action Plan)
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-accent text-white font-semibold' : 'bg-bg-input text-text-muted hover:text-text-primary'
              }`}
            >
              All Gaps ({gaps.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'critical' ? 'bg-error text-white font-semibold' : 'bg-bg-input text-text-muted hover:text-text-primary'
              }`}
            >
              High Priority ({criticalCount + highCount})
            </button>
            <button
              onClick={() => setFilter('unverified')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'unverified' ? 'bg-warning text-black font-semibold' : 'bg-bg-input text-text-muted hover:text-text-primary'
              }`}
            >
              Unverified ({unverifiedCount})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'ready' ? 'bg-success text-white font-semibold' : 'bg-bg-input text-text-muted hover:text-text-primary'
              }`}
            >
              Strengths ({readyCount})
            </button>
          </div>
        </div>

        {/* Detailed Skill Gap Cards */}
        <div className="space-y-4">
          {filteredGaps.map((gap, i) => {
            const cat = mapSkillToCategory(gap.skill_id);
            const isVerified = gap.reason.includes('score') || gap.reason.includes('verified at');
            const isClaimed = gap.reason.includes('Claimed');

            return (
              <Card
                key={gap.id || i}
                className={`p-5 transition-all hover:border-accent/40 ${
                  gap.priority === 'critical' ? 'border-l-4 border-l-error' :
                  gap.priority === 'high' ? 'border-l-4 border-l-warning' :
                  gap.priority === 'medium' ? 'border-l-4 border-l-info' : 'border-l-4 border-l-success'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-text-primary">{gap.skill_id}</h3>
                      <PriorityBadge priority={gap.priority} />
                      {isVerified ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-success-muted text-success font-medium flex items-center gap-1">
                          <CheckCircle2 size={10} /> Verified by Test
                        </span>
                      ) : isClaimed ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-warning-muted text-warning font-medium flex items-center gap-1">
                          <AlertCircle size={10} /> Claimed on Resume
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-error-muted text-error font-medium">
                          Untested / Missing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Level Comparison Badge */}
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-text-muted">Current: </span>
                      <strong className="text-text-primary">{gap.current_level}%</strong>
                    </div>
                    <ArrowRight size={12} className="text-text-muted" />
                    <div>
                      <span className="text-text-muted">Target Bar: </span>
                      <strong className="text-accent-light">{gap.required_level}%</strong>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-bg-input font-bold text-xs">
                      Gap: <span className={gap.gap_score > 0 ? 'text-warning' : 'text-success'}>-{gap.gap_score}%</span>
                    </div>
                  </div>
                </div>

                {/* Comparative Progress Bar */}
                <div className="mt-3">
                  <div className="relative w-full h-2.5 bg-bg-input rounded-full overflow-hidden">
                    {/* Current level fill */}
                    <div
                      className={`h-full rounded-full transition-all ${
                        gap.current_level >= gap.required_level
                          ? 'bg-success'
                          : gap.current_level >= 50
                          ? 'bg-warning'
                          : 'bg-error'
                      }`}
                      style={{ width: `${gap.current_level}%` }}
                    />
                    {/* Target benchmark marker line */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow"
                      style={{ left: `${gap.required_level}%` }}
                      title={`Target Bar: ${gap.required_level}%`}
                    />
                  </div>
                </div>

                {/* Diagnosis & Prescription Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-border">
                  {/* Left: Why there is a gap */}
                  <div className="p-3 rounded-lg bg-bg-input/60 border border-border/50">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <AlertCircle size={12} className="text-warning" /> Diagnosis (Where You Are)
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">{gap.reason}</p>
                  </div>

                  {/* Right: Action plan */}
                  <div className="p-3 rounded-lg bg-accent-muted/10 border border-accent/20">
                    <p className="text-[11px] font-bold text-accent-light uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Zap size={12} /> Action Prescription (How to Improve)
                    </p>
                    <p className="text-xs text-text-primary font-medium leading-relaxed">{gap.recommended_action}</p>
                  </div>
                </div>

                {/* 1-Click Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-border/40">
                  <span className="text-[11px] text-text-muted">
                    Recommended next action for {gap.skill_id}:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/assessment')}
                      className="btn btn-primary btn-xs flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Take 5-Min Diagnostic Test
                    </button>
                    <button
                      onClick={() => navigate('/simulation')}
                      className="btn btn-secondary btn-xs flex items-center gap-1"
                    >
                      <Play size={12} /> Test in AI Simulator
                    </button>
                    <button
                      onClick={() => navigate('/plan')}
                      className="btn btn-secondary btn-xs flex items-center gap-1"
                    >
                      <Calendar size={12} /> Add to Daily Plan
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredGaps.length === 0 && (
            <Card className="text-center py-10">
              <CheckCircle2 size={36} className="text-success mx-auto mb-2" />
              <h3 className="text-base font-bold text-text-primary">No Skill Gaps in this Filter!</h3>
              <p className="text-xs text-text-muted mt-1">All evaluated skills meet or exceed target requirements.</p>
              <button onClick={() => setFilter('all')} className="btn btn-secondary btn-sm mt-4">
                View All Skills
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
