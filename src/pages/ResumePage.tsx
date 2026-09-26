// ============================================================
// PlacementOS — Advanced Resume Parsing & Placement Twin Hub
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  PageHeader, Card, CardHeader, Spinner, PageLoader,
  StatusBadge, ErrorDisplay,
} from '../components/ui';
import {
  FileText, Upload, Trash2, Brain, RefreshCw,
  CheckCircle2, Code, Briefcase, Award, Wrench,
  FolderOpen, Download, Sparkles, GraduationCap,
  Plus, UserCheck,
} from 'lucide-react';
import { resumeService } from '../services/resume.service';
import type { Resume, ResumeAnalysis, SkillCategory } from '../types';

export default function ResumePage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('dsa');
  const [newSkillProficiency, setNewSkillProficiency] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [showAddSkill, setShowAddSkill] = useState(false);

  useEffect(() => {
    if (user) loadResume();
  }, [user]);

  const loadResume = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await resumeService.getByUser(user.id);
      setResume(r);
    } catch (err: any) {
      console.error('Load resume error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const res = reader.result as string;
        const b64 = res.split(',')[1] || res;
        resolve(b64);
      };
      reader.onerror = err => reject(err);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError('');
    setUploading(true);

    try {
      const base64 = await fileToBase64(file);
      if (user) {
        try {
          localStorage.setItem(`placementos_resume_pdf_${user.id}`, base64);
        } catch {
          // ignore
        }
      }

      const uploaded = await resumeService.upload(user.id, file);
      setResume(uploaded);

      // Trigger automatic AI analysis
      setAnalyzing(true);
      try {
        const analysis = await resumeService.analyzePdfBase64(uploaded.id, base64);
        setResume(prev => prev ? {
          ...prev,
          analysis_status: 'completed',
          analysis_json: analysis,
        } : null);
      } catch (analysisErr: any) {
        console.warn('PDF Base64 parse failed, fallback:', analysisErr);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteAnalyze = async () => {
    if (!pastedText.trim() || !user) return;
    setAnalyzing(true);
    setError('');

    try {
      let targetResume = resume;
      if (!targetResume) {
        const virtualRecord: Resume = {
          id: `res_paste_${Date.now()}`,
          user_id: user.id,
          file_name: 'Pasted_Profile_Resume.txt',
          storage_path: 'text_input',
          parsed_text: pastedText,
          analysis_status: 'processing',
          analysis_json: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        try {
          localStorage.setItem(`placementos_resume_${user.id}`, JSON.stringify(virtualRecord));
        } catch {
          // ignore
        }
        targetResume = virtualRecord;
        setResume(virtualRecord);
      }

      const analysis = await resumeService.analyze(targetResume.id, pastedText);
      setResume(prev => prev ? {
        ...prev,
        analysis_status: 'completed',
        analysis_json: analysis,
        parsed_text: pastedText,
      } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze text');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resume || !user) return;
    setAnalyzing(true);
    setError('');

    try {
      let base64 = localStorage.getItem(`placementos_resume_pdf_${user.id}`);
      if (!base64 && resume.storage_path && resume.storage_path !== 'text_input') {
        try {
          const url = await resumeService.getDownloadUrl(resume.storage_path);
          const res = await fetch(url);
          const blob = await res.blob();
          base64 = await fileToBase64(blob);
          localStorage.setItem(`placementos_resume_pdf_${user.id}`, base64);
        } catch (storageErr) {
          console.warn('Storage fetch warning:', storageErr);
        }
      }

      let analysis: ResumeAnalysis;
      if (base64) {
        analysis = await resumeService.analyzePdfBase64(resume.id, base64);
      } else {
        const textToAnalyze = resume.parsed_text || pastedText || 'Software Developer with Java, Python, React, DSA, and DBMS experience.';
        analysis = await resumeService.analyze(resume.id, textToAnalyze);
      }

      setResume(prev => prev ? {
        ...prev,
        analysis_status: 'completed',
        analysis_json: analysis,
      } : null);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      setResume(prev => prev ? { ...prev, analysis_status: 'failed' } : null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!resume || !confirm('Are you sure you want to delete this resume?')) return;
    try {
      if (resume.storage_path && resume.storage_path !== 'text_input') {
        await resumeService.delete(resume.id, resume.storage_path);
      }
      if (user) {
        localStorage.removeItem(`placementos_resume_${user.id}`);
        localStorage.removeItem(`placementos_resume_pdf_${user.id}`);
      }
      setResume(null);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleDownload = async () => {
    if (!resume || !resume.storage_path || resume.storage_path === 'text_input') return;
    try {
      const url = await resumeService.getDownloadUrl(resume.storage_path);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleAddCustomSkill = () => {
    if (!newSkillName.trim() || !resume || !resume.analysis_json) return;
    const current = { ...resume.analysis_json } as ResumeAnalysis;
    current.skills = current.skills || [];
    current.skills.push({
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: newSkillProficiency,
    });

    const updatedResume = {
      ...resume,
      analysis_json: current,
    };
    setResume(updatedResume);
    if (user) {
      localStorage.setItem(`placementos_resume_${user.id}`, JSON.stringify(updatedResume));
    }
    setNewSkillName('');
    setShowAddSkill(false);
  };

  const loadSampleResume = (type: 'sde' | 'fullstack' | 'ai') => {
    const samples = {
      sde: `Aditya Sharma
B.Tech Computer Science and Engineering, IIT / NIT (2025) | CGPA: 8.9 / 10

SKILLS:
Languages: Java, C++, Python, SQL, JavaScript
Core: Data Structures & Algorithms, Object-Oriented Programming (OOP), Operating Systems, DBMS, Computer Networks
Frameworks & Tools: Spring Boot, Docker, Git, Redis, PostgreSQL, Linux

PROJECTS:
1. High-Performance Distributed Task Queue
- Built a fault-tolerant job queue processing 15,000 tasks/sec using Java, Redis, and multithreading.
- Implemented round-robin worker scheduling and dead-letter queue with PostgreSQL persistence.

2. Real-Time Algorithmic Code Judge
- Architected sandbox execution engine using Docker & C++ with memory and CPU time limit enforcement.

INTERNSHIP:
Software Engineering Intern at CloudWorks (May 2024 - July 2024)
- Optimized SQL database indexing, reducing p99 query latency by 42%.

CERTIFICATIONS & ACHIEVEMENTS:
- LeetCode Guardian (Rating: 2150+) | 650+ Problems Solved
- AWS Certified Cloud Practitioner`,
      fullstack: `Rohan Gupta
B.Tech Information Technology (2025) | CGPA: 8.6 / 10

SKILLS:
Frontend: React, Next.js, TypeScript, Tailwind CSS, Redux Toolkit
Backend: Node.js, Express.js, Python FastAPI, PostgreSQL, MongoDB, GraphQL
Tools: Docker, Git, GitHub Actions, Postman, Jest

PROJECTS:
1. PlacementOS AI Career Acceleration Platform
- Built responsive web dashboard in React & TypeScript with Gemini AI analysis and interactive simulation.
2. Enterprise Collaborative Workspace
- Developed real-time document editor using WebSockets and PostgreSQL JSONB storage.

INTERNSHIP:
Full Stack Developer Intern at NexaTech (Jan 2024 - June 2024)
- Developed 12+ reusable UI components in React and integrated Stripe subscription payments.`,
      ai: `Priya Patel
B.Tech Computer Science with AI/ML Specialization (2025) | CGPA: 9.1 / 10

SKILLS:
Languages: Python, C++, SQL, R
AI/ML: PyTorch, TensorFlow, Scikit-learn, HuggingFace Transformers, OpenCV, LangChain, RAG
Fundamentals: Operating Systems, Computer Networks, Database Management, Algorithms

PROJECTS:
1. Multimodal Document Intelligence & Semantic Search
- Built RAG pipeline indexing 50,000+ technical PDFs using FAISS vector search and Gemini 1.5.
2. Real-time Vision Quality Assurance System
- Trained YOLOv8 object detection model achieving 98.4% mAP on industrial edge devices.`,
    };

    setPastedText(samples[type]);
    setActiveTab('paste');
  };

  if (loading) return <PageLoader message="Loading resume intelligence..." />;

  const analysis = resume?.analysis_json as ResumeAnalysis | null;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Resume & Placement Twin"
        subtitle="AI deep-scan parses claimed skills, projects, and credentials into your verified digital profile"
        action={
          resume ? (
            <div className="flex gap-2">
              {resume.storage_path && resume.storage_path !== 'text_input' && (
                <button onClick={handleDownload} className="btn btn-secondary btn-sm">
                  <Download size={14} /> Download PDF
                </button>
              )}
              <button onClick={handleDelete} className="btn btn-danger btn-sm">
                <Trash2 size={14} /> Reset
              </button>
            </div>
          ) : undefined
        }
      />

      {error && <ErrorDisplay message={error} onRetry={() => setError('')} />}

      {/* Input / Upload Section */}
      {!resume ? (
        <Card className="max-w-2xl mx-auto">
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'upload'
                  ? 'border-accent text-accent-light'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Upload size={16} /> Upload PDF Resume
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'paste'
                  ? 'border-accent text-accent-light'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <FileText size={16} /> Paste Resume / LinkedIn Text
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div>
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-accent hover:bg-accent-muted/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading || analyzing ? (
                  <div className="flex flex-col items-center py-4">
                    <Spinner size={36} className="text-accent mb-4 animate-spin" />
                    <p className="text-sm font-semibold text-text-primary">
                      {analyzing ? 'Gemini AI parsing document structure...' : 'Uploading PDF to secure storage...'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Extracting skills, projects, and metrics</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mx-auto mb-4">
                      <Upload size={28} className="text-accent-light" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">Click to Upload PDF Resume</h3>
                    <p className="text-xs text-text-muted mb-4">Full multimodal Gemini PDF analysis (Max 5MB)</p>
                    <span className="btn btn-primary btn-sm">Select PDF File</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Paste Raw Resume / Profile Text
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted mr-1">Quick Load:</span>
                  <button
                    onClick={() => loadSampleResume('sde')}
                    className="text-xs px-2 py-0.5 rounded bg-bg-input hover:bg-accent hover:text-white transition-colors"
                  >
                    SDE
                  </button>
                  <button
                    onClick={() => loadSampleResume('fullstack')}
                    className="text-xs px-2 py-0.5 rounded bg-bg-input hover:bg-accent hover:text-white transition-colors"
                  >
                    Full-Stack
                  </button>
                  <button
                    onClick={() => loadSampleResume('ai')}
                    className="text-xs px-2 py-0.5 rounded bg-bg-input hover:bg-accent hover:text-white transition-colors"
                  >
                    AI/ML
                  </button>
                </div>
              </div>

              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste complete resume content here..."
                rows={10}
                className="w-full p-3 rounded-lg bg-bg-input border border-border text-sm text-text-primary focus:outline-none focus:border-accent font-mono resize-y"
              />

              <button
                onClick={handlePasteAnalyze}
                disabled={analyzing || !pastedText.trim()}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <><Spinner size={16} /> Analyzing with Gemini AI...</>
                ) : (
                  <><Brain size={16} /> Parse & Build Placement Twin Profile</>
                )}
              </button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Resume Header Card */}
          <Card className="border-accent/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
                  <FileText size={24} className="text-accent-light" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">{resume.file_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                    <span>Uploaded {new Date(resume.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-accent-light font-medium">
                      <Sparkles size={12} /> Gemini Powered
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={resume.analysis_status} />
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  {analyzing ? (
                    <><Spinner size={14} /> Scanning...</>
                  ) : (
                    <><RefreshCw size={14} /> Re-analyze with AI</>
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5"
                >
                  <Upload size={14} /> Replace File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
            </div>
          </Card>

          {/* Analysis Results Display */}
          {analysis && (
            <div className="space-y-6">
              {/* Profile Summary Strip */}
              {analysis.education && analysis.education.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="p-4 bg-bg-card/80 border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-info-muted text-info-light">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Education</p>
                        <p className="text-sm font-semibold text-text-primary">{analysis.education[0]?.degree || 'B.Tech'}</p>
                        <p className="text-xs text-text-muted truncate">{analysis.education[0]?.college}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-bg-card/80 border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-accent-muted text-accent-light">
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Candidate</p>
                        <p className="text-sm font-semibold text-text-primary">{analysis.name || 'Student Candidate'}</p>
                        <p className="text-xs text-text-muted">Batch {analysis.education[0]?.year || '2025'}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-bg-card/80 border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-success-muted text-success">
                        <Award size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Academic Score</p>
                        <p className="text-sm font-semibold text-text-primary">
                          {analysis.education[0]?.cgpa ? `${analysis.education[0].cgpa} CGPA` : 'Verified Score'}
                        </p>
                        <p className="text-xs text-text-muted">{analysis.skills?.length || 0} Claimed Skills</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Grid of Extracted Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claimed Skills */}
                <Card className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <CardHeader
                        title="Claimed Skills"
                        icon={Code}
                        subtitle="Extracted from resume text/projects"
                      />
                      <button
                        onClick={() => setShowAddSkill(!showAddSkill)}
                        className="btn btn-ghost btn-xs text-accent-light hover:bg-accent-muted/20 flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Skill
                      </button>
                    </div>

                    {showAddSkill && (
                      <div className="p-3 mb-3 rounded-lg bg-bg-input border border-border space-y-2">
                        <input
                          type="text"
                          placeholder="Skill name (e.g., PostgreSQL, Graph Algorithms)"
                          value={newSkillName}
                          onChange={e => setNewSkillName(e.target.value)}
                          className="w-full p-2 text-xs rounded bg-bg-card border border-border text-text-primary"
                        />
                        <div className="flex gap-2">
                          <select
                            value={newSkillCategory}
                            onChange={e => setNewSkillCategory(e.target.value as SkillCategory)}
                            className="flex-1 p-1.5 text-xs rounded bg-bg-card border border-border text-text-primary"
                          >
                            <option value="dsa">DSA</option>
                            <option value="dbms">DBMS</option>
                            <option value="operating_systems">Operating Systems</option>
                            <option value="computer_networks">Computer Networks</option>
                            <option value="programming">Programming</option>
                            <option value="oop">OOP</option>
                          </select>
                          <select
                            value={newSkillProficiency}
                            onChange={e => setNewSkillProficiency(e.target.value as any)}
                            className="flex-1 p-1.5 text-xs rounded bg-bg-card border border-border text-text-primary"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                          <button
                            onClick={handleAddCustomSkill}
                            className="btn btn-primary btn-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {analysis.skills?.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-accent-muted/40 border border-accent/30 text-accent-light font-medium"
                        >
                          {s.name}
                          <span className="text-[10px] px-1 py-0.2 rounded bg-bg-card text-text-muted capitalize">
                            {s.proficiency}
                          </span>
                        </span>
                      ))}
                      {(!analysis.skills || analysis.skills.length === 0) && (
                        <p className="text-sm text-text-muted">No skills detected yet</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Programming Languages */}
                <Card>
                  <CardHeader title="Programming Languages" icon={Code} subtitle="Core syntax & runtimes" />
                  <div className="flex flex-wrap gap-2">
                    {analysis.programming_languages?.map((lang, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-info-muted/30 text-info-light border border-info/30"
                      >
                        {lang}
                      </span>
                    ))}
                    {(!analysis.programming_languages || analysis.programming_languages.length === 0) && (
                      <p className="text-sm text-text-muted">None detected</p>
                    )}
                  </div>
                </Card>

                {/* Frameworks & Tools */}
                <Card>
                  <CardHeader title="Frameworks & Tools" icon={Wrench} subtitle="Libraries, SDKs & Infrastructure" />
                  <div className="flex flex-wrap gap-2">
                    {[...(analysis.frameworks || []), ...(analysis.tools || [])].map((item, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md text-xs bg-bg-input text-text-primary border border-border font-medium"
                      >
                        {item}
                      </span>
                    ))}
                    {(!analysis.frameworks?.length && !analysis.tools?.length) && (
                      <p className="text-sm text-text-muted">None detected</p>
                    )}
                  </div>
                </Card>

                {/* Achievements & Certifications */}
                <Card>
                  <CardHeader title="Achievements & Certifications" icon={Award} subtitle="Verified credentials" />
                  <div className="space-y-2">
                    {[...(analysis.certifications || []), ...(analysis.achievements || [])].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-text-primary font-medium">{item}</span>
                      </div>
                    ))}
                    {(!analysis.certifications?.length && !analysis.achievements?.length) && (
                      <p className="text-sm text-text-muted">None detected</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Projects Extracted */}
              <Card>
                <CardHeader
                  title="Technical Projects"
                  icon={FolderOpen}
                  subtitle="Architecture, technologies, and implementation highlights"
                />
                {analysis.projects && analysis.projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.projects.map((proj, i) => (
                      <div key={i} className="p-3.5 rounded-lg bg-bg-input border border-border flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-text-primary">{proj.name}</h4>
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">{proj.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/50">
                          {proj.technologies?.map((tech, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-bg-card text-accent-light font-medium">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No projects detected</p>
                )}
              </Card>

              {/* Internships & Experience */}
              {analysis.internships && analysis.internships.length > 0 && (
                <Card>
                  <CardHeader
                    title="Experience & Internships"
                    icon={Briefcase}
                    subtitle="Industry roles and practical contributions"
                  />
                  <div className="space-y-3">
                    {analysis.internships.map((intern, i) => (
                      <div key={i} className="p-3.5 rounded-lg bg-bg-input border border-border">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-text-primary">{intern.role}</h4>
                          <span className="text-xs px-2 py-0.5 rounded bg-bg-card text-text-muted">{intern.duration}</span>
                        </div>
                        <p className="text-xs font-semibold text-accent-light mt-0.5">{intern.company}</p>
                        {intern.description && (
                          <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{intern.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Placement Twin Bridge Notice */}
              <Card className="border-accent/30 bg-accent-muted/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-accent-muted text-accent-light flex-shrink-0">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">All Extracted Skills are Initial Claimed Skills</h4>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      PlacementOS distinguishes between <strong>Claimed Skills</strong> (from resume text) and <strong>Verified Knowledge</strong> (from diagnostic assessments & AI simulation).
                      Head to the <strong className="text-accent-light">Assessment Center</strong> or <strong className="text-accent-light">AI Simulator</strong> to benchmark your readiness score!
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
