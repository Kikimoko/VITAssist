import { retrieveContext } from "./retrieveContext.js";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;


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

    console.log("Retrieved Context:", context);

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

If the answer cannot be found in the study material, reply:

"I couldn't find this in your downloaded notes."

=========================
STUDY MATERIAL

${formattedContext}
Previous Conversation

${previousConversation}

=========================

QUESTION

${question}

Answer in simple student-friendly language.
`;

    const response = await fetch(

        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,

        {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                contents: [

                    {

                        parts: [

                            {

                                text: prompt

                            }

                        ]

                    }

                ]

            })

        }

    );

    const json = await response.json();
    console.log(response.status);
console.log(json);

const answer =
    json.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response.";

const sources = unique
    .map(c =>
        `• ${c.subject} → ${c.lecture} (Page ${c.page})`
    )
    .join("\n");

return `${answer}

━━━━━━━━━━━━━━━━━━

📚 Sources

${sources}`;

}