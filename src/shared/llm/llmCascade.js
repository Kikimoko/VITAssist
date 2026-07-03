// src/shared/llm/llmCascade.js
// Three-tier on-device LLM cascade
// Tier 1: Gemini Nano (Chrome Built-in AI)
// Tier 2: WebLLM (Phi-3 mini via WebGPU)
// Tier 3: Transformers.js (TinyLlama via WASM)
// Fallback: Fuse.js results only — no LLM

import { saveSetting, getSettings } from "../storage/storage.js";

// ─── TIER DETECTION ──────────────────────────────────────────────────────────
export async function detectAvailableTier() {
  // Tier 1: Gemini Nano
  if (window.ai?.languageModel) {
    try {
      const capabilities = await window.ai.languageModel.capabilities();
      if (capabilities.available === "readily") return "nano";
      if (capabilities.available === "after-download") return "nano-pending";
    } catch (_) {}
  }

  // Tier 2: WebLLM via WebGPU
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return "webllm";
    } catch (_) {}
  }

  // Tier 3: Transformers.js (WASM — works on any device)
  return "transformers";
}

// ─── MAIN QUERY FUNCTION ─────────────────────────────────────────────────────
// context: array of { filename, slideNo, title, text } from Fuse.js
// query: student's search string
// onProgress: optional callback for download progress (WebLLM)
export async function queryLLM(query, context, onProgress = null) {
  const tier = await detectAvailableTier();
  await saveSetting("llmTier", tier);

  const prompt = buildPrompt(query, context);

  try {
    switch (tier) {
      case "nano":
      case "nano-pending":
        return await queryGeminiNano(prompt, tier);
      case "webllm":
        return await queryWebLLM(prompt, onProgress);
      case "transformers":
        return await queryTransformers(prompt);
      default:
        return null; // Fuse.js fallback handled by caller
    }
  } catch (err) {
    console.error(`[VITAssist] LLM tier ${tier} failed:`, err);
    // Try next tier down
    return await fallbackQuery(prompt, tier);
  }
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────
function buildPrompt(query, context) {
  const contextText = context
    .slice(0, 3) // max 3 slides to fit context window
    .map(c => `[${c.filename} — Slide ${c.slideNo}]\n${c.text}`)
    .join("\n\n");

  return `You are a study assistant for a VIT computer science student preparing for exams.
Answer the question using ONLY the provided study material context below.
Be concise — 2-3 sentences max. Focus on what matters for an exam.

STUDY MATERIAL:
${contextText}

QUESTION: ${query}

ANSWER:`;
}

// ─── TIER 1: GEMINI NANO ─────────────────────────────────────────────────────
async function queryGeminiNano(prompt, tier) {
  const session = await window.ai.languageModel.create({
    systemPrompt: "You are a concise exam study assistant for VIT students.",
  });

  const response = await session.prompt(prompt);
  session.destroy(); // free memory

  return {
    answer: response.trim(),
    tier: "Gemini Nano",
    tierLabel: "Gemini Nano · on-device",
    isOnDevice: true,
  };
}

// ─── TIER 2: WEBLLM ──────────────────────────────────────────────────────────
let webLLMEngine = null; // cached after first load

async function queryWebLLM(prompt, onProgress) {
  // Lazy import — only loads if needed
  const { CreateMLCEngine } = await import(
    "https://esm.run/@mlc-ai/web-llm"
  );

  if (!webLLMEngine) {
    webLLMEngine = await CreateMLCEngine("Phi-3-mini-4k-instruct-q4f16_1-MLC", {
      initProgressCallback: (progress) => {
        if (onProgress) {
          onProgress({
            text: progress.text,
            percent: Math.round(progress.progress * 100),
          });
        }
      },
    });
  }

  const reply = await webLLMEngine.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
    temperature: 0.3,
  });

  return {
    answer: reply.choices[0].message.content.trim(),
    tier: "WebLLM",
    tierLabel: "Phi-3 mini · on-device via WebGPU",
    isOnDevice: true,
  };
}

// ─── TIER 3: TRANSFORMERS.JS ─────────────────────────────────────────────────
let transformersPipeline = null;

async function queryTransformers(prompt) {
  const { pipeline } = await import(
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js"
  );

  if (!transformersPipeline) {
    transformersPipeline = await pipeline(
      "text-generation",
      "Xenova/TinyLlama-1.1B-Chat-v1.0",
      { quantized: true }
    );
  }

  const result = await transformersPipeline(prompt, {
    max_new_tokens: 150,
    temperature: 0.3,
    do_sample: true,
  });

  const answer = result[0].generated_text
    .replace(prompt, "")
    .trim();

  return {
    answer,
    tier: "Transformers.js",
    tierLabel: "TinyLlama · on-device via WASM",
    isOnDevice: true,
  };
}

// ─── FALLBACK CHAIN ──────────────────────────────────────────────────────────
async function fallbackQuery(prompt, failedTier) {
  const tierOrder = ["nano", "webllm", "transformers"];
  const nextIndex = tierOrder.indexOf(failedTier) + 1;

  if (nextIndex >= tierOrder.length) return null;

  const nextTier = tierOrder[nextIndex];
  try {
    switch (nextTier) {
      case "webllm": return await queryWebLLM(prompt, null);
      case "transformers": return await queryTransformers(prompt);
      default: return null;
    }
  } catch (err) {
    console.error(`[VITAssist] Fallback tier ${nextTier} also failed:`, err);
    return null;
  }
}

// ─── SUMMARY GENERATION ──────────────────────────────────────────────────────
export async function generateSummary(slides, subjectName, onProgress = null) {
  const tier = await detectAvailableTier();

  // Chunk slides to fit context window — max 8 slides per chunk
  const chunks = chunkArray(slides, 8);
  const allBullets = [];

  for (const chunk of chunks) {
    const contextText = chunk
      .map(s => `Slide ${s.slideNo}: ${s.text}`)
      .join("\n");

    const prompt = `You are helping a VIT ${subjectName} student prepare for their exam.
Read the following slide content and generate exactly 5 key exam bullet points.
Format: start each bullet with "• "
Be specific — include key terms, definitions, and concepts likely to appear in exams.

SLIDES:
${contextText}

5 EXAM BULLET POINTS:`;

    try {
      const result = await queryLLM("", [], onProgress);
      // Direct prompt for summary — bypass context injection
      const bullets = await directPrompt(prompt, tier, onProgress);
      if (bullets) allBullets.push(...bullets);
    } catch (_) {}
  }

  // Return top 5 most relevant bullets
  return allBullets.slice(0, 5);
}

async function directPrompt(prompt, tier, onProgress) {
  let rawAnswer = "";

  try {
    switch (tier) {
      case "nano":
      case "nano-pending": {
        const session = await window.ai.languageModel.create();
        rawAnswer = await session.prompt(prompt);
        session.destroy();
        break;
      }
      case "webllm": {
        const result = await queryWebLLM(prompt, onProgress);
        rawAnswer = result?.answer || "";
        break;
      }
      case "transformers": {
        const result = await queryTransformers(prompt);
        rawAnswer = result?.answer || "";
        break;
      }
    }
  } catch (_) {
    return null;
  }

  // Parse bullet points from response
  return rawAnswer
    .split("\n")
    .filter(line => line.trim().startsWith("•") || line.trim().match(/^\d+\./))
    .map(line => line.replace(/^[•\d.]\s*/, "").trim())
    .filter(line => line.length > 10);
}

// ─── MULTIMODAL — GEMINI FLASH ───────────────────────────────────────────────
// Uses embedded API key — shared pool, 1500 free calls/day
const GEMINI_API_KEY = "YOUR_GEMINI_FLASH_API_KEY_HERE"; // replace before shipping

export async function explainSlideImage(base64Image, subjectName) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: "image/png",
            data: base64Image,
          },
        },
        {
          text: `This is a slide from a ${subjectName} course at VIT university. 
Explain the key concept on this slide in simple terms for a student preparing for their exam.
Focus on: what is being explained, why it matters, and any key terms to remember.
Keep it under 4 sentences.`,
        },
      ],
    }],
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

    return {
      answer,
      tier: "Gemini Flash",
      tierLabel: "Gemini Flash · vision · cloud",
      isOnDevice: false,
    };
  } catch (err) {
    console.error("[VITAssist] Gemini Flash failed:", err);
    return null;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
