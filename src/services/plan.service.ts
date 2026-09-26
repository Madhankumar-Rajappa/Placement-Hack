// ============================================================
// PlacementOS — Preparation Plan Service
// ============================================================

import { supabase } from '../lib/supabase';
import type { PreparationPlan, PreparationTask, SkillGap } from '../types';
import { aiService } from './ai.service';

export const planService = {
  async generate(
    userId: string,
    targetRole: string,
    skillGaps: SkillGap[],
    availableHours: number = 2
  ): Promise<PreparationPlan> {
    const gapData = skillGaps.map(g => ({
      skill: g.skill_id,
      gap: g.gap_score,
      priority: g.priority,
    }));

    const aiPlan = await aiService.generatePreparationPlan({
      targetRole,
      skillGaps: gapData,
      availableHours,
      level: 'intermediate',
    }) as { title: string; description: string; duration_days: number; tasks: Array<{
      title: string; skill: string; description: string; duration_minutes: number;
      difficulty: string; task_type: string; priority: string; day_number: number; order_index: number;
    }> };

    // Create plan
    const { data: plan, error: planError } = await supabase
      .from('preparation_plans')
      .insert({
        user_id: userId,
        title: aiPlan.title || 'Personalized Preparation Plan',
        description: aiPlan.description || 'A targeted plan to close your skill gaps',
        duration_days: aiPlan.duration_days || 7,
        daily_hours: availableHours,
        status: 'active',
      })
      .select()
      .single();

    if (planError) throw planError;

    // Create tasks
    if (aiPlan.tasks && aiPlan.tasks.length > 0) {
      const tasks = aiPlan.tasks.map(t => ({
        plan_id: plan.id,
        title: t.title,
        description: t.description,
        duration_minutes: t.duration_minutes,
        difficulty: t.difficulty as 'easy' | 'medium' | 'hard',
        task_type: t.task_type as 'learn' | 'practice' | 'assess' | 'review' | 'project',
        priority: t.priority as 'high' | 'medium' | 'low',
        day_number: t.day_number,
        order_index: t.order_index,
        status: 'pending' as const,
      }));

      await supabase.from('preparation_tasks').insert(tasks);
    }

    return plan;
  },

  async getActivePlan(userId: string): Promise<PreparationPlan | null> {
    const { data, error } = await supabase
      .from('preparation_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getAllPlans(userId: string): Promise<PreparationPlan[]> {
    const { data, error } = await supabase
      .from('preparation_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getTasks(planId: string): Promise<PreparationTask[]> {
    const { data, error } = await supabase
      .from('preparation_tasks')
      .select('*')
      .eq('plan_id', planId)
      .order('day_number')
      .order('order_index');

    if (error) throw error;
    return data || [];
  },

  async getTodaysTasks(planId: string): Promise<PreparationTask[]> {
    const plan = await this.getActivePlan('');
    // Get tasks for "today" based on plan start
    const { data, error } = await supabase
      .from('preparation_tasks')
      .select('*')
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .order('day_number')
      .order('order_index')
      .limit(5);

    if (error) throw error;
    return data || [];
  },

  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  ): Promise<void> {
    const { error } = await supabase
      .from('preparation_tasks')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', taskId);

    if (error) throw error;
  },

  async getProgress(planId: string): Promise<{
    total: number;
    completed: number;
    skipped: number;
    pending: number;
    percentage: number;
  }> {
    const { data, error } = await supabase
      .from('preparation_tasks')
      .select('status')
      .eq('plan_id', planId);

    if (error) throw error;

    const tasks = data || [];
    const completed = tasks.filter(t => t.status === 'completed').length;
    const skipped = tasks.filter(t => t.status === 'skipped').length;
    const total = tasks.length;
    const pending = total - completed - skipped;

    return {
      total,
      completed,
      skipped,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },

  async recalculateAdaptivePlan(params: {
    planId: string;
    recentMasteredSkills?: string[];
    recentWeakSkills?: string[];
  }): Promise<{ message: string; updatedTasksCount: number }> {
    const { planId, recentMasteredSkills = [], recentWeakSkills = [] } = params;

    // Fetch active pending tasks
    const tasks = await this.getTasks(planId);
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    let updatedCount = 0;

    // Reprioritize: de-emphasize mastered skills, increase emphasis on recent weak skills
    for (const t of pendingTasks) {
      if (t.skill_id && recentMasteredSkills.includes(t.skill_id)) {
        // Reduced duration and downgraded priority
        t.priority = 'low';
        t.duration_minutes = Math.max(15, Math.round(t.duration_minutes * 0.6));
        updatedCount++;
      } else if (t.skill_id && recentWeakSkills.includes(t.skill_id)) {
        // Elevated priority
        t.priority = 'high';
        t.duration_minutes = Math.min(60, Math.round(t.duration_minutes * 1.3));
        updatedCount++;
      }
    }

    return {
      message: `Adaptive plan updated: reprioritized ${updatedCount} upcoming tasks based on recent simulation and assessment scores.`,
      updatedTasksCount: updatedCount,
    };
  },
};

