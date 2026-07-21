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

    line = normalize(line);

    if (!line) return -999;

    let score = 0;

    // Length
    if (line.length < 5) return -999;
    if (line.length > 80) score -= 150;

    const lower = line.toLowerCase();

    // ---------- Reject garbage ----------
    if (/^page\s+\d+$/i.test(line)) score -= 500;
    if (/^slide\s+\d+$/i.test(line)) score -= 500;
    if (/^\d+$/.test(line)) score -= 500;

    if (/copyright/i.test(lower)) score -= 1000;
    if (/isbn/i.test(lower)) score -= 1000;
    if (/all rights reserved/i.test(lower)) score -= 1000;
    if (/published by/i.test(lower)) score -= 1000;

    if (/ramez|elmasri|navathe|pearson|mcgraw|springer/i.test(lower))
        score -= 1000;

    if (/department|faculty|school|prof|dr\.|vellore institute/i.test(lower))
        score -= 500;

    // Course codes
    if (/^[A-Z]{4}\d+[A-Z]?$/i.test(line))
        score -= 800;

    // ---------- Positive ----------
    const words = line.split(/\s+/).length;

    if (words >= 2 && words <= 8)
        score += 120;

    if (/^[A-Z]/.test(line))
        score += 40;

    if (!line.endsWith("."))
        score += 20;

    if (/[-:&]/.test(line))
        score += 10;
        if (/module/i.test(lower))
        score += 50;
    
    if (/chapter/i.test(lower))
        score += 40;
    
    if (/unit/i.test(lower))
        score += 40;
    
    if (/introduction/i.test(lower))
        score += 30;
    
    if (/security|network|database|cloud|kernel|process|thread|memory/i.test(lower))
        score += 20;

    return score;
}
function guessLectureTitle(lines) {

    let best = "";
    let bestScore = -999;

    for (const line of lines) {

        const score = scoreTitle(line);

        if (score > bestScore) {
            bestScore = score;
            best = line;
        }
    }

    best = cleanupTitle(best);

if (!best)
    return "";

return best;
}
function chooseBestLectureTitle(pages) {

    let best = "";
    let bestScore = -999;

    for (const page of pages) {

        if (!page.title)
            continue;

        let score = scoreTitle(page.title);

        // Prefer earlier pages
        if (page.no === 1)
            score += 30;
        else if (page.no === 2)
            score += 20;
        else if (page.no === 3)
            score += 10;

        if (score > bestScore) {

            bestScore = score;
            best = page.title;

        }

    }

    best = cleanupTitle(best);

if (!best)
    return "";

return best;

}
export async function parsePDF(arrayBuffer) {
    console.log("parsePDF called");
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

            const title =
            cleanupTitle(pptTitle) ||
            cleanupTitle(
                guessLectureTitle(lines.slice(0, 8))
            ) ||
            `Slide ${slides.length + 1}`;

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
    console.log("==========");
    console.log("FINAL TITLE:", chooseBestLectureTitle(pages));
    console.table(pages.map(p => ({
        page: p.no,
        title: p.title
    })));
    console.log("==========");
    console.log({
        fullTextLength: fullText.length,
        pages: pages.length,
        lectureTitle: chooseBestLectureTitle(pages)
    });
    

            return {

                lectureTitle:
                    chooseBestLectureTitle(pages),
            
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