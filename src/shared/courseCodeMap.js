// src/shared/courseCodeMap.js
// VIT course code → subject name mapping
// ADD YOUR FULL LIST HERE — crowd-source from classmates for completeness

const COURSE_CODE_MAP = {
  // Computer Science core
  "BCSE101L": "Engineering Mathematics",
  "BCSE102L": "Problem Solving and Object Oriented Programming",
  "BCSE201L": "Data Structures and Algorithms",
  "BCSE202L": "Digital Principles and Computer Organization",
  "BCSE203L": "Database Management Systems",
  "BCSE204L": "Operating Systems",
  "BCSE301L": "Computer Networks",
  "BCSE302L": "Design and Analysis of Algorithms",
  "BCSE303L": "Software Engineering",
  "BCSE304L": "Compiler Design",
  "BCSE305L": "Theory of Computation",
  "BCSE306L": "Artificial Intelligence",

  // Information Security specialisation
  "BCSE317L": "Information Security",
  "BCSE318L": "Network Security",
  "BCSE319L": "Cryptography and Network Security",
  "BCSE320L": "Cyber Forensics",
  "BCSE321L": "Ethical Hacking",
  "BCSE322L": "Malware Analysis",
  "BCSE323L": "Cloud Security",
  "BCSE324L": "Application Security",
  "BCSE325L": "Security Operations Center",
  "BCSE326L": "IoT Security",

  // Labs
  "BCSE101P": "Programming Lab",
  "BCSE201P": "Data Structures Lab",
  "BCSE203P": "DBMS Lab",
  "BCSE301P": "Networks Lab",
  "BCSE317P": "Information Security Lab",
  "BCSE318P": "Network Security Lab",
  "BCSE319P": "Cryptography Lab",

  // Mathematics
  "BMAT101L": "Calculus and its Applications",
  "BMAT201L": "Linear Algebra and its Applications",
  "BMAT301L": "Probability and Statistics",
  "BMAT302L": "Discrete Mathematics and Graph Theory",

  // Physics / Chemistry
  "BPHY101L": "Engineering Physics",
  "BCHE101L": "Engineering Chemistry",

  // Electronics
  "BECE201L": "Digital Electronics",
  "BECE202L": "Analog Electronics",
  "BECE301L": "Microprocessors and Microcontrollers",

  // Professional courses
  "BSTS101L": "Technical English",
  "BSTS201L": "Professional Communication",
  "BENG101L": "English for Engineers",

  // Management
  "BMGT401L": "Principles of Management",
  "BMGT402L": "Engineering Economics",

  // ADD MORE — paste your full VTOP course list below
};

// Extract module number from topic string
// e.g. "M5_kernel_modes" → "M5"
export function extractModuleNumber(topicStr) {
  const match = topicStr.match(/M(\d+)/i);
  return match ? `M${match[1]}` : null;
}

// Clean topic string into readable format
// e.g. "types-of-threats" → "Types of Threats"
export function cleanTopicName(topicStr) {
  return topicStr
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// Parse raw VIT filename into parts
// e.g. "WINSEM2025-26_VL_BCSE318L_00100_TH_2026-03-11_types-of-threats.pptx"
export function parseVITFilename(rawFilename) {
  // Remove extension
  const ext = rawFilename.split(".").pop().toLowerCase();
  const base = rawFilename.replace(`.${ext}`, "");

  // Split by underscore
  const parts = base.split("_");

  // VIT filename structure:
  // [0] WINSEM2025-26 or FALLSEM2025-26
  // [1] VL or EL or ETH
  // [2] course code e.g. BCSE318L
  // [3] section number e.g. 00100
  // [4] type TH/LT/ETH
  // [5] date YYYY-MM-DD
  // [6..] topic words

  if (parts.length < 6) {
    return null; // Not a VIT file — skip
  }

  const semester = parts[0]; // WINSEM2025-26
  const courseCode = parts[2]; // BCSE318L
  const date = parts[5]; // 2026-03-11
  const topicParts = parts.slice(6); // ["types", "of", "threats"]
  const topicRaw = topicParts.join("-");

  const subjectName = COURSE_CODE_MAP[courseCode] || courseCode;
  const moduleNumber = extractModuleNumber(topicRaw);
  const topicClean = cleanTopicName(topicRaw.replace(/^M\d+-?/i, ""));

  return {
    courseCode,
    subjectName,
    semester,
    date,
    moduleNumber,
    topicClean,
    extension: ext,
    isKnownCourse: !!COURSE_CODE_MAP[courseCode],
  };
}

// Build the clean output filename
// e.g. "M5 — Network Security — Types of Threats.pptx"
export function buildCleanFilename(parsed) {
  if (!parsed) return null;

  const parts = [];
  if (parsed.moduleNumber) parts.push(parsed.moduleNumber);
  parts.push(parsed.subjectName);
  if (parsed.topicClean) parts.push(parsed.topicClean);

  return `${parts.join(" — ")}.${parsed.extension}`;
}

// Build subfolder path inside Downloads/VITAssist/
// e.g. "VITAssist/Network Security"
export function buildFolderPath(parsed) {
  if (!parsed) return "VITAssist/Unknown";
  return `VITAssist/${parsed.subjectName}`;
}

export default COURSE_CODE_MAP;
