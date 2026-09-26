// ============================================================
// PlacementOS — Skill Gap Service (Supabase + Local Cache)
// ============================================================

import { supabase } from '../lib/supabase';
import type {
  SkillGap,
  ResumeAnalysis,
  JobAnalysis,
  ReadinessScore,
  ReadinessComponent,
  SkillCategory,
} from '../types';

const LOCAL_GAPS_KEY = 'placementos_skill_gaps';

function getLocalGaps(userId: string): SkillGap[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_GAPS_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGaps(userId: string, gaps: SkillGap[]): void {
  try {
    localStorage.setItem(`${LOCAL_GAPS_KEY}_${userId}`, JSON.stringify(gaps));
  } catch {
    // ignore
  }
}

export const skillGapService = {
  async generateGaps(
    userId: string,
    jobId: string,
    resumeAnalysis: ResumeAnalysis | null,
    jobAnalysis: JobAnalysis | null,
    assessmentScores: Map<string, number>
  ): Promise<SkillGap[]> {
    if (!jobAnalysis || !jobAnalysis.required_skills) return [];

    const gaps: SkillGap[] = [];

    for (const reqSkill of jobAnalysis.required_skills) {
      const skillName = reqSkill.name;
      const category = reqSkill.category as SkillCategory;
      const requiredLevel = reqSkill.level || 75;

      let currentLevel = 0;
      let isVerified = false;
      let isClaimed = false;

      // 1. Check verified assessment scores
      const assessScore = assessmentScores.get(category) ??
                          assessmentScores.get(skillName.toLowerCase()) ??
                          assessmentScores.get(category.replace('_', ' '));

      if (assessScore !== undefined) {
        currentLevel = assessScore;
        isVerified = true;
      }

      // 2. Check resume claimed skills if no assessment or if resume claim is higher
      if (resumeAnalysis) {
        const lowerName = skillName.toLowerCase();
        const matchingSkill = resumeAnalysis.skills?.find(
          s => s.name.toLowerCase().includes(lowerName) ||
               lowerName.includes(s.name.toLowerCase()) ||
               s.category === category
        );

        const inLangs = resumeAnalysis.programming_languages?.some(l => lowerName.includes(l.toLowerCase()));
        const inFrameworks = resumeAnalysis.frameworks?.some(f => lowerName.includes(f.toLowerCase()));
        const inTools = resumeAnalysis.tools?.some(t => lowerName.includes(t.toLowerCase()));

        if (matchingSkill || inLangs || inFrameworks || inTools) {
          isClaimed = true;
          if (!isVerified) {
            const prof = matchingSkill?.proficiency || 'intermediate';
            currentLevel = prof === 'advanced' ? 75 : prof === 'intermediate' ? 55 : 35;
          }
        }
      }

      const gapScore = Math.max(0, requiredLevel - currentLevel);
      let priority: SkillGap['priority'] = 'low';
      if (gapScore >= 35) priority = 'critical';
      else if (gapScore >= 20) priority = 'high';
      else if (gapScore >= 10) priority = 'medium';

      let reason = '';
      let recommendedAction = '';

      if (isVerified) {
        if (gapScore > 0) {
          reason = `Diagnostic score (${currentLevel}%) is below target threshold (${requiredLevel}%). Core concept edge-cases and optimization speed need reinforcement.`;
          recommendedAction = `Review advanced ${skillName} patterns, solve 5-10 targeted medium-difficulty problems, and retake the diagnostic assessment.`;
        } else {
          reason = `Skill verified at ${currentLevel}% (Exceeds required ${requiredLevel}%). Excellent foundation.`;
          recommendedAction = `Maintain readiness with weekly spaced-repetition refreshers.`;
        }
      } else if (isClaimed) {
        reason = `Claimed on resume (Estimated ~${currentLevel}%), but unverified by diagnostic tests. Interviewers rigorously probe claimed skills.`;
        recommendedAction = `Take the 5-minute ${skillName} verification assessment to validate your proficiency and boost your Placement Twin score.`;
      } else {
        reason = `No evidence found on resume or assessments. Required at ${requiredLevel}% for ${jobAnalysis.role || 'the target role'}.`;
        recommendedAction = `Start foundational study for ${skillName}. Focus on fundamental definitions, core implementations, and practical interview questions.`;
      }

      gaps.push({
        id: `gap_${jobId}_${category}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        job_id: jobId,
        skill_id: skillName,
        current_level: currentLevel,
        required_level: requiredLevel,
        gap_score: gapScore,
        priority,
        reason,
        recommended_action: recommendedAction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Sort by priority and gap score descending
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    gaps.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      return pDiff !== 0 ? pDiff : b.gap_score - a.gap_score;
    });

    saveLocalGaps(userId, gaps);

    // Try saving to Supabase if table exists
    try {
      if (supabase) {
        await supabase.from('skill_gaps').delete().eq('user_id', userId).eq('job_id', jobId);
        await supabase.from('skill_gaps').insert(
          gaps.map(g => ({
            user_id: userId,
            job_id: jobId,
            skill_id: g.skill_id,
            current_level: g.current_level,
            required_level: g.required_level,
            gap_score: g.gap_score,
            priority: g.priority,
            reason: g.reason,
            recommended_action: g.recommended_action,
          }))
        );
      }
    } catch {
      // ignore
    }

    return gaps;
  },

  async getGaps(userId: string, jobId?: string): Promise<SkillGap[]> {
    try {
      if (supabase) {
        let query = supabase
          .from('skill_gaps')
          .select('*')
          .eq('user_id', userId)
          .order('gap_score', { ascending: false });

        if (jobId) {
          query = query.eq('job_id', jobId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          saveLocalGaps(userId, data as SkillGap[]);
          return data as SkillGap[];
        }
      }
    } catch {
      // ignore
    }

    const local = getLocalGaps(userId);
    if (jobId) {
      return local.filter(g => g.job_id === jobId);
    }
    return local;
  },

  calculateReadiness(
    gaps: SkillGap[],
    assessmentScores: Map<string, number>,
    resumeAnalysis: ResumeAnalysis | null
  ): ReadinessScore {
    const weights: Record<string, { weight: number; label: string; categories: string[] }> = {
      dsa: { weight: 0.25, label: 'Data Structures & Algorithms', categories: ['dsa', 'algorithms'] },
      cs_fundamentals: { weight: 0.20, label: 'CS Fundamentals (OS, DBMS, Networks)', categories: ['dbms', 'operating_systems', 'computer_networks'] },
      programming: { weight: 0.15, label: 'Core Programming & OOP', categories: ['programming', 'oop'] },
      projects: { weight: 0.15, label: 'System Design & Projects', categories: ['web_development', 'system_design', 'project_knowledge'] },
      aptitude: { weight: 0.15, label: 'Quantitative & Logical Aptitude', categories: ['aptitude', 'problem_solving'] },
      communication: { weight: 0.10, label: 'Communication & STAR Interviewing', categories: ['communication', 'interview_skills'] },
    };

    const components: ReadinessComponent[] = [];

    for (const [key, config] of Object.entries(weights)) {
      let score = 35; // Base score

      // Check assessment scores
      for (const cat of config.categories) {
        const assessScore = assessmentScores.get(cat);
        if (assessScore !== undefined) {
          score = Math.max(score, assessScore);
        }
      }

      // Boost from resume claims
      if (resumeAnalysis) {
        const hasResumeEvidence = resumeAnalysis.skills?.some(s =>
          config.categories.includes(s.category)
        );
        if (hasResumeEvidence && score < 55) {
          score = Math.max(score, 50);
        }
      }

      // Penalize for gaps
      const relatedGaps = gaps.filter(g => {
        const gapCat = g.skill_id?.toLowerCase() || '';
        return config.categories.some(c => gapCat.includes(c)) ||
               config.label.toLowerCase().includes(gapCat);
      });

      if (relatedGaps.length > 0) {
        const avgGap = relatedGaps.reduce((sum, g) => sum + g.gap_score, 0) / relatedGaps.length;
        score = Math.max(15, score - avgGap * 0.4);
      }

      score = Math.round(Math.min(100, Math.max(0, score)));

      components.push({
        category: config.categories[0] as SkillCategory,
        label: config.label,
        score,
        weight: config.weight,
        weighted_score: Math.round(score * config.weight),
      });
    }

    const overall = Math.round(
      components.reduce((sum, c) => sum + c.weighted_score, 0)
    );

    const explanationParts: string[] = [];
    const strong = components.filter(c => c.score >= 70).map(c => c.label);
    const weak = components.filter(c => c.score < 50).map(c => c.label);

    if (strong.length > 0) {
      explanationParts.push(`Strengths: ${strong.join(', ')}.`);
    }
    if (weak.length > 0) {
      explanationParts.push(`Priority focus: ${weak.join(', ')}.`);
    }
    if (gaps.length > 0) {
      const criticalGaps = gaps.filter(g => g.priority === 'critical');
      if (criticalGaps.length > 0) {
        explanationParts.push(`${criticalGaps.length} critical requirement gap(s) must be closed before drive.`);
      }
    }

    return {
      overall: Math.min(100, Math.max(0, overall)),
      components,
      explanation: explanationParts.join(' ') || 'Upload your resume and complete assessments to calibrate your Placement Twin.',
      last_updated: new Date().toISOString(),
    };
  },
};
