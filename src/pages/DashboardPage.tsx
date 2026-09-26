// ============================================================
// PlacementOS — Dashboard Page
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ReadinessCircle,
  Card,
  CardHeader,
  PageLoader,
  ProgressBar,
  PriorityBadge,
  StatusBadge,
  EmptyState,
} from '../components/ui';
import {
  Brain,
  Target,
  TrendingUp,
  ClipboardCheck,
  BookOpen,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calendar,
  Award,
  Flame,
  Sparkles,
  Crosshair,
  Sliders,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { resumeService } from '../services/resume.service';
import { jobService } from '../services/job.service';
import { assessmentService } from '../services/assessment.service';
import { skillGapService } from '../services/skillgap.service';
import { planService } from '../services/plan.service';
import { progressService } from '../services/progress.service';
import type { ReadinessScore, SkillGap, AssessmentAttempt, PreparationTask, PlacementTwin } from '../types';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [twin, setTwin] = useState<PlacementTwin | null>(null);
  const [progressData, setProgressData] = useState<{ date: string; score: number }[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<PreparationTask[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<AssessmentAttempt[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load all data in parallel
      const [resume, targetJob, assessmentScores, gaps, activePlan, streakVal, progressHistory] =
        await Promise.all([
          resumeService.getByUser(user.id).catch(() => null),
          jobService.getTargetJob(user.id).catch(() => null),
          assessmentService.getAssessmentScores(user.id).catch(() => new Map()),
          skillGapService.getGaps(user.id).catch(() => []),
          planService.getActivePlan(user.id).catch(() => null),
          progressService.getStreak(user.id).catch(() => 0),
          progressService.getScoreHistory(user.id).catch(() => []),
        ]);

      // Calculate readiness
      const readiness = skillGapService.calculateReadiness(
        gaps,
        assessmentScores,
        resume?.analysis_json || null
      );

      // Get recent assessments
      const attempts = await assessmentService.getAttempts(user.id).catch(() => []);

      // Get today's tasks
      let tasks: PreparationTask[] = [];
      if (activePlan) {
        tasks = await planService.getTasks(activePlan.id).catch(() => []);
        tasks = tasks.filter(t => t.status === 'pending').slice(0, 3);
      }

      // Build placement twin
      const strengths = readiness.components
        .filter(c => c.score >= 65)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(c => ({ skill: c.label, score: c.score }));

      const criticalGaps = (gaps as any[])
        .filter((g: any) => g.priority === 'critical' || g.priority === 'high')
        .slice(0, 3)
        .map((g: any) => ({ skill: g.skill_id, gap: g.gap_score, reason: g.reason }));

      const unverified = (resume?.analysis_json as any)?.skills
        ?.filter((s: any) => {
          const assessed = assessmentScores.get(s.category);
          return assessed === undefined;
        })
        .slice(0, 3)
        .map((s: any) => ({ skill: s.name, claimed: s.proficiency === 'advanced' ? 80 : s.proficiency === 'intermediate' ? 55 : 30 })) || [];

      const recentAssessments = attempts.slice(0, 3).map(a => ({
        title: `Assessment`,
        score: a.score || 0,
        date: a.completed_at || a.created_at,
        category: 'dsa' as const,
      }));

      // AI recommendation
      let nextAction = 'Upload your resume and add a target job to get personalized recommendations.';
      if (criticalGaps.length > 0) {
        nextAction = `Focus on ${criticalGaps[0].skill} today. ${criticalGaps[0].reason}`;
      } else if (unverified.length > 0) {
        nextAction = `Take an assessment to verify your ${unverified[0].skill} skills claimed on your resume.`;
      } else if (tasks.length > 0) {
        nextAction = `Continue your preparation: "${tasks[0].title}"`;
      }

      setTwin({
        readiness,
        strengths,
        critical_gaps: criticalGaps,
        unverified_claims: unverified,
        recent_assessments: recentAssessments,
        streak: streakVal,
        next_action: nextAction,
      });
      setProgressData(progressHistory);
      setTodaysTasks(tasks);
      setRecentAttempts(attempts.slice(0, 5));
      setStreak(streakVal);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading your command center..." />;

  const readiness = twin?.readiness;
  const radarData = readiness?.components.map(c => ({
    subject: c.label,
    score: c.score,
    fullMark: 100,
  })) || [];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {profile?.target_role
              ? `Targeting: ${profile.target_role}`
              : 'Set your target role in Profile to get personalized insights'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/simulation')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white text-xs sm:text-sm font-bold shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all"
          >
            <Sparkles size={16} />
            Launch AI Simulation
          </button>
          <button
            onClick={() => navigate('/weaknesses')}
            className="btn btn-secondary text-xs sm:text-sm font-semibold"
          >
            <Crosshair size={16} />
            Weakness Hunter
          </button>
          <button
            onClick={() => navigate('/what-if')}
            className="btn btn-secondary text-xs sm:text-sm font-semibold"
          >
            <Sliders size={16} />
            What-If
          </button>
        </div>
      </div>

      {/* Placement Twin Card */}
      <Card accent className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
          <div className="absolute inset-0 rounded-full bg-accent blur-[80px]" />
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Brain size={20} className="text-accent-light" />
          <h2 className="text-lg font-bold">Your Placement Twin</h2>
          {streak > 0 && (
            <div className="flex items-center gap-1 ml-auto badge badge-warning">
              <Flame size={12} />
              {streak} day streak
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Readiness Circle */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center">
            <ReadinessCircle score={readiness?.overall || 0} />
            <p className="text-xs text-text-muted mt-3 text-center max-w-[200px]">
              {readiness?.explanation || 'Complete assessments to calculate your readiness.'}
            </p>
          </div>

          {/* Strengths & Gaps */}
          <div className="lg:col-span-4 space-y-4">
            {/* Strengths */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Strongest Areas
              </h4>
              {twin?.strengths && twin.strengths.length > 0 ? (
                <div className="space-y-2">
                  {twin.strengths.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                      <span className="text-sm flex-1">{s.skill}</span>
                      <span className="text-xs text-text-muted">{s.score}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Take assessments to identify strengths</p>
              )}
            </div>

            {/* Gaps */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Needs Attention
              </h4>
              {twin?.critical_gaps && twin.critical_gaps.length > 0 ? (
                <div className="space-y-2">
                  {twin.critical_gaps.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                      <span className="text-sm flex-1">{g.skill}</span>
                      <span className="text-xs text-error">-{g.gap}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Add a target job to identify gaps</p>
              )}
            </div>

            {/* Unverified */}
            {twin?.unverified_claims && twin.unverified_claims.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Unverified Resume Claims
                </h4>
                <div className="space-y-2">
                  {twin.unverified_claims.map((u, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <HelpCircle size={14} className="text-info flex-shrink-0" />
                      <span className="text-sm flex-1">{u.skill}</span>
                      <span className="text-xs text-text-muted">Claimed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Recommendation */}
          <div className="lg:col-span-5">
            <div className="bg-bg-input rounded-lg p-4 h-full">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-accent-light" />
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  AI Recommendation
                </h4>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                "{twin?.next_action}"
              </p>

              {/* Skill Radar */}
              {radarData.length > 0 && (
                <div className="mt-4" style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="var(--color-accent)"
                        fill="var(--color-accent)"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
              <Target size={20} className="text-accent-light" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Readiness</p>
              <p className="text-xl font-bold">{readiness?.overall || 0}%</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success-muted flex items-center justify-center">
              <ClipboardCheck size={20} className="text-success" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Assessments</p>
              <p className="text-xl font-bold">{recentAttempts.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-muted flex items-center justify-center">
              <AlertTriangle size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Skill Gaps</p>
              <p className="text-xl font-bold">{twin?.critical_gaps?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-error-muted flex items-center justify-center">
              <Flame size={20} className="text-error" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Streak</p>
              <p className="text-xl font-bold">{streak} days</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Graph */}
        <Card>
          <CardHeader title="Progress Over Time" icon={TrendingUp} />
          {progressData.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-accent)"
                    fill="var(--color-accent)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No progress data yet"
              description="Complete assessments to start tracking your progress over time."
              action={
                <button onClick={() => navigate('/assessment')} className="btn btn-primary btn-sm">
                  Take Assessment
                </button>
              }
            />
          )}
        </Card>

        {/* Today's Plan */}
        <Card>
          <CardHeader
            title="Today's Preparation"
            icon={BookOpen}
            action={
              <button
                onClick={() => navigate('/plan')}
                className="btn btn-ghost btn-sm"
              >
                View Plan <ArrowRight size={14} />
              </button>
            }
          />
          {todaysTasks.length > 0 ? (
            <div className="space-y-3">
              {todaysTasks.map((task, i) => (
                <div key={task.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-bg-input">
                  <div className="w-8 h-8 rounded-md bg-accent-muted flex items-center justify-center text-xs font-bold text-accent-light">
                    {task.duration_minutes}m
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-text-muted">{task.task_type} • {task.difficulty}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No tasks yet"
              description="Generate a preparation plan from your skill gaps to get daily tasks."
              action={
                <button onClick={() => navigate('/plan')} className="btn btn-primary btn-sm">
                  Create Plan
                </button>
              }
            />
          )}
        </Card>

        {/* Recent Assessments */}
        <Card>
          <CardHeader
            title="Recent Assessments"
            icon={ClipboardCheck}
            action={
              <button
                onClick={() => navigate('/assessment')}
                className="btn btn-ghost btn-sm"
              >
                View All <ArrowRight size={14} />
              </button>
            }
          />
          {recentAttempts.length > 0 ? (
            <div className="space-y-3">
              {recentAttempts.map((attempt, i) => (
                <div key={attempt.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-bg-input">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
                    ${(attempt.score || 0) >= 70 ? 'bg-success-muted text-success' :
                      (attempt.score || 0) >= 40 ? 'bg-warning-muted text-warning' :
                      'bg-error-muted text-error'}`}
                  >
                    {attempt.score || 0}%
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Assessment</p>
                    <p className="text-xs text-text-muted">
                      {attempt.completed_at
                        ? new Date(attempt.completed_at).toLocaleDateString()
                        : 'In progress'}
                    </p>
                  </div>
                  <StatusBadge status={attempt.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Award}
              title="No assessments taken"
              description="Take your first assessment to measure your placement readiness."
              action={
                <button onClick={() => navigate('/assessment')} className="btn btn-primary btn-sm">
                  Start Assessment
                </button>
              }
            />
          )}
        </Card>

        {/* Readiness Breakdown */}
        <Card>
          <CardHeader title="Readiness Breakdown" subtitle="Why this score?" icon={Target} />
          {readiness?.components && readiness.components.length > 0 ? (
            <div className="space-y-3">
              {readiness.components.map((comp, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">{comp.label}</span>
                    <span className="text-text-muted">
                      {comp.score}% <span className="text-[10px]">({Math.round(comp.weight * 100)}% weight)</span>
                    </span>
                  </div>
                  <ProgressBar
                    value={comp.score}
                    color={
                      comp.score >= 70 ? 'var(--color-success)' :
                      comp.score >= 40 ? 'var(--color-warning)' :
                      'var(--color-error)'
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Complete your profile and assessments to see the breakdown.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
