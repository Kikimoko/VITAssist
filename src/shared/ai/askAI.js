import { retrieveContext } from "./retrieveContext.js";
import { askGroq } from "./groq.js";

export async function askAI(question, history = []) {

    const context = await retrieveContext(question);

    const unique = [];
    const seen = new Set();

    context.forEach(c => {

        const key =
            `${c.subject}-${c.lecture}-${c.text.substring(0, 200)}`;

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(c);
        }

    });

    const formattedContext = unique
    .map((c, i) => `
========== SOURCE ${i + 1} ==========

Subject: ${c.subject}
Lecture: ${c.lecture}
Module: ${c.module ?? "N/A"}
Page/Slide: ${c.page ?? "Unknown"}

${c.text}
`)
    .join("\n\n");

    const previousConversation = history
        .slice(-6)
        .map(m => `${m.role}: ${m.text}`)
        .join("\n");

        const prompt = `
You are VITAssist.

You are helping a VIT student prepare for exams.

Use the supplied study material as your PRIMARY source.

If multiple snippets discuss the same topic, combine them into one clear answer.

If the notes only partially answer the question, explain what is available and mention any missing details.

Only reply "I couldn't find this in your downloaded notes." if NONE of the supplied study material is relevant.

Do NOT invent facts that contradict the notes.

==========================
STUDY MATERIAL
==========================

${formattedContext}

==========================
PREVIOUS CONVERSATION
==========================

${previousConversation}

==========================
QUESTION
==========================

${question}

Answer in clear student-friendly language using headings and bullet points whenever helpful.
`;

    const answer = await askGroq(prompt);

    const sources = unique
        .map(c => `• ${c.subject} → ${c.lecture} (Page ${c.page})`)
        .join("\n");

    return `${answer}

━━━━━━━━━━━━━━━━━━

📚 Sources

${sources}`;
}