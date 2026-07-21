import JSZip from "jszip";

function normalize(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractModule(text) {
  const match =
    text.match(/Module\s*[-:]?\s*(\d+)/i) ||
    text.match(/\bM\s*([0-9]+)\b/i);

  return match ? `Module ${match[1]}` : null;
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
function chooseBestSlideTitle(slides) {

  let best = "";
  let bestScore = -999;

  for (const slide of slides) {

      if (!slide.title)
          continue;

      let score = scoreTitle(slide.title);

      if (slide.no === 1)
          score += 30;

      if (score > bestScore) {

          bestScore = score;
          best = slide.title;

      }

  }

  best = cleanupTitle(best);

if (!best)
    return "";

return best;

}

function extractSlideContent(xml) {

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  // Title placeholder
  let title = "";

  const spList = Array.from(doc.getElementsByTagName("p:sp"));

  for (const sp of spList) {

      const ph = sp.getElementsByTagName("p:ph")[0];

      if (ph?.getAttribute("type") === "title") {

          title = Array.from(sp.getElementsByTagName("a:t"))
              .map(n => n.textContent)
              .join(" ")
              .trim();

          break;
      }
  }

  // Entire slide text
  const text = Array.from(doc.getElementsByTagName("a:t"))
      .map(n => n.textContent)
      .join("\n");

  return { title, text };

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
      .replace(/^copyright.*$/i, "")
.replace(/^isbn.*$/i, "")
.replace(/^all rights reserved.*$/i, "")
.replace(/^published by.*$/i, "")
.replace(/^department.*$/i, "")
.replace(/^school.*$/i, "")
.replace(/^faculty.*$/i, "")
.replace(/^prof\.?.*$/i, "")
.replace(/^dr\.?.*$/i, "")
.replace(/^BCSE\d+[A-Z]?$/i, "")
.replace(/^Page\s+\d+$/i, "")
.replace(/^Slide\s+\d+$/i, "")
.replace(/[©®]/g, "")

      .trim();
}

export async function parsePPTX(arrayBuffer) {

  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideNames = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a,b)=>{

      const na = Number(a.match(/\d+/)[0]);
      const nb = Number(b.match(/\d+/)[0]);

      return na-nb;

    });
    console.log("Slides found:", slideNames.length);
console.log(slideNames);

  const slides = [];

  let fullText = "";

  for (const slidePath of slideNames) {
    console.log("Reading", slidePath);

    const xml = await zip.file(slidePath).async("string");

    const { title: pptTitle, text } = extractSlideContent(xml);
    console.log(
      "Characters:",
      text.length,
      text.substring(0,150)
  );

    const lines = text
        .split("\n")
        .map(normalize)
        .filter(Boolean);

        const title =
    cleanupTitle(pptTitle) ||
    cleanupTitle(guessLectureTitle(lines)) ||
    `Slide ${slides.length + 1}`;
        if (text.trim().length < 5)
        continue;
        slides.push({
          no: slides.length + 1,
          title,
          text
      });
      console.log(
        "Saved slide",
        slides.length,
        title
    );

    fullText += text + "\n";

}


      return {

        lectureTitle:
            chooseBestSlideTitle(slides),
    
        moduleNumber:
            extractModule(fullText),
    
        slideCount:
            slides.length,
    
        slides,
    
        fullText,
    
        parsedAt:
            Date.now()
    
    };

}