import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import workerPath from "tesseract.js/dist/worker.min.js?url";
import corePath from "tesseract.js-core/tesseract-core.wasm.js?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
let ocrWorker = null;

async function getOCRWorker() {
    if (ocrWorker) return ocrWorker;

    ocrWorker = await createWorker("eng", 1, {
        workerPath,
        corePath,
    });

    return ocrWorker;
}
async function ocrPage(page) {

    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: ctx,
        viewport
    }).promise;

    const worker = await getOCRWorker();

    const {
        data: { text }
    } = await worker.recognize(canvas);

    return normalize(text);
}

function normalize(text) {
    return text
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function cleanupTitle(title) {
    if (!title) return "";

    return title
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")

        // collapse whitespace
        .replace(/\s+/g, " ")

        // remove duplicate words
        .replace(/\b(\w+)\s+\1\b/gi, "$1")

        // remove repeated phrases
        .replace(/\b(.+?)\s+\1\b/gi, "$1")

        // remove lecturer names
        .replace(/^Prof\.?.*$/i, "")
        .replace(/^Dr\.?.*$/i, "")

        // remove trailing separators
        .replace(/[-|:]\s*$/, "")

        // remove page numbers
        .replace(/^Page\s+\d+$/i, "")
        .replace(/^VIT$/i, "")
.replace(/^Vellore Institute.*$/i, "")
.replace(/^Cryptography and Network Security$/i, "Cryptography and Network Security")
.replace(/^Cloud Architecture Design$/i, "Cloud Architecture Design")
        .trim();
}

function extractModule(text) {
    const match =
        text.match(/Module\s*[-:]?\s*(\d+)/i) ||
        text.match(/\bM\s*([0-9]+)\b/i);

    if (!match) return null;

    return `Module ${match[1]}`;
}

function scoreTitle(line) {

    let score = 0;

    line = normalize(line);

    if (line.length < 5) return -100;
    if (line.length > 90) return -100;

    // Bad candidates
    if (/^page\s+\d+$/i.test(line)) score -= 100;
    if (/^slide\s+\d+$/i.test(line)) score -= 100;
    if (/^https?:\/\//i.test(line)) score -= 100;
    if (/^\d+$/.test(line)) score -= 100;

    if (/copyright/i.test(line)) score -= 40;
    if (/department/i.test(line)) score -= 30;
    if (/school/i.test(line)) score -= 30;
    if (/faculty/i.test(line)) score -= 30;
    if (/prof/i.test(line)) score -= 30;
    if (/dr\./i.test(line)) score -= 30;
    if (/vellore institute/i.test(line)) score -= 50;
    if (/vit/i.test(line)) score -= 20;

    // Good candidates
    if (line.split(" ").length <= 8)
        score += 25;

    if (/^[A-Z0-9 ()\-&/,]+$/.test(line))
        score += 20;

    if (
        /^[A-Z]/.test(line) &&
        !line.endsWith(".")
    )
        score += 10;

    return score;
}

function guessLectureTitle(lines) {

    let best = "";
    let bestScore = -999;

    for (const line of lines) {

        const s = scoreTitle(line);

        if (s > bestScore) {

            bestScore = s;
            best = line;

        }

    }

    return cleanupTitle(best);

}
export async function parsePDF(arrayBuffer) {

    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
    }).promise;

    const pages = [];
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {

        const page = await pdf.getPage(i);

        const content = await page.getTextContent();

        let pageText = "";

        let lastY = null;

        for (const item of content.items) {

            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 4) {
                pageText += "\n";
            }

            pageText += item.str + " ";

            lastY = item.transform[5];
        }
        pageText = pageText
            .replace(/[ ]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        // If almost no text was extracted, try OCR
let usedOCR = false;
if (pageText.length < 20) {

    console.log(`Running OCR on page ${i}...`);

    try {

        pageText = await ocrPage(page);

        usedOCR = true;

        console.log(`OCR extracted ${pageText.length} characters`);

    } catch (err) {

        console.error("OCR failed:", err);

        pageText = "";

        usedOCR = false;
    }
}
        const lines = pageText
            .split("\n")
            .map(normalize)
            .filter(Boolean);

        const pageTitle =
            guessLectureTitle(lines) ||
            `Page ${i}`;

        pages.push({
            no: i,
            title: pageTitle,
            text: pageText,
            ocr: usedOCR
        });
        console.log("PAGE", i);
        console.log(pageTitle);
        console.log(pageText.substring(0, 300));

        if (pageText.trim())
    fullText += pageText + "\n";

    }

    const firstPageLines =
        pages.length
            ? pages[0].text.split("\n").map(normalize).filter(Boolean)
            : [];


    return {
        lectureTitle:
    pages.find(p => p.title && !/^Page\s+\d+$/i.test(p.title))
        ?.title || "",

        moduleNumber:
            extractModule(fullText),

        pageCount:
            pdf.numPages,

        pages,

        fullText,

        parsedAt:
            Date.now(),
    };

}