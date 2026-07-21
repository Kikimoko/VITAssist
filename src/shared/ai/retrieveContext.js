import { getFileIndex } from "../storage/storage.js";

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeSnippet(text, words) {

    if (!text) return "";

    const lower = text.toLowerCase();

    let first = Infinity;

    words.forEach(word => {

        const i = lower.indexOf(word);

        if (i !== -1 && i < first)
            first = i;

    });

    if (first === Infinity)
        return text.substring(0, 900);

    const start = Math.max(0, first - 250);
    const end = Math.min(text.length, first + 700);

    let snippet = text.substring(start, end);

    words.forEach(word => {

        const regex = new RegExp(
            escapeRegex(word),
            "gi"
        );

        snippet = snippet.replace(
            regex,
            m => `【${m}】`
        );

    });

    return snippet;
}

export async function retrieveContext(question) {

    const index = await getFileIndex();

    const normalizedQuestion = question.trim().toLowerCase();

    const STOP_WORDS = new Set([
        "what",
        "which",
        "when",
        "where",
        "who",
        "why",
        "how",
        "is",
        "are",
        "was",
        "were",
        "do",
        "does",
        "did",
        "can",
        "could",
        "should",
        "would",
        "will",
        "shall",
        "the",
        "a",
        "an",
        "of",
        "to",
        "for",
        "and",
        "or",
        "in",
        "on",
        "at",
        "by",
        "with",
        "about",
        "into",
        "from",
        "using",
        "use",
        "explain",
        "define",
        "describe",
        "tell",
        "me"
    ]);
    
    const words = normalizedQuestion
        .split(/[^a-z0-9-]+/)
        .filter(w =>
            w.length > 2 &&
            !STOP_WORDS.has(w)
        );

    const matches = [];

    Object.values(index).forEach(file => {

        if (file.status === "deleted")
            return;

        const chunks =
            file.pages?.length
                ? file.pages
                : file.slides?.length
                ? file.slides
                : [];

        chunks.forEach(chunk => {

            const rawText =
                (chunk.title || "") +
                "\n" +
                (chunk.text || "");

            if (!rawText.trim())
                return;

            const text = rawText.toLowerCase();

            const pageTitle =
                (chunk.title || "").toLowerCase();

            const lectureTitle =
                (file.lectureTitle || "").toLowerCase();

            const subject =
                (file.subject || "").toLowerCase();

            let score = 0;

            words.forEach(word => {

                const regex = new RegExp(
                    escapeRegex(word),
                    "gi"
                );

                const bodyMatches =
    text.match(regex)?.length || 0;

if (bodyMatches > 0)
    score += 10 + bodyMatches * 3;

// page title
if (pageTitle.includes(word))
    score += 30;

// lecture title
if (lectureTitle.includes(word))
    score += 40;

// subject
if (subject.includes(word))
    score += 50;

// starts with keyword
if (text.startsWith(word))
    score += 10;

            });

            if (text.includes(normalizedQuestion)) {
                score += 75;
            }
            
            const questionWords = normalizedQuestion.split(/\s+/);

                let consecutive = 0;
                
                for (let i = 0; i < questionWords.length - 1; i++) {
                
                    const phrase =
                        questionWords[i] + " " + questionWords[i + 1];
                
                    if (text.includes(phrase))
                        consecutive++;
                }
                
                score += consecutive * 25;
                const phrases = [];

for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words[i] + " " + words[i + 1]);
}

for (const phrase of phrases) {

    if (text.includes(phrase))
        score += 120;

    if (pageTitle.includes(phrase))
        score += 200;

    if (lectureTitle.includes(phrase))
        score += 250;
}

                if (score > 0) {

                    const pageIndex = chunks.indexOf(chunk);
                
                    let mergedText = "";
                
                    for (
                        let i = Math.max(0, pageIndex - 1);
                        i <= Math.min(chunks.length - 1, pageIndex + 1);
                        i++
                    ) {
                        mergedText += "\n\n" + (chunks[i].text || "");
                    }
                    
                    matches.push({
                
                        score,
                
                        subject: file.subject,
                
                        lecture: file.lectureTitle,
                
                        module: file.moduleNumber,
                
                        page:
                            chunk.no ??
                            chunk.pageNo ??
                            chunk.slideNo ??
                            chunk.number ??
                            null,
                
                        text: makeSnippet(mergedText, words)
                
                    });
                
                }

        });

    });

    matches.sort((a, b) => b.score - a.score);

    const finalMatches = [];

const seen = new Set();

for (const m of matches) {

    const key = `${m.subject}-${m.page}`;

    if (seen.has(key))
        continue;

    seen.add(key);
    finalMatches.push(m);

    if (finalMatches.length >= 8)
        break;
}
console.log("========== RETRIEVED CONTEXT ==========");

finalMatches.forEach((m, i) => {
    console.log(
        `${i + 1}.`,
        m.subject,
        "|",
        m.lecture,
        "| Page:",
        m.page,
        "| Score:",
        m.score
    );
});

console.log("======================================");

return finalMatches.slice(0, 5);

}