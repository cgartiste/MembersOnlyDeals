import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AIProvider = "claude" | "gemini" | "groq" | "openrouter";

export const AI_MODELS: Record<AIProvider, Array<{ id: string; label: string; free?: boolean }>> = {
  claude: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (rapide)" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (recommandé)" },
    { id: "llama3-8b-8192", label: "Llama 3 8B (ultra rapide)" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    { id: "gemma2-9b-it", label: "Gemma 2 9B" },
  ],
  openrouter: [
    { id: "meta-llama/llama-3.3-8b-instruct:free", label: "Llama 3.3 8B (Gratuit)", free: true },
    { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Gratuit)", free: true },
    { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Gratuit)", free: true },
    { id: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B" },
    { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  ],
};

/* ── Core callers ── */

async function callClaude(prompt: string, maxTokens = 4096, model = "claude-sonnet-4-6"): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith("your-")) throw new Error("ANTHROPIC_API_KEY non configurée.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json() as { content: Array<{ text: string }> };
  return json.content[0]?.text ?? "";
}

async function callGemini(prompt: string, maxTokens = 4096, model = "gemini-2.0-flash", retries = 3): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("your-")) throw new Error("GEMINI_API_KEY non configurée.");
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } }),
      },
    );
    if (res.status === 429) {
      const body = await res.text();
      const match = body.match(/retry in ([\d.]+)s/i);
      const waitSec = match ? Math.ceil(parseFloat(match[1])) + 2 : Math.pow(2, attempt + 1) * 5;
      if (attempt < retries) { await new Promise(r => setTimeout(r, waitSec * 1_000)); continue; }
      throw new Error(`Gemini [429]: Quota dépassé. Réessayez dans ${waitSec}s.`);
    }
    if (!res.ok) throw new Error(`Gemini API [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }> };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
  throw new Error("Gemini: max retries exceeded");
}

async function callGroq(prompt: string, maxTokens = 4096, model = "llama-3.3-70b-versatile"): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.startsWith("your-")) throw new Error("GROQ_API_KEY non configurée. Obtenir sur console.groq.com/keys");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`Groq API [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json() as { choices?: Array<{ message?: { content: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callOpenRouter(prompt: string, maxTokens = 4096, model = "meta-llama/llama-3.3-8b-instruct:free"): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.startsWith("your-")) throw new Error("OPENROUTER_API_KEY non configurée. Obtenir sur openrouter.ai/keys");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://tubemind.app",
      "X-Title": "TubeMind",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`OpenRouter API [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json() as { choices?: Array<{ message?: { content: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callAI(prompt: string, provider: AIProvider, maxTokens = 4096, model?: string): Promise<string> {
  switch (provider) {
    case "claude":      return callClaude(prompt, maxTokens, model);
    case "gemini":      return callGemini(prompt, maxTokens, model);
    case "groq":        return callGroq(prompt, maxTokens, model);
    case "openrouter":  return callOpenRouter(prompt, maxTokens, model);
    default:            return callGemini(prompt, maxTokens);
  }
}

/* ── Check available providers ── */
export const checkAIProviders = createServerFn({ method: "GET" }).handler(async () => ({
  claude:      !!(process.env.ANTHROPIC_API_KEY   && !process.env.ANTHROPIC_API_KEY.startsWith("your-")),
  gemini:      !!(process.env.GEMINI_API_KEY       && !process.env.GEMINI_API_KEY.startsWith("your-")),
  groq:        !!(process.env.GROQ_API_KEY         && !process.env.GROQ_API_KEY.startsWith("your-")),
  openrouter:  !!(process.env.OPENROUTER_API_KEY   && !process.env.OPENROUTER_API_KEY.startsWith("your-")),
}));

/* ── Test a provider connection ── */
export const testAIProvider = createServerFn({ method: "POST" })
  .inputValidator(z.object({ provider: z.enum(["claude", "gemini", "groq", "openrouter"]), model: z.string().optional() }).parse)
  .handler(async ({ data }) => {
    const start = Date.now();
    const result = await callAI('Réponds juste "OK" en un mot.', data.provider as AIProvider, 10, data.model);
    return { ok: true, response: result.trim(), latencyMs: Date.now() - start };
  });

const providerSchema = z.enum(["claude", "gemini", "groq", "openrouter"]);
const modelSchema = z.string().max(200).optional();

/* ── Script Generator ── */
export const generateScript = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      topic: z.string().min(3).max(500),
      niche: z.string().max(100).optional(),
      duration: z.enum(["3-5min", "8-12min", "15-20min", "20+"]).default("8-12min"),
      style: z.enum(["educational", "entertaining", "storytelling", "tutorial", "vlog"]).default("educational"),
      audience: z.string().max(200).optional(),
      language: z.enum(["fr", "en", "es"]).default("fr"),
      provider: providerSchema.default("gemini"),
      model: modelSchema,
    }).parse,
  )
  .handler(async ({ data }) => {
    const lang = data.language === "fr" ? "français" : data.language === "es" ? "espagnol" : "English";
    const prompt = `Tu es un expert en création de contenu YouTube. Génère un script complet en ${lang}.

SUJET : ${data.topic}
NICHE : ${data.niche ?? "générale"}
DURÉE : ${data.duration} | STYLE : ${data.style}
AUDIENCE : ${data.audience ?? "grand public"}

Réponds UNIQUEMENT en JSON valide :
{
  "title_options": ["Titre 1", "Titre 2", "Titre 3"],
  "hook": "Les 30 premières secondes",
  "intro": "Introduction",
  "sections": [{"title": "Section", "content": "Contenu détaillé", "duration": "3min"}],
  "transition_tips": ["Conseil 1"],
  "outro": "Conclusion avec CTA",
  "cta": "Appel à l'action",
  "description": "Description YouTube SEO (500 mots)",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "chapters": ["00:00 - Intro","02:00 - Section 1"],
  "thumbnail_text": "Texte miniature court",
  "tweet": "Tweet 280 chars max",
  "instagram_caption": "Légende Instagram + hashtags"
}`;
    const raw = await callAI(prompt, data.provider as AIProvider, 6000, data.model);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw) as {
      title_options: string[]; hook: string; intro: string;
      sections: Array<{ title: string; content: string; duration: string }>;
      transition_tips: string[]; outro: string; cta: string;
      description: string; tags: string[]; chapters: string[];
      thumbnail_text: string; tweet: string; instagram_caption: string;
    };
  });

/* ── SEO Optimizer ── */
export const optimizeSEO = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    title: z.string().max(200),
    description: z.string().max(5000).optional(),
    tags: z.string().max(1000).optional(),
    niche: z.string().max(100).optional(),
    provider: providerSchema.default("gemini"),
    model: modelSchema,
  }).parse)
  .handler(async ({ data }) => {
    const prompt = `Expert SEO YouTube. Analyse et optimise ces métadonnées. Réponds UNIQUEMENT en JSON valide.

TITRE : ${data.title}
DESCRIPTION : ${data.description ?? "(vide)"}
TAGS : ${data.tags ?? "(vide)"}
NICHE : ${data.niche ?? "générale"}

{
  "title_score": 75, "title_issues": ["Problème"], "title_suggestions": ["Titre 1", "Titre 2", "Titre 3"],
  "description_score": 60, "description_issues": ["Problème"], "description_optimized": "Description SEO...",
  "tags_score": 50, "tags_to_add": ["tag1","tag2","tag3"], "tags_to_remove": ["mauvais"], "tags_optimized": ["tag1","tag2","tag3","tag4","tag5"],
  "overall_score": 62, "top_opportunities": ["Opportunité 1","Opportunité 2"], "keywords_to_target": ["mot clé 1","mot clé 2"]
}`;
    const raw = await callAI(prompt, data.provider as AIProvider, 3000, data.model);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw) as {
      title_score: number; title_issues: string[]; title_suggestions: string[];
      description_score: number; description_issues: string[]; description_optimized: string;
      tags_score: number; tags_to_add: string[]; tags_to_remove: string[]; tags_optimized: string[];
      overall_score: number; top_opportunities: string[]; keywords_to_target: string[];
    };
  });

/* ── Competitor Analysis ── */
export const analyzeCompetitor = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    channelName: z.string().max(200),
    niche: z.string().max(100).optional(),
    topVideos: z.string().max(5000).optional(),
    provider: providerSchema.default("gemini"),
    model: modelSchema,
  }).parse)
  .handler(async ({ data }) => {
    const prompt = `Expert analyse concurrents YouTube. Réponds UNIQUEMENT en JSON valide.

CONCURRENT : ${data.channelName}
NICHE : ${data.niche ?? "générale"}
DONNÉES : ${data.topVideos ?? "(non disponible)"}

{
  "content_strategy": "Stratégie", "posting_frequency": "Fréquence",
  "title_patterns": ["Pattern 1","Pattern 2","Pattern 3"],
  "winning_topics": ["Sujet 1","Sujet 2","Sujet 3"],
  "content_gaps": ["Opportunité 1","Opportunité 2","Opportunité 3"],
  "recommended_tags": ["tag1","tag2","tag3","tag4","tag5"],
  "video_ideas": ["Idée 1","Idée 2","Idée 3","Idée 4","Idée 5"],
  "differentiators": ["Différenciateur 1","Différenciateur 2"],
  "overall_assessment": "Évaluation"
}`;
    const raw = await callAI(prompt, data.provider as AIProvider, 3000, data.model);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw) as {
      content_strategy: string; posting_frequency: string;
      title_patterns: string[]; winning_topics: string[]; content_gaps: string[];
      recommended_tags: string[]; video_ideas: string[]; differentiators: string[];
      overall_assessment: string;
    };
  });

/* ── Content Calendar ── */
export const generateCalendar = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    niche: z.string().max(200),
    frequency: z.enum(["1/week", "2/week", "3/week", "daily"]).default("2/week"),
    month: z.string().max(20).optional(),
    provider: providerSchema.default("gemini"),
    model: modelSchema,
  }).parse)
  .handler(async ({ data }) => {
    const prompt = `Génère un calendrier éditorial YouTube pour 1 mois. Réponds UNIQUEMENT en JSON valide.

NICHE : ${data.niche} | FRÉQUENCE : ${data.frequency} | MOIS : ${data.month ?? "prochain mois"}

{
  "videos": [{"week":1,"day":"Lundi","topic":"Sujet","type":"educational","hook_idea":"Accroche","thumbnail_concept":"Concept","estimated_views":"5k-20k"}],
  "monthly_theme": "Thème",
  "tips": ["Conseil 1","Conseil 2","Conseil 3"]
}`;
    const raw = await callAI(prompt, data.provider as AIProvider, 4000, data.model);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw) as {
      videos: Array<{ week: number; day: string; topic: string; type: string; hook_idea: string; thumbnail_concept: string; estimated_views: string }>;
      monthly_theme: string; tips: string[];
    };
  });

/* ── Video SEO Analysis ── */
export const analyzeVideoSEO = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    videoId: z.string(),
    title: z.string().max(200),
    description: z.string().max(2000).optional(),
    tags: z.array(z.string()).max(200),
    views: z.number().optional(),
    likes: z.number().optional(),
    comments: z.number().optional(),
    niche: z.string().max(100).optional(),
    provider: providerSchema.default("gemini"),
    model: modelSchema,
  }).parse)
  .handler(async ({ data }) => {
    const prompt = `Analyse SEO YouTube rapide. Réponds UNIQUEMENT en JSON valide.

TITRE: ${data.title}
TAGS (${data.tags.length}): ${data.tags.slice(0, 20).join(", ") || "(aucun)"}
DESCRIPTION: ${data.description?.slice(0, 300) ?? "(vide)"}
VUES: ${data.views?.toLocaleString() ?? "?"} | LIKES: ${data.likes?.toLocaleString() ?? "?"}

{
  "overall_score": 72, "title_score": 80, "tags_score": 60, "description_score": 55,
  "title_length_ok": true, "title_has_keyword": true, "tags_count": ${data.tags.length},
  "tags_missing": ["tag 1","tag 2","tag 3"], "tags_weak": ["faible"], "tags_good": ["bon tag"],
  "title_suggestion": "Meilleur titre suggéré",
  "description_missing": true,
  "top_opportunity": "Description vide — +35% visibilité possible",
  "priority": "high",
  "notification_summary": "3 tags manquants · Titre optimisable · Description vide",
  "notification_color": "red",
  "quick_wins": ["Ajouter description SEO","Optimiser 3 tags","Raccourcir titre"],
  "estimated_views_boost": "+25-40%",
  "keywords_to_add": ["mot clé 1","mot clé 2","mot clé 3"],
  "full_title_analysis": "Analyse titre détaillée...",
  "full_tags_analysis": "Analyse tags détaillée...",
  "full_description_analysis": "Analyse description détaillée..."
}`;
    const raw = await callAI(prompt, data.provider as AIProvider, 2000, data.model);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw) as {
      overall_score: number; title_score: number; tags_score: number; description_score: number;
      title_length_ok: boolean; title_has_keyword: boolean; tags_count: number;
      tags_missing: string[]; tags_weak: string[]; tags_good: string[];
      title_suggestion: string; description_missing: boolean; top_opportunity: string;
      priority: "high" | "medium" | "low";
      notification_summary: string; notification_color: "red" | "orange" | "yellow" | "green";
      quick_wins: string[]; estimated_views_boost: string; keywords_to_add: string[];
      full_title_analysis: string; full_tags_analysis: string; full_description_analysis: string;
    };
  });
