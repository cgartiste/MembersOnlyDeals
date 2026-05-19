import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function callClaude(prompt: string, maxTokens = 4096): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY non configurée.");
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
  if (!res.ok) throw new Error(`Claude API error: ${await res.text()}`);
  const json = await res.json() as { content: Array<{ text: string }> };
  return json.content[0]?.text ?? "";
}

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

Génère le script avec exactement cette structure en JSON :
{
  "title_options": ["Titre 1", "Titre 2", "Titre 3"],
  "hook": "Les 30 premières secondes accrocheuses",
  "intro": "Introduction (30-60 secondes)",
  "sections": [
    {"title": "Titre section", "content": "Contenu détaillé", "duration": "2-3min"}
  ],
  "transition_tips": ["Conseil transition 1", "Conseil transition 2"],
  "outro": "Conclusion avec CTA",
  "cta": "Appel à l'action spécifique",
  "description": "Description YouTube optimisée SEO (500 mots)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"],
  "chapters": ["00:00 - Intro", "01:30 - Section 1", "05:00 - Section 2"],
  "thumbnail_text": "Texte court pour miniature",
  "tweet": "Tweet de promotion (280 chars)",
  "instagram_caption": "Légende Instagram avec hashtags"
}

Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après.`;

    const raw = await callClaude(prompt, 6000);
    try {
      return JSON.parse(raw) as {
        title_options: string[]; hook: string; intro: string;
        sections: Array<{ title: string; content: string; duration: string }>;
        transition_tips: string[]; outro: string; cta: string;
        description: string; tags: string[]; chapters: string[];
        thumbnail_text: string; tweet: string; instagram_caption: string;
      };
    } catch {
      return { title_options: [], hook: raw, intro: "", sections: [], transition_tips: [], outro: "", cta: "", description: "", tags: [], chapters: [], thumbnail_text: "", tweet: "", instagram_caption: "" };
    }
  });

/* ── SEO Optimizer ── */
export const optimizeSEO = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().max(200),
      description: z.string().max(5000).optional(),
      tags: z.string().max(1000).optional(),
      niche: z.string().max(100).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const prompt = `Tu es un expert SEO YouTube. Analyse et optimise ces métadonnées.

TITRE ACTUEL : ${data.title}
DESCRIPTION : ${data.description ?? "(vide)"}
TAGS : ${data.tags ?? "(vide)"}
NICHE : ${data.niche ?? "générale"}

Réponds en JSON :
{
  "title_score": 75,
  "title_issues": ["Problème 1", "Problème 2"],
  "title_suggestions": ["Titre optimisé 1", "Titre optimisé 2", "Titre optimisé 3"],
  "description_score": 60,
  "description_issues": ["Problème 1"],
  "description_optimized": "Description complète optimisée SEO avec mots clés...",
  "tags_score": 50,
  "tags_to_add": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "tags_to_remove": ["mauvais_tag1"],
  "tags_optimized": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "overall_score": 62,
  "top_opportunities": ["Opportunité 1", "Opportunité 2", "Opportunité 3"],
  "keywords_to_target": ["mot clé 1", "mot clé 2", "mot clé 3"]
}`;

    const raw = await callClaude(prompt, 3000);
    return JSON.parse(raw) as {
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
    }).parse,
  )
  .handler(async ({ data }) => {
    const prompt = `Tu es un expert en analyse de concurrents YouTube.

CONCURRENT : ${data.channelName}
NICHE : ${data.niche ?? "générale"}
DONNÉES VIDÉOS : ${data.topVideos ?? "(non disponible)"}

Analyse ce concurrent et génère une stratégie. Réponds en JSON :
{
  "content_strategy": "Description de leur stratégie de contenu",
  "posting_frequency": "Fréquence de publication estimée",
  "title_patterns": ["Pattern titre 1", "Pattern titre 2", "Pattern titre 3"],
  "winning_topics": ["Sujet gagnant 1", "Sujet gagnant 2", "Sujet gagnant 3"],
  "content_gaps": ["Opportunité que tu peux exploiter 1", "Opportunité 2", "Opportunité 3"],
  "recommended_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "video_ideas": ["Idée vidéo 1", "Idée vidéo 2", "Idée vidéo 3", "Idée vidéo 4", "Idée vidéo 5"],
  "differentiators": ["Comment te différencier 1", "Comment te différencier 2"],
  "overall_assessment": "Évaluation globale de ce concurrent"
}`;

    const raw = await callClaude(prompt, 3000);
    return JSON.parse(raw) as {
      content_strategy: string; posting_frequency: string;
      title_patterns: string[]; winning_topics: string[]; content_gaps: string[];
      recommended_tags: string[]; video_ideas: string[]; differentiators: string[];
      overall_assessment: string;
    };
  });

/* ── Generate Calendar ── */
export const generateCalendar = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      niche: z.string().max(200),
      frequency: z.enum(["1/week", "2/week", "3/week", "daily"]).default("2/week"),
      month: z.string().max(20).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const prompt = `Génère un calendrier éditorial YouTube pour 1 mois.

NICHE : ${data.niche}
FRÉQUENCE : ${data.frequency}
MOIS : ${data.month ?? "prochain mois"}

Réponds en JSON avec exactement ce format :
{
  "videos": [
    {
      "week": 1,
      "day": "Lundi",
      "topic": "Sujet de la vidéo",
      "type": "educational",
      "hook_idea": "Idée d'accroche",
      "thumbnail_concept": "Concept miniature",
      "estimated_views": "5k-20k"
    }
  ],
  "monthly_theme": "Thème du mois",
  "tips": ["Conseil 1", "Conseil 2", "Conseil 3"]
}`;

    const raw = await callClaude(prompt, 4000);
    return JSON.parse(raw) as {
      videos: Array<{ week: number; day: string; topic: string; type: string; hook_idea: string; thumbnail_concept: string; estimated_views: string }>;
      monthly_theme: string;
      tips: string[];
    };
  });
