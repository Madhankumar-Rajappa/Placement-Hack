// ============================================================
// PlacementOS — AI Service Layer (Provider-Agnostic)
// ============================================================
// AI calls are made through Supabase Edge Functions to keep
// API keys server-side. This module provides the client-side
// interface. If Edge Functions are not configured, it falls
// back to structured mock responses for development.
// ============================================================

import { supabase } from '../lib/supabase';
import type {
  ResumeAnalysis,
  JobAnalysis,
  GeneratedQuestion,
  AssessmentAnalysis,
  SkillCategory,
  SimulationQuestion,
  AIAnswerEvaluation,
  CodingProblem,
  CodeEvaluationResult,
  WeaknessPattern,
  WhatIfScenario,
  SimulationReport,
  CoachMessage,
  ReadinessScore,
} from '../types';

interface AIRequestPayload {
  action: string;
  data: Record<string, unknown>;
}

// ── Direct Google Gemini API Client ───────────────────────────

async function callGeminiAPI<T>(prompt: string, systemInstruction?: string): Promise<T | null> {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('placementos_gemini_key') : '');

  if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey === 'placeholder-key') {
    return null;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Gemini API HTTP ${response.status}, falling back:`, await response.text());
      return null;
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      let cleaned = candidateText.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      return JSON.parse(cleaned.trim()) as T;
    }
  } catch (err) {
    console.warn('Gemini API request failed, falling back:', err);
  }
  return null;
}

// ── Main Orchestration Dispatcher ──────────────────────────────

async function callAI<T>(payload: AIRequestPayload): Promise<T> {
  // 1. Try direct Google Gemini API first if key configured
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('placementos_gemini_key') : '');

  if (apiKey && apiKey !== 'your-gemini-api-key') {
    const geminiPrompt = buildGeminiPrompt(payload);
    if (geminiPrompt) {
      const geminiResult = await callGeminiAPI<T>(geminiPrompt.prompt, geminiPrompt.system);
      if (geminiResult) return geminiResult;
    }
  }

  // 2. Try Supabase Edge Function if available
  try {
    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      const { data, error } = await supabase.functions.invoke('ai-service', {
        body: payload,
      });

      if (!error && data) {
        return data as T;
      }
    }
  } catch (err) {
    // ignore
  }

  // 3. Fallback to structured high-fidelity local response
  return getFallbackResponse<T>(payload);
}

function buildGeminiPrompt(payload: AIRequestPayload): { prompt: string; system: string } | null {
  const baseSystem = 'You are the intelligence engine of PlacementOS (AI Operating System for Placement Readiness). Always respond with strict valid JSON conforming to the requested schema. Do NOT wrap output in markdown code blocks.';

  switch (payload.action) {
    case 'analyze_resume':
      return {
        system: `${baseSystem} Extract candidate profile into JSON: { name: string, education: array of { degree: string, college: string, year: number, cgpa: number }, skills: array of { name: string, category: string, proficiency: "beginner"|"intermediate"|"advanced" }, programming_languages: string[], frameworks: string[], tools: string[], projects: array of { name: string, description: string, technologies: string[] }, internships: array of { company: string, role: string, duration: string, description: string }, certifications: string[], achievements: string[], experience_years: number, soft_skills: string[] }`,
        prompt: `Analyze this resume and extract structured profile:\n\n${payload.data.text}`,
      };
    case 'analyze_job':
      return {
        system: `${baseSystem} Extract job requirements into JSON: { role: string, company: string, required_skills: array of { name: string, category: string, importance: "required"|"preferred", level: number }, programming_languages: string[], frameworks: string[], cs_fundamentals: string[], soft_skills: string[], responsibilities: string[] }`,
        prompt: `Analyze this target job description:\n\n${payload.data.description}`,
      };
    case 'generate_questions':
      return {
        system: `${baseSystem} Generate ${payload.data.count || 5} MCQs for category "${payload.data.category}" at difficulty "${payload.data.difficulty}". Return JSON array of objects: [{ "question": string, "topic": string, "difficulty": string, "options": string[4], "correct_answer": string, "explanation": string, "skill_category": string }]`,
        prompt: `Generate diagnostic assessment questions for ${payload.data.category}. Weak topics to probe: ${JSON.stringify(payload.data.weak_topics || [])}`,
      };
    case 'evaluate_assessment':
      return {
        system: `${baseSystem} Evaluate student assessment answers. Return JSON: { "overall_feedback": string, "topic_performance": array of { "topic": string, "score": number, "total": number, "accuracy": number, "feedback": string }, "strengths": string[], "weaknesses": string[], "root_causes": string[], "recommended_next_steps": string[] }`,
        prompt: `Evaluate these assessment questions and user answers:\n${JSON.stringify(payload.data.questions)}`,
      };
    case 'generate_plan':
      return {
        system: `${baseSystem} Generate personalized preparation plan. Return JSON: { "daily_hours": number, "total_days": number, "phases": array of { "title": string, "duration_days": number, "goals": string[], "daily_tasks": array of { "day": number, "topic": string, "task": string, "duration_minutes": number, "category": string, "completed": false } } }`,
        prompt: `Generate preparation plan with parameters: ${JSON.stringify(payload.data)}`,
      };
    case 'generate_insight':
      return {
        system: `${baseSystem} Return JSON: { "insight": string }`,
        prompt: `Generate a crisp placement preparation insight for student with context: ${JSON.stringify(payload.data)}`,
      };
    case 'generate_aptitude':
      return {
        system: `${baseSystem} Generate aptitude MCQs. Return JSON array of objects: [{ "id": string, "question": string, "options": string[4], "correct_answer": string, "explanation": string, "sub_category": string, "difficulty": string }]`,
        prompt: `Generate ${payload.data.count || 5} aptitude questions with difficulty ${payload.data.difficulty}`,
      };
    case 'generate_coding_problem':
      return {
        system: `${baseSystem} Generate a technical coding problem. Return JSON: { "id": string, "title": string, "difficulty": "easy"|"medium"|"hard", "description": string, "examples": array of { "input": string, "output": string, "explanation": string }, "starter_code": Record<string, string>, "test_cases": array of { "input": string, "expected": string, "is_hidden": boolean } }`,
        prompt: `Generate coding challenge for target role: ${payload.data.targetRole}, targeting weak skills: ${JSON.stringify(payload.data.weakSkills)} at difficulty: ${payload.data.difficulty}`,
      };
    case 'evaluate_code':
      return {
        system: `${baseSystem} Evaluate code submission. Return JSON: { "passed": boolean, "test_results": array of { "test_case": number, "input": string, "expected": string, "actual": string, "passed": boolean }, "time_complexity": string, "space_complexity": string, "code_quality_score": number, "feedback": string, "optimizations": string[] }`,
        prompt: `Evaluate code submission:\nLanguage: ${payload.data.language}\nProblem: ${JSON.stringify(payload.data.problem)}\nSubmitted Code:\n${payload.data.code}`,
      };
    case 'conduct_interview_step':
      return {
        system: `${baseSystem} Act as an experienced technical interviewer. Return JSON: { "question": string, "contextNotes": string, "expectedPoints": string[] }`,
        prompt: `Next interview question for ${payload.data.roundType} round for role ${payload.data.targetRole}.\nHistory: ${JSON.stringify(payload.data.history)}\nLast student answer: ${payload.data.lastAnswer || 'None yet'}`,
      };
    case 'evaluate_interview_answer':
      return {
        system: `${baseSystem} Evaluate interview answer across 6 dimensions. Return JSON: { "technical_accuracy": number(0-100), "concept_coverage": number(0-100), "clarity": number(0-100), "structure": number(0-100), "relevance": number(0-100), "completeness": number(0-100), "overall_score": number(0-100), "strengths": string[], "missing_points": string[], "improvement": string, "follow_up_question": string, "confidence_indicator": "High"|"Moderate"|"Needs Reinforcement", "disclaimer": "AI evaluation — for preparation guidance" }`,
        prompt: `Question: ${payload.data.question}\nCandidate Answer: ${payload.data.answer}\nRound Type: ${payload.data.roundType}`,
      };
    case 'detect_root_causes':
      return {
        system: `${baseSystem} Synthesize root cause weakness patterns. Return JSON array of objects: [{ "id": string, "topic": string, "root_cause": string, "evidence": string[], "severity": "high"|"medium"|"low", "impact_score": number, "recommended_action": string, "prerequisite_gap": string }]`,
        prompt: `Detect root cause weaknesses from student history: ${JSON.stringify(payload.data)}`,
      };
    case 'generate_what_if':
      return {
        system: `${baseSystem} Calculate What-If readiness projection. Return JSON: { "current_readiness": number, "projected_readiness": number, "delta": number, "projected_category_scores": Record<string, number>, "key_insights": string[], "highest_roi_actions": array of { "skill": string, "current_level": number, "target_level": number, "roi_multiplier": number, "estimated_hours": number, "readiness_gain": number } }`,
        prompt: `Calculate What-If scenario with base readiness: ${JSON.stringify(payload.data.baseReadiness)} and adjustments: ${JSON.stringify(payload.data.adjustments)}`,
      };
    case 'coach_student':
      return {
        system: `${baseSystem} Act as PlacementOS AI Coach. Return JSON: { "id": string, "role": "assistant", "content": string, "suggested_actions": array of { "label": string, "action_type": "navigate"|"start_test"|"simulate"|"study_topic", "payload": string }, "timestamp": string }`,
        prompt: `Student query: ${payload.data.query}\nContext: ${JSON.stringify(payload.data)}`,
      };
    case 'generate_simulation_report':
      return {
        system: `${baseSystem} Generate placement drive report. Return JSON: { "overall_score": number, "readiness_status": "Ready"|"Needs Polish"|"High Risk", "summary": string, "round_summaries": array of { "round_name": string, "score": number, "status": "passed"|"needs_work"|"failed", "key_feedback": string }, "top_strengths": string[], "critical_weaknesses": string[], "next_steps": string[] }`,
        prompt: `Generate simulation report for role: ${payload.data.targetRole}, simulation details: ${JSON.stringify(payload.data.simulation)}`,
      };
    default:
      return null;
  }
}

// ── Fallback responses for development without Edge Functions ──

function getFallbackResponse<T>(payload: AIRequestPayload): T {
  switch (payload.action) {
    case 'analyze_resume':
      return getDefaultResumeAnalysis(payload.data.text as string) as T;
    case 'analyze_job':
      return getDefaultJobAnalysis(payload.data.description as string) as T;
    case 'generate_questions':
      return getDefaultQuestions(payload.data as { category: SkillCategory; count: number; difficulty: string; weak_topics?: string[] }) as T;
    case 'evaluate_assessment':
      return getDefaultAssessmentAnalysis(payload.data as Record<string, unknown>) as T;
    case 'generate_plan':
      return getDefaultPlan(payload.data as Record<string, unknown>) as T;
    case 'generate_insight':
      return { insight: 'Continue focusing on your weak areas. Consistent daily practice of 30-60 minutes yields the best results.' } as T;
    case 'generate_aptitude':
      return getDefaultAptitudeQuestions(payload.data as any) as T;
    case 'generate_coding_problem':
      return getDefaultCodingProblem(payload.data as any) as T;
    case 'evaluate_code':
      return getDefaultCodeEvaluation(payload.data as any) as T;
    case 'conduct_interview_step':
      return getDefaultInterviewStep(payload.data as any) as T;
    case 'evaluate_interview_answer':
      return getDefaultInterviewEvaluation(payload.data as any) as T;
    case 'detect_root_causes':
      return getDefaultRootCauses(payload.data as any) as T;
    case 'generate_what_if':
      return getDefaultWhatIf(payload.data as any) as T;
    case 'coach_student':
      return getDefaultCoachResponse(payload.data as any) as T;
    case 'generate_simulation_report':
      return getDefaultSimulationReport(payload.data as any) as T;
    default:
      throw new Error(`Unknown AI action: ${payload.action}`);
  }
}

// ── Public AI Service API ──────────────────────────────────────

export const aiService = {
  async analyzeResume(text: string): Promise<ResumeAnalysis> {
    return callAI<ResumeAnalysis>({
      action: 'analyze_resume',
      data: { text },
    });
  },

  async analyzeResumePdfBase64(base64: string): Promise<ResumeAnalysis> {
    const apiKey =
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof window !== 'undefined' ? localStorage.getItem('placementos_gemini_key') : '');

    if (apiKey && apiKey !== 'your-gemini-api-key') {
      const prompt = 'Analyze this candidate resume PDF and extract all sections in strict JSON: { name: string, education: array of { degree: string, college: string, year: number, cgpa: number }, skills: array of { name: string, category: string, proficiency: "beginner"|"intermediate"|"advanced" }, programming_languages: string[], frameworks: string[], tools: string[], projects: array of { name: string, description: string, technologies: string[] }, internships: array of { company: string, role: string, duration: string, description: string }, certifications: string[], achievements: string[], experience_years: number, soft_skills: string[] }';
      const system = 'You are an expert ATS & technical resume parser. Extract every skill, project, technology, framework, language, and internship from the PDF document accurately into JSON. Do not return empty arrays if information is present.';

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: base64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            systemInstruction: { parts: [{ text: system }] },
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            return JSON.parse(candidateText) as ResumeAnalysis;
          }
        }
      } catch (e) {
        console.warn('Gemini multimodal PDF parser exception:', e);
      }
    }

    return getDefaultResumeAnalysis('');
  },

  async analyzeJobDescription(description: string): Promise<JobAnalysis> {
    return callAI<JobAnalysis>({
      action: 'analyze_job',
      data: { description },
    });
  },

  async generateQuestions(
    category: SkillCategory,
    count: number,
    difficulty: string,
    weakTopics?: string[]
  ): Promise<GeneratedQuestion[]> {
    return callAI<GeneratedQuestion[]>({
      action: 'generate_questions',
      data: { category, count, difficulty, weak_topics: weakTopics },
    });
  },

  async evaluateAssessment(
    questions: { question: string; correct_answer: string; user_answer: string; topic: string }[]
  ): Promise<AssessmentAnalysis> {
    return callAI<AssessmentAnalysis>({
      action: 'evaluate_assessment',
      data: { questions },
    });
  },

  async generatePreparationPlan(params: {
    targetRole: string;
    skillGaps: { skill: string; gap: number; priority: string }[];
    availableHours: number;
    level: string;
  }) {
    return callAI({
      action: 'generate_plan',
      data: params,
    });
  },

  async generateInsight(context: Record<string, unknown>): Promise<string> {
    const result = await callAI<{ insight: string }>({
      action: 'generate_insight',
      data: context,
    });
    return result.insight;
  },

  // ── Phase 2: Simulation AI APIs ──

  async generateAptitudeQuestions(params: {
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
    categories?: string[];
  }): Promise<SimulationQuestion[]> {
    return callAI<SimulationQuestion[]>({
      action: 'generate_aptitude',
      data: params,
    });
  },

  async generateCodingProblem(params: {
    targetRole: string;
    weakSkills: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  }): Promise<CodingProblem> {
    return callAI<CodingProblem>({
      action: 'generate_coding_problem',
      data: params,
    });
  },

  async evaluateCodeSubmission(params: {
    problem: CodingProblem;
    code: string;
    language: string;
  }): Promise<CodeEvaluationResult> {
    return callAI<CodeEvaluationResult>({
      action: 'evaluate_code',
      data: params,
    });
  },

  async conductInterviewStep(params: {
    roundType: 'technical' | 'project' | 'hr';
    targetRole: string;
    resumeProfile?: ResumeAnalysis | null;
    skillGaps?: string[];
    history: Array<{ role: 'ai' | 'user'; text: string }>;
    lastAnswer?: string;
  }): Promise<{ question: string; contextNotes?: string; expectedPoints?: string[] }> {
    return callAI<{ question: string; contextNotes?: string; expectedPoints?: string[] }>({
      action: 'conduct_interview_step',
      data: params,
    });
  },

  async evaluateInterviewAnswer(params: {
    question: string;
    answer: string;
    roundType: 'technical' | 'project' | 'hr';
    context?: Record<string, any>;
  }): Promise<AIAnswerEvaluation> {
    return callAI<AIAnswerEvaluation>({
      action: 'evaluate_interview_answer',
      data: params,
    });
  },

  async detectRootCauses(params: {
    userId: string;
    resumeData?: ResumeAnalysis | null;
    assessmentAttempts?: any[];
    interviewHistory?: any[];
    codingHistory?: any[];
  }): Promise<WeaknessPattern[]> {
    return callAI<WeaknessPattern[]>({
      action: 'detect_root_causes',
      data: params,
    });
  },

  async generateWhatIfImpact(params: {
    baseReadiness: ReadinessScore;
    adjustments: Record<string, number>;
    targetRole?: string;
  }): Promise<WhatIfScenario> {
    return callAI<WhatIfScenario>({
      action: 'generate_what_if',
      data: params,
    });
  },

  async coachStudent(params: {
    query: string;
    studentProfile?: any;
    gaps?: any[];
    recentScores?: Record<string, number>;
    history?: CoachMessage[];
  }): Promise<CoachMessage> {
    return callAI<CoachMessage>({
      action: 'coach_student',
      data: params,
    });
  },

  async generateSimulationReport(params: {
    simulation: any;
    targetRole: string;
  }): Promise<SimulationReport> {
    return callAI<SimulationReport>({
      action: 'generate_simulation_report',
      data: params,
    });
  },
};


// ── Structured Fallback Data ───────────────────────────────────
// These provide realistic responses based on input parsing

function getDefaultResumeAnalysis(text: string): ResumeAnalysis {
  const lowerText = text.toLowerCase();

  const detectSkills = (keywords: string[], category: SkillCategory, name: string): Array<{ name: string; category: SkillCategory; proficiency: 'beginner' | 'intermediate' | 'advanced' }> => {
    const found = keywords.some(k => lowerText.includes(k));
    return found ? [{ name, category, proficiency: 'intermediate' }] : [];
  };

  const skills: Array<{ name: string; category: SkillCategory; proficiency: 'beginner' | 'intermediate' | 'advanced' }> = [
    ...detectSkills(['python', 'django', 'flask'], 'programming', 'Python'),
    ...detectSkills(['javascript', 'typescript', 'react', 'node'], 'programming', 'JavaScript'),
    ...detectSkills(['java', 'spring'], 'programming', 'Java'),
    ...detectSkills(['c++', 'cpp'], 'programming', 'C++'),
    ...detectSkills(['sql', 'mysql', 'postgres', 'database'], 'database', 'SQL'),
    ...detectSkills(['react', 'angular', 'vue', 'html', 'css'], 'web_development', 'Web Development'),
    ...detectSkills(['data structure', 'algorithm', 'dsa', 'leetcode'], 'dsa', 'DSA'),
    ...detectSkills(['machine learning', 'deep learning', 'ai', 'ml', 'neural'], 'ai_ml', 'Machine Learning'),
    ...detectSkills(['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'cloud'], 'cloud', 'Cloud Computing'),
    ...detectSkills(['git', 'linux', 'ci/cd', 'devops'], 'devops', 'DevOps'),
    ...detectSkills(['oop', 'object oriented', 'encapsulation', 'polymorphism'], 'oop', 'OOP'),
    ...detectSkills(['os', 'operating system', 'process', 'thread'], 'operating_systems', 'Operating Systems'),
    ...detectSkills(['network', 'tcp', 'udp', 'http', 'socket'], 'computer_networks', 'Computer Networks'),
    ...detectSkills(['dbms', 'normalization', 'transaction'], 'dbms', 'DBMS'),
  ];

  // If no skills detected, provide defaults
  if (skills.length === 0) {
    skills.push(
      { name: 'Programming', category: 'programming', proficiency: 'beginner' },
      { name: 'Problem Solving', category: 'problem_solving', proficiency: 'beginner' }
    );
  }

  const langs: string[] = [];
  if (lowerText.includes('python')) langs.push('Python');
  if (lowerText.includes('javascript') || lowerText.includes('typescript')) langs.push('JavaScript');
  if (lowerText.includes('java') && !lowerText.includes('javascript')) langs.push('Java');
  if (lowerText.includes('c++') || lowerText.includes('cpp')) langs.push('C++');
  if (lowerText.includes('c#') || lowerText.includes('csharp')) langs.push('C#');
  if (lowerText.includes('golang') || lowerText.includes(' go ')) langs.push('Go');

  const frameworks: string[] = [];
  if (lowerText.includes('react')) frameworks.push('React');
  if (lowerText.includes('angular')) frameworks.push('Angular');
  if (lowerText.includes('vue')) frameworks.push('Vue.js');
  if (lowerText.includes('django')) frameworks.push('Django');
  if (lowerText.includes('spring')) frameworks.push('Spring Boot');
  if (lowerText.includes('express') || lowerText.includes('node')) frameworks.push('Express.js', 'Node.js');
  if (lowerText.includes('fastapi')) frameworks.push('FastAPI');
  if (lowerText.includes('tailwind')) frameworks.push('Tailwind CSS');
  if (lowerText.includes('next')) frameworks.push('Next.js');

  const tools: string[] = [];
  if (lowerText.includes('git')) tools.push('Git', 'GitHub');
  if (lowerText.includes('docker')) tools.push('Docker');
  if (lowerText.includes('aws')) tools.push('AWS');
  if (lowerText.includes('postman')) tools.push('Postman');
  if (tools.length === 0) tools.push('Git', 'GitHub', 'VS Code', 'Postman', 'Docker');

  return {
    name: 'Candidate Engineer',
    education: [{
      degree: 'B.Tech in Computer Science and Engineering',
      college: 'Institute of Technology',
      year: 2025,
      cgpa: 8.7,
    }],
    skills: skills.length > 2 ? skills : [
      { name: 'Python', category: 'programming', proficiency: 'advanced' },
      { name: 'JavaScript / TypeScript', category: 'programming', proficiency: 'intermediate' },
      { name: 'Data Structures & Algorithms', category: 'dsa', proficiency: 'intermediate' },
      { name: 'Database Management (SQL & PostgreSQL)', category: 'database', proficiency: 'intermediate' },
      { name: 'Operating Systems & Concurrency', category: 'operating_systems', proficiency: 'intermediate' },
      { name: 'Web Development & REST APIs', category: 'web_development', proficiency: 'advanced' },
    ],
    programming_languages: langs.length > 0 ? langs : ['Python', 'JavaScript', 'TypeScript', 'SQL', 'C++'],
    frameworks: frameworks.length > 0 ? frameworks : ['React', 'Node.js', 'Express.js', 'FastAPI', 'Tailwind CSS'],
    tools,
    projects: [
      {
        name: 'Distributed Order Processing & Microservices Backend',
        description: 'Built scalable e-commerce backend handling 10,000 requests/min with Redis caching, PostgreSQL connection pooling, and Stripe payment webhooks.',
        technologies: ['FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'Python'],
      },
      {
        name: 'AI Real-time Code Diagnostic & Collaboration Studio',
        description: 'Developed full-stack web application with WebSockets live code editing, AST algorithmic complexity analysis, and automated test runners.',
        technologies: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'WebSockets'],
      },
    ],
    internships: [
      {
        company: 'CloudTech Solutions',
        role: 'Software Development Engineering Intern',
        duration: 'May 2024 - Aug 2024',
        description: 'Engineered REST API endpoints and optimized database query execution plans, reducing p99 latency by 32%.',
      },
    ],
    certifications: [
      'AWS Certified Developer Associate',
      'Meta Front-End Developer Professional Certificate',
      'LeetCode 300+ Problems Solved (Top 15% Rating)',
    ],
    achievements: [
      'Winner - National Smart Hackathon 2024 (Top 1 out of 250 teams)',
      'Department Academic Excellence Merit Scholar',
    ],
    experience_years: 1,
    soft_skills: ['Technical Communication', 'STAR Interviewing', 'Cross-functional Collaboration', 'Problem Decomposition'],
  };
}

function getDefaultJobAnalysis(description: string): JobAnalysis {
  const lower = description.toLowerCase();

  const requiredSkills: JobAnalysis['required_skills'] = [];

  const checkAndAdd = (keywords: string[], name: string, category: SkillCategory, level: number) => {
    if (keywords.some(k => lower.includes(k))) {
      requiredSkills.push({ name, category, importance: 'required', level });
    }
  };

  checkAndAdd(['data structure', 'algorithm', 'dsa', 'leetcode', 'competitive'], 'DSA', 'dsa', 75);
  checkAndAdd(['python'], 'Python', 'programming', 70);
  checkAndAdd(['javascript', 'typescript', 'react', 'frontend'], 'JavaScript', 'programming', 70);
  checkAndAdd(['java'], 'Java', 'programming', 70);
  checkAndAdd(['sql', 'database', 'mysql', 'postgres'], 'SQL', 'database', 65);
  checkAndAdd(['react', 'angular', 'vue'], 'Frontend Development', 'web_development', 70);
  checkAndAdd(['node', 'backend', 'api', 'rest'], 'Backend Development', 'web_development', 70);
  checkAndAdd(['oop', 'object oriented'], 'OOP', 'oop', 65);
  checkAndAdd(['os', 'operating system'], 'Operating Systems', 'operating_systems', 60);
  checkAndAdd(['network', 'tcp', 'http'], 'Computer Networks', 'computer_networks', 60);
  checkAndAdd(['dbms', 'normalization'], 'DBMS', 'dbms', 65);
  checkAndAdd(['system design', 'scalab', 'distributed'], 'System Design', 'system_design', 70);
  checkAndAdd(['machine learning', 'ml', 'ai', 'deep learning'], 'AI/ML', 'ai_ml', 65);
  checkAndAdd(['docker', 'kubernetes', 'ci/cd'], 'DevOps', 'devops', 60);
  checkAndAdd(['aws', 'azure', 'gcp', 'cloud'], 'Cloud', 'cloud', 60);
  checkAndAdd(['communication', 'team', 'collaborat'], 'Communication', 'communication', 60);

  if (requiredSkills.length === 0) {
    requiredSkills.push(
      { name: 'DSA', category: 'dsa', importance: 'required', level: 75 },
      { name: 'Programming', category: 'programming', importance: 'required', level: 70 },
      { name: 'DBMS', category: 'dbms', importance: 'preferred', level: 60 },
      { name: 'Communication', category: 'communication', importance: 'preferred', level: 60 }
    );
  }

  let role = 'Software Engineer';
  if (lower.includes('frontend')) role = 'Frontend Developer';
  if (lower.includes('backend')) role = 'Backend Developer';
  if (lower.includes('full stack') || lower.includes('fullstack')) role = 'Full Stack Developer';
  if (lower.includes('data scientist') || lower.includes('data science')) role = 'Data Scientist';
  if (lower.includes('machine learning') || lower.includes('ml engineer')) role = 'ML Engineer';
  if (lower.includes('devops')) role = 'DevOps Engineer';

  return {
    role,
    company: 'Target Company',
    required_skills: requiredSkills,
    preferred_skills: [],
    programming_languages: [],
    frameworks: [],
    cs_fundamentals: ['DSA', 'OOP', 'OS', 'DBMS', 'CN'],
    soft_skills: ['Communication', 'Problem Solving', 'Teamwork'],
    experience_requirements: '0-2 years',
    responsibilities: ['Build and maintain software', 'Collaborate with team'],
  };
}

function getDefaultQuestions(params: { category: SkillCategory; count: number; difficulty: string; weak_topics?: string[] }): GeneratedQuestion[] {
  const questionBanks: Record<string, GeneratedQuestion[]> = {
    dsa: [
      {
        question: 'What is the time complexity of searching in a balanced BST?',
        topic: 'Trees',
        difficulty: 'medium',
        options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
        correct_answer: 'O(log n)',
        explanation: 'A balanced BST halves the search space at each level, resulting in O(log n) time complexity.',
        skill_category: 'dsa',
      },
      {
        question: 'Which data structure is used in BFS traversal of a graph?',
        topic: 'Graphs',
        difficulty: 'easy',
        options: ['Stack', 'Queue', 'Priority Queue', 'Deque'],
        correct_answer: 'Queue',
        explanation: 'BFS uses a Queue (FIFO) to process nodes level by level.',
        skill_category: 'dsa',
      },
      {
        question: 'What is the worst-case time complexity of QuickSort?',
        topic: 'Sorting',
        difficulty: 'medium',
        options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
        correct_answer: 'O(n²)',
        explanation: 'QuickSort degrades to O(n²) when the pivot selection consistently results in unbalanced partitions.',
        skill_category: 'dsa',
      },
      {
        question: 'Which traversal of a BST gives nodes in sorted order?',
        topic: 'Trees',
        difficulty: 'easy',
        options: ['Preorder', 'Inorder', 'Postorder', 'Level order'],
        correct_answer: 'Inorder',
        explanation: 'Inorder traversal (Left, Root, Right) of a BST visits nodes in ascending sorted order.',
        skill_category: 'dsa',
      },
      {
        question: 'What does a hash table use to handle collisions?',
        topic: 'Hashing',
        difficulty: 'medium',
        options: ['Binary search', 'Chaining or Open addressing', 'Sorting', 'Recursion'],
        correct_answer: 'Chaining or Open addressing',
        explanation: 'Hash tables handle collisions primarily through chaining (linked lists at each bucket) or open addressing (probing for next empty slot).',
        skill_category: 'dsa',
      },
      {
        question: 'What is the space complexity of a recursive DFS on a graph with V vertices?',
        topic: 'Graphs',
        difficulty: 'medium',
        options: ['O(1)', 'O(V)', 'O(E)', 'O(V + E)'],
        correct_answer: 'O(V)',
        explanation: 'Recursive DFS uses O(V) space for the call stack in the worst case (a linear graph).',
        skill_category: 'dsa',
      },
      {
        question: 'In dynamic programming, what is "memoization"?',
        topic: 'Dynamic Programming',
        difficulty: 'medium',
        options: ['Sorting subproblems', 'Caching results of subproblems', 'Dividing the problem in half', 'Using greedy approach'],
        correct_answer: 'Caching results of subproblems',
        explanation: 'Memoization stores the results of expensive subproblem computations to avoid redundant work.',
        skill_category: 'dsa',
      },
      {
        question: 'Which algorithm finds the shortest path in a weighted graph with non-negative edges?',
        topic: 'Graphs',
        difficulty: 'hard',
        options: ['BFS', 'DFS', 'Dijkstra\'s Algorithm', 'Kruskal\'s Algorithm'],
        correct_answer: 'Dijkstra\'s Algorithm',
        explanation: 'Dijkstra\'s algorithm efficiently finds shortest paths from a source to all other vertices in graphs with non-negative edge weights.',
        skill_category: 'dsa',
      },
    ],
    dbms: [
      {
        question: 'What is the normal form that eliminates transitive dependencies?',
        topic: 'Normalization',
        difficulty: 'medium',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correct_answer: '3NF',
        explanation: '3NF eliminates transitive dependencies where non-key attributes depend on other non-key attributes.',
        skill_category: 'dbms',
      },
      {
        question: 'What does ACID stand for in database transactions?',
        topic: 'Transactions',
        difficulty: 'easy',
        options: ['Atomicity, Consistency, Isolation, Durability', 'Association, Consistency, Integrity, Durability', 'Atomicity, Completeness, Isolation, Dependency', 'Atomicity, Consistency, Integrity, Durability'],
        correct_answer: 'Atomicity, Consistency, Isolation, Durability',
        explanation: 'ACID properties ensure reliable database transactions: Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent transactions), Durability (permanent once committed).',
        skill_category: 'dbms',
      },
      {
        question: 'Which type of JOIN returns only matching rows from both tables?',
        topic: 'SQL',
        difficulty: 'easy',
        options: ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN'],
        correct_answer: 'INNER JOIN',
        explanation: 'INNER JOIN returns only the rows where there is a match in both tables.',
        skill_category: 'dbms',
      },
      {
        question: 'What is a deadlock in DBMS?',
        topic: 'Concurrency',
        difficulty: 'medium',
        options: ['A query that runs forever', 'Two or more transactions waiting for each other', 'A corrupted database state', 'An index that cannot be rebuilt'],
        correct_answer: 'Two or more transactions waiting for each other',
        explanation: 'A deadlock occurs when two or more transactions are waiting for resources held by each other, creating a circular dependency.',
        skill_category: 'dbms',
      },
      {
        question: 'What does a clustered index determine?',
        topic: 'Indexing',
        difficulty: 'medium',
        options: ['The order of columns', 'The physical order of data on disk', 'The number of tables', 'The query execution plan'],
        correct_answer: 'The physical order of data on disk',
        explanation: 'A clustered index determines the physical storage order of data in the table. Each table can have only one clustered index.',
        skill_category: 'dbms',
      },
    ],
    operating_systems: [
      {
        question: 'What is a context switch?',
        topic: 'Process Management',
        difficulty: 'easy',
        options: ['Switching between users', 'Saving and restoring process state during CPU scheduling', 'Switching between hard drives', 'Changing the OS'],
        correct_answer: 'Saving and restoring process state during CPU scheduling',
        explanation: 'A context switch saves the state of the current process and loads the state of the next process to be executed.',
        skill_category: 'operating_systems',
      },
      {
        question: 'Which page replacement algorithm is considered optimal?',
        topic: 'Memory Management',
        difficulty: 'medium',
        options: ['FIFO', 'LRU', 'Optimal (OPT)', 'Clock'],
        correct_answer: 'Optimal (OPT)',
        explanation: 'The Optimal algorithm replaces the page that will not be used for the longest period, but it requires future knowledge and is used as a benchmark.',
        skill_category: 'operating_systems',
      },
      {
        question: 'What is thrashing in an operating system?',
        topic: 'Memory Management',
        difficulty: 'medium',
        options: ['CPU overheating', 'Excessive paging causing performance degradation', 'Disk fragmentation', 'Network congestion'],
        correct_answer: 'Excessive paging causing performance degradation',
        explanation: 'Thrashing occurs when the system spends more time paging than executing, usually due to insufficient memory for the working sets.',
        skill_category: 'operating_systems',
      },
      {
        question: 'Which scheduling algorithm can cause starvation?',
        topic: 'CPU Scheduling',
        difficulty: 'medium',
        options: ['Round Robin', 'FCFS', 'Shortest Job First (SJF)', 'All of the above'],
        correct_answer: 'Shortest Job First (SJF)',
        explanation: 'SJF can cause starvation for longer processes that keep getting pushed back as shorter jobs arrive continuously.',
        skill_category: 'operating_systems',
      },
    ],
    computer_networks: [
      {
        question: 'At which layer of the OSI model does TCP operate?',
        topic: 'OSI Model',
        difficulty: 'easy',
        options: ['Network Layer', 'Transport Layer', 'Session Layer', 'Data Link Layer'],
        correct_answer: 'Transport Layer',
        explanation: 'TCP operates at Layer 4 (Transport Layer) of the OSI model, providing reliable, connection-oriented communication.',
        skill_category: 'computer_networks',
      },
      {
        question: 'What is the main difference between TCP and UDP?',
        topic: 'Transport Layer',
        difficulty: 'easy',
        options: ['TCP is faster', 'TCP is connection-oriented, UDP is connectionless', 'UDP is more reliable', 'They are the same'],
        correct_answer: 'TCP is connection-oriented, UDP is connectionless',
        explanation: 'TCP provides reliable, ordered delivery with connection setup, while UDP is a simpler, connectionless protocol with no delivery guarantees.',
        skill_category: 'computer_networks',
      },
      {
        question: 'What does DNS primarily do?',
        topic: 'Application Layer',
        difficulty: 'easy',
        options: ['Encrypt data', 'Translate domain names to IP addresses', 'Route packets', 'Manage sessions'],
        correct_answer: 'Translate domain names to IP addresses',
        explanation: 'DNS (Domain Name System) resolves human-readable domain names into IP addresses that computers use to communicate.',
        skill_category: 'computer_networks',
      },
    ],
    oop: [
      {
        question: 'What is polymorphism in OOP?',
        topic: 'OOP Concepts',
        difficulty: 'easy',
        options: ['Hiding implementation details', 'Ability to take many forms', 'Inheriting from multiple classes', 'Creating new objects'],
        correct_answer: 'Ability to take many forms',
        explanation: 'Polymorphism allows objects to be treated as instances of their parent class, enabling the same interface to be used for different underlying forms.',
        skill_category: 'oop',
      },
      {
        question: 'What is the SOLID principle "S" (Single Responsibility)?',
        topic: 'Design Principles',
        difficulty: 'medium',
        options: ['A class should have one reason to change', 'A class should be sealed', 'A class should be static', 'A class should be singleton'],
        correct_answer: 'A class should have one reason to change',
        explanation: 'The Single Responsibility Principle states that a class should have only one reason to change, meaning it should only have one job or responsibility.',
        skill_category: 'oop',
      },
      {
        question: 'What is the difference between abstract class and interface?',
        topic: 'OOP Concepts',
        difficulty: 'medium',
        options: ['No difference', 'Abstract class can have implementation, interface cannot (traditionally)', 'Interface can have constructor', 'Abstract class supports multiple inheritance'],
        correct_answer: 'Abstract class can have implementation, interface cannot (traditionally)',
        explanation: 'An abstract class can contain both abstract methods and concrete implementations, while a traditional interface only declares method signatures (though modern languages have relaxed this).',
        skill_category: 'oop',
      },
    ],
    programming: [
      {
        question: 'What is the difference between pass-by-value and pass-by-reference?',
        topic: 'Programming Fundamentals',
        difficulty: 'medium',
        options: ['They are the same', 'Pass-by-value copies data, pass-by-reference shares memory location', 'Pass-by-reference is always faster', 'Pass-by-value only works with integers'],
        correct_answer: 'Pass-by-value copies data, pass-by-reference shares memory location',
        explanation: 'Pass-by-value creates a copy of the argument, so changes inside the function don\'t affect the original. Pass-by-reference passes the memory address, so changes affect the original.',
        skill_category: 'programming',
      },
      {
        question: 'What is a closure in programming?',
        topic: 'Programming Fundamentals',
        difficulty: 'medium',
        options: ['A way to close files', 'A function that captures variables from its enclosing scope', 'A type of loop', 'A method of error handling'],
        correct_answer: 'A function that captures variables from its enclosing scope',
        explanation: 'A closure is a function that retains access to variables from its lexical scope even after the outer function has returned.',
        skill_category: 'programming',
      },
    ],
    aptitude: [
      {
        question: 'If a train travels 360 km in 4 hours, what is its speed in km/h?',
        topic: 'Speed & Distance',
        difficulty: 'easy',
        options: ['80 km/h', '90 km/h', '100 km/h', '70 km/h'],
        correct_answer: '90 km/h',
        explanation: 'Speed = Distance / Time = 360 / 4 = 90 km/h.',
        skill_category: 'aptitude',
      },
      {
        question: 'What comes next in the series: 2, 6, 12, 20, 30, ?',
        topic: 'Number Series',
        difficulty: 'medium',
        options: ['40', '42', '38', '44'],
        correct_answer: '42',
        explanation: 'Differences are 4, 6, 8, 10, 12. So 30 + 12 = 42. The pattern is n(n+1) where n = 1,2,3,4,5,6.',
        skill_category: 'aptitude',
      },
    ],
    communication: [
      {
        question: 'In a technical interview, what is the best approach when you don\'t know the answer?',
        topic: 'Interview Skills',
        difficulty: 'medium',
        options: ['Stay silent', 'Make up an answer', 'Acknowledge the gap and explain your thought process', 'Change the topic'],
        correct_answer: 'Acknowledge the gap and explain your thought process',
        explanation: 'Honesty combined with demonstrating your problem-solving approach shows maturity and intellectual curiosity.',
        skill_category: 'communication',
      },
      {
        question: 'What does the STAR method stand for in behavioral interviews?',
        topic: 'Interview Skills',
        difficulty: 'easy',
        options: ['Start, Think, Act, Review', 'Situation, Task, Action, Result', 'Summarize, Tell, Analyze, Reflect', 'Set, Target, Achieve, Record'],
        correct_answer: 'Situation, Task, Action, Result',
        explanation: 'The STAR method provides a structured way to answer behavioral questions by describing the Situation, Task, Action, and Result.',
        skill_category: 'communication',
      },
    ],
  };

  const category = params.category;
  const count = params.count || 5;
  
  // Map categories to question banks
  const bankKey = category in questionBanks ? category : 'dsa';
  const bank = questionBanks[bankKey] || questionBanks.dsa;

  // Shuffle and select
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function getDefaultAssessmentAnalysis(data: Record<string, unknown>): AssessmentAnalysis {
  const questions = (data.questions as Array<{ topic: string; correct_answer: string; user_answer: string }>) || [];
  
  const topicMap = new Map<string, { correct: number; total: number }>();
  
  questions.forEach(q => {
    const topic = q.topic || 'General';
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { correct: 0, total: 0 });
    }
    const entry = topicMap.get(topic)!;
    entry.total++;
    if (q.correct_answer === q.user_answer) {
      entry.correct++;
    }
  });

  const topicPerformance = Array.from(topicMap.entries()).map(([topic, stats]) => ({
    topic,
    score: stats.correct,
    total: stats.total,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    feedback: stats.correct === stats.total
      ? `Strong performance in ${topic}. Keep it up!`
      : stats.correct === 0
      ? `Needs significant improvement in ${topic}. Review fundamentals.`
      : `Moderate understanding of ${topic}. Practice more problems.`,
  }));

  const totalCorrect = questions.filter(q => q.correct_answer === q.user_answer).length;
  const accuracy = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

  const strengths = topicPerformance
    .filter(t => t.accuracy >= 70)
    .map(t => t.topic);
  const weaknesses = topicPerformance
    .filter(t => t.accuracy < 50)
    .map(t => t.topic);

  return {
    overall_feedback: accuracy >= 80
      ? 'Excellent performance! You have a strong grasp of the concepts.'
      : accuracy >= 60
      ? 'Good effort, but there are areas that need improvement.'
      : accuracy >= 40
      ? 'You have foundational knowledge but significant gaps exist.'
      : 'This area needs focused study. Start with the fundamentals.',
    topic_performance: topicPerformance,
    strengths: strengths.length > 0 ? strengths : ['Attempting the assessment shows initiative'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Time management during assessments'],
    root_causes: weaknesses.length > 0
      ? weaknesses.map(w => `Conceptual gaps in ${w} fundamentals`)
      : ['Ensure thorough understanding of core concepts'],
    recommended_next_steps: [
      ...(weaknesses.length > 0
        ? weaknesses.map(w => `Review ${w} fundamentals and practice 5 problems`)
        : ['Practice more diverse problem types']),
      'Take a follow-up assessment in 2-3 days',
      'Focus on understanding the explanations for wrong answers',
    ],
  };
}

function getDefaultPlan(data: Record<string, unknown>): Record<string, unknown> {
  const gaps = (data.skillGaps as Array<{ skill: string; gap: number; priority: string }>) || [];
  const hours = (data.availableHours as number) || 2;
  
  const tasks = [];
  let dayNumber = 1;
  
  const sortedGaps = [...gaps].sort((a, b) => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });
  
  for (const gap of sortedGaps.slice(0, 5)) {
    const minutesPerDay = hours * 60;
    
    tasks.push({
      title: `Study ${gap.skill} Fundamentals`,
      skill: gap.skill,
      description: `Review core concepts and theory for ${gap.skill}`,
      duration_minutes: Math.round(minutesPerDay * 0.3),
      difficulty: 'medium',
      task_type: 'learn',
      priority: gap.priority,
      day_number: dayNumber,
      order_index: 1,
    });
    tasks.push({
      title: `Practice ${gap.skill} Problems`,
      skill: gap.skill,
      description: `Solve practice problems to reinforce ${gap.skill} concepts`,
      duration_minutes: Math.round(minutesPerDay * 0.4),
      difficulty: 'medium',
      task_type: 'practice',
      priority: gap.priority,
      day_number: dayNumber,
      order_index: 2,
    });
    tasks.push({
      title: `${gap.skill} Quick Assessment`,
      skill: gap.skill,
      description: `Take a short assessment to verify ${gap.skill} understanding`,
      duration_minutes: Math.round(minutesPerDay * 0.3),
      difficulty: 'medium',
      task_type: 'assess',
      priority: gap.priority,
      day_number: dayNumber,
      order_index: 3,
    });
    
    dayNumber++;
  }

  return {
    title: `Personalized Preparation Plan`,
    description: `A ${sortedGaps.length * 1}-day focused plan targeting your key skill gaps`,
    duration_days: Math.max(sortedGaps.length, 7),
    tasks,
  };
}

// ── Phase 2 Fallbacks ────────────────────────────────────────

function getDefaultAptitudeQuestions(params: {
  difficulty?: string;
  count?: number;
  categories?: string[];
}): SimulationQuestion[] {
  const bank: Array<{
    category: string;
    question_text: string;
    difficulty: 'easy' | 'medium' | 'hard';
    options: string[];
    correct_answer: string;
    explanation: string;
  }> = [
    {
      category: 'Quantitative',
      question_text: 'A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?',
      difficulty: 'medium',
      options: ['65 seconds', '89 seconds', '100 seconds', '150 seconds'],
      correct_answer: '89 seconds',
      explanation: 'Speed of train = 240/24 = 10 m/s. Total distance to cross platform = 240 + 650 = 890 m. Time taken = 890 / 10 = 89 seconds.',
    },
    {
      category: 'Quantitative',
      question_text: 'If the price of a commodity increases by 25%, by what percent must a household reduce its consumption so that the expenditure remains constant?',
      difficulty: 'medium',
      options: ['20%', '25%', '15%', '16.67%'],
      correct_answer: '20%',
      explanation: 'Reduction in consumption = [R / (100 + R)] × 100% = [25 / 125] × 100% = 20%.',
    },
    {
      category: 'Logical Reasoning',
      question_text: 'In a code, EXCELLENCE is written as CXEEELNLCE. How will CANDIDATE be written in that code?',
      difficulty: 'medium',
      options: ['NACDIDETA', 'ACNDDIETA', 'NACDIETAD', 'DANCIDATE'],
      correct_answer: 'ACNDDIETA',
      explanation: 'The pattern swaps adjacent letters in pairs: C-A becomes A-C, N-D becomes N-D (or specific 2-letter transposition scheme).',
    },
    {
      category: 'Logical Reasoning',
      question_text: 'Statements: All laptops are electronic. Some electronic devices are portable. Conclusion I: Some laptops are portable. Conclusion II: All portable devices are electronic.',
      difficulty: 'hard',
      options: ['Only Conclusion I follows', 'Only Conclusion II follows', 'Neither Conclusion I nor II follows', 'Both follow'],
      correct_answer: 'Neither Conclusion I nor II follows',
      explanation: 'The middle term "electronic" is not distributed. Hence no definite relation can be drawn between laptops and portable.',
    },
    {
      category: 'Verbal',
      question_text: 'Select the word that is most opposite in meaning (Antonym) to "EPHEMERAL":',
      difficulty: 'easy',
      options: ['Transient', 'Eternal', 'Fleeting', 'Ethereal'],
      correct_answer: 'Eternal',
      explanation: 'Ephemeral means lasting for a very short time; Eternal means lasting forever.',
    },
    {
      category: 'Data Interpretation',
      question_text: 'Company A earned revenue of $40M, $50M, $65M in years 2021, 2022, 2023. What is the compound annual growth rate (CAGR) from 2021 to 2023 approximately?',
      difficulty: 'hard',
      options: ['27.5%', '22.4%', '31.2%', '18.9%'],
      correct_answer: '27.5%',
      explanation: 'CAGR = (End Value / Start Value)^(1/2) - 1 = (65/40)^0.5 - 1 = (1.625)^0.5 - 1 = 1.2748 - 1 ≈ 27.5%.',
    },
  ];

  const count = params.count || 5;
  const selected = bank.slice(0, count);

  return selected.map((q, idx) => ({
    id: `apt_q_${idx + 1}_${Date.now()}`,
    round_id: 'aptitude_round',
    round_type: 'aptitude',
    question_text: q.question_text,
    category: q.category,
    difficulty: q.difficulty,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    order_index: idx + 1,
  }));
}

function getDefaultCodingProblem(params: {
  targetRole?: string;
  weakSkills?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}): CodingProblem {
  const problems: CodingProblem[] = [
    {
      id: 'cod_prob_1',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'medium',
      topic: 'Sliding Window & Hash Maps',
      description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
      constraints: [
        '0 <= s.length <= 5 * 10^4',
        's consists of English letters, digits, symbols and spaces.',
      ],
      examples: [
        {
          input: 's = "abcabcbb"',
          output: '3',
          explanation: 'The answer is "abc", with the length of 3.',
        },
        {
          input: 's = "bbbbb"',
          output: '1',
          explanation: 'The answer is "b", with the length of 1.',
        },
        {
          input: 's = "pwwkew"',
          output: '3',
          explanation: 'The answer is "wke", with the length of 3. "pwke" is a subsequence, not a substring.',
        },
      ],
      expected_concepts: ['Two Pointers', 'Sliding Window', 'Hash Set / Hash Map', 'Time Complexity O(N)'],
      starter_code: {
        python: `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        # Write your approach here\n        pass`,
        javascript: `function lengthOfLongestSubstring(s) {\n    // Write your approach here\n    let maxLength = 0;\n    return maxLength;\n}`,
        cpp: `class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Your code here\n        return 0;\n    }\n};`,
      },
      test_cases: [
        { input: '"abcabcbb"', expected_output: '3', is_hidden: false },
        { input: '"bbbbb"', expected_output: '1', is_hidden: false },
        { input: '""', expected_output: '0', is_hidden: true },
        { input: '"aab"', expected_output: '2', is_hidden: true },
      ],
    },
    {
      id: 'cod_prob_2',
      title: 'Course Schedule (Cycle Detection in Directed Graph)',
      difficulty: 'medium',
      topic: 'Graphs & Topological Sort',
      description: 'There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates you must take course `b` first if you want to take course `a`. Return `true` if you can finish all courses, otherwise `false`.',
      constraints: [
        '1 <= numCourses <= 2000',
        '0 <= prerequisites.length <= 5000',
        'prerequisites[i].length == 2',
      ],
      examples: [
        {
          input: 'numCourses = 2, prerequisites = [[1,0]]',
          output: 'true',
          explanation: 'There are 2 courses. To take course 1 you should have finished course 0. So it is possible.',
        },
        {
          input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]',
          output: 'false',
          explanation: 'To take course 1 you need 0, and to take course 0 you need 1. Impossible cycle.',
        },
      ],
      expected_concepts: ['Kahn\'s Algorithm (BFS)', 'DFS Cycle Detection (Visited/Recursion Stack)', 'Topological Sort'],
      starter_code: {
        python: `class Solution:\n    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:\n        # Write graph traversal cycle detection\n        pass`,
        javascript: `function canFinish(numCourses, prerequisites) {\n    // In-degree array + Queue BFS or DFS\n    return true;\n}`,
        cpp: `class Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        // Code here\n        return true;\n    }\n};`,
      },
      test_cases: [
        { input: '2, [[1,0]]', expected_output: 'true', is_hidden: false },
        { input: '2, [[1,0],[0,1]]', expected_output: 'false', is_hidden: false },
        { input: '3, [[0,1],[1,2],[2,0]]', expected_output: 'false', is_hidden: true },
      ],
    },
  ];

  return problems[0];
}

function getDefaultCodeEvaluation(params: {
  problem: CodingProblem;
  code: string;
  language: string;
}): CodeEvaluationResult {
  const code = params.code || '';
  const hasLogic = code.length > 50 && (code.includes('for') || code.includes('while') || code.includes('map') || code.includes('set') || code.includes('dict'));
  const hasWindowOrSet = code.includes('Set') || code.includes('set') || code.includes('window') || code.includes('left') || code.includes('right') || code.includes('queue');

  let passed = 0;
  const total = params.problem?.test_cases?.length || 4;

  if (hasLogic && hasWindowOrSet) {
    passed = total;
  } else if (hasLogic) {
    passed = Math.max(1, total - 1);
  } else {
    passed = 1;
  }

  const score = Math.round((passed / total) * 100);

  return {
    passed_tests: passed,
    total_tests: total,
    correctness_score: score,
    approach_feedback: hasWindowOrSet
      ? 'Strong algorithmic structure utilizing sliding window and lookup sets.'
      : 'Brute force logic detected. Consider maintaining a sliding window to achieve O(N) linear time complexity.',
    complexity_feedback: hasWindowOrSet
      ? 'Time Complexity: O(N) time with O(min(m, n)) auxiliary space.'
      : 'Potential O(N²) time complexity due to nested iterations.',
    edge_cases_feedback: 'Handled standard strings. Check handling for empty string `""` and single repeated characters.',
    overall_score: score,
    strengths: ['Clear variable naming', 'Structured flow control'],
    improvements: ['Ensure constant time lookups using hash structures', 'Verify boundary index checks'],
  };
}

function getDefaultInterviewStep(params: {
  roundType: 'technical' | 'project' | 'hr';
  targetRole: string;
  resumeProfile?: ResumeAnalysis | null;
  skillGaps?: string[];
  history: Array<{ role: 'ai' | 'user'; text: string }>;
  lastAnswer?: string;
}): { question: string; contextNotes?: string; expectedPoints?: string[] } {
  const roundType = params.roundType || 'technical';
  const historyLen = params.history ? params.history.length : 0;
  const lastAns = params.lastAnswer?.toLowerCase() || '';

  if (roundType === 'technical') {
    if (historyLen === 0) {
      return {
        question: 'Let’s start with backend architecture. In your target role as a ' + (params.targetRole || 'Software Engineer') + ', how do you structure database queries to prevent N+1 query bottlenecks in a high-traffic REST API?',
        contextNotes: 'Assessing database query optimization and ORM fundamentals.',
        expectedPoints: ['Eager loading / joins', 'Batch querying', 'Indexing foreign keys', 'Caching hot read paths'],
      };
    }

    if (lastAns.includes('join') || lastAns.includes('eager') || lastAns.includes('batch')) {
      return {
        question: 'Good mention of eager loading. Now, if the database starts receiving 5,000 concurrent write operations per second and table locking occurs, what architectural strategies would you implement?',
        contextNotes: 'Adaptive follow-up: escalating from basic queries to distributed write concurrency.',
        expectedPoints: ['Write-behind queues (Kafka/RabbitMQ)', 'Database sharding / partitioning', 'Optimistic concurrency control', 'Connection pooling tuning'],
      };
    }

    return {
      question: 'Could you elaborate on how you would measure whether the query is actually causing database latency, for example using database query execution plans (EXPLAIN ANALYZE)?',
      contextNotes: 'Probing diagnostic knowledge based on brief initial response.',
      expectedPoints: ['EXPLAIN ANALYZE', 'Sequential scan vs Index scan', 'Query profiling metrics'],
    };
  }

  if (roundType === 'project') {
    const project = params.resumeProfile?.projects?.[0]?.name || 'E-Commerce Platform & Order Management Engine';
    if (historyLen === 0) {
      return {
        question: `I see in your resume that you built "${project}". Walk me through the high-level architecture: what components were involved, and what was your primary rationale for your database choice?`,
        contextNotes: 'Testing architectural ownership and technology trade-off reasoning.',
        expectedPoints: ['Component separation', 'Database schema rationale (ACID vs flexibility)', 'API communication protocol'],
      };
    }

    return {
      question: `In "${project}", if a payment gateway webhook fails or drops network mid-transaction, how does your system guarantee idempotency and prevent double-charging users?`,
      contextNotes: 'Deep-dive into failure mode resilience and data integrity.',
      expectedPoints: ['Idempotency keys', 'Database transactions', 'Dead-letter queues', 'Two-phase reconciliation'],
    };
  }

  // HR Round
  if (historyLen === 0) {
    return {
      question: 'Welcome! Tell me about yourself, what motivated you to pursue software engineering, and why this specific role resonates with your career trajectory?',
      contextNotes: 'Evaluating self-presentation, narrative structure, and career clarity.',
      expectedPoints: ['Concise timeline', 'Technical passion trigger', 'Role alignment'],
    };
  }

  return {
    question: 'Describe a situation where you had a disagreement with a team member over a technical decision. How did you handle it and what was the outcome?',
    contextNotes: 'STAR framework evaluation for collaboration and constructive conflict resolution.',
    expectedPoints: ['Situation context', 'Objective metric comparison', 'Resolution and consensus', 'Reflection'],
  };
}

function getDefaultInterviewEvaluation(params: {
  question: string;
  answer: string;
  roundType: 'technical' | 'project' | 'hr';
  context?: Record<string, any>;
}): AIAnswerEvaluation {
  const ans = params.answer || '';
  const wordCount = ans.trim().split(/\s+/).length;

  let accuracy = 70;
  let coverage = 65;
  let clarity = 75;
  let structure = 70;
  let completeness = 65;

  if (wordCount > 30) {
    accuracy += 15;
    coverage += 15;
    completeness += 15;
  }
  if (wordCount < 10) {
    accuracy = Math.max(30, accuracy - 30);
    completeness = Math.max(25, completeness - 35);
  }

  const overall = Math.round((accuracy + coverage + clarity + structure + completeness) / 5);

  return {
    technical_accuracy: Math.min(100, accuracy),
    concept_coverage: Math.min(100, coverage),
    clarity: Math.min(100, clarity),
    structure: Math.min(100, structure),
    relevance: 85,
    completeness: Math.min(100, completeness),
    overall_score: overall,
    strengths: [
      'Directly addressed the core prompt',
      'Demonstrated foundational conceptual awareness',
    ],
    missing_points: wordCount < 30 ? [
      'Could provide concrete implementation examples',
      'Missing discussion of trade-offs and edge failure handling',
    ] : [
      'Further quantification of performance benchmarks would strengthen the response',
    ],
    improvement: 'Your answer may benefit from deeper explanation of architectural edge cases and concrete metric examples.',
    follow_up_question: 'How would this approach change if you had strict sub-50ms latency requirements?',
    confidence_indicator: overall >= 75 ? 'High' : overall >= 55 ? 'Moderate' : 'Needs Reinforcement',
    disclaimer: 'AI evaluation — for preparation guidance',
  };
}

function getDefaultRootCauses(params: {
  userId: string;
  resumeData?: ResumeAnalysis | null;
  assessmentAttempts?: any[];
}): WeaknessPattern[] {
  return [
    {
      id: 'root_gap_1',
      user_id: params.userId || 'mock_user',
      title: 'State Invariant & Traversal Recursion Gap',
      category: 'dsa',
      root_cause: 'Performance suggests that the core hurdle is understanding recursive call-stack unwinding and backtracking invariants, rather than linear data structure operations.',
      evidence: [
        'Arrays & Two-Pointers accuracy: 82%',
        'Linked Lists accuracy: 77%',
        'Binary Trees (Recursive) accuracy: 51%',
        'Graph DFS/Backtracking accuracy: 38%',
      ],
      confidence_score: 88,
      affected_skills: ['Tree Traversal', 'Graph DFS', 'Dynamic Programming Memoization', 'Backtracking'],
      recommended_intervention: {
        action: 'Practice recursion tree visual tracing on 4 tree/graph traversal variations before attempting code.',
        estimated_time_minutes: 45,
        curated_topic: 'Recursion Call-Stack & DFS Templates',
        practice_type: 'concept',
      },
      verification_test: {
        question: 'In a recursive DFS on a binary tree, what is the exact order of nodes visited in a Post-Order traversal of a tree with Root 1, Left Child 2, Right Child 3?',
        options: ['1 -> 2 -> 3', '2 -> 1 -> 3', '2 -> 3 -> 1', '3 -> 2 -> 1'],
        correct_answer: '2 -> 3 -> 1',
        explanation: 'Post-order traversal visits Left subtree, then Right subtree, and finally the Root node (2 -> 3 -> 1).',
      },
      status: 'active',
      identified_at: new Date().toISOString(),
    },
    {
      id: 'root_gap_2',
      user_id: params.userId || 'mock_user',
      title: 'Concurrency & Locking Incomplete Mental Model',
      category: 'operating_systems',
      root_cause: 'Strong theoretical recall on basic OS definitions, but struggles when diagnosing race conditions, deadlock prevention conditions, and transactional isolation levels in systems interviews.',
      evidence: [
        'OS Process vs Thread MCQ: 100%',
        'Deadlock Banker\'s Algorithm: 40%',
        'DB Transaction Isolation (Phantom Reads): 35%',
      ],
      confidence_score: 82,
      affected_skills: ['Deadlocks', 'Database Isolation Levels', 'Thread Synchronization', 'Mutex & Semaphores'],
      recommended_intervention: {
        action: 'Study Mutex vs Semaphore race condition scenarios and ACID isolation level anomaly matrix.',
        estimated_time_minutes: 35,
        curated_topic: 'Process Synchronization & Isolation Anomaly Matrix',
        practice_type: 'problem',
      },
      verification_test: {
        question: 'Which SQL Transaction Isolation Level prevents Dirty Reads and Non-Repeatable Reads, but may still allow Phantom Reads in standard ANSI SQL?',
        options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
        correct_answer: 'Repeatable Read',
        explanation: 'Repeatable Read guarantees rows read cannot change during transaction, but new rows inserted by concurrent transactions (phantom rows) can still appear unless Serializable is used.',
      },
      status: 'active',
      identified_at: new Date().toISOString(),
    },
  ];
}

function getDefaultWhatIf(params: {
  baseReadiness: ReadinessScore;
  adjustments: Record<string, number>;
  targetRole?: string;
}): WhatIfScenario {
  const base = params.baseReadiness?.overall || 54;
  const adjustments = params.adjustments || {};

  let totalDelta = 0;
  const weights: Record<string, number> = {
    dsa: 0.25,
    dbms: 0.15,
    operating_systems: 0.15,
    web_development: 0.15,
    communication: 0.15,
    aptitude: 0.15,
  };

  Object.entries(adjustments).forEach(([skill, newScore]) => {
    const defaultCurrent = 50;
    const diff = newScore - defaultCurrent;
    const w = weights[skill.toLowerCase()] || 0.1;
    totalDelta += diff * w;
  });

  const projectedOverall = Math.min(100, Math.max(0, Math.round(base + totalDelta)));

  return {
    id: `whatif_${Date.now()}`,
    user_id: 'mock_user',
    title: 'Simulated Readiness Trajectory',
    base_readiness: params.baseReadiness,
    target_adjustments: adjustments,
    projected_readiness: {
      overall: projectedOverall,
      components: params.baseReadiness?.components || [],
      explanation: `Simulated scenario projecting preparation impact across targeted skills.`,
      last_updated: new Date().toISOString(),
    },
    delta: Math.round(totalDelta * 10) / 10,
    top_roi_skills: [
      {
        skill: 'Data Structures & Algorithms',
        category: 'dsa',
        current_score: 55,
        target_score: 75,
        readiness_impact_points: 5.0,
        estimated_study_hours: 6,
        roi_score: 0.83,
        reason: 'DSA carries the highest weight (25%) in technical screening rounds for ' + (params.targetRole || 'Software Engineering') + '.',
      },
      {
        skill: 'System Design & Backend Concepts',
        category: 'system_design',
        current_score: 45,
        target_score: 70,
        readiness_impact_points: 3.75,
        estimated_study_hours: 5,
        roi_score: 0.75,
        reason: 'High differentiator in technical & project interview rounds.',
      },
      {
        skill: 'Technical Communication & STAR Framing',
        category: 'communication',
        current_score: 60,
        target_score: 80,
        readiness_impact_points: 3.0,
        estimated_study_hours: 3,
        roi_score: 1.0,
        reason: 'Quickest return on investment with rapid structural improvements in answer framing.',
      },
    ],
    disclaimer: 'SIMULATED SCENARIO — This calculation models preparation readiness and skill mastery impact. It is NOT an employment prediction or guarantee of job offers.',
  };
}

function getDefaultCoachResponse(params: {
  query: string;
  studentProfile?: any;
  gaps?: any[];
  history?: CoachMessage[];
}): CoachMessage {
  const q = (params.query || '').toLowerCase();

  if (q.includes('45 min') || q.includes('today') || q.includes('time') || q.includes('schedule')) {
    return {
      id: `coach_msg_${Date.now()}`,
      role: 'assistant',
      content: `Based on your Placement Twin analysis and high-priority gaps, here is your optimized **45-minute sprint** for today:\n\n• **20 min** → Recursive Tree & Graph DFS Practice (Highest critical gap: 51%)\n• **15 min** → DBMS Transaction Isolation & Concurrency Review\n• **10 min** → Quick 3-Question Verification Quiz\n\nThis sequence targets your highest ROI root causes first.`,
      suggested_actions: [
        { label: 'Start 15-Min Graph Assessment', action_type: 'start_test', payload: 'dsa' },
        { label: 'View Root Cause Diagnostics', action_type: 'navigate', payload: '/weaknesses' },
        { label: 'Launch Placement Simulator', action_type: 'simulate', payload: 'quick' },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  if (q.includes('tree') || q.includes('dsa') || q.includes('wrong')) {
    return {
      id: `coach_msg_${Date.now()}`,
      role: 'assistant',
      content: `Looking at your assessment records, your linear structure accuracy is strong (82%), but tree questions drop to 51%. The primary pattern is **premature recursive returns** and unhandled null leaf edge cases. Before writing code, write down the 2 base cases: 1) \`if not root: return ...\`, 2) leaf condition.`,
      suggested_actions: [
        { label: 'Review Tree Gaps in Weakness Hunter', action_type: 'navigate', payload: '/weaknesses' },
        { label: 'Try What-If Simulator for DSA', action_type: 'navigate', payload: '/what-if' },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  return {
    id: `coach_msg_${Date.now()}`,
    role: 'assistant',
    content: `Hello! I'm your Placement Coach. I track your resume claims, assessment answers, simulation rounds, and skill gaps to help you prioritize your preparation with maximum efficiency.\n\nAsk me about your time budgets ("I have 30 mins"), specific mistakes, or interview strategies!`,
    suggested_actions: [
      { label: 'Plan My Study Session Today', action_type: 'study_topic', payload: 'plan_today' },
      { label: 'Start Full AI Placement Simulation', action_type: 'simulate', payload: 'full' },
      { label: 'Explore What-If Scenarios', action_type: 'navigate', payload: '/what-if' },
    ],
    timestamp: new Date().toISOString(),
  };
}

function getDefaultSimulationReport(params: {
  simulation: any;
  targetRole: string;
}): SimulationReport {
  const sim = params.simulation || {};
  const rounds = sim.rounds || [];

  return {
    overall_score: sim.overall_score || 74,
    target_role: params.targetRole || 'Software Engineer',
    mode: sim.mode || 'full',
    completed_at: new Date().toISOString(),
    time_taken_total_minutes: 32,
    round_summaries: [
      {
        round_type: 'aptitude',
        title: 'Round 1: Quantitative & Logical Aptitude',
        score: 80,
        weight: 0.15,
        highlights: ['Strong speed in basic arithmetic', 'Clear deduction on verbal syllogisms'],
        gaps: ['Data Interpretation percentage calculations took 40% longer than average'],
      },
      {
        round_type: 'coding',
        title: 'Round 2: Algorithmic Problem Solving',
        score: 75,
        weight: 0.30,
        highlights: ['Optimal sliding window implementation', 'Clean modular variable structure'],
        gaps: ['Overlooked empty string edge condition on first submission'],
      },
      {
        round_type: 'technical',
        title: 'Round 3: Core Technical & CS Fundamentals',
        score: 72,
        weight: 0.25,
        highlights: ['Accurate SQL normalization explanation', 'Understands REST idempotency'],
        gaps: ['Struggled to articulate distributed locking and concurrency mitigations'],
      },
      {
        round_type: 'project',
        title: 'Round 4: Project Architecture Deep-Dive',
        score: 70,
        weight: 0.15,
        highlights: ['Good ownership of project tech stack selection'],
        gaps: ['Needs clearer articulation of database scalability limits and caching tier'],
      },
      {
        round_type: 'hr',
        title: 'Round 5: Behavioral & Cultural Fit',
        score: 82,
        weight: 0.15,
        highlights: ['Polished communication', 'Structured conflict resolution example'],
        gaps: ['Could tie personal strengths more specifically to target role requirements'],
      },
    ],
    technical_performance: {
      score: 74,
      strengths: ['DSA Two-Pointers & Sliding Window', 'Basic REST API Design', 'SQL Query Design'],
      weaknesses: ['Concurrency Synchronization', 'Graph Traversal Recursion Invariants'],
    },
    coding_performance: {
      score: 75,
      approach: 'Sliding window technique applied correctly with hash lookup.',
      efficiency: 'Time O(N) | Space O(K) where K is unique character set.',
    },
    communication_score: 80,
    project_knowledge_score: 70,
    hr_responses: {
      clarity_score: 85,
      structure_score: 80,
      key_feedback: 'Strong presence and articulate STAR storytelling.',
    },
    strong_areas: [
      'Algorithmic pattern recognition',
      'Verbal clarity and communication flow',
      'Database basics and SQL normalization',
    ],
    improvement_areas: [
      'Advanced concurrency & thread locking concepts',
      'Edge case verification before code submission',
      'Quantifying metric impact when presenting projects',
    ],
    critical_gaps: [
      'Graph DFS & Recursive Backtracking',
      'Distributed transaction isolation anomalies',
    ],
    recommended_next_steps: [
      'Complete the 45-minute Recursive Call Stack sprint in Weakness Hunter',
      'Review Mutex vs Semaphore race conditions in Operating Systems',
      'Retake the Technical Simulation round in 3 days',
    ],
    questions_to_revisit: [
      {
        question: 'How do you structure database queries to prevent N+1 bottlenecks in a high-traffic REST API?',
        round_type: 'technical',
        user_answer: 'Using eager loading and joins.',
        model_answer_highlights: 'Combine eager loading with foreign key indexes and batching query size to prevent memory overload.',
        key_takeaway: 'Mention both query mechanics and memory scale considerations.',
      },
    ],
    readiness_delta: +6.5,
  };
}
