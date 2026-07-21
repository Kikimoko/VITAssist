import { getFileIndex } from "../storage/storage.js";
const SNIPPET_PADDING = 60;
const DEFAULT_SNIPPET = 150;

function score(filename, file, query) {

  let score = 0;
  let bestMatch = null;

  const fileName = filename
      .replace(/\.[^/.]+$/, "")   // remove .pdf/.pptx
      .toLowerCase();

  const realFilename = String(file.realFilename || "").toLowerCase();
  const subject = String(file.subject || "").toLowerCase();
  const lecture = String(file.lectureTitle || "").toLowerCase();
  const module = String(file.moduleNumber || "").toLowerCase();
  const fullText = String(file.fullText || "").toLowerCase();

  if (fileName.includes(query))
      score += 200;

  if (realFilename.includes(query))
      score += 200;

  if (lecture.includes(query))
      score += 120;

  if (subject.includes(query))
      score += 40;

  if (module.includes(query))
      score += 20;

  if (fullText.includes(query))
      score += 80;

  // ---------- Search every slide/page ----------
  const sections = [
    ...(file.slides || []),
    ...(file.pages || [])
  ];

  sections.forEach(section => {

    const title = String(section.title || "").toLowerCase();
    const text = String(section.text || "").toLowerCase();

    let localScore = 0;

    const words = query.split(/\s+/);

const titleHits =
    words.filter(w => title.includes(w)).length;

const textHits =
    words.filter(w => text.includes(w)).length;

localScore += titleHits * 50;
localScore += textHits * 30;

      if (localScore > 0) {

        score += localScore;
    
        if (
            !bestMatch ||
            localScore > (bestMatch.score || 0)
        ) {
    
            bestMatch = {
    
                score: localScore,
    
                slideNo:
                    section.no ??
                    section.slide ??
                    section.page ??
                    null,
    
                title:
                    section.title || "",
    
                snippet:
                    makeSnippet(
                        section.text || "",
                        query
                    )
            };
    
        }
    
    }
  });

  return {
    score,
    bestMatch
  };
}
function makeSnippet(text, query) {

  if (!text)
      return "";

  // Clean OCR/PDF noise
  text = text
      .replace(/\r/g, " ")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")

      // Remove slide/page labels
      .replace(/Slide\s+\d+(\s*[-–]\s*\d+)?/gi, "")
      .replace(/Page\s+\d+/gi, "")

      // Remove copyright boilerplate
      .replace(/Copyright\s*©.*?(?=[A-Z][a-z]|\.)/gi, "")
      .replace(/All Rights Reserved\.?/gi, "")
      .replace(/Vellore Institute of Technology/gi, "")
      .trim();

  const lower = text.toLowerCase();
  const q = query.toLowerCase();

  const idx = lower.indexOf(q);

  // No match → return clean preview
  if (idx === -1) {

      let preview = text.slice(0, DEFAULT_SNIPPET);

      if (preview.length < text.length)
          preview += "...";

      return preview;
  }

  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + q.length + 100);

  let snippet = text.slice(start, end).trim();

  if (start > 0)
      snippet = "..." + snippet;

  if (end < text.length)
      snippet += "...";

  return snippet;
}

export async function searchLibrary(query) {
  console.log("searchLibrary()", query);
  query = query.trim().toLowerCase();

  if (!query)
      return [];

    const index = await getFileIndex();
    console.log(index);
    const results = [];

    Object.entries(index)
    .filter(([_, file]) => file.status !== "deleted")
    .forEach(([filename, file]) => {
        console.log(file);
        console.log(
          file.subject,
          typeof file.subject,
          file.lectureTitle,
          typeof file.lectureTitle,
          file.moduleNumber,
          typeof file.moduleNumber
      );
      console.log(
        file.lectureTitle,
        "slides:", file.slides?.length,
        "pages:", file.pages?.length,
        "fullText chars:", file.fullText?.length
    );
      const result = score(filename,file, query);

      if (result.score === 0)
          return;

      
            console.log(results);
            results.push({
              filename,
              score: result.score,
          
              subject: file.subject,
              lectureTitle: file.lectureTitle,
              moduleNumber: file.moduleNumber,
          
              // IMPORTANT
              downloadId: file.downloadId ?? null,
              path: file.path ?? null,
              folderPath: file.folderPath ?? null,
              realFilename: file.realFilename ?? filename,
          
              page:
                  file.pages?.find(p =>
                      String(p.title || "").toLowerCase().includes(query) ||
                      String(p.text || "").toLowerCase().includes(query)
                  )?.page ?? null,
          
              slide:
                  file.slides?.find(s =>
                      String(s.title || "").toLowerCase().includes(query) ||
                      String(s.text || "").toLowerCase().includes(query)
                  )?.slide ?? null,
          
              slideNo: result.bestMatch?.slideNo ?? null,
          
              snippet: result.bestMatch?.snippet ?? null,
              matchedTitle: result.bestMatch?.title ?? null,
          
              type:
                  file.path?.toLowerCase().endsWith(".pdf")
                      ? "pdf"
                      : "ppt"
          });

    });

    results.sort((a,b)=>b.score-a.score);
    
    return results;

}