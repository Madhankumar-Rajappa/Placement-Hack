// ============================================================
// PlacementOS — Skill Gap Page
// ============================================================

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  PageHeader, Card, CardHeader, Spinner, PageLoader,
  EmptyState, ProgressBar, PriorityBadge, ReadinessCircle,
} from '../components/ui';
import {
  GitCompareArrows, RefreshCw, Target, AlertTriangle,
  CheckCircle2, HelpCircle, ArrowRight, Brain,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { resumeService } from '../services/resume.service';
import { jobService } from '../services/job.service';
import { assessmentService } from '../services/assessment.service';
import { skillGapService } from '../services/skillgap.service';
import type { SkillGap, ReadinessScore } from '../types';
import { useNavigate } from 'react-router-dom';

export default function SkillGapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const existingGaps = await skillGapService.getGaps(user.id);
      const assessmentScores = await assessmentService.getAssessmentScores(user.id);
      const resume = await resumeService.getByUser(user.id);

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

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setError('');

    try {
      const [resume, targetJob, assessmentScores] = await Promise.all([
        resumeService.getByUser(user.id),
        jobService.getTargetJob(user.id),
        assessmentService.getAssessmentScores(user.id),
      ]);

      if (!targetJob) {
        setError('Please add a target job first and mark it as your target.');
        setGenerating(false);
        return;
      }

      if (targetJob.analysis_status !== 'completed') {
        setError('Please analyze your target job first.');
        setGenerating(false);
        return;
      }

      const newGaps = await skillGapService.generateGaps(
        user.id,
        targetJob.id,
        resume?.analysis_json || null,
        targetJob.analysis_json || null,
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

  if (loading) return <PageLoader message="Loading skill gaps..." />;

  const chartData = gaps.map(g => ({
    name: g.skill_id,
    current: g.current_level,
    required: g.required_level,
    gap: g.gap_score,
  }));

  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Skill Gap Analysis"
        subtitle="Compare your skills against target job requirements"
        action={
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary"
          >
            {generating ? (
              <><Spinner size={16} /> Analyzing...</>
            ) : (
              <><RefreshCw size={16} /> {gaps.length > 0 ? 'Regenerate' : 'Generate'} Analysis</>
            )}
          </button>
        }
      />

      {error && (
        <Card className="border-error/30 bg-error-muted/10 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-error mt-0.5" />
            <div>
              <p className="text-sm">{error}</p>
              {error.includes('target job') && (
                <button
                  onClick={() => navigate('/jobs')}
                  className="btn btn-sm btn-secondary mt-2"
                >
                  Go to Jobs <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {gaps.length === 0 && !error ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No skill gap analysis yet"
          description="Upload your resume, add a target job, and generate your skill gap analysis."
          action={
            <div className="flex gap-3">
              <button onClick={() => navigate('/resume')} className="btn btn-secondary btn-sm">
                Upload Resume
              </button>
              <button onClick={() => navigate('/jobs')} className="btn btn-primary btn-sm">
                Add Target Job
              </button>
            </div>
          }
        />
      ) : gaps.length > 0 && (
        <div className="space-y-6">
          {/* Readiness + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Readiness */}
            <div className="lg:col-span-4">
              <Card accent className="flex flex-col items-center py-8">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                  Placement Readiness
                </h3>
                <ReadinessCircle score={readiness?.overall || 0} size={180} />
                <p className="text-xs text-text-muted mt-4 text-center max-w-xs">
                  {readiness?.explanation}
                </p>
              </Card>
            </div>

            {/* Gap Chart */}
            <div className="lg:col-span-8">
              <Card>
                <CardHeader title="Skill Levels vs Requirements" icon={Target} />
                {chartData.length > 0 && (
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" barGap={2}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--color-bg-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="current" name="Your Level" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={14} />
                        <Bar dataKey="required" name="Required" fill="var(--color-border-light)" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Gap Details */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Brain size={20} className="text-accent-light" />
              Detailed Gap Analysis ({gaps.length} gaps)
            </h2>
            <div className="space-y-3">
              {gaps.map((gap, i) => (
                <Card key={gap.id || i}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-sm font-semibold">{gap.skill_id}</h4>
                        <PriorityBadge priority={gap.priority} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center mb-3">
                        <div className="p-2 rounded bg-bg-input">
                          <p className="text-lg font-bold text-accent-light">{gap.current_level}%</p>
                          <p className="text-[10px] text-text-muted uppercase">Current</p>
                        </div>
                        <div className="p-2 rounded bg-bg-input">
                          <p className="text-lg font-bold text-text-primary">{gap.required_level}%</p>
                          <p className="text-[10px] text-text-muted uppercase">Required</p>
                        </div>
                        <div className="p-2 rounded bg-bg-input">
                          <p className="text-lg font-bold" style={{ color: priorityColors[gap.priority] }}>
                            -{gap.gap_score}%
                          </p>
                          <p className="text-[10px] text-text-muted uppercase">Gap</p>
                        </div>
                      </div>
                      <ProgressBar
                        value={gap.current_level}
                        max={gap.required_level}
                        color={priorityColors[gap.priority]}
                      />
                    </div>
                    <div className="sm:w-72 space-y-2">
                      <div className="p-3 rounded-lg bg-bg-input">
                        <p className="text-xs font-medium text-text-muted uppercase mb-1">Why?</p>
                        <p className="text-xs text-text-secondary">{gap.reason}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-accent-muted/20">
                        <p className="text-xs font-medium text-accent-light uppercase mb-1">Action</p>
                        <p className="text-xs text-text-secondary">{gap.recommended_action}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
