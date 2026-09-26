// ============================================================
// PlacementOS — Placement Twin Readiness Timeline Component
// ============================================================

import { useState, useEffect } from 'react';
import { timelineService } from '../services/timeline.service';
import type { TwinTimelinePoint } from '../types';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function PlacementTwinTimeline() {
  const [points, setPoints] = useState<TwinTimelinePoint[]>([]);

  useEffect(() => {
    setPoints(timelineService.getTimeline());
  }, []);

  if (points.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-bg-card border border-border text-center">
        <p className="text-sm text-text-muted">Not enough assessment history yet. Complete assessments or simulations to build your timeline.</p>
      </div>
    );
  }

  const latest = points[points.length - 1];
  const baseline = points[0];
  const totalGrowth = latest ? latest.readiness - baseline.readiness : 0;

  return (
    <div className="space-y-6">
      {/* Header Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Baseline Readiness</span>
          <p className="text-2xl font-bold text-text-primary mt-1">{baseline?.readiness || 0}%</p>
          <span className="text-xs text-text-muted">Day 1 Initial Scan</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Current Verified Twin</span>
          <p className="text-2xl font-bold text-accent-light mt-1">{latest?.readiness || 0}%</p>
          <span className="text-xs text-emerald-400 font-medium">+{totalGrowth}% Verified Progress</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Milestones Logged</span>
          <p className="text-2xl font-bold text-text-primary mt-1">{points.length}</p>
          <span className="text-xs text-text-muted">Historical Data Points</span>
        </div>
      </div>

      {/* Visual Timeline Path */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-border/80 space-y-8 my-4 ml-3">
        {points.map((pt, idx) => {
          const isLatest = idx === points.length - 1;
          return (
            <div key={pt.id} className="relative group">
              {/* Node Marker */}
              <div
                className={`absolute -left-[31px] sm:-left-[39px] top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
                  isLatest
                    ? 'bg-accent text-white ring-4 ring-accent/20 shadow-lg shadow-accent/30'
                    : 'bg-bg-tertiary border-2 border-border text-text-secondary'
                }`}
              >
                {idx + 1}
              </div>

              {/* Milestone Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-bg-card border border-border hover:border-accent/40 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${
                        pt.event_type === 'simulation'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : pt.event_type === 'assessment'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {pt.event_type}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-text-primary">{pt.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Calendar size={12} />
                      {pt.date}
                    </span>
                    <div className="px-3 py-1 rounded-lg bg-bg-secondary border border-border/80 text-sm font-bold text-accent-light">
                      {pt.readiness}%
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed">{pt.note}</p>

                {/* Categories Bar */}
                {pt.scores_by_category && Object.keys(pt.scores_by_category).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                    {Object.entries(pt.scores_by_category).map(([cat, score]) => (
                      <span
                        key={cat}
                        className="text-[11px] px-2 py-0.5 rounded bg-bg-secondary text-text-muted border border-border/50 font-mono"
                      >
                        {cat.toUpperCase()}: <strong className="text-text-primary">{score}%</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
