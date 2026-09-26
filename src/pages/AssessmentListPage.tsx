// ============================================================
// PlacementOS — Assessment List Page
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  PageHeader, Card, CardHeader, Spinner, PageLoader,
  EmptyState, StatusBadge,
} from '../components/ui';
import {
  ClipboardCheck, Plus, Play, Clock, Award,
  Brain, TrendingUp,
} from 'lucide-react';
import { assessmentService } from '../services/assessment.service';
import type { Assessment, SkillCategory, SKILL_CATEGORY_LABELS } from '../types';

const ASSESSMENT_CATEGORIES: { value: SkillCategory; label: string; icon: string }[] = [
  { value: 'dsa', label: 'DSA', icon: '🧮' },
  { value: 'dbms', label: 'DBMS', icon: '🗄️' },
  { value: 'operating_systems', label: 'Operating Systems', icon: '⚙️' },
  { value: 'computer_networks', label: 'Computer Networks', icon: '🌐' },
  { value: 'oop', label: 'OOP', icon: '🏗️' },
  { value: 'programming', label: 'Programming', icon: '💻' },
  { value: 'aptitude', label: 'Aptitude', icon: '🧠' },
  { value: 'communication', label: 'Communication', icon: '🗣️' },
];

export default function AssessmentListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'mixed'>('mixed');

  useEffect(() => {
    if (user) loadAssessments();
  }, [user]);

  const loadAssessments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await assessmentService.getUserAssessments(user.id);
      setAssessments(data);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (category: SkillCategory) => {
    if (!user) return;
    setCreating(category);
    try {
      const assessment = await assessmentService.create(user.id, category, selectedDifficulty, 5);
      navigate(`/assessment/${assessment.id}`);
    } catch (err) {
      console.error('Create error:', err);
    } finally {
      setCreating(null);
    }
  };

  if (loading) return <PageLoader message="Loading assessments..." />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Assessment Center"
        subtitle="Test your knowledge and verify your skills"
      />

      {/* Difficulty selector */}
      <div className="mb-6">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Difficulty</p>
        <div className="flex gap-2">
          {(['mixed', 'beginner', 'intermediate', 'advanced'] as const).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={`btn btn-sm ${selectedDifficulty === d ? 'btn-primary' : 'btn-secondary'}`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-4">Start New Assessment</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ASSESSMENT_CATEGORIES.map(cat => (
            <Card
              key={cat.value}
              className="cursor-pointer hover:border-accent transition-all"
              onClick={() => handleCreate(cat.value)}
            >
              <div className="text-center py-2">
                <span className="text-2xl mb-2 block">{cat.icon}</span>
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-text-muted mt-1">5 questions</p>
                {creating === cat.value && (
                  <div className="mt-2">
                    <Spinner size={16} className="text-accent mx-auto" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Past assessments */}
      <div>
        <h2 className="text-base font-semibold mb-4">Past Assessments</h2>
        {assessments.length > 0 ? (
          <div className="space-y-3">
            {assessments.map(assessment => (
              <Card
                key={assessment.id}
                className="cursor-pointer"
                onClick={() => navigate(`/assessment/${assessment.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                    <ClipboardCheck size={18} className="text-accent-light" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">{assessment.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {assessment.time_limit_minutes} min
                      </span>
                      <span>{assessment.total_questions} questions</span>
                      {assessment.is_adaptive && (
                        <span className="flex items-center gap-1 text-accent-light">
                          <Brain size={12} /> Adaptive
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={assessment.status} />
                  {assessment.status === 'ready' && (
                    <button className="btn btn-primary btn-sm">
                      <Play size={14} /> Start
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="No assessments yet"
            description="Choose a category above to take your first assessment."
          />
        )}
      </div>
    </div>
  );
}
