// src/shared/storage/storage.js
// Single source of truth for all chrome.storage.local operations
// Schema is defined here — never write raw storage calls elsewhere

// ─── KEYS ───────────────────────────────────────────────────────────────────
export const KEYS = {
    FILE_INDEX:   "vitassist_file_index",    // { [filename]: { subject, module, slides: [{no, title, text}], path, dateAdded } }
    CHECKLIST:    "vitassist_checklist",     // { [subject]: { topics: [{id, label, done}] } }
    NOTES:        "vitassist_notes",         // { [`${filename}::${slideNo}`]: { text, timestamp } }
    SUMMARIES:    "vitassist_summaries",     // { [filename]: { bullets: string[], generatedAt: timestamp, llmTier: string } }
    SUBJECTS:     "vitassist_subjects",      // { [subject]: { examDate: ISO string, color: string } }
    SETTINGS:     "vitassist_settings",      // { llmTier: string, notificationsEnabled: bool, lastPortalCheck: timestamp }
    PORTAL_CACHE: "vitassist_portal_cache",  // { fileList: string[], lastChecked: timestamp }
  };
  
  // ─── FILE INDEX ──────────────────────────────────────────────────────────────
  export async function getFileIndex() {
    const res = await chrome.storage.local.get(KEYS.FILE_INDEX);
    return res[KEYS.FILE_INDEX] || {};
  }
  
  export async function addFileToIndex(filename, metadata) {
    console.log("folderPath =", folderPath);
console.log("cleanName =", cleanName);
console.log("stored path =", `${folderPath}/${cleanName}`);
    const index = await getFileIndex();
  
    index[filename] = {
      ...metadata,
  
      // Parsing metadata
      lectureTitle: metadata.lectureTitle ?? null,
      moduleNumber: metadata.moduleNumber ?? null,
  
      fullText: metadata.fullText ?? "",
  
      pages: metadata.pages ?? [],
      slides: metadata.slides ?? [],
  
      pageCount: metadata.pageCount ?? 0,
      slideCount: metadata.slideCount ?? 0,
  
      parsed: metadata.parsed ?? false,
parsingStatus: metadata.parsingStatus ?? "pending",

// File lifecycle
status: metadata.status ?? "active",
deletedAt: metadata.deletedAt ?? null,
lastIndexed: Date.now(),

dateAdded: metadata.dateAdded ?? Date.now(),
    };
    const verify =
    await chrome.storage.local.get("vitassist_file_index");

console.log(
    "VERIFY INDEX ENTRY",
    verify.vitassist_file_index?.[filename]
);
    await chrome.storage.local.set({
      [KEYS.FILE_INDEX]: index,
    });
  }
  export async function updateFileMetadata(filename, updates) {
  
    const index = await getFileIndex();
  
    if (!index[filename]) return;
  
    index[filename] = {
      ...index[filename],
      ...updates,
    };
  
    await chrome.storage.local.set({
      [KEYS.FILE_INDEX]: index,
    });
  
  }
  export async function getFileMetadata(filename) {
  
    const index = await getFileIndex();
  
    return index[filename] || null;
  
  }
  export async function getFilesForSubject(subject) {
    const index = await getFileIndex();
    return Object.entries(index)
    .filter(([_, meta]) =>
    meta.subject === subject &&
    meta.status !== "deleted"
)
      .map(([filename, meta]) => ({ filename, ...meta }));
  }
  export async function getPendingFiles() {

    const index = await getFileIndex();

    return Object.entries(index)
        .filter(([_, file]) =>
            file.status !== "deleted" &&
            !file.parsed
        )
        .map(([filename, file]) => ({
            filename,
            ...file
        }));

}
  export async function markParsing(filename) {
    return updateFileMetadata(filename, {
      parsed: false,
      parsingStatus: "processing",
    });
  }
  export async function markParsed(filename) {
    return updateFileMetadata(filename, {
      parsed: true,
      parsingStatus: "completed",
    });
  }
  export async function markDeleted(filename) {

    return updateFileMetadata(filename, {

        status: "deleted",

        deletedAt: Date.now()

    });

}

export async function restoreFile(filename) {

    return updateFileMetadata(filename, {

        status: "active",

        deletedAt: null

    });

}
  
  export async function getAllSubjectsFromIndex() {

    const index = await getFileIndex();

    return [
        ...new Set(
            Object.values(index)
                .filter(file => file.status !== "deleted")
                .map(file => file.subject)
        )
    ];

}
  
  // ─── CHECKLIST ───────────────────────────────────────────────────────────────
  export async function getChecklist(subject) {
    const res = await chrome.storage.local.get(KEYS.CHECKLIST);
    const all = res[KEYS.CHECKLIST] || {};
    return all[subject] || { topics: [] };
  }
  
  export async function saveChecklist(subject, topics) {
    const res = await chrome.storage.local.get(KEYS.CHECKLIST);
    const all = res[KEYS.CHECKLIST] || {};
    all[subject] = { topics };
    await chrome.storage.local.set({ [KEYS.CHECKLIST]: all });
  }
  
  export async function toggleChecklistTopic(subject, topicId) {
    const checklist = await getChecklist(subject);
    checklist.topics = checklist.topics.map(t =>
      t.id === topicId ? { ...t, done: !t.done } : t
    );
    await saveChecklist(subject, checklist.topics);
    return checklist.topics;
  }
  
  // ─── NOTES ───────────────────────────────────────────────────────────────────
  export async function getNotes() {
    const res = await chrome.storage.local.get(KEYS.NOTES);
    return res[KEYS.NOTES] || {};
  }
  
  export async function getNoteForSlide(filename, slideNo) {
    const notes = await getNotes();
    return notes[`${filename}::${slideNo}`] || null;
  }
  
  export async function saveNote(filename, slideNo, text) {
    const notes = await getNotes();
    notes[`${filename}::${slideNo}`] = {
      text,
      timestamp: Date.now(),
      pinned: false
  };
    await chrome.storage.local.set({ [KEYS.NOTES]: notes });
  }
  
  export async function deleteNote(filename, slideNo) {
    const notes = await getNotes();
    delete notes[`${filename}::${slideNo}`];
    await chrome.storage.local.set({ [KEYS.NOTES]: notes });
  }
  
  export async function getNotesForFile(filename) {
    const notes = await getNotes();
    return Object.entries(notes)
      .filter(([key]) => key.startsWith(`${filename}::`))
      .map(([key, val]) => ({
        slideNo: parseInt(key.split("::")[1]),
        ...val,
      }))
      .sort((a, b) => a.slideNo - b.slideNo);
  }
  
  // ─── SUMMARIES ───────────────────────────────────────────────────────────────
  export async function getSummary(filename) {
    const res = await chrome.storage.local.get(KEYS.SUMMARIES);
    const all = res[KEYS.SUMMARIES] || {};
    return all[filename] || null;
  }
  
  export async function saveSummary(filename, bullets, llmTier) {
    const res = await chrome.storage.local.get(KEYS.SUMMARIES);
    const all = res[KEYS.SUMMARIES] || {};
    all[filename] = { bullets, llmTier, generatedAt: Date.now() };
    await chrome.storage.local.set({ [KEYS.SUMMARIES]: all });
  }
  
  // ─── SUBJECTS (exam dates etc.) ───────────────────────────────────────────────
  export async function getSubjects() {
    const res = await chrome.storage.local.get(KEYS.SUBJECTS);
    return res[KEYS.SUBJECTS] || {};
  }
  
  export async function saveSubjectMeta(subject, meta) {
    const subjects = await getSubjects();
    subjects[subject] = { ...subjects[subject], ...meta };
    await chrome.storage.local.set({ [KEYS.SUBJECTS]: subjects });
  }
  
  // ─── SETTINGS ────────────────────────────────────────────────────────────────
  export async function getSettings() {
    const res = await chrome.storage.local.get(KEYS.SETTINGS);
    return res[KEYS.SETTINGS] || {
      llmTier: "auto",
      notificationsEnabled: true,
      lastPortalCheck: null,
    };
  }
  
  export async function saveSetting(key, value) {
    const settings = await getSettings();
    settings[key] = value;
    await chrome.storage.local.set({ [KEYS.SETTINGS]: settings });
  }
  
  // ─── PORTAL CACHE ────────────────────────────────────────────────────────────
  export async function getPortalCache() {
    const res = await chrome.storage.local.get(KEYS.PORTAL_CACHE);
    return res[KEYS.PORTAL_CACHE] || { fileList: [], lastChecked: null };
  }
  
  export async function savePortalCache(fileList) {
    await chrome.storage.local.set({
      [KEYS.PORTAL_CACHE]: { fileList, lastChecked: Date.now() },
    });
  }
  
  // ─── UTILS ───────────────────────────────────────────────────────────────────
  export async function getStorageStats() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        resolve({
          usedBytes: bytes,
          usedKB: Math.round(bytes / 1024),
          quotaBytes: chrome.storage.local.QUOTA_BYTES || 5242880,
          percentUsed: Math.round((bytes / 5242880) * 100),
        });
      });
    });
  }
  export async function togglePin(filename, slideNo) {
  
    const notes = await getNotes();
  
    const key = `${filename}::${slideNo}`;
  
    notes[key].pinned = !notes[key].pinned;
  
    await chrome.storage.local.set({
        [KEYS.NOTES]: notes
    });
  
  }
  export async function clearAll() {
    await chrome.storage.local.clear();
  }
  // ─── DELETE SUBJECT ──────────────────────────────────────────────────────────
  export async function deleteSubject(subject) {
    // File index
    const index = await getFileIndex();
    const deletedFiles = [];
  
    for (const [filename, meta] of Object.entries(index)) {
      if (meta.subject === subject) {
        deletedFiles.push(meta);
        delete index[filename];
      }
    }
  
    await chrome.storage.local.set({
      [KEYS.FILE_INDEX]: index,
    });
  
    // Checklist
    const checklistRes = await chrome.storage.local.get(KEYS.CHECKLIST);
    const checklist = checklistRes[KEYS.CHECKLIST] || {};
    delete checklist[subject];
  
    await chrome.storage.local.set({
      [KEYS.CHECKLIST]: checklist,
    });
  
    // Subject metadata
    const subjectRes = await chrome.storage.local.get(KEYS.SUBJECTS);
    const subjects = subjectRes[KEYS.SUBJECTS] || {};
    delete subjects[subject];
  
    await chrome.storage.local.set({
      [KEYS.SUBJECTS]: subjects,
    });
  
    // Delete summaries
    const summaryRes = await chrome.storage.local.get(KEYS.SUMMARIES);
    const summaries = summaryRes[KEYS.SUMMARIES] || {};
  
    deletedFiles.forEach(file => {
      const filename = file.path.split("/").pop();
      delete summaries[filename];
    });
  
    await chrome.storage.local.set({
      [KEYS.SUMMARIES]: summaries,
    });
  
    // Delete notes
    const notesRes = await chrome.storage.local.get(KEYS.NOTES);
    const notes = notesRes[KEYS.NOTES] || {};
  
    Object.keys(notes).forEach(key => {
      const filename = key.split("::")[0];
  
      if (
        deletedFiles.some(f => f.path.endsWith(filename))
      ) {
        delete notes[key];
      }
    });
  
    await chrome.storage.local.set({
      [KEYS.NOTES]: notes,
    });
  
    return deletedFiles;
  }