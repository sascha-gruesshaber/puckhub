import type { PrismaClient } from "@puckhub/db"
import OpenAI from "openai"

// ─── OpenRouter Client (same as aiRecapService) ─────────────────────────────

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")
  return new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey })
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite-preview"
}

// ─── HTML → plain text ──────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

// ─── Prompt Construction ────────────────────────────────────────────────────

function buildSystemPrompt(locale: string): string {
  const lang = locale.startsWith("de") ? "German" : "English"

  return `You are an SEO specialist for an amateur ice hockey league website.

Rules:
- Write in ${lang}
- Generate a concise SEO title (max 60 characters) and meta description (max 155 characters, plain text)
- The title should be catchy and include relevant keywords
- The description should summarize the content and encourage clicks
- Do NOT invent facts — only use information from the provided content
- Return valid JSON with exactly two fields: "seoTitle" and "seoDescription"
- Do NOT wrap the JSON in markdown code blocks`
}

function buildUserPrompt(title: string, content: string): string {
  const plainText = stripHtml(content).slice(0, 2000)
  return `Title: ${title}\n\nContent:\n${plainText}`
}

// ─── Generate SEO for News ──────────────────────────────────────────────────

export async function generateNewsSeo(db: PrismaClient, newsId: string, organizationId: string): Promise<void> {
  try {
    const article = await db.news.findFirst({
      where: { id: newsId, organizationId },
      select: { title: true, content: true },
    })
    if (!article) return

    const settings = await db.systemSettings.findFirst({
      where: { organizationId },
      select: { locale: true },
    })
    const locale = settings?.locale ?? "de-DE"

    const client = getClient()
    const model = getModel()

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(locale) },
        { role: "user", content: buildUserPrompt(article.title, article.content) },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("Empty response from AI")

    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()
    const parsed = JSON.parse(cleaned) as { seoTitle: string; seoDescription: string }

    // Log token usage
    const usage = response.usage
    if (usage) {
      await db.aiUsageLog.create({
        data: {
          organizationId,
          feature: "seo_news",
          model,
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
          newsId,
        },
      })
    }

    // Persist SEO fields
    await db.news.update({
      where: { id: newsId },
      data: {
        seoTitle: parsed.seoTitle.slice(0, 60),
        seoDescription: parsed.seoDescription.slice(0, 155),
      },
    })
  } catch (error) {
    console.error("[ai-seo] News SEO generation failed:", error)
  }
}

// ─── Generate SEO for Page ──────────────────────────────────────────────────

export async function generatePageSeo(db: PrismaClient, pageId: string, organizationId: string): Promise<void> {
  try {
    const page = await db.page.findFirst({
      where: { id: pageId, organizationId },
      select: { title: true, content: true, isSystemRoute: true },
    })
    if (!page || page.isSystemRoute) return

    const settings = await db.systemSettings.findFirst({
      where: { organizationId },
      select: { locale: true },
    })
    const locale = settings?.locale ?? "de-DE"

    const client = getClient()
    const model = getModel()

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(locale) },
        { role: "user", content: buildUserPrompt(page.title, page.content) },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("Empty response from AI")

    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()
    const parsed = JSON.parse(cleaned) as { seoTitle: string; seoDescription: string }

    // Log token usage
    const usage = response.usage
    if (usage) {
      await db.aiUsageLog.create({
        data: {
          organizationId,
          feature: "seo_page",
          model,
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
          pageId,
        },
      })
    }

    // Persist SEO fields
    await db.page.update({
      where: { id: pageId },
      data: {
        seoTitle: parsed.seoTitle.slice(0, 60),
        seoDescription: parsed.seoDescription.slice(0, 155),
      },
    })
  } catch (error) {
    console.error("[ai-seo] Page SEO generation failed:", error)
  }
}
