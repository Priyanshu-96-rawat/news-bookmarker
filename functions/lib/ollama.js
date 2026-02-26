"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizeWithOllama = categorizeWithOllama;
const node_fetch_1 = __importDefault(require("node-fetch"));
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VALID_TAGS = [
    "AI/ML", "Cybersecurity", "Startups", "Climate", "Politics",
    "Health", "Science", "Entertainment", "Sports", "Finance", "Space", "Education",
];
const PROMPT_TEMPLATE = `You are a news article classifier. For the given article, return a JSON object with:
- "tags": array of 1-3 tags from this list: ["AI/ML","Cybersecurity","Startups","Climate","Politics","Health","Science","Entertainment","Sports","Finance","Space","Education"]
- "sentiment": one of "positive", "negative", or "neutral"

Article Title: {title}
Article Description: {description}

Respond ONLY with valid JSON. No explanation, no markdown.`;
/**
 * Categorize a single article using Ollama
 */
async function categorizeArticle(title, description) {
    var _a;
    try {
        const prompt = PROMPT_TEMPLATE
            .replace("{title}", title)
            .replace("{description}", description);
        const response = await (0, node_fetch_1.default)(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.2",
                prompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 100,
                },
            }),
            timeout: 15000,
        });
        if (!response.ok) {
            console.warn(`⚠️ Ollama returned ${response.status}`);
            return null;
        }
        const data = await response.json();
        const text = ((_a = data.response) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        // Try to parse JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn("⚠️ No JSON found in Ollama response:", text.substring(0, 100));
            return null;
        }
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate and sanitize tags
        const tags = (parsed.tags || [])
            .filter((t) => VALID_TAGS.includes(t))
            .slice(0, 3);
        const sentiment = ["positive", "negative", "neutral"].includes(parsed.sentiment)
            ? parsed.sentiment
            : "neutral";
        return { tags, sentiment };
    }
    catch (error) {
        console.warn(`⚠️ Ollama error for "${title.substring(0, 40)}...":`, error.message);
        return null;
    }
}
/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
    try {
        const response = await (0, node_fetch_1.default)(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
        return response.ok;
    }
    catch (_a) {
        return false;
    }
}
/**
 * Categorize an array of articles using Ollama.
 * If Ollama is unavailable, returns articles unchanged (no AI tags).
 */
async function categorizeWithOllama(articles) {
    // Quick check — is Ollama even running?
    const available = await isOllamaAvailable();
    if (!available) {
        console.log("ℹ️ Ollama not available — skipping AI categorization");
        return articles;
    }
    console.log(`🤖 Categorizing ${articles.length} articles with Ollama...`);
    // Process in batches of 5 to avoid overwhelming Ollama
    const batchSize = 5;
    const enriched = [];
    for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map((article) => categorizeArticle(article.title, article.description)));
        for (let j = 0; j < batch.length; j++) {
            const article = { ...batch[j] };
            const result = results[j];
            if (result.status === "fulfilled" && result.value) {
                article.aiTags = result.value.tags;
                article.sentiment = result.value.sentiment;
            }
            enriched.push(article);
        }
        // Small delay between batches
        if (i + batchSize < articles.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
    const tagged = enriched.filter((a) => a.aiTags && a.aiTags.length > 0).length;
    console.log(`✅ AI categorization complete: ${tagged}/${articles.length} articles tagged`);
    return enriched;
}
//# sourceMappingURL=ollama.js.map