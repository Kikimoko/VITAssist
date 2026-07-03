import { getFileIndex } from "../storage/storage.js";

function score(file, query) {
  query = query.toLowerCase();

  let score = 0;
  let bestMatch = null;

  const subject = String(file.subject || "").toLowerCase();
  const lecture = String(file.lectureTitle || "").toLowerCase();
  const module = String(file.moduleNumber || "").toLowerCase();
  const fullText = String(file.fullText || "").toLowerCase();

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

    if (title.includes(query))
      localScore += 100;

    if (text.includes(query))
      localScore += 80;

    if (localScore > 0) {

      if (localScore > score)
        score += localScore;

        bestMatch = {
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
  });

  return {
    score,
    bestMatch
  };
}
function makeSnippet(text, query) {

  if (!text)
    return "";

  const lower = text.toLowerCase();

  const idx = lower.indexOf(query.toLowerCase());

  if (idx === -1)
    return text.substring(0, 150);

  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 60);

  return "..." + text.substring(start, end) + "...";
}

export async function searchLibrary(query) {
  console.log("searchLibrary()", query);
    if (!query.trim())
        return [];

    const index = await getFileIndex();
    console.log(index);
    const results = [];

    Object.entries(index).forEach(([filename, file]) => {
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
      const result = score(file, query);

      if (result.score === 0)
          return;

          let hit = null;

          // Search pages
          for (const page of (file.pages || [])) {
          
              const title = String(page.title || "").toLowerCase();
              const text  = String(page.text || "").toLowerCase();
          
              if (title.includes(query) || text.includes(query)) {
          
                  hit = {
                      page: page.page || page.no
                  };
          
                  break;
              }
          }
          
          // Search slides
          if (!hit) {
          
              for (const slide of (file.slides || [])) {
          
                  const title = String(slide.title || "").toLowerCase();
                  const text  = String(slide.text || "").toLowerCase();
          
                  if (title.includes(query) || text.includes(query)) {
          
                      hit = {
                          slide: slide.slide || slide.no
                      };
          
                      break;
                  }
              }
          }
            console.log(results);
            results.push({
                filename,
                score: result.score,
            
                subject: file.subject,
            
                lectureTitle: file.lectureTitle,
            
                moduleNumber: file.moduleNumber,
            
                downloadId: file.downloadId,
            
                path: file.path,
            
                page: hit?.page,
            
                slide: hit?.slide,
              slideNo: result.bestMatch?.slideNo || null,

              snippet: result.bestMatch?.snippet || null,

              matchedTitle: result.bestMatch?.title || null,
            
                type:
                    file.path.endsWith(".pdf")
                        ? "pdf"
                        : "ppt"
            
            });

    });

    results.sort((a,b)=>b.score-a.score);
    
    return results;

}