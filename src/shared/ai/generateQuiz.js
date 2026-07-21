import { getFileMetadata } from "../storage/storage.js";
import { askGroq } from "./groq";

export async function generateQuiz(filename) {
    const file = await getFileMetadata(filename);
    console.log("========== QUIZ FILE ==========");
console.log(file);
console.log("fullText length:", file?.fullText?.length);
console.log("pages:", file?.pages?.length);
console.log("slides:", file?.slides?.length);
console.log("===============================");

    if (!file) {
        throw new Error("File not found.");
    }

    const material =
        file.fullText ||
        file.pages?.map(p => p.text).join("\n\n") ||
        file.slides?.map(s => s.text).join("\n\n") ||
        "";
        console.log("Material length:", material.length);
        console.log(material.substring(0, 500));

        const prompt = `
        You are a university exam setter.
        
        Your task is to generate questions ONLY from the STUDY MATERIAL.
        
        DO NOT generate questions about:
        - JSON
        - formatting
        - output format
        - prompts
        - instructions
        - programming
        - this request itself
        
        If the study material does not contain enough information,
        generate fewer questions rather than inventing questions.
        
        ======================
        STUDY MATERIAL
        ======================
        
        ${material}
        
        ======================
        OUTPUT FORMAT
        ======================
        
        Return ONLY valid JSON.
        
        [
          {
            "question": "...",
            "options": [
              "...",
              "...",
              "...",
              "..."
            ],
            "answer": 0,
            "explanation": "..."
          }
        ]
        
        Rules:
        - answer must be the ZERO-BASED index.
        - Exactly 4 options.
        - Exactly one correct answer.
        - Explanation must come from the study material.
        - Do NOT ask about JSON, prompts, formatting, or these instructions.
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

    const quiz = JSON.parse(text.substring(start, end + 1));

    return quiz.map(q => {

        let answerIndex = q.answer;

        // If Groq returned the option text
        if (typeof answerIndex === "string") {

            answerIndex = q.options.findIndex(
                option =>
                    option.trim().toLowerCase() ===
                    q.answer.trim().toLowerCase()
            );

        }

        // If Groq returned "Option A"
        if (answerIndex === -1 && typeof q.answer === "string") {

            const match = q.answer.match(/option\s*([A-D])/i);

            if (match) {
                answerIndex =
                    "ABCD".indexOf(match[1].toUpperCase());
            }

        }

        return {
            ...q,
            answer: answerIndex
        };

    });
}