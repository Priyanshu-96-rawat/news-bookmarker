import crypto from "crypto";
import { parseString } from "xml2js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── RSS Feed Sources ────────────────────────────────────────────────────────

interface FeedSource {
    url: string;
    source: string;
    category: string;
}

const FEED_SOURCES: FeedSource[] = [
    // ─── Original Sources ────────────────────────────────────────────────
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC", category: "world" },
    { url: "http://rss.cnn.com/rss/edition_world.rss", source: "CNN", category: "world" },
    { url: "https://techcrunch.com/feed/", source: "TechCrunch", category: "tech" },
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC", category: "business" },
    { url: "http://rss.cnn.com/rss/edition_technology.rss", source: "CNN", category: "tech" },
    { url: "http://rss.cnn.com/rss/edition_business.rss", source: "CNN", category: "business" },
    // ─── New Sources ─────────────────────────────────────────────────────
    { url: "https://www.theguardian.com/world/rss", source: "The Guardian", category: "world" },
    { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", category: "world" },
    { url: "https://hnrss.org/frontpage", source: "Hacker News", category: "tech" },
    { url: "https://feeds.npr.org/1001/rss.xml", source: "NPR", category: "world" },
    { url: "https://www.wired.com/feed/rss", source: "Wired", category: "tech" },
    { url: "https://www.thehindu.com/news/international/feeder/default.rss", source: "The Hindu", category: "world" },
    // ─── Science ─────────────────────────────────────────────────────────
    { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC", category: "science" },
    { url: "http://rss.cnn.com/rss/edition_space.rss", source: "CNN", category: "science" },
];

export interface ParsedArticle {
    articleId: string;
    title: string;
    description: string;
    link: string;
    source: string;
    category: string;
    imageUrl?: string;
    pubDate: string;
    aiTags?: string[];
    sentiment?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateArticleId(url: string): string {
    return crypto.createHash("md5").update(url).digest("hex");
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function parseXml(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
        parseString(xml, { explicitArray: false, trim: true }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function extractImageUrl(item: any): string | undefined {
    if (item["media:content"]?.$?.url) return item["media:content"].$.url;
    if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
    if (item.enclosure?.$?.url && item.enclosure.$.type?.startsWith("image")) {
        return item.enclosure.$.url;
    }
    const descHtml = typeof item.description === "string" ? item.description : "";
    const imgMatch = descHtml.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch) return imgMatch[1];
    return undefined;
}

// ─── Fetch a single feed ─────────────────────────────────────────────────────

async function fetchSingleFeed(feedSource: FeedSource): Promise<ParsedArticle[]> {
    try {
        const response = await fetch(feedSource.url, {
            headers: { "User-Agent": "NewsMarker/1.0" },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return [];

        const xml = await response.text();
        const parsed = await parseXml(xml);
        const channel = parsed.rss?.channel || parsed.feed;
        if (!channel) return [];

        const items = channel.item || channel.entry || [];
        const itemArray = Array.isArray(items) ? items : [items];

        return itemArray.slice(0, 15).map((item: any) => {
            const link = typeof item.link === "string" ? item.link : item.link?.$?.href || item.link?._ || "";
            const title = typeof item.title === "string" ? item.title : item.title?._ || "Untitled";
            const desc = typeof item.description === "string" ? item.description : item.description?._ || item.summary || "";

            return {
                articleId: generateArticleId(link),
                title: stripHtml(title),
                description: stripHtml(desc).substring(0, 300),
                link,
                source: feedSource.source,
                category: feedSource.category,
                imageUrl: extractImageUrl(item),
                pubDate: item.pubDate || item.published || item.updated || new Date().toISOString(),
            };
        });
    } catch {
        return [];
    }
}

// ─── Gemini AI Categorization ────────────────────────────────────────────────

const VALID_TAGS = [
    "AI/ML", "Cybersecurity", "Startups", "Climate", "Politics",
    "Health", "Science", "Entertainment", "Sports", "Finance", "Space", "Education",
];

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
}

async function categorizeWithGemini(articles: ParsedArticle[]): Promise<ParsedArticle[]> {
    const genAI = getGeminiClient();
    if (!genAI) {
        console.log("ℹ️ No GEMINI_API_KEY — skipping AI categorization");
        return articles;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Batch all articles into a single prompt for efficiency
    const articlesForPrompt = articles.map((a, i) => ({
        index: i,
        title: a.title,
        description: a.description.substring(0, 150),
    }));

    const prompt = `You are a news article classifier. For each article below, assign:
- "tags": 1-3 tags from ONLY this list: ${JSON.stringify(VALID_TAGS)}
- "sentiment": exactly one of "positive", "negative", or "neutral"

Articles:
${articlesForPrompt.map((a) => `[${a.index}] "${a.title}" — ${a.description}`).join("\n")}

Respond with a JSON array like:
[{"index":0,"tags":["AI/ML"],"sentiment":"positive"},{"index":1,"tags":["Politics","Climate"],"sentiment":"negative"}]

ONLY return valid JSON array. No markdown, no explanation.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Extract JSON array from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn("⚠️ No JSON array in Gemini response");
            return articles;
        }

        const parsed = JSON.parse(jsonMatch[0]) as Array<{
            index: number;
            tags: string[];
            sentiment: string;
        }>;

        // Merge results back into articles
        const enriched = [...articles];
        for (const item of parsed) {
            if (item.index >= 0 && item.index < enriched.length) {
                enriched[item.index] = {
                    ...enriched[item.index],
                    aiTags: (item.tags || []).filter((t) => VALID_TAGS.includes(t)).slice(0, 3),
                    sentiment: ["positive", "negative", "neutral"].includes(item.sentiment)
                        ? item.sentiment
                        : "neutral",
                };
            }
        }

        const tagged = enriched.filter((a) => a.aiTags && a.aiTags.length > 0).length;
        console.log(`✅ Gemini tagged ${tagged}/${articles.length} articles`);
        return enriched;
    } catch (error: any) {
        console.warn("⚠️ Gemini categorization failed:", error.message);
        return articles;
    }
}

// ─── Main: Fetch all feeds → Gemini AI → Return ─────────────────────────────

export async function fetchAllFeeds(): Promise<Record<string, ParsedArticle[]>> {
    const results = await Promise.allSettled(
        FEED_SOURCES.map((source) => fetchSingleFeed(source))
    );

    const byCategory: Record<string, ParsedArticle[]> = { tech: [], world: [], business: [], science: [] };

    for (const result of results) {
        if (result.status === "fulfilled") {
            for (const article of result.value) {
                if (byCategory[article.category]) {
                    byCategory[article.category].push(article);
                }
            }
        }
    }

    // Deduplicate
    for (const cat of Object.keys(byCategory)) {
        const seen = new Set<string>();
        byCategory[cat] = byCategory[cat].filter((a) => {
            if (seen.has(a.articleId)) return false;
            seen.add(a.articleId);
            return true;
        });
    }

    // Gemini AI categorization (one batch call per category for efficiency)
    for (const cat of Object.keys(byCategory)) {
        if (byCategory[cat].length > 0) {
            byCategory[cat] = await categorizeWithGemini(byCategory[cat]);
        }
    }

    return byCategory;
}
