// ============================================================
// PlacementOS — What-If Placement Simulator Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { whatIfService } from '../services/whatif.service';
import type { WhatIfScenario, ReadinessScore } from '../types';
import {
  Sliders,
  Sparkles,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react';

export default function WhatIfPage() {
  const { profile } = useAuth();

  const defaultBaseReadiness: ReadinessScore = {
    overall: 54,
    components: [
      { category: 'dsa', label: 'DSA & Problem Solving', score: 55, weight: 0.25, weighted_score: 13.75 },
      { category: 'operating_systems', label: 'Operating Systems & Concurrency', score: 45, weight: 0.15, weighted_score: 6.75 },
      { category: 'dbms', label: 'Database & SQL Normalization', score: 50, weight: 0.15, weighted_score: 7.5 },
      { category: 'web_development', label: 'Web & System Architecture', score: 60, weight: 0.15, weighted_score: 9.0 },
      { category: 'communication', label: 'Communication & STAR Interview', score: 65, weight: 0.15, weighted_score: 9.75 },
      { category: 'aptitude', label: 'Aptitude & Data Interpretation', score: 50, weight: 0.15, weighted_score: 7.5 },
    ],
    explanation: 'Current verified Placement Twin baseline score.',
    last_updated: new Date().toISOString(),
  };

  const [adjustments, setAdjustments] = useState<Record<string, number>>({
    dsa: 75,
    operating_systems: 65,
    dbms: 70,
    web_development: 75,
    communication: 80,
    aptitude: 65,
  });

  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runCalculation();
  }, [adjustments]);

  const runCalculation = async () => {
    setLoading(true);
    try {
      const res = await whatIfService.runScenario({
        baseReadiness: defaultBaseReadiness,
        adjustments,
        targetRole: profile?.target_role || 'Software Engineer',
      });
      setScenario(res);
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (skill: string, val: number) => {
    setAdjustments(prev => ({ ...prev, [skill]: val }));
  };

  const applyPreset = (presetAdjustments: Record<string, number>) => {
    setAdjustments(prev => ({ ...prev, ...presetAdjustments }));
  };

  const presets = whatIfService.getPresetScenarios(defaultBaseReadiness, profile?.target_role);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wider mb-1">
            <span>Predictive Modeling</span>
            <span>/</span>
            <span className="text-accent-light">What-If Simulator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            What-If Placement Simulator
            <span className="text-xs px-2.5 py-1 rounded-full bg-accent/20 text-accent-light border border-accent/30 font-semibold">
              Readiness Trajectory
            </span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Model how targeted skill improvements impact your Preparation Readiness Index and discover your highest ROI study areas.
          </p>
        </div>

        <button
          onClick={() => {
            setAdjustments({
              dsa: 55,
              operating_systems: 45,
              dbms: 50,
              web_development: 60,
              communication: 65,
              aptitude: 50,
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-bg-card hover:bg-bg-tertiary border border-border text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
        >
          <RotateCcw size={14} />
          <span>Reset to Current Baseline</span>
        </button>
      </div>

      {/* Prominent Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 flex items-start gap-3">
        <AlertCircle size={18} className="text-accent-light flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-text-secondary">
          <strong className="text-text-primary font-bold">SIMULATED SCENARIO ONLY:</strong> This tool calculates preparation readiness metrics and skill sensitivity based on curriculum weighting. It does <strong>not</strong> make hiring predictions or employment guarantees.
        </div>
      </div>

      {/* Projection Metric Comparison Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Baseline Card */}
        <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-2">
          <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Current Verified Twin</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            {defaultBaseReadiness.overall}%
          </div>
          <p className="text-xs text-text-secondary">Baseline score based on current assessments.</p>
        </div>

        {/* Projected Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-bg-card via-bg-card to-accent/15 border border-accent shadow-xl shadow-accent/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-accent-light font-bold uppercase tracking-wider">Projected Readiness</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              +{scenario ? scenario.delta : 0}%
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-accent-light">
            {scenario ? scenario.projected_readiness.overall : defaultBaseReadiness.overall}%
          </div>
          <p className="text-xs text-text-secondary">Simulated Preparation Readiness Index.</p>
        </div>

        {/* Target Role Sensitivity */}
        <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-2">
          <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Target Profile</span>
          <div className="text-lg font-bold text-text-primary truncate">
            {profile?.target_role || 'Software Engineer'}
          </div>
          <p className="text-xs text-text-muted">
            DSA carries 25% weight; CS Core & System Design carry 30% aggregate weight.
          </p>
        </div>
      </div>

      {/* Main Interactive Controls & ROI Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sliders Panel */}
        <div className="p-6 sm:p-7 rounded-2xl bg-bg-card border border-border space-y-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Sliders size={18} className="text-accent-light" /> Adjust Mastery Levels
            </h3>
            <span className="text-xs text-text-muted">Move sliders to simulate gains</span>
          </div>

          <div className="space-y-5">
            {defaultBaseReadiness.components.map((comp) => {
              const currentVal = adjustments[comp.category] ?? comp.score;
              const isIncreased = currentVal > comp.score;

              return (
                <div key={comp.category} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-text-primary">{comp.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-[11px]">Base: {comp.score}%</span>
                      <span className={`px-2 py-0.5 rounded font-mono font-bold ${isIncreased ? 'bg-accent/20 text-accent-light' : 'bg-bg-secondary text-text-secondary'}`}>
                        {currentVal}%
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={currentVal}
                    onChange={(e) => handleSliderChange(comp.category, parseInt(e.target.value))}
                    className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Top ROI Skills & Presets */}
        <div className="space-y-6">
          {/* Top ROI Skills Card */}
          <div className="p-6 sm:p-7 rounded-2xl bg-bg-card border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Zap size={18} className="text-amber-400" /> Top 3 High ROI Study Areas
              </h3>
              <span className="text-xs text-text-muted">Impact per study hour</span>
            </div>

            <div className="space-y-3">
              {scenario?.top_roi_skills.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-bg-secondary border border-border space-y-2 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent-light text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-text-primary">{item.skill}</h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      +{item.readiness_impact_points}% Readiness
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">{item.reason}</p>

                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                    <span>Est. Study Investment: ~{item.estimated_study_hours} hrs</span>
                    <span className="font-semibold text-accent-light">Efficiency: {item.roi_score} pts/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Scenario Presets */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border space-y-4">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              1-Click Scenario Presets:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset.adjustments)}
                  className="p-3.5 rounded-xl bg-bg-secondary hover:bg-accent/15 border border-border hover:border-accent/40 text-left transition-all space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary group-hover:text-accent-light">
                      {preset.title}
                    </span>
                    <ArrowRight size={13} className="text-text-muted group-hover:text-accent-light" />
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
