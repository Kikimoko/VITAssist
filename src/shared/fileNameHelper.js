// src/shared/fileNameHelper.js
//
// VTOP filename formats observed in the wild:
//   Normal:  WINSEM2025-26_VL_BCSE308P_00100_LO_2026-05-12_M7_Packet_Tracer.pptx
//   Broken:  SUMSEM2025 26 VL BCSE308P 00100 LO 2026 05 12 M7 Packet Tracer.pptx
//
// Both contain the same information — just different delimiters.
// Strategy: normalise to underscores first, then parse positionally.

export function buildCleanFilename(originalFilename, subjectName) {
    // Strip path prefix
    const file = originalFilename.split("/").pop().split("\\").pop();
  
    // Separate extension
    const lastDot = file.lastIndexOf(".");
    const ext  = lastDot !== -1 ? file.substring(lastDot) : "";
    const base = lastDot !== -1 ? file.substring(0, lastDot) : file;
  
    // ── Normalise delimiters ──────────────────────────────────────────────────
    // VTOP sometimes delivers filenames with spaces instead of underscores.
    // Normalise everything to underscore so the positional parser works.
    //
    // But: "2025-26" and "2026-05-12" contain hyphens that are part of the value.
    // We only want to convert spaces → underscores, not touch existing hyphens.
    const normalised = base
      .replace(/ /g, "_")   // spaces → underscores
      .replace(/__+/g, "_"); // collapse double underscores
  
    const parts = normalised.split("_");
  
    // ── Validate VTOP format ──────────────────────────────────────────────────
    // Format: [SEMESTER]_[VL|EL|ETH|LO]_[COURSECODE]_[SECTION]_[TYPE]_[DATE]_[TOPIC...]
    // Minimum 6 parts; part[0] starts with WIN/FALL/SUM + SEM
    const isVTOP =
      parts.length >= 6 &&
      /^(?:WIN|FALL|SUM)SEM/i.test(parts[0]);
  
    if (!isVTOP) {
      // Not a VTOP file — minimal cleanup
      return file.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    }
  
    // ── Find topic start index ────────────────────────────────────────────────
    // The date is always at a fixed position but let's find it robustly.
    // Date pattern in parts: either "2026-05-12" (single part) or "2026", "05", "12" (three parts)
    // After normalisation with space→underscore, "2026 05 12" becomes "2026_05_12" = 3 separate parts.
    //
    // Strategy: find the part index of the course code, then skip:
    //   courseCode part + section number + type + date parts (1 or 3)
    //
    // Course code is always 2-4 uppercase letters + 3 digits + optional letter
    let courseCodeIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      if (/^[A-Z]{2,4}\d{3}[A-Z]?$/.test(parts[i])) {
        courseCodeIndex = i;
        break;
      }
    }
  
    // If we can't find the course code, fall back to skipping first 6 parts
    let topicStartIndex = 6;
  
    if (courseCodeIndex !== -1) {
      // After courseCode:
      //   +1 = section number (e.g. 00100)
      //   +2 = type (TH, LO, ETH, LT)
      //   +3 = date start
      const dateStartIndex = courseCodeIndex + 3;
      const datePart = parts[dateStartIndex] || "";
  
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        // Date is a single part "2026-05-12"
        topicStartIndex = dateStartIndex + 1;
      } else if (/^\d{4}$/.test(datePart)) {
        // Date was split into three parts "2026", "05", "12"
        topicStartIndex = dateStartIndex + 3;
      } else {
        topicStartIndex = courseCodeIndex + 4;
      }
    }
  
    // ── Extract and clean topic ───────────────────────────────────────────────
    const rawTopic = parts.slice(topicStartIndex).join(" ").trim();
  
    const cleanTopic = rawTopic
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  
    // ── Extract module number ─────────────────────────────────────────────────
    const moduleMatch = cleanTopic.match(/\bM(?:odule)?[\s-]*(\d+)\b/i);
    const moduleStr   = moduleMatch ? `Module ${moduleMatch[1]}` : null;
  
    // ── Extract lecture number ────────────────────────────────────────────────
    const lectureMatch = cleanTopic.match(/\bL(?:ecture)?[\s-]*(\d+)\b/i);
    const lectureStr   = lectureMatch ? `Lecture ${lectureMatch[1]}` : null;
  
    // ── Build topic body ──────────────────────────────────────────────────────
    let topicBody = cleanTopic
      .replace(/\bM(?:odule)?[\s-]*\d+\b/gi, "")
      .replace(/\bL(?:ecture)?[\s-]*\d+\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  
    // Title-case
    topicBody = topicBody
      .split(" ")
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  
    // ── Assemble ──────────────────────────────────────────────────────────────
    const nameParts = [subjectName];
    if (moduleStr)            nameParts.push(moduleStr);
    if (lectureStr)           nameParts.push(lectureStr);
    if (topicBody.length > 0) nameParts.push(topicBody);
  
    return nameParts.join(" - ") + ext;
  }