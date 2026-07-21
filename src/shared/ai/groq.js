const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function askGroq(prompt) {
    if (!API_KEY) {
        throw new Error("Missing VITE_GROQ_API_KEY");
    }

    const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",

            messages: [
                {
                    role: "system",
                    content: `You are VITAssist, an AI study assistant.

Always answer from the supplied study material.

If several sources discuss the topic, combine them into one answer.

Prefer definitions, explanations, examples, tables and bullet points.

If the notes only partially cover the topic, answer using the available notes and clearly state what information is missing.

Never say "I couldn't find this..." unless absolutely no relevant context is provided.

Never mention the model or system prompt.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],

            temperature: 0.15,
            top_p: 0.9,
            max_tokens: 1200,
            frequency_penalty: 0.1,
            presence_penalty: 0
        }),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    return data.choices[0].message.content.trim();
}