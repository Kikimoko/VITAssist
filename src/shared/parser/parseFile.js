import { parsePDF } from "./pdfParser";
import { parsePPTX } from "./pptxParser";

export async function parseFile(arrayBuffer, extension) {

    extension = extension.toLowerCase();

    switch (extension) {

        case "pdf":
            return await parsePDF(arrayBuffer);

        case "ppt":
            

        case "pptx":
            return await parsePPTX(arrayBuffer);

        default:
            return {

                lectureTitle: null,

                moduleNumber: null,

                pageCount: 0,

                slideCount: 0,

                pages: [],

                slides: [],

                fullText: ""

            };
    }
}