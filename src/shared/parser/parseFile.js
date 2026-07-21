import { parsePDF } from "./pdfParser.js";
import { parsePPTX } from "./pptxParser.js";

const EMPTY_RESULT = {
    lectureTitle: null,
    moduleNumber: null,
    pageCount: 0,
    slideCount: 0,
    pages: [],
    slides: [],
    fullText: ""
};

export async function parseFile(arrayBuffer, extension) {

    extension = extension.toLowerCase();

    try {

        switch (extension) {

            case "pdf":
                return await parsePDF(arrayBuffer);

            case "ppt":
            case "pptx":
                return await parsePPTX(arrayBuffer);

            default:
                console.warn("[VITAssist] Unsupported file type:", extension);
                return EMPTY_RESULT;
        }

    } catch (err) {

        console.error("========== PARSER FAILED ==========");
        console.error("Extension:", extension);
        console.error(err);
        console.error(err.stack);
        console.error("===================================");
    
        throw err;   // <-- temporarily
    }

}