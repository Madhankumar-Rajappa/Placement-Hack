// ============================================================
// PlacementOS — AI Service Edge Function
// ============================================================
// Deploy to Supabase Edge Functions:
// supabase functions deploy ai-service
//
// Set secrets:
// supabase secrets set AI_API_KEY=your-key AI_PROVIDER=openai AI_MODEL=gpt-4
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    const AI_PROVIDER = Deno.env.get("AI_PROVIDER") || "openai";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "gpt-4";
    const AI_BASE_URL = Deno.env.get("AI_BASE_URL") || "https://api.openai.com/v1";

    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt = "";
    let systemPrompt = "You are PlacementOS AI, an expert career advisor and technical assessor for placement preparation. Always respond with valid JSON.";

    switch (action) {
      case "analyze_resume":
        prompt = `Analyze this resume text and extract structured information. Return JSON with these fields:
name, education (array of {degree, college, year, cgpa}), skills (array of {name, category, proficiency}),
programming_languages (array), frameworks (array), tools (array),
projects (array of {name, description, technologies}),
internships (array of {company, role, duration, description}),
certifications (array), achievements (array), experience_years (number), soft_skills (array).

Categories must be one of: programming, dsa, algorithms, database, dbms, operating_systems, computer_networks, oop, system_design, web_development, cloud, devops, ai_ml, communication, problem_solving, aptitude, interview_skills, project_knowledge.
Proficiency must be: beginner, intermediate, or advanced.

Resume text:
${data.text}`;
        break;

      case "analyze_job":
        prompt = `Analyze this job description and extract structured requirements. Return JSON with:
role (string), company (string),
required_skills (array of {name, category, importance, level}),
preferred_skills (array of {name, category, level}),
programming_languages (array), frameworks (array),
cs_fundamentals (array), soft_skills (array),
experience_requirements (string), responsibilities (array of strings).

importance must be: required, preferred, or nice_to_have.
level is 0-100 indicating required proficiency.

Job description:
${data.description}`;
        break;

      case "generate_questions":
        const weakTopicStr = data.weak_topics?.length
          ? `Focus more on these weak areas: ${data.weak_topics.join(", ")}`
          : "";
        prompt = `Generate ${data.count || 5} MCQ questions for ${data.category} assessment at ${data.difficulty} difficulty level.
${weakTopicStr}

Return a JSON array where each element has:
question (string), topic (string), difficulty (easy|medium|hard),
options (array of 4 strings), correct_answer (string matching one option exactly),
explanation (string), skill_category (string).`;
        break;

      case "evaluate_assessment":
        prompt = `Evaluate this assessment performance. Questions and answers:
${JSON.stringify(data.questions, null, 2)}

Return JSON with:
overall_feedback (string), 
topic_performance (array of {topic, score, total, accuracy, feedback}),
strengths (array of strings), weaknesses (array of strings),
root_causes (array of strings explaining WHY the student struggles),
recommended_next_steps (array of actionable strings).`;
        break;

      case "generate_plan":
        prompt = `Create a study plan for a student targeting ${data.targetRole}.
Skill gaps: ${JSON.stringify(data.skillGaps)}
Available hours per day: ${data.availableHours}
Level: ${data.level}

Return JSON with:
title (string), description (string), duration_days (number),
tasks (array of {title, skill, description, duration_minutes, difficulty, task_type, priority, day_number, order_index}).
task_type: learn|practice|assess|review|project
priority: high|medium|low`;
        break;

      case "generate_insight":
        prompt = `Based on this student data, provide a brief personalized insight:
${JSON.stringify(data)}
Return JSON with: insight (string with 2-3 sentences of actionable advice).`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Call AI API
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    // Parse and validate JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    return new Response(
      JSON.stringify(parsedContent),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI service error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "AI service error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
