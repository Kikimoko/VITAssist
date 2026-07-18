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
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    return data.choices[0].message.content;
}