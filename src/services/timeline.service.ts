// ============================================================
// PlacementOS — Placement Twin Timeline Service Layer
// ============================================================

import type { TwinTimelinePoint } from '../types';

const TIMELINE_KEY = 'placementos_twin_timeline';

export const timelineService = {
  getTimeline(): TwinTimelinePoint[] {
    try {
      const data = localStorage.getItem(TIMELINE_KEY);
      if (data) {
        const list: TwinTimelinePoint[] = JSON.parse(data);
        if (list && list.length > 0) return list;
      }
    } catch {
      // ignore
    }

    // Default historical baseline from initial diagnostic
    const baseline: TwinTimelinePoint[] = [
      {
        id: 'time_pt_1',
        date: 'Day 1 (Baseline Assessment)',
        timestamp: Date.now() - 14 * 86400000,
        readiness: 42,
        event_type: 'baseline',
        title: 'Initial Profile & Resume Scan',
        note: 'Baseline diagnostic established. Identified gaps in Recursive Algorithms and OS Deadlocks.',
        scores_by_category: { dsa: 40, dbms: 50, operating_systems: 45, web_development: 60, communication: 55 },
      },
      {
        id: 'time_pt_2',
        date: 'Day 4 (Core Assessment)',
        timestamp: Date.now() - 10 * 86400000,
        readiness: 51,
        event_type: 'assessment',
        title: 'Completed DSA Diagnostic Test',
        note: 'Scored 75% on linear data structures. Verified Array & Hash Table proficiency.',
        scores_by_category: { dsa: 55, dbms: 50, operating_systems: 45, web_development: 60, communication: 55 },
      },
      {
        id: 'time_pt_3',
        date: 'Day 7 (Technical Simulation)',
        timestamp: Date.now() - 7 * 86400000,
        readiness: 64,
        event_type: 'simulation',
        title: 'Full Placement Simulation (Round 1-3)',
        note: 'Passed Aptitude (80%) and Coding (75%). Elevated overall interview confidence.',
        scores_by_category: { dsa: 65, dbms: 65, operating_systems: 60, web_development: 70, communication: 70 },
      },
      {
        id: 'time_pt_4',
        date: 'Day 14 (Latest Verified Twin)',
        timestamp: Date.now(),
        readiness: 71,
        event_type: 'assessment',
        title: 'Weakness Hunter Sprint Complete',
        note: 'Resolved Recursive Call-Stack root cause. Reassessed graph mastery.',
        scores_by_category: { dsa: 75, dbms: 70, operating_systems: 65, web_development: 75, communication: 75 },
      },
    ];

    try {
      localStorage.setItem(TIMELINE_KEY, JSON.stringify(baseline));
    } catch {
      // ignore
    }

    return baseline;
  },

  recordPoint(point: Omit<TwinTimelinePoint, 'id' | 'timestamp'>): TwinTimelinePoint[] {
    const list = this.getTimeline();
    const newPoint: TwinTimelinePoint = {
      ...point,
      id: `pt_${Date.now()}`,
      timestamp: Date.now(),
    };
    list.push(newPoint);
    try {
      localStorage.setItem(TIMELINE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
    return list;
  },
};
