import { retrieveContext } from "./retrieveContext.js";
import { askGroq } from "./groq.js";

export async function askAI(question, history = []) {

    const context = await retrieveContext(question);

    const unique = [];
    const seen = new Set();

    context.forEach(c => {
        const key = `${c.subject}-${c.page}`;

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(c);
        }
    });

    const formattedContext = unique
        .map(c => `
Subject: ${c.subject}
Lecture: ${c.lecture}
Page: ${c.page}

${c.text}
`)
        .join("\n-------------------------\n");

    const previousConversation = history
        .slice(-6)
        .map(m => `${m.role}: ${m.text}`)
        .join("\n");

    const prompt = `
You are VITAssist.

You are helping a VIT student study.

ONLY answer using the study material below.

If the answer cannot be found, reply:
"I couldn't find this in your downloaded notes."

STUDY MATERIAL

${formattedContext}

Previous Conversation

${previousConversation}

QUESTION

${question}

Answer in simple student-friendly language.
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