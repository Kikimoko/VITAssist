import { getFileMetadata } from "../storage/storage.js";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function generateQuiz(filename) {
    console.log("generateQuiz() called");
    const file = await getFileMetadata(filename);

    if (!file) {
        throw new Error("File not found.");
    }

    const material =
        file.fullText ||
        file.pages?.map(p => p.text).join("\n\n") ||
        file.slides?.map(s => s.text).join("\n\n") ||
        "";
        console.log(material.length);
console.log(material.substring(0,300));

    const prompt = `
You are an engineering professor.

Generate EXACTLY 10 multiple choice questions.

Rules:

- Use ONLY the study material.
- 4 options.
- One correct answer.
- Include explanation.
- Return ONLY JSON.
- No markdown.

Format:

[
{
"question":"...",
"options":[
"...",
"...",
"...",
"..."
],
"answer":0,
"explanation":"..."
}
]

Study Material:

${material.substring(0,7000)}
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                contents:[
                    {
                        parts:[
                            {
                                text:prompt
                            }
                        ]
                    }
                ]
            })
        }
    );

    if (!response.ok) {

        const error = await response.json();
    
        console.log(error);
    
        throw new Error(
            JSON.stringify(error, null, 2)
        );
    
    }
    if (response.status === 429) {

        await new Promise(r => setTimeout(r, 3000));
    
        return generateQuiz(filename);
    
    }
    const json = await response.json();

    let text =
        json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    text = text
        .replace(/```json/g,"")
        .replace(/```/g,"")
        .trim();

    return JSON.parse(text);

}
