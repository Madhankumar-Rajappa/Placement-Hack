// ============================================================
// PlacementOS — Progress Service
// ============================================================

import { supabase } from '../lib/supabase';
import type { ProgressRecord, AIInsight, SkillCategory } from '../types';

export const progressService = {
  async getRecords(userId: string, days: number = 30): Promise<ProgressRecord[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('progress_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getStreak(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('progress_records')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDates = [...new Set(data.map(r => r.date))].sort().reverse();

    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];

      if (uniqueDates[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  },

  async getInsights(userId: string): Promise<AIInsight[]> {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async markInsightRead(insightId: string): Promise<void> {
    await supabase
      .from('ai_insights')
      .update({ is_read: true })
      .eq('id', insightId);
  },

  async addRecord(userId: string, record: Omit<ProgressRecord, 'id' | 'created_at'>): Promise<void> {
    await supabase.from('progress_records').upsert(
      {
        user_id: record.user_id,
        date: record.date,
        skill_category: record.skill_category,
        score: record.score,
        assessment_count: record.assessment_count,
        tasks_completed: record.tasks_completed,
        study_minutes: record.study_minutes,
      },
      { onConflict: 'user_id,date,skill_category' }
    );
  },

  async getScoreHistory(userId: string): Promise<{ date: string; score: number }[]> {
    const { data, error } = await supabase
      .from('progress_records')
      .select('date, score')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw error;

    // Aggregate by date
    const dateMap = new Map<string, number[]>();
    for (const record of data || []) {
      if (!dateMap.has(record.date)) {
        dateMap.set(record.date, []);
      }
      dateMap.get(record.date)!.push(record.score);
    }

    return Array.from(dateMap.entries()).map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
  },
};
