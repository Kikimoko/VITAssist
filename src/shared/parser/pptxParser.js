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

  let score = 0;

  if (line.length > 8) score += 3;
  if (line.length < 70) score += 2;

  if (/module/i.test(line)) score -= 5;
  if (/copyright/i.test(line)) score -= 5;
  if (/department/i.test(line)) score -= 5;
  if (/school/i.test(line)) score -= 5;
  if (/faculty/i.test(line)) score -= 5;
  if (/dr\./i.test(line)) score -= 5;
  if (/prof/i.test(line)) score -= 5;

  if (/^[A-Z0-9 ()\-]+$/.test(line))
    score += 5;

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

  return best;
}

function extractSlideText(xml) {

  const parser = new DOMParser();

  const doc = parser.parseFromString(xml, "application/xml");

  return Array.from(doc.getElementsByTagName("a:t"))
      .map(node => node.textContent)
      .join("\n");

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

    const text = extractSlideText(xml);
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
        cleanupTitle(
            guessLectureTitle(lines)
        ) ||
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

  const firstSlideLines = slides[0]?.text
      .split("\n")
      .map(normalize)
      .filter(Boolean) || [];
      console.log("FINAL SLIDES:", slides.length);

      return {

        lectureTitle:
            slides.length
                ? slides[0].title
                : "",
    
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