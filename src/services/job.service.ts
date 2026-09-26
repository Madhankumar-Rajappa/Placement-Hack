// ============================================================
// PlacementOS — Job Service
// ============================================================

import { supabase } from '../lib/supabase';
import type { Job, JobAnalysis } from '../types';
import { aiService } from './ai.service';

export const jobService = {
  async create(userId: string, data: { role: string; company: string; description: string; source_type: 'paste' | 'pdf' }): Promise<Job> {
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        role: data.role,
        company: data.company,
        description: data.description,
        source_type: data.source_type,
        is_target: false,
        analysis_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return job;
  },

  async getAll(userId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(jobId: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getTargetJob(userId: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_target', true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async setAsTarget(userId: string, jobId: string): Promise<void> {
    // Unset existing target
    await supabase
      .from('jobs')
      .update({ is_target: false })
      .eq('user_id', userId)
      .eq('is_target', true);

    // Set new target
    const { error } = await supabase
      .from('jobs')
      .update({ is_target: true })
      .eq('id', jobId);

    if (error) throw error;
  },

  async delete(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw error;
  },

  async analyze(jobId: string, description: string): Promise<JobAnalysis> {
    await supabase
      .from('jobs')
      .update({ analysis_status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    try {
      const analysis = await aiService.analyzeJobDescription(description);

      await supabase
        .from('jobs')
        .update({
          analysis_status: 'completed',
          analysis_json: analysis,
          role: analysis.role || 'Software Engineer',
          company: analysis.company || 'Target Company',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return analysis;
    } catch (err) {
      await supabase
        .from('jobs')
        .update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', jobId);
      throw err;
    }
  },
};
