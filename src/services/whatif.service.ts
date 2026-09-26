// ============================================================
// PlacementOS — What-If Placement Simulator Service Layer
// ============================================================

import { aiService } from './ai.service';
import type { WhatIfScenario, ReadinessScore } from '../types';

export const whatIfService = {
  async runScenario(params: {
    baseReadiness: ReadinessScore;
    adjustments: Record<string, number>;
    targetRole?: string;
  }): Promise<WhatIfScenario> {
    return aiService.generateWhatIfImpact(params);
  },

  getPresetScenarios(
    baseReadiness: ReadinessScore,
    targetRole: string = 'Software Engineer'
  ): Array<{ title: string; description: string; adjustments: Record<string, number> }> {
    return [
      {
        title: 'Master DSA & Problem Solving',
        description: 'Simulate the impact of elevating Data Structures & Algorithms from current level to 85%.',
        adjustments: { dsa: 85, problem_solving: 80 },
      },
      {
        title: 'Comprehensive CS Core Sprint',
        description: 'Simulate upgrading DBMS, Operating Systems & Networks to 80%.',
        adjustments: { dbms: 80, operating_systems: 80, computer_networks: 75 },
      },
      {
        title: 'Interview Communication & Behavioral Polish',
        description: 'Simulate boosting Communication and STAR interview readiness to 90%.',
        adjustments: { communication: 90, interview_skills: 85 },
      },
      {
        title: 'Full-Stack & System Design Deep Dive',
        description: 'Simulate boosting Web Dev and System Design to 85%.',
        adjustments: { web_development: 85, system_design: 80 },
      },
    ];
  },
};
