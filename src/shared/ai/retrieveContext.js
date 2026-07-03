import { getFileIndex } from "../storage/storage.js";
function makeSnippet(text, words) {

    if (!text) return "";

    const lower = text.toLowerCase();

    let first = Infinity;

    words.forEach(word => {

        const i = lower.indexOf(word);

        if (i !== -1 && i < first) {
            first = i;
        }

    });

    if (first === Infinity) {
        return text.substring(0, 700);
    }

    const start = Math.max(0, first - 250);

    const end = Math.min(
        text.length,
        first + 450
    );

    let snippet = text.substring(start, end);

    words.forEach(word => {
    
        const regex = new RegExp(word, "gi");
    
        snippet = snippet.replace(
            regex,
            `【${word}】`
        );
    
    });
    
    return snippet;

}
export async function retrieveContext(question) {

    const index = await getFileIndex();

    const words = question
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 2);

    const matches = [];

    Object.values(index).forEach(file => {

        const chunks =
            file.pages?.length
                ? file.pages
                : file.slides?.length
                ? file.slides
                : [];

        chunks.forEach(chunk => {

            const pageTitle = (chunk.title || "").toLowerCase();

            const text =
                (
                    (chunk.title || "") +
                    "\n" +
                    (chunk.text || "")
                ).toLowerCase();

            if (!text) return;

            const lectureTitle =
                (file.lectureTitle || "").toLowerCase();

            let score = 0;

            words.forEach(word => {

                const found = text.match(
                    new RegExp(word, "gi")
                );

                if (found) {
                    score += found.length;
                }

                if (lectureTitle.includes(word)) {
                    score += 5;
                }

                if (pageTitle.includes(word)) {
                    score += 10;
                }

            });

            if (score > 0) {

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

                        text: makeSnippet(chunk.text, words)

                });

            }

        });

    });

    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, 3);

}