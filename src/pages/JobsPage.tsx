// ============================================================
// PlacementOS — Jobs Page
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  PageHeader, Card, CardHeader, Spinner, PageLoader,
  EmptyState, StatusBadge, ErrorDisplay, PriorityBadge,
} from '../components/ui';
import {
  Briefcase, Plus, Trash2, Brain, Star, StarOff,
  Building2, Code, CheckCircle2, X,
} from 'lucide-react';
import { jobService, PRESET_TARGET_JOBS } from '../services/job.service';
import type { Job, JobAnalysis } from '../types';

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Form state
  const [form, setForm] = useState({
    role: '',
    company: '',
    description: '',
  });

  useEffect(() => {
    if (user) loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await jobService.getAll(user.id);
      setJobs(data);
    } catch (err) {
      console.error('Load jobs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !form.description.trim()) return;
    setAdding(true);
    setError('');

    try {
      const job = await jobService.create(user.id, {
        role: form.role || 'Software Engineer',
        company: form.company || 'Target Company',
        description: form.description,
        source_type: 'paste',
      });
      setJobs(prev => [job, ...prev]);
      setSelectedJob(job);
      setForm({ role: '', company: '', description: '' });
      setShowForm(false);

      // Automatically run AI analysis
      setAnalyzingId(job.id);
      try {
        const analysis = await jobService.analyze(job.id, job.description);
        setJobs(prev =>
          prev.map(j =>
            j.id === job.id
              ? { ...j, analysis_status: 'completed', analysis_json: analysis, role: analysis.role || j.role, company: analysis.company || j.company }
              : j
          )
        );
        setSelectedJob(prev => prev ? { ...prev, analysis_status: 'completed', analysis_json: analysis } : null);
      } catch (analysisErr) {
        console.warn('Auto-analyze job error:', analysisErr);
      } finally {
        setAnalyzingId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add job');
    } finally {
      setAdding(false);
    }
  };

  const handleLoadSampleJob = (index: number) => {
    const preset = PRESET_TARGET_JOBS[index];
    if (preset) {
      setForm({
        role: preset.role,
        company: preset.company,
        description: preset.description,
      });
    }
  };

  const handleAnalyze = async (job: Job) => {
    setAnalyzingId(job.id);
    setError('');
    try {
      const analysis = await jobService.analyze(job.id, job.description);
      setJobs(prev =>
        prev.map(j =>
          j.id === job.id
            ? { ...j, analysis_status: 'completed', analysis_json: analysis, role: analysis.role, company: analysis.company || j.company }
            : j
        )
      );
      if (selectedJob?.id === job.id) {
        setSelectedJob(prev => prev ? { ...prev, analysis_status: 'completed', analysis_json: analysis } : null);
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleSetTarget = async (jobId: string) => {
    if (!user) return;
    try {
      await jobService.setAsTarget(user.id, jobId);
      setJobs(prev =>
        prev.map(j => ({ ...j, is_target: j.id === jobId }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to set target');
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this job?')) return;
    try {
      await jobService.delete(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      if (selectedJob?.id === jobId) setSelectedJob(null);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  if (loading) return <PageLoader message="Loading jobs..." />;

  const analysis = selectedJob?.analysis_json as JobAnalysis | null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Target Jobs"
        subtitle="Add job descriptions and extract required skills"
        action={
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Add Job'}
          </button>
        }
      />

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {/* Add Job Form */}
      {showForm && (
        <Card className="mb-6 animate-scale-in">
          <CardHeader title="Add Job Description" icon={Plus} />
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <span className="text-xs text-text-muted font-medium">Quick Load Role Preset:</span>
            <button type="button" onClick={() => handleLoadSampleJob(0)} className="btn btn-xs btn-secondary">
              SDE-1
            </button>
            <button type="button" onClick={() => handleLoadSampleJob(1)} className="btn btn-xs btn-secondary">
              Full Stack
            </button>
            <button type="button" onClick={() => handleLoadSampleJob(2)} className="btn btn-xs btn-secondary">
              AI / ML
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Role (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Software Engineer"
                  value={form.role}
                  onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Company (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Google"
                  value={form.company}
                  onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Job Description *</label>
              <textarea
                className="input"
                rows={8}
                placeholder="Paste the full job description here..."
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <button type="submit" disabled={adding} className="btn btn-primary">
              {adding ? <Spinner size={16} /> : <Plus size={16} />}
              Add Job
            </button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Job List */}
        <div className="lg:col-span-5 space-y-3">
          {jobs.length > 0 ? (
            jobs.map(job => (
              <Card
                key={job.id}
                className={`cursor-pointer ${selectedJob?.id === job.id ? 'card-accent' : ''}`}
                onClick={() => setSelectedJob(job)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-accent-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold truncate">{job.role || 'Software Engineer'}</h4>
                      {job.is_target && (
                        <Star size={14} className="text-warning fill-warning flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{job.company || 'Company'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={job.analysis_status} />
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetTarget(job.id); }}
                      className="btn-icon btn-ghost"
                      title={job.is_target ? 'Target job' : 'Set as target'}
                    >
                      {job.is_target ? (
                        <Star size={14} className="text-warning fill-warning" />
                      ) : (
                        <StarOff size={14} className="text-text-muted" />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}
                      className="btn-icon btn-ghost text-text-muted hover:text-error"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No jobs added"
              description="Add a job description to extract required skills and identify your gaps."
              action={
                <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
                  <Plus size={14} /> Add Job
                </button>
              }
            />
          )}
        </div>

        {/* Job Details / Analysis */}
        <div className="lg:col-span-7">
          {selectedJob ? (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{selectedJob.role || 'Software Engineer'}</h3>
                    <p className="text-sm text-text-muted">{selectedJob.company || 'Company'}</p>
                  </div>
                  <button
                    onClick={() => handleAnalyze(selectedJob)}
                    disabled={analyzingId === selectedJob.id}
                    className="btn btn-primary btn-sm"
                  >
                    {analyzingId === selectedJob.id ? (
                      <><Spinner size={14} /> Analyzing...</>
                    ) : (
                      <><Brain size={14} /> {selectedJob.analysis_status === 'completed' ? 'Re-analyze' : 'Analyze'}</>
                    )}
                  </button>
                </div>
                <p className="text-sm text-text-secondary line-clamp-4">{selectedJob.description}</p>
              </Card>

              {analysis && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Required Skills" icon={Code} />
                    <div className="space-y-2">
                      {analysis.required_skills.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-bg-input">
                          <CheckCircle2 size={14} className="text-accent-light flex-shrink-0" />
                          <span className="text-sm flex-1">{s.name}</span>
                          <PriorityBadge priority={s.importance === 'required' ? 'high' : s.importance === 'preferred' ? 'medium' : 'low'} />
                          <span className="text-xs text-text-muted">Level: {s.level}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {analysis.responsibilities.length > 0 && (
                    <Card>
                      <CardHeader title="Responsibilities" icon={Briefcase} />
                      <ul className="space-y-2">
                        {analysis.responsibilities.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                            <span className="text-accent mt-1">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Card className="flex items-center justify-center py-20">
              <EmptyState
                icon={Briefcase}
                title="Select a job"
                description="Click a job from the list to view details and analysis."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
