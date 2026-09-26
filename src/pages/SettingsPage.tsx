// ============================================================
// PlacementOS — Settings Page
// ============================================================

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PageHeader, Card, CardHeader } from '../components/ui';
import { Settings, Palette, Bell, Shield, Brain } from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Configure your PlacementOS experience"
      />

      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader title="Appearance" icon={Palette} />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-text-muted">Choose your preferred theme</p>
              </div>
              <select
                className="input w-40"
                value={theme}
                onChange={e => setTheme(e.target.value)}
              >
                <option value="dark">Dark</option>
                <option value="light" disabled>Light (Coming soon)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader title="Notifications" icon={Bell} />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Assessment Reminders</p>
                <p className="text-xs text-text-muted">Get reminded to take daily assessments</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications ? 'bg-accent' : 'bg-border-light'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Google Gemini & Supabase AI Configuration */}
        <Card>
          <CardHeader title="Google Gemini & Supabase AI Engine" icon={Brain} />
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg-secondary border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-text-primary">Google Gemini API Key</p>
                  <p className="text-xs text-text-muted">Direct high-speed Gemini 1.5/2.0 Flash integration</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Primary AI Engine
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste Google Gemini API Key (e.g. AIzaSy...)"
                  defaultValue={localStorage.getItem('placementos_gemini_key') || ''}
                  id="geminiKeyInput"
                  className="input flex-1 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('geminiKeyInput') as HTMLInputElement;
                    if (el) {
                      localStorage.setItem('placementos_gemini_key', el.value.trim());
                      alert('Google Gemini API Key saved successfully!');
                    }
                  }}
                  className="btn btn-primary text-xs"
                >
                  Save Key
                </button>
              </div>
              <p className="text-[11px] text-text-muted">
                You can also configure <code className="text-accent-light">VITE_GEMINI_API_KEY</code> in your <code className="text-accent-light">.env</code> file.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-bg-secondary border border-border text-xs text-text-secondary space-y-1">
              <p className="font-bold text-text-primary">Supabase PostgreSQL & Storage Layer</p>
              <p className="text-text-muted">
                URL: <code className="text-accent-light">{import.meta.env.VITE_SUPABASE_URL || 'Configured via .env / Local Demo Fallback'}</code>
              </p>
            </div>
          </div>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader title="Security" icon={Shield} />
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-bg-input">
              <div>
                <p className="text-sm font-medium">Account Email</p>
                <p className="text-xs text-text-muted">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-bg-input">
              <div>
                <p className="text-sm font-medium">Row Level Security</p>
                <p className="text-xs text-text-muted">All data is protected by Supabase RLS policies</p>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card>
          <CardHeader title="About PlacementOS" icon={Settings} />
          <div className="text-sm text-text-muted space-y-1">
            <p>Version: 1.0.0 (Phase 1)</p>
            <p>Built with React, TypeScript, Tailwind CSS, Supabase</p>
            <p>AI-powered placement readiness platform</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
