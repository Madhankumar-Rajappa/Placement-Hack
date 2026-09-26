// ============================================================
// PlacementOS — Weakness Hunter Service Layer
// ============================================================

import { supabase } from '../lib/supabase';
import { aiService } from './ai.service';
import type { WeaknessPattern } from '../types';

const STORAGE_KEY = 'placementos_weakness_patterns';

export const weaknessService = {
  async getWeaknesses(userId: string): Promise<WeaknessPattern[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }

    // Generate diagnostic root causes via AI engine
    const defaults = await aiService.detectRootCauses({ userId });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch {
      // ignore
    }

    // Try Supabase if available
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('weakness_insights')
          .select('*')
          .eq('user_id', userId);
        if (!error && data && data.length > 0) {
          return data as WeaknessPattern[];
        }
      }
    } catch {
      // ignore
    }

    return defaults;
  },

  async verifyWeakness(
    weaknessId: string,
    userAnswer: string
  ): Promise<{ isCorrect: boolean; explanation: string; updatedWeakness: WeaknessPattern | null }> {
    const list = await this.getWeaknesses('current_user');
    const target = list.find(w => w.id === weaknessId);

    if (!target) {
      return { isCorrect: false, explanation: 'Pattern not found', updatedWeakness: null };
    }

    const isCorrect = target.verification_test.correct_answer.trim().toLowerCase() === userAnswer.trim().toLowerCase();

    if (isCorrect) {
      target.status = 'resolved';
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
    }

    return {
      isCorrect,
      explanation: target.verification_test.explanation,
      updatedWeakness: target,
    };
  },

  async resetWeaknesses(): Promise<WeaknessPattern[]> {
    localStorage.removeItem(STORAGE_KEY);
    return this.getWeaknesses('current_user');
  },
};
