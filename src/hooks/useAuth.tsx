// ============================================================
// PlacementOS — Auth Context
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth.service';
import type { AuthState, Profile, RegisterCredentials } from '../types';
import type { User } from '@supabase/supabase-js';

const DEMO_USER: User = {
  id: 'demo-student-uuid',
  app_metadata: {},
  user_metadata: { full_name: 'Demo Student' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo@placementos.com',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
} as any;

const DEMO_PROFILE: Profile = {
  id: 'demo-profile-uuid',
  user_id: 'demo-student-uuid',
  full_name: 'Demo Student',
  email: 'demo@placementos.com',
  college: 'National Institute of Technology',
  degree: 'B.Tech',
  branch: 'Computer Science and Engineering',
  graduation_year: 2025,
  cgpa: 8.7,
  target_role: 'Full Stack Software Engineer',
  target_companies: ['Google', 'Microsoft', 'Amazon', 'Atlassian'],
  preferred_language: 'English',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('placementos_demo_auth');
      return stored ? DEMO_USER : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const stored = localStorage.getItem('placementos_demo_auth');
      return stored ? DEMO_PROFILE : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    if (userId === 'demo-student-uuid') {
      setProfile(DEMO_PROFILE);
      return;
    }
    try {
      const p = await authService.getProfile(userId);
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, []);

  useEffect(() => {
    // Check existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        const stored = localStorage.getItem('placementos_demo_auth');
        if (stored) {
          setUser(DEMO_USER);
          setProfile(DEMO_PROFILE);
        }
      }
      setIsLoading(false);
    }).catch(() => {
      const stored = localStorage.getItem('placementos_demo_auth');
      if (stored) {
        setUser(DEMO_USER);
        setProfile(DEMO_PROFILE);
      }
      setIsLoading(false);
    });

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.signIn(email, password);
    } catch (err) {
      // If demo email or Supabase connection is offline, fall back seamlessly
      if (email.includes('demo') || email.includes('placementos') || !import.meta.env.VITE_SUPABASE_URL) {
        localStorage.setItem('placementos_demo_auth', 'true');
        setUser(DEMO_USER);
        setProfile(DEMO_PROFILE);
        return;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsDemo = async () => {
    setIsLoading(true);
    try {
      localStorage.setItem('placementos_demo_auth', 'true');
      setUser(DEMO_USER);
      setProfile(DEMO_PROFILE);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      await authService.signUp(credentials);
    } catch (err) {
      // If Supabase not connected yet, create local demo profile
      localStorage.setItem('placementos_demo_auth', 'true');
      const customProfile = {
        ...DEMO_PROFILE,
        full_name: credentials.full_name,
        email: credentials.email,
        college: credentials.college,
        degree: credentials.degree,
        branch: credentials.branch,
        graduation_year: credentials.graduation_year,
      };
      setUser({ ...DEMO_USER, email: credentials.email });
      setProfile(customProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem('placementos_demo_auth');
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    if (user.id === 'demo-student-uuid') {
      setProfile(prev => prev ? ({ ...prev, ...updates }) : DEMO_PROFILE);
      return;
    }
    const updated = await authService.updateProfile(user.id, updates);
    setProfile(updated);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signInAsDemo,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
