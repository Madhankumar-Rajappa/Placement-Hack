# PlacementOS 🚀
### Your AI Operating System for Placement Readiness

PlacementOS creates an AI-powered **"Placement Twin"** for every student, replacing generic study lists with an adaptive intelligence loop:

```
          ┌──────────────────────────────────────────────┐
          │               ASSESS                         │
          │     (MCQ + Live Coding Diagnostic)           │
          └──────────────────────┬───────────────────────┘
                                 ▼
          ┌──────────────────────────────────────────────┐
          │              DIAGNOSE                        │
          │   (Weakness Hunter & Root Cause Tree)        │
          └──────────────────────┬───────────────────────┘
                                 ▼
          ┌──────────────────────────────────────────────┐
          │               PREPARE                        │
          │   (Adaptive Daily Sprints & Time Budgets)    │
          └──────────────────────┬───────────────────────┘
                                 ▼
          ┌──────────────────────────────────────────────┐
          │              SIMULATE                        │
          │  (5-Round Placement Drive + AI Interview)    │
          └──────────────────────┬───────────────────────┘
                                 ▼
          ┌──────────────────────────────────────────────┐
          │              REASSESS                        │
          │     (Updated Placement Twin & Timeline)      │
          └──────────────────────────────────────────────┘
```

---

## 🌟 Phase 2 Core Features

### 1. AI Placement Simulator (`/simulation`)
- **Modes**: Quick Simulation (25m), Technical Simulation (35m), Full Placement Simulation (50m).
- **Round 1 — Adaptive Aptitude**: Quantitative, Logical Reasoning, Verbal, Data Interpretation with time calibration.
- **Round 2 — Algorithmic Coding Challenge**: Problem statements, constraints, Python/JS/C++ starter templates, test case simulator with approach, space/time complexity feedback.
- **Round 3 — Core Technical Interview**: Dynamic AI interviewer grounded in candidate resume, target role, and active gaps. Adapts and drills down into incomplete answers.
- **Round 4 — Resume Project Architecture Probe**: Deep-dive into claimed resume projects (concurrency, caching, database tradeoffs, scalability, security).
- **Round 5 — Behavioral & STAR HR Interview**: Behavioral evaluation, clarity, structured storytelling, confidence indicators.
- **Speech & Voice Support**: Web Speech API integration (Microphone Speech-to-Text + Voice synthesis) with **100% reliable text fallback**.
- **Post-Simulation Diagnostic Report**: Multi-round rubric scoring, radar comparison, takeaways, and questions to revisit.

### 2. Weakness Hunter (`/weaknesses`)
- Multi-modal root-cause diagnostic pattern engine across resume claims, test answers, coding submissions, and interview transcripts.
- Correlates sub-topic performance (e.g. *Array 82%, Linked List 77%, Tree 51%, Graph 38%* $\rightarrow$ *"State invariant & recursive call-stack unwinding gap"*).
- Displays: **ROOT CAUSE $\rightarrow$ Evidence $\rightarrow$ Recommended Intervention $\rightarrow$ 1-Click Verification Test**.

### 3. What-If Placement Simulator (`/what-if`)
- Interactive skill mastery slider playground.
- Calculates **"Preparation Readiness Impact"** (clearly labeled: *SIMULATED SCENARIO — NOT AN EMPLOYMENT PREDICTION*).
- Sensitivity table showcasing the **Top 3 Highest ROI Study Areas** (impact points per study hour).

### 4. Adaptive Daily Plan Update Engine (`/plan`)
- Dynamic recalculation loop: de-emphasizes mastered topics and shifts focus to active gaps from recent simulations.

### 5. Placement Twin Timeline (`/progress`)
- Visual historical progression of Placement Twin readiness scores (Day 1: 42%, Day 4: 51%, Day 7: 64%, Day 14: 71%) backed by real assessment records.

### 6. AI Coach Assistant (Global Drawer)
- Twin-aware assistant accessible across all views with quick time-budget queries (*"I have 45 minutes today, what should I study?"*) and 1-click action shortcuts.

---

## 🗄️ Database Architecture (Supabase PostgreSQL)

### Phase 1 Tables:
1. `profiles`: Candidate details, college, target role, graduation year.
2. `resumes`: Parsed resume text and extracted structured skills.
3. `jobs`: Target job description, requirements, priority weights.
4. `skills` & `student_skills`: Verified vs Claimed skill matrix.
5. `skill_gaps`: Calculated gaps with priority levels.
6. `assessments`, `assessment_questions`, `assessment_attempts`, `assessment_answers`.
7. `preparation_plans`, `preparation_tasks`, `progress_records`.

### Phase 2 Tables Added:
8. `simulations`: Multi-round drive sessions, status, mode, score, report JSON.
9. `simulation_rounds`: Round metadata, time limits, rubric scores.
10. `simulation_questions`: Questions, starter code, context data.
11. `simulation_answers`: Code submissions, interview transcripts, rubric evaluations.
12. `weakness_insights`: Root-cause patterns, evidence arrays, verification tests.
13. `what_if_scenarios`: Baseline vs projected readiness models.
14. `twin_timeline`: Historical readiness progression timestamps.
15. `coach_conversations`: Chat transcripts and suggested action payloads.

*Full SQL schema with RLS policies is available in `supabase/schema.sql`.*

---

## 🚀 Quickstart & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AI_PROVIDER=gemini # or groq / fallback
VITE_GEMINI_API_KEY=your-key
```
*(Note: PlacementOS includes a local engine with rich structured fallbacks, running out-of-the-box even without external API keys).*

### 3. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:5173`.

### 4. Run Production Build & Type Check
```bash
npx tsc --noEmit
npm run build
```

---

## 🎬 3-Minute Hackathon Demo Script

1. **Login & Placement Twin 360** (`/dashboard`):
   - View the Placement Twin card, Verified Readiness Index (54%), and radar chart.
2. **Resume & Target Job Gap** (`/skill-gap`):
   - Review Claimed vs Proven skills and target job requirement deltas.
3. **Launch AI Placement Simulator** (`/simulation`):
   - Select **Quick Simulation** or **Full Placement Simulation**.
   - Answer Aptitude questions $\rightarrow$ Submit Coding solution.
   - Speak or type into the **Technical Interviewer** $\rightarrow$ Observe AI adaptive follow-up questioning.
   - Complete drive $\rightarrow$ Inspect comprehensive rubric report.
4. **Discover Root Causes in Weakness Hunter** (`/weaknesses`):
   - View synthesized root-cause patterns with evidence.
   - Take the **1-Click Verification Test** $\rightarrow$ Watch the gap resolve.
5. **Simulate Scenarios in What-If Engine** (`/what-if`):
   - Adjust DSA and System Design sliders $\rightarrow$ View projected readiness impact and highest ROI study hours.
6. **Open Global AI Coach** (Floating icon):
   - Click *"I have 45 minutes today"* $\rightarrow$ Receive an optimized minute-by-minute sprint plan.

---

## 🔒 Security & Quality Standards
- **Zero API Key Leakage**: Client only uses public anon keys; sensitive AI calls route through Edge Functions.
- **Row Level Security (RLS)** enabled across all database tables.
- **Strict TypeScript Validation**: All AI outputs pass through validated TypeScript interfaces with fallback guarantees.
- **Accessible & Responsive**: Clean desktop + mobile experience with accessible color contrasts.
