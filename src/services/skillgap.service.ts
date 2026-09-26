// ============================================================
// PlacementOS — Skill Gap Service
// ============================================================

import { supabase } from '../lib/supabase';
import type {
  SkillGap,
  StudentSkill,
  JobSkill,
  ResumeAnalysis,
  JobAnalysis,
  ReadinessScore,
  ReadinessComponent,
  SkillCategory,
  SKILL_CATEGORY_LABELS,
} from '../types';

export const skillGapService = {
  async generateGaps(
    userId: string,
    jobId: string,
    resumeAnalysis: ResumeAnalysis | null,
    jobAnalysis: JobAnalysis | null,
    assessmentScores: Map<string, number>
  ): Promise<SkillGap[]> {
    if (!jobAnalysis) return [];

    // Clear existing gaps for this job
    await supabase
      .from('skill_gaps')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);

    const gaps: Omit<SkillGap, 'id' | 'created_at' | 'updated_at' | 'skill'>[] = [];

    for (const reqSkill of jobAnalysis.required_skills) {
      // Find student's level from resume claims
      let currentLevel = 0;
      if (resumeAnalysis) {
        const matchingSkill = resumeAnalysis.skills.find(
          s => s.name.toLowerCase() === reqSkill.name.toLowerCase() ||
               s.category === reqSkill.category
        );
        if (matchingSkill) {
          currentLevel = matchingSkill.proficiency === 'advanced' ? 80 :
                         matchingSkill.proficiency === 'intermediate' ? 55 : 30;
        }
      }

      // Override with assessment scores if available
      const assessmentScore = assessmentScores.get(reqSkill.category) ??
                              assessmentScores.get(reqSkill.name.toLowerCase());
      if (assessmentScore !== undefined) {
        currentLevel = assessmentScore;
      }

      const gapScore = Math.max(0, reqSkill.level - currentLevel);
      let priority: SkillGap['priority'] = 'low';
      if (gapScore >= 40) priority = 'critical';
      else if (gapScore >= 25) priority = 'high';
      else if (gapScore >= 10) priority = 'medium';

      if (gapScore > 0) {
        gaps.push({
          user_id: userId,
          job_id: jobId,
          skill_id: reqSkill.name, // Using name as fallback for skill_id
          current_level: currentLevel,
          required_level: reqSkill.level,
          gap_score: gapScore,
          priority,
          reason: currentLevel === 0
            ? `No evidence of ${reqSkill.name} skills found. This is a ${reqSkill.importance} skill for the target role.`
            : assessmentScore !== undefined
            ? `Assessment score (${assessmentScore}%) is below the required level (${reqSkill.level}%). Focus on improving through targeted practice.`
            : `Resume claims ${reqSkill.name} but it has not been verified through assessment. Current estimated level is ${currentLevel}%.`,
          recommended_action: gapScore >= 40
            ? `Start with ${reqSkill.name} fundamentals and build up systematically. Allocate at least 1 hour daily.`
            : gapScore >= 25
            ? `Focus on intermediate ${reqSkill.name} concepts and practice problems regularly.`
            : `Review advanced ${reqSkill.name} topics and attempt harder problems.`,
        });
      }
    }

    if (gaps.length > 0) {
      const { data, error } = await supabase
        .from('skill_gaps')
        .insert(gaps)
        .select();

      if (error) {
        console.error('Error saving skill gaps:', error);
        // Return unsaved gaps with placeholder IDs for display
        return gaps.map((g, i) => ({
          ...g,
          id: `temp-${i}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as SkillGap[];
      }
      return data || [];
    }

    return [];
  },

  async getGaps(userId: string, jobId?: string): Promise<SkillGap[]> {
    let query = supabase
      .from('skill_gaps')
      .select('*')
      .eq('user_id', userId)
      .order('gap_score', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  calculateReadiness(
    gaps: SkillGap[],
    assessmentScores: Map<string, number>,
    resumeAnalysis: ResumeAnalysis | null
  ): ReadinessScore {
    const weights: Record<string, { weight: number; label: string; categories: string[] }> = {
      dsa: { weight: 0.20, label: 'DSA', categories: ['dsa', 'algorithms'] },
      cs_fundamentals: { weight: 0.20, label: 'CS Fundamentals', categories: ['dbms', 'operating_systems', 'computer_networks'] },
      programming: { weight: 0.15, label: 'Programming', categories: ['programming', 'oop'] },
      projects: { weight: 0.15, label: 'Projects', categories: ['web_development', 'project_knowledge'] },
      communication: { weight: 0.10, label: 'Communication', categories: ['communication'] },
      aptitude: { weight: 0.10, label: 'Aptitude', categories: ['aptitude', 'problem_solving'] },
      interview_skills: { weight: 0.10, label: 'Interview Skills', categories: ['interview_skills'] },
    };

    const components: ReadinessComponent[] = [];

    for (const [key, config] of Object.entries(weights)) {
      let score = 30; // Base score

      // Check assessment scores
      for (const cat of config.categories) {
        const assessScore = assessmentScores.get(cat);
        if (assessScore !== undefined) {
          score = Math.max(score, assessScore);
        }
      }

      // Boost from resume claims (but less than assessment)
      if (resumeAnalysis) {
        const hasResumeEvidence = resumeAnalysis.skills.some(
          s => config.categories.includes(s.category)
        );
        if (hasResumeEvidence && score < 50) {
          score = Math.max(score, 45); // Resume claim gives base 45
        }
      }

      // Reduce for gaps
      const relatedGaps = gaps.filter(g => {
        const gapCat = g.skill_id?.toLowerCase() || '';
        return config.categories.some(c => gapCat.includes(c)) ||
               config.label.toLowerCase().includes(gapCat);
      });

      if (relatedGaps.length > 0) {
        const avgGap = relatedGaps.reduce((sum, g) => sum + g.gap_score, 0) / relatedGaps.length;
        score = Math.max(10, score - avgGap * 0.5);
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
      explanationParts.push(`Strong in: ${strong.join(', ')}.`);
    }
    if (weak.length > 0) {
      explanationParts.push(`Needs improvement: ${weak.join(', ')}.`);
    }
    if (gaps.length > 0) {
      const criticalGaps = gaps.filter(g => g.priority === 'critical');
      if (criticalGaps.length > 0) {
        explanationParts.push(`${criticalGaps.length} critical skill gap(s) detected.`);
      }
    }

    return {
      overall: Math.min(100, Math.max(0, overall)),
      components,
      explanation: explanationParts.join(' ') || 'Upload your resume and take assessments to get a detailed readiness analysis.',
      last_updated: new Date().toISOString(),
    };
  },
};
