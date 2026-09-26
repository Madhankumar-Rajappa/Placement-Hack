// ============================================================
// PlacementOS — Job Service (Supabase + Local Cache Resilience)
// ============================================================

import { supabase } from '../lib/supabase';
import type { Job, JobAnalysis } from '../types';
import { aiService } from './ai.service';

const LOCAL_JOBS_KEY = 'placementos_jobs';
const LOCAL_TARGET_JOB_KEY = 'placementos_target_job';

export const PRESET_TARGET_JOBS: Array<{
  role: string;
  company: string;
  description: string;
  analysis: JobAnalysis;
}> = [
  {
    role: 'Software Development Engineer (SDE-1)',
    company: 'Tier-1 Product Tech Company',
    description: 'We are seeking an SDE-1 with strong mastery in Data Structures & Algorithms, Object-Oriented Design, Operating Systems, Database Management Systems, and scalable backend REST APIs.',
    analysis: {
      role: 'Software Development Engineer (SDE-1)',
      company: 'Tier-1 Product Tech Company',
      required_skills: [
        { name: 'Data Structures & Algorithms', category: 'dsa', importance: 'required', level: 85 },
        { name: 'Database Management Systems (SQL)', category: 'dbms', importance: 'required', level: 75 },
        { name: 'Operating Systems & Concurrency', category: 'operating_systems', importance: 'required', level: 75 },
        { name: 'Object-Oriented Programming (OOP)', category: 'oop', importance: 'required', level: 80 },
        { name: 'Computer Networks', category: 'computer_networks', importance: 'required', level: 70 },
        { name: 'Core Programming (Java/C++/Python)', category: 'programming', importance: 'required', level: 80 },
        { name: 'System Design & Scalability', category: 'system_design', importance: 'preferred', level: 65 },
        { name: 'Quantitative & Logical Aptitude', category: 'aptitude', importance: 'required', level: 75 },
        { name: 'Technical & STAR Communication', category: 'communication', importance: 'required', level: 75 },
      ],
      preferred_skills: [
        { name: 'Redis Caching', category: 'dbms', level: 70 },
        { name: 'Docker Containers', category: 'devops', level: 65 },
        { name: 'Microservices', category: 'system_design', level: 65 },
      ],
      programming_languages: ['Java', 'C++', 'Python', 'SQL'],
      frameworks: ['Spring Boot', 'Node.js', 'FastAPI'],
      cs_fundamentals: ['DSA', 'OOP', 'OS', 'DBMS', 'CN'],
      soft_skills: ['Problem Decomposition', 'STAR Interviewing', 'Clear Communication'],
      experience_requirements: '0-2 years (Campus / Freshers)',
      responsibilities: ['Write clean, high-performance code', 'Design and implement database schemas', 'Participate in code reviews'],
    },
  },
  {
    role: 'Full Stack Software Engineer',
    company: 'Fast-Growing SaaS Tech',
    description: 'Looking for a versatile Full Stack Engineer experienced in React, TypeScript, Node.js, PostgreSQL, REST APIs, and core problem solving.',
    analysis: {
      role: 'Full Stack Software Engineer',
      company: 'Fast-Growing SaaS Tech',
      required_skills: [
        { name: 'Frontend Architecture (React & TypeScript)', category: 'web_development', importance: 'required', level: 85 },
        { name: 'Backend APIs (Node.js & Express)', category: 'programming', importance: 'required', level: 80 },
        { name: 'Database Design & SQL', category: 'dbms', importance: 'required', level: 75 },
        { name: 'Data Structures & Algorithms', category: 'dsa', importance: 'required', level: 75 },
        { name: 'Web Security & HTTP Protocols', category: 'computer_networks', importance: 'required', level: 70 },
        { name: 'Technical Communication & Teamwork', category: 'communication', importance: 'required', level: 75 },
      ],
      preferred_skills: [
        { name: 'Next.js', category: 'web_development', level: 75 },
        { name: 'Tailwind CSS', category: 'web_development', level: 75 },
        { name: 'PostgreSQL', category: 'dbms', level: 70 },
        { name: 'Docker', category: 'devops', level: 65 },
      ],
      programming_languages: ['TypeScript', 'JavaScript', 'SQL'],
      frameworks: ['React', 'Node.js', 'Express.js', 'Tailwind CSS'],
      cs_fundamentals: ['DSA', 'DBMS', 'CN', 'OOP'],
      soft_skills: ['Ownership', 'UI/UX Sensitivity', 'Agile Collaboration'],
      experience_requirements: '0-2 years',
      responsibilities: ['Build modern responsive web applications', 'Create secure REST endpoints', 'Optimize page performance'],
    },
  },
  {
    role: 'AI / Machine Learning Engineer',
    company: 'AI Research & Product Lab',
    description: 'Hiring an AI Engineer with expertise in Python, PyTorch/TensorFlow, Model Evaluation, RAG pipelines, and fundamental Algorithms.',
    analysis: {
      role: 'AI / Machine Learning Engineer',
      company: 'AI Research & Product Lab',
      required_skills: [
        { name: 'Python Programming & Vector Math', category: 'programming', importance: 'required', level: 85 },
        { name: 'Data Structures & Algorithms', category: 'dsa', importance: 'required', level: 80 },
        { name: 'Machine Learning & Deep Learning', category: 'ai_ml', importance: 'required', level: 85 },
        { name: 'Database Management & Vector DBs', category: 'dbms', importance: 'required', level: 70 },
        { name: 'Operating Systems & Parallel Processing', category: 'operating_systems', importance: 'required', level: 70 },
        { name: 'Technical Communication & ML Explanations', category: 'communication', importance: 'required', level: 75 },
      ],
      preferred_skills: [
        { name: 'PyTorch', category: 'ai_ml', level: 80 },
        { name: 'HuggingFace', category: 'ai_ml', level: 75 },
        { name: 'FastAPI', category: 'programming', level: 70 },
        { name: 'LangChain', category: 'ai_ml', level: 75 },
        { name: 'RAG', category: 'ai_ml', level: 75 },
      ],
      programming_languages: ['Python', 'SQL', 'C++'],
      frameworks: ['PyTorch', 'TensorFlow', 'FastAPI', 'NumPy', 'Pandas'],
      cs_fundamentals: ['DSA', 'OS', 'Linear Algebra', 'Probability'],
      soft_skills: ['Analytical Thinking', 'Model Diagnostics', 'Research Translation'],
      experience_requirements: '0-2 years',
      responsibilities: ['Train and evaluate ML models', 'Deploy scalable inference APIs', 'Benchmark model latency'],
    },
  },
];

function getLocalJobs(userId: string): Job[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_JOBS_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalJobs(userId: string, jobs: Job[]): void {
  try {
    localStorage.setItem(`${LOCAL_JOBS_KEY}_${userId}`, JSON.stringify(jobs));
  } catch {
    // ignore
  }
}

export const jobService = {
  async create(
    userId: string,
    data: { role: string; company: string; description: string; source_type: 'paste' | 'pdf' }
  ): Promise<Job> {
    const localJobs = getLocalJobs(userId);
    const newJob: Job = {
      id: `job_${Date.now()}`,
      user_id: userId,
      role: data.role,
      company: data.company,
      description: data.description,
      source_type: data.source_type,
      is_target: localJobs.length === 0, // automatically set first job as target
      analysis_status: 'pending',
      analysis_json: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        const { data: dbJob, error } = await supabase
          .from('jobs')
          .insert({
            user_id: userId,
            role: data.role,
            company: data.company,
            description: data.description,
            source_type: data.source_type,
            is_target: newJob.is_target,
            analysis_status: 'pending',
          })
          .select()
          .single();

        if (!error && dbJob) {
          localJobs.unshift(dbJob);
          saveLocalJobs(userId, localJobs);
          return dbJob as Job;
        }
      }
    } catch {
      // ignore
    }

    localJobs.unshift(newJob);
    saveLocalJobs(userId, localJobs);
    return newJob;
  },

  async getAll(userId: string): Promise<Job[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          saveLocalJobs(userId, data as Job[]);
          return data as Job[];
        }
      }
    } catch {
      // ignore
    }

    const local = getLocalJobs(userId);
    if (local.length > 0) return local;

    // Default preset seed if empty
    const defaultJob: Job = {
      id: `job_preset_sde`,
      user_id: userId,
      role: PRESET_TARGET_JOBS[0].role,
      company: PRESET_TARGET_JOBS[0].company,
      description: PRESET_TARGET_JOBS[0].description,
      source_type: 'paste',
      is_target: true,
      analysis_status: 'completed',
      analysis_json: PRESET_TARGET_JOBS[0].analysis,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalJobs(userId, [defaultJob]);
    return [defaultJob];
  },

  async getById(jobId: string): Promise<Job | null> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle();

        if (!error && data) return data as Job;
      }
    } catch {
      // ignore
    }

    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_JOBS_KEY));
    for (const key of allKeys) {
      try {
        const list: Job[] = JSON.parse(localStorage.getItem(key) || '[]');
        const found = list.find(j => j.id === jobId);
        if (found) return found;
      } catch {
        // ignore
      }
    }

    return null;
  },

  async getTargetJob(userId: string): Promise<Job | null> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('user_id', userId)
          .eq('is_target', true)
          .limit(1)
          .maybeSingle();

        if (!error && data) return data as Job;
      }
    } catch {
      // ignore
    }

    const local = getLocalJobs(userId);
    const target = local.find(j => j.is_target);
    if (target) return target;
    if (local.length > 0) {
      local[0].is_target = true;
      saveLocalJobs(userId, local);
      return local[0];
    }

    // Default SDE Target
    const defaultJob: Job = {
      id: `job_preset_sde`,
      user_id: userId,
      role: PRESET_TARGET_JOBS[0].role,
      company: PRESET_TARGET_JOBS[0].company,
      description: PRESET_TARGET_JOBS[0].description,
      source_type: 'paste',
      is_target: true,
      analysis_status: 'completed',
      analysis_json: PRESET_TARGET_JOBS[0].analysis,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalJobs(userId, [defaultJob]);
    return defaultJob;
  },

  async setAsTarget(userId: string, jobId: string): Promise<void> {
    const local = getLocalJobs(userId);
    for (const j of local) {
      j.is_target = j.id === jobId;
    }
    saveLocalJobs(userId, local);

    try {
      if (supabase) {
        await supabase
          .from('jobs')
          .update({ is_target: false })
          .eq('user_id', userId);

        await supabase
          .from('jobs')
          .update({ is_target: true })
          .eq('id', jobId);
      }
    } catch {
      // ignore
    }
  },

  async selectPresetRole(userId: string, presetIndex: number): Promise<Job> {
    const preset = PRESET_TARGET_JOBS[presetIndex] || PRESET_TARGET_JOBS[0];
    const job: Job = {
      id: `job_preset_${presetIndex}_${Date.now()}`,
      user_id: userId,
      role: preset.role,
      company: preset.company,
      description: preset.description,
      source_type: 'paste',
      is_target: true,
      analysis_status: 'completed',
      analysis_json: preset.analysis,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const local = getLocalJobs(userId);
    for (const j of local) {
      j.is_target = false;
    }
    local.unshift(job);
    saveLocalJobs(userId, local);

    try {
      if (supabase) {
        await supabase.from('jobs').update({ is_target: false }).eq('user_id', userId);
        await supabase.from('jobs').insert({
          user_id: userId,
          role: job.role,
          company: job.company,
          description: job.description,
          source_type: 'paste',
          is_target: true,
          analysis_status: 'completed',
          analysis_json: job.analysis_json,
        });
      }
    } catch {
      // ignore
    }

    return job;
  },

  async delete(jobId: string): Promise<void> {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_JOBS_KEY));
    for (const key of allKeys) {
      try {
        let list: Job[] = JSON.parse(localStorage.getItem(key) || '[]');
        list = list.filter(j => j.id !== jobId);
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        // ignore
      }
    }

    try {
      if (supabase) {
        await supabase.from('jobs').delete().eq('id', jobId);
      }
    } catch {
      // ignore
    }
  },

  async analyze(jobId: string, description: string): Promise<JobAnalysis> {
    try {
      if (supabase) {
        await supabase
          .from('jobs')
          .update({ analysis_status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', jobId);
      }
    } catch {
      // ignore
    }

    try {
      const analysis = await aiService.analyzeJobDescription(description);

      const allKeys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_JOBS_KEY));
      for (const key of allKeys) {
        try {
          const list: Job[] = JSON.parse(localStorage.getItem(key) || '[]');
          const job = list.find(j => j.id === jobId);
          if (job) {
            job.analysis_status = 'completed';
            job.analysis_json = analysis;
            job.role = analysis.role || job.role;
            job.company = analysis.company || job.company;
            localStorage.setItem(key, JSON.stringify(list));
          }
        } catch {
          // ignore
        }
      }

      try {
        if (supabase) {
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
        }
      } catch {
        // ignore
      }

      return analysis;
    } catch (err) {
      try {
        if (supabase) {
          await supabase
            .from('jobs')
            .update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', jobId);
        }
      } catch {
        // ignore
      }
      throw err;
    }
  },
};
