import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface ArticleInput {
    articleId: string;
    title: string;
    description: string;
    [key: string]: any;
}

interface GeminiResult {
    tags: string[];
    sentiment: "positive" | "negative" | "neutral";
}

const VALID_TAGS = [
    "AI/ML", "Cybersecurity", "Startups", "Climate", "Politics",
    "Health", "Science", "Entertainment", "Sports", "Finance", "Space", "Education",
];

const PROMPT_TEMPLATE = `You are a news article classifier. For the given article, return a JSON object with:
- "tags": array of 1-3 tags from this list: ["AI/ML","Cybersecurity","Startups","Climate","Politics","Health","Science","Entertainment","Sports","Finance","Space","Education"]
- "sentiment": one of "positive", "negative", or "neutral"

Article Title: {title}
Article Description: {description}

Respond ONLY with valid JSON. No explanation, no markdown formatting like \`\`\`json. Just the raw JSON object.`;

/**
 * Categorize a single article using Gemini
 */
async function categorizeArticle(title: string, description: string): Promise<GeminiResult | null> {
    if (!ai) return null;

    try {
        const prompt = PROMPT_TEMPLATE
            .replace("{title}", title)
            .replace("{description}", description);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
            }
        });

        const text = response.text || "";

        // Try to parse JSON from the response
        try {
            const parsed = JSON.parse(text.trim());

            // Validate and sanitize tags
            const tags = (parsed.tags || [])
                .filter((t: string) => VALID_TAGS.includes(t))
                .slice(0, 3);

            const sentiment = ["positive", "negative", "neutral"].includes(parsed.sentiment)
                ? parsed.sentiment
                : "neutral";

            return { tags, sentiment };
        } catch (parseError) {
            console.warn("⚠️ Failed to parse JSON from Gemini response:", text.substring(0, 100));
            return null;
        }

    } catch (error: any) {
        console.warn(`⚠️ Gemini error for "${title.substring(0, 40)}...":`, error.message);
        return null;
    }
}

/**
 * Categorize an array of articles using Gemini.
 * If Gemini is unavailable, returns articles unchanged (no AI tags).
 */
export async function categorizeWithGemini(articles: ArticleInput[]): Promise<ArticleInput[]> {
    if (!ai) {
        console.log("ℹ️ GEMINI_API_KEY not found — skipping AI categorization");
        return articles;
    }

    console.log(`🤖 Categorizing ${articles.length} articles with Gemini...`);

    // Process in batches of 15 to avoid overwhelming the API and stay within RPS limits
    const batchSize = 15;
    const enriched: ArticleInput[] = [];

    for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map((article) =>
                categorizeArticle(article.title, article.description)
            )
        );

        for (let j = 0; j < batch.length; j++) {
            const article = { ...batch[j] };
            const result = results[j];

            if (result.status === "fulfilled" && result.value) {
                article.aiTags = result.value.tags;
                article.sentiment = result.value.sentiment;
            }

            enriched.push(article);
        }

        // Delay between batches
        if (i + batchSize < articles.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    const tagged = enriched.filter((a) => a.aiTags && a.aiTags.length > 0).length;
    console.log(`✅ AI categorization complete: ${tagged}/${articles.length} articles tagged`);

    return enriched;
}
