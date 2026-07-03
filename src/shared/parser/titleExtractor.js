function cleanTitle(text) {
    if (!text) return "";
  
    return text
      .replace(/\r/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[^\w\s\-()]/g, "")
      .trim();
  }
  
  function score(line) {
    let s = 0;
  
    if (line.length > 8) s += 2;
    if (line.length < 80) s += 2;
  
    if (/module/i.test(line)) s -= 5;
    if (/department/i.test(line)) s -= 5;
    if (/school/i.test(line)) s -= 5;
    if (/university/i.test(line)) s -= 5;
    if (/dr\./i.test(line)) s -= 5;
    if (/prof/i.test(line)) s -= 5;
    if (/copyright/i.test(line)) s -= 5;
  
    if (/^[A-Z\s]+$/.test(line)) s += 3;
  
    return s;
  }
  
  export function extractLectureTitle(text) {
    const lines = text
      .split("\n")
      .map(cleanTitle)
      .filter(Boolean);
  
    let best = "";
    let bestScore = -999;
  
    for (const line of lines.slice(0, 40)) {
      const sc = score(line);
  
      if (sc > bestScore) {
        bestScore = sc;
        best = line;
      }
    }
  
    return best;
  }