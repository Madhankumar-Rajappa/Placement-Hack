// ============================================================
// PlacementOS — Authentication Service
// ============================================================

import { supabase } from '../lib/supabase';
import type { Profile, RegisterCredentials } from '../types';

export const authService = {
  async signUp(credentials: RegisterCredentials) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.full_name,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      full_name: credentials.full_name,
      email: credentials.email,
      college: credentials.college,
      degree: credentials.degree,
      branch: credentials.branch,
      graduation_year: credentials.graduation_year,
      target_role: '',
      target_companies: [],
      preferred_language: 'English',
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't throw — auth succeeded, profile can be retried
    }

    return authData;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
};
