// ============================================================
// PlacementOS — Progress Page
// ============================================================

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  PageHeader, Card, CardHeader, PageLoader, EmptyState, ProgressBar,
} from '../components/ui';
import {
  TrendingUp, Calendar, Flame, Award, Clock,
  BarChart3,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { progressService } from '../services/progress.service';
import { assessmentService } from '../services/assessment.service';
import PlacementTwinTimeline from '../components/PlacementTwinTimeline';
import type { ProgressRecord, AssessmentAttempt } from '../types';

export default function ProgressPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [scoreHistory, setScoreHistory] = useState<{ date: string; score: number }[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [recs, history, atts, str] = await Promise.all([
        progressService.getRecords(user.id, 30),
        progressService.getScoreHistory(user.id),
        assessmentService.getAttempts(user.id),
        progressService.getStreak(user.id),
      ]);
      setRecords(recs);
      setScoreHistory(history);
      setAttempts(atts);
      setStreak(str);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Loading progress..." />;

  const totalAssessments = attempts.length;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
    : 0;
  const totalMinutes = records.reduce((sum, r) => sum + r.study_minutes, 0);

  // Assessment score distribution
  const scoreDistribution = [
    { range: '0-20', count: attempts.filter(a => (a.score || 0) <= 20).length },
    { range: '21-40', count: attempts.filter(a => (a.score || 0) > 20 && (a.score || 0) <= 40).length },
    { range: '41-60', count: attempts.filter(a => (a.score || 0) > 40 && (a.score || 0) <= 60).length },
    { range: '61-80', count: attempts.filter(a => (a.score || 0) > 60 && (a.score || 0) <= 80).length },
    { range: '81-100', count: attempts.filter(a => (a.score || 0) > 80).length },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Progress Tracking"
        subtitle="Your placement preparation journey"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
              <Award size={20} className="text-accent-light" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Avg Score</p>
              <p className="text-xl font-bold">{avgScore}%</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success-muted flex items-center justify-center">
              <BarChart3 size={20} className="text-success" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Assessments</p>
              <p className="text-xl font-bold">{totalAssessments}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-muted flex items-center justify-center">
              <Flame size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Streak</p>
              <p className="text-xl font-bold">{streak} days</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info-muted flex items-center justify-center">
              <Clock size={20} className="text-info" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Study Time</p>
              <p className="text-xl font-bold">{totalMinutes}m</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Over Time */}
        <Card>
          <CardHeader title="Score Over Time" icon={TrendingUp} />
          {scoreHistory.length > 0 ? (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
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
              title="No data yet"
              description="Complete assessments to track your score over time."
            />
          )}
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader title="Score Distribution" icon={BarChart3} />
          {totalAssessments > 0 ? (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Assessments" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No assessments yet"
              description="Take assessments to see your score distribution."
            />
          )}
        </Card>

        {/* Assessment History */}
        <Card className="lg:col-span-2">
          <CardHeader title="Assessment History" icon={Calendar} />
          {attempts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase">#</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase">Date</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase">Score</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase">Accuracy</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase">Time</th>
                    <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt, i) => (
                    <tr key={attempt.id} className="border-b border-border/50 hover:bg-bg-input transition-colors">
                      <td className="py-3 px-2 text-text-muted">{i + 1}</td>
                      <td className="py-3 px-2">
                        {attempt.completed_at
                          ? new Date(attempt.completed_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`font-semibold ${
                          (attempt.score || 0) >= 70 ? 'text-success' :
                          (attempt.score || 0) >= 40 ? 'text-warning' : 'text-error'
                        }`}>
                          {attempt.score || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-2">{attempt.accuracy || 0}%</td>
                      <td className="py-3 px-2">
                        {attempt.time_taken_seconds
                          ? `${Math.floor(attempt.time_taken_seconds / 60)}m ${attempt.time_taken_seconds % 60}s`
                          : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`badge ${attempt.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                          {attempt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No assessment history"
              description="Your assessment results will appear here."
            />
          )}
        </Card>
      </div>

      {/* Verified Placement Twin Timeline */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-accent-light" size={20} />
          <h3 className="text-lg font-bold text-text-primary">Placement Twin Timeline</h3>
        </div>
        <PlacementTwinTimeline />
      </div>
    </div>
  );
}
