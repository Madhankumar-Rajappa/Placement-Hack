// ============================================================
// PlacementOS — Profile Page
// ============================================================

import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PageHeader, Card, CardHeader, Spinner } from '../components/ui';
import { User, Save, GraduationCap, Target, Code, Building2 } from 'lucide-react';

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    college: profile?.college || '',
    degree: profile?.degree || '',
    branch: profile?.branch || '',
    graduation_year: profile?.graduation_year || new Date().getFullYear() + 1,
    cgpa: profile?.cgpa || '',
    target_role: profile?.target_role || '',
    target_companies: profile?.target_companies?.join(', ') || '',
    preferred_language: profile?.preferred_language || 'English',
  });

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name,
        college: form.college,
        degree: form.degree,
        branch: form.branch,
        graduation_year: Number(form.graduation_year),
        cgpa: form.cgpa ? Number(form.cgpa) : null,
        target_role: form.target_role,
        target_companies: form.target_companies
          .split(',')
          .map(c => c.trim())
          .filter(Boolean),
        preferred_language: form.preferred_language,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Profile update error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Student Profile"
        subtitle="Your academic and placement target information"
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Personal Info */}
        <Card>
          <CardHeader title="Personal Information" icon={User} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={form.full_name}
                onChange={e => updateField('full_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={profile?.email || ''}
                disabled
              />
            </div>
          </div>
        </Card>

        {/* Academic Info */}
        <Card>
          <CardHeader title="Academic Information" icon={GraduationCap} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">College / University</label>
              <input
                type="text"
                className="input"
                value={form.college}
                onChange={e => updateField('college', e.target.value)}
              />
            </div>
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
                placeholder="e.g. Computer Science"
                value={form.branch}
                onChange={e => updateField('branch', e.target.value)}
              />
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
            <div>
              <label className="label">CGPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                className="input"
                placeholder="e.g. 8.5"
                value={form.cgpa}
                onChange={e => updateField('cgpa', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Placement Target */}
        <Card>
          <CardHeader title="Placement Target" icon={Target} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Target Role</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Software Engineer"
                value={form.target_role}
                onChange={e => updateField('target_role', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Preferred Language</label>
              <select
                className="input"
                value={form.preferred_language}
                onChange={e => updateField('preferred_language', e.target.value)}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Target Companies (comma-separated)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Google, Microsoft, Amazon"
                value={form.target_companies}
                onChange={e => updateField('target_companies', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            {saving ? <Spinner size={18} /> : <><Save size={16} /><span>Save Profile</span></>}
          </button>
          {success && (
            <span className="text-sm text-success animate-fade-in">Profile updated successfully!</span>
          )}
        </div>
      </form>
    </div>
  );
}
