// ============================================================
// PlacementOS — Preparation Plan Page
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  PageHeader, Card, CardHeader, Spinner, PageLoader,
  EmptyState, StatusBadge, ProgressBar, PriorityBadge,
} from '../components/ui';
import {
  BookOpen, Plus, CheckCircle2, SkipForward, Clock,
  Brain, RefreshCw, Zap, Calendar,
} from 'lucide-react';
import { planService } from '../services/plan.service';
import { skillGapService } from '../services/skillgap.service';
import { jobService } from '../services/job.service';
import type { PreparationPlan, PreparationTask } from '../types';

export default function PlanPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PreparationPlan | null>(null);
  const [tasks, setTasks] = useState<PreparationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ total: 0, completed: 0, skipped: 0, pending: 0, percentage: 0 });

  useEffect(() => {
    if (user) loadPlan();
  }, [user]);

  const loadPlan = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const activePlan = await planService.getActivePlan(user.id);
      if (activePlan) {
        const [planTasks, planProgress] = await Promise.all([
          planService.getTasks(activePlan.id),
          planService.getProgress(activePlan.id),
        ]);
        setPlan(activePlan);
        setTasks(planTasks);
        setProgress(planProgress);
      }
    } catch (err) {
      console.error('Load plan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setError('');

    try {
      const targetJob = await jobService.getTargetJob(user.id);
      const gaps = await skillGapService.getGaps(user.id);

      if (gaps.length === 0) {
        setError('Please generate skill gaps first from the Skill Gap page.');
        setGenerating(false);
        return;
      }

      const newPlan = await planService.generate(
        user.id,
        profile?.target_role || targetJob?.role || 'Software Engineer',
        gaps,
        2 // hours per day
      );

      const planTasks = await planService.getTasks(newPlan.id);
      const planProgress = await planService.getProgress(newPlan.id);

      setPlan(newPlan);
      setTasks(planTasks);
      setProgress(planProgress);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskAction = async (taskId: string, action: 'completed' | 'skipped') => {
    try {
      await planService.updateTaskStatus(taskId, action);
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, status: action, completed_at: action === 'completed' ? new Date().toISOString() : null } : t)
      );
      if (plan) {
        const updatedProgress = await planService.getProgress(plan.id);
        setProgress(updatedProgress);
      }
    } catch (err) {
      console.error('Task action error:', err);
    }
  };

  if (loading) return <PageLoader message="Loading preparation plan..." />;

  // Group tasks by day
  const tasksByDay = tasks.reduce((acc, task) => {
    const day = task.day_number;
    if (!acc[day]) acc[day] = [];
    acc[day].push(task);
    return acc;
  }, {} as Record<number, PreparationTask[]>);

  const taskTypeIcons: Record<string, string> = {
    learn: '📖',
    practice: '💻',
    assess: '📝',
    review: '🔄',
    project: '🛠️',
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Preparation Plan"
        subtitle="Your personalized study plan powered by AI"
        action={
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary"
          >
            {generating ? (
              <><Spinner size={16} /> Generating...</>
            ) : (
              <><Brain size={16} /> {plan ? 'Regenerate' : 'Generate'} Plan</>
            )}
          </button>
        }
      />

      {error && (
        <Card className="border-error/30 bg-error-muted/10 mb-6">
          <p className="text-sm text-error">{error}</p>
          {error.includes('skill gaps') && (
            <button onClick={() => navigate('/skill-gap')} className="btn btn-sm btn-secondary mt-2">
              Go to Skill Gaps
            </button>
          )}
        </Card>
      )}

      {!plan ? (
        <EmptyState
          icon={BookOpen}
          title="No preparation plan"
          description="Generate a personalized preparation plan based on your skill gaps and target role."
          action={
            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary">
              {generating ? <Spinner size={16} /> : <Brain size={16} />}
              Generate Plan
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Plan Overview */}
          <Card accent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold">{plan.title}</h3>
                <p className="text-sm text-text-muted mt-1">{plan.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {plan.duration_days} days</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {plan.daily_hours}h/day</span>
                  <StatusBadge status={plan.status} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent-light">{progress.percentage}%</p>
                <p className="text-xs text-text-muted">Complete</p>
              </div>
            </div>
            <ProgressBar value={progress.percentage} showLabel label={`${progress.completed}/${progress.total} tasks`} />
          </Card>

          {/* Tasks by Day */}
          {Object.entries(tasksByDay).map(([day, dayTasks]) => (
            <div key={day} className="animate-slide-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center text-sm font-bold text-accent-light">
                  D{day}
                </div>
                <h3 className="text-sm font-semibold text-text-secondary">Day {day}</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2 ml-11">
                {dayTasks.map(task => (
                  <Card key={task.id} className={task.status === 'completed' ? 'opacity-60' : ''}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{taskTypeIcons[task.task_type] || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-text-muted' : ''}`}>
                            {task.title}
                          </h4>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{task.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                          <span className="flex items-center gap-1"><Clock size={10} /> {task.duration_minutes}m</span>
                          <span className="capitalize">{task.difficulty}</span>
                          <span className="capitalize">{task.task_type}</span>
                        </div>
                      </div>
                      {task.status === 'pending' && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleTaskAction(task.id, 'completed')}
                            className="btn btn-sm btn-primary"
                            title="Mark complete"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={() => handleTaskAction(task.id, 'skipped')}
                            className="btn btn-sm btn-ghost"
                            title="Skip"
                          >
                            <SkipForward size={14} />
                          </button>
                        </div>
                      )}
                      {task.status !== 'pending' && (
                        <StatusBadge status={task.status} />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
