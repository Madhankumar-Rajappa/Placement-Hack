// ============================================================
// PlacementOS — Login Page
// ============================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Brain, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '../components/ui';

export default function LoginPage() {
  const { signIn, signInAsDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-accent blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent-dark blur-[120px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PlacementOS</h1>
              <p className="text-xs text-text-muted tracking-widest uppercase">AI Command Center</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-6">
            Your AI Operating System
            <br />
            <span className="text-accent-light">for Placement Readiness</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-md leading-relaxed">
            Assess. Diagnose. Prepare. Simulate. Reassess. 
            Your Placement Twin knows exactly where you stand.
          </p>
        </div>

        <div className="relative z-10 flex gap-8 text-sm text-text-muted">
          <div>
            <p className="text-2xl font-bold text-text-primary">5+</p>
            <p>AI Engines</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">200+</p>
            <p>Skill Assessments</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">Real</p>
            <p>Gap Analysis</p>
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Brain size={22} className="text-white" />
            </div>
            <span className="text-lg font-bold">PlacementOS</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-text-muted text-sm mb-8">Sign in to your placement command center</p>

          {error && (
            <div className="card border-error/30 bg-error-muted/10 mb-6 py-3 px-4">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg"
            >
              {loading ? <Spinner size={18} /> : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <span className="relative bg-bg-primary px-3 text-xs text-text-muted uppercase">or</span>
            </div>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await signInAsDemo();
                navigate('/dashboard');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent/15 hover:bg-accent/25 border border-accent/40 text-accent-light text-sm font-bold transition-all shadow-sm"
            >
              <span>⚡ Sign In as Demo Student (1-Click)</span>
            </button>
          </form>

          <p className="text-sm text-text-muted text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-light hover:text-accent font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
