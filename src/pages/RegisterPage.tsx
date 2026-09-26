// ============================================================
// PlacementOS — Register Page
// ============================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Brain, Mail, Lock, User, GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '../components/ui';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
    degree: 'B.Tech',
    branch: '',
    graduation_year: new Date().getFullYear() + 1,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Please enter your full name';
    if (!form.email.trim()) return 'Please enter your email';
    if (!form.email.includes('@')) return 'Please enter a valid email';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.college.trim() || !form.branch.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        college: form.college,
        degree: form.degree,
        branch: form.branch,
        graduation_year: form.graduation_year,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-40 left-10 w-80 h-80 rounded-full bg-accent blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-success blur-[120px]" />
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
            Start your
            <br />
            <span className="text-accent-light">Placement Journey</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-md leading-relaxed">
            Create your account and let AI build your personalized placement strategy from day one.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex gap-3 mb-4">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'w-12 bg-accent' : 'w-8 bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-text-muted">
            Step {step} of 2: {step === 1 ? 'Account Details' : 'Academic Info'}
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Brain size={22} className="text-white" />
            </div>
            <span className="text-lg font-bold">PlacementOS</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Create your account</h2>
          <p className="text-text-muted text-sm mb-8">
            {step === 1 ? 'Enter your account details' : 'Tell us about your academics'}
          </p>

          {error && (
            <div className="card border-error/30 bg-error-muted/10 mb-6 py-3 px-4">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Your full name"
                    value={form.full_name}
                    onChange={e => updateField('full_name', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    className="input pl-10"
                    placeholder="you@university.edu"
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
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
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => updateField('password', e.target.value)}
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

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password"
                    className="input pl-10"
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={e => updateField('confirmPassword', e.target.value)}
                  />
                </div>
              </div>

              <button onClick={handleNext} className="btn btn-primary w-full btn-lg">
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">College / University</label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Your college name"
                    value={form.college}
                    onChange={e => updateField('college', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Degree</label>
                  <select
                    className="input"
                    value={form.degree}
                    onChange={e => updateField('degree', e.target.value)}
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="B.E.">B.E.</option>
                    <option value="B.Sc">B.Sc</option>
                    <option value="BCA">BCA</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="MCA">MCA</option>
                    <option value="M.Sc">M.Sc</option>
                  </select>
                </div>
                <div>
                  <label className="label">Branch</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. CSE"
                    value={form.branch}
                    onChange={e => updateField('branch', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Graduation Year</label>
                <select
                  className="input"
                  value={form.graduation_year}
                  onChange={e => updateField('graduation_year', parseInt(e.target.value))}
                >
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i - 1).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary flex-1">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 btn-lg">
                  {loading ? <Spinner size={18} /> : <><span>Create Account</span><ArrowRight size={16} /></>}
                </button>
              </div>
            </form>
          )}

          <p className="text-sm text-text-muted text-center mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-light hover:text-accent font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
