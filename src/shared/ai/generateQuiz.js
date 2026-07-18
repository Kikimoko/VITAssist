import { getFileMetadata } from "../storage/storage.js";
import { askGroq } from "./groq";

export async function generateQuiz(filename) {
    const file = await getFileMetadata(filename);

    if (!file) {
        throw new Error("File not found.");
    }

    const material =
        file.fullText ||
        file.pages?.map(p => p.text).join("\n\n") ||
        file.slides?.map(s => s.text).join("\n\n") ||
        "";

        const prompt = `
        You are an exam question generator.
        
        Based on the study material below, generate exactly 10 multiple-choice questions.
        
        Study Material:
        ${material}
        
        Return ONLY valid JSON.
        
        Format:
        
        [
          {
            "question": "Question text",
            "options": [
              "Option A",
              "Option B",
              "Option C",
              "Option D"
            ],
            "answer": "Option A"
          }
        ]
        
        Rules:
        - Return only JSON.
        - Do not use markdown.
        - Do not wrap the output in \`\`\`.
        - Do not explain anything.
        - Ensure the JSON is valid.
        `;

    console.time("Groq");

    let text = await askGroq(prompt);

    console.timeEnd("Groq");

    text = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
        console.log("========== GROQ RAW ==========");
        console.log(text);
        console.log("==============================");
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        
        if (start === -1 || end === -1) {
            throw new Error("Groq did not return valid JSON.\n\n" + text);
        }
        
        return JSON.parse(text.substring(start, end + 1));
}