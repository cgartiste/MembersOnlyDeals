import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AIProvider = "claude" | "gemini";

/* ── Core callers ── */

async function callClaude(prompt: string, maxTokens = 4096): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "your-anthropic-api-key-here") throw new Error("ANTHROPIC_API_KEY non configurée.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API [${res.status}]: ${await res.text()}`);
  const json = await res.json() as { content: Array<{ text: string }> };
  return json.content[0]?.text ?? "";
}

async function callGemini(prompt: string, maxTokens = 4096): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your-gemini-api-key-here") throw new Error("GEMINI_API_KEY non configurée. Obtenir sur aistudio.google.com/app/apikey");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API [${res.status}]: ${await res.text()}`);
  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAI(prompt: string, provider: AIProvider, maxTokens = 4096): Promise<string> {
  return provider === "gemini" ? callGemini(prompt, maxTokens) : callClaude(prompt, maxTokens);
}

/* ── Check available providers ── */
export const checkAIProviders = createServerFn({ method: "GET" }).handler(async () => ({
  claude: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your-anthropic-api-key-here"),
  gemini: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your-gemini-api-key-here"),
}));

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
      provider: z.enum(["claude", "gemini"]).default("claude"),
    }).parse,
  )
  .handler(async ({ data }) => {
    const lang = data.language === "fr" ? "français" : data.language === "es" ? "espagnol" : "English";
    const prompt = `Tu es un expert en création de contenu YouTube. Génère un script complet en ${lang} pour une vidéo YouTube.

SUJET : ${data.topic}
NICHE : ${data.niche ?? "générale"}
DURÉE CIBLE : ${data.duration}
STYLE : ${data.style}
AUDIENCE CIBLE : ${data.audience ?? "grand public"}

Génère le script avec exactement cette structure en JSON valide (UNIQUEMENT le JSON, sans texte avant ou après) :
{
  "title_options": ["Titre 1", "Titre 2", "Titre 3"],
  "hook": "Les 30 premières secondes accrocheuses",
  "intro": "Introduction (30-60 secondes)",
  "sections": [
    {"title": "Titre section", "content": "Contenu détaillé", "duration": "2-3min"}
  ],
  "transition_tips": ["Conseil 1", "Conseil 2"],
  "outro": "Conclusion avec CTA",
  "cta": "Appel à l'action spécifique",
  "description": "Description YouTube SEO (500 mots)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"],
  "chapters": ["00:00 - Intro", "01:30 - Section 1"],
  "thumbnail_text": "Texte court miniature",
  "tweet": "Tweet (280 chars max)",
  "instagram_caption": "Légende Instagram + hashtags"
}`;

    const raw = await callAI(prompt, data.provider, 6000);
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
  .inputValidator(
    z.object({
      title: z.string().max(200),
      description: z.string().max(5000).optional(),
      tags: z.string().max(1000).optional(),
      niche: z.string().max(100).optional(),
      provider: z.enum(["claude", "gemini"]).default("claude"),
    }).parse,
  )
  .handler(async ({ data }) => {
    const prompt = `Expert SEO YouTube. Analyse et optimise ces métadonnées.

TITRE : ${data.title}
DESCRIPTION : ${data.description ?? "(vide)"}
TAGS : ${data.tags ?? "(vide)"}
NICHE : ${data.niche ?? "générale"}

Réponds UNIQUEMENT en JSON valide :
{
  "title_score": 75,
  "title_issues": ["Problème 1"],
  "title_suggestions": ["Titre 1", "Titre 2", "Titre 3"],
  "description_score": 60,
  "description_issues": ["Problème 1"],
  "description_optimized": "Description SEO complète...",
  "tags_score": 50,
  "tags_to_add": ["tag1", "tag2", "tag3"],
  "tags_to_remove": ["mauvais_tag"],
  "tags_optimized": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "overall_score": 62,
  "top_opportunities": ["Opportunité 1", "Opportunité 2"],
  "keywords_to_target": ["mot clé 1", "mot clé 2"]
}`;

    const raw = await callAI(prompt, data.provider, 3000);
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
  .inputValidator(
    z.object({
      channelName: z.string().max(200),
      niche: z.string().max(100).optional(),
      topVideos: z.string().max(5000).optional(),
      provider: z.enum(["claude", "gemini"]).default("claude"),
    }).parse,
  )
  .handler(async ({ data }) => {
    const prompt = `Expert analyse concurrents YouTube.

CONCURRENT : ${data.channelName}
NICHE : ${data.niche ?? "générale"}
DONNÉES : ${data.topVideos ?? "(non disponible)"}

Réponds UNIQUEMENT en JSON valide :
{
  "content_strategy": "Stratégie de contenu",
  "posting_frequency": "Fréquence estimée",
  "title_patterns": ["Pattern 1", "Pattern 2", "Pattern 3"],
  "winning_topics": ["Sujet 1", "Sujet 2", "Sujet 3"],
  "content_gaps": ["Opportunité 1", "Opportunité 2", "Opportunité 3"],
  "recommended_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "video_ideas": ["Idée 1", "Idée 2", "Idée 3", "Idée 4", "Idée 5"],
  "differentiators": ["Différenciateur 1", "Différenciateur 2"],
  "overall_assessment": "Évaluation globale"
}`;

    const raw = await callAI(prompt, data.provider, 3000);
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
  .inputValidator(
    z.object({
      niche: z.string().max(200),
      frequency: z.enum(["1/week", "2/week", "3/week", "daily"]).default("2/week"),
      month: z.string().max(20).optional(),
      provider: z.enum(["claude", "gemini"]).default("claude"),
    }).parse,
  )
  .handler(async ({ data }) => {
    const prompt = `Génère un calendrier éditorial YouTube pour 1 mois.

NICHE : ${data.niche}
FRÉQUENCE : ${data.frequency}
MOIS : ${data.month ?? "prochain mois"}

Réponds UNIQUEMENT en JSON valide :
{
  "videos": [
    {
      "week": 1,
      "day": "Lundi",
      "topic": "Sujet",
      "type": "educational",
      "hook_idea": "Accroche",
      "thumbnail_concept": "Concept miniature",
      "estimated_views": "5k-20k"
    }
  ],
  "monthly_theme": "Thème du mois",
  "tips": ["Conseil 1", "Conseil 2", "Conseil 3"]
}`;

    const raw = await callAI(prompt, data.provider, 4000);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw) as {
      videos: Array<{ week: number; day: string; topic: string; type: string; hook_idea: string; thumbnail_concept: string; estimated_views: string }>;
      monthly_theme: string;
      tips: string[];
    };
  });
