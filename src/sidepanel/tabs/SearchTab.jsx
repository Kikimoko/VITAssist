// src/sidepanel/tabs/SearchTab.jsx
import { useState, useEffect, useRef } from "react";
import { searchLibrary } from "../../shared/search/searchEngine.js";
import {
  chooseLibraryFolder,
  indexLibrary,
  openIndexedFile,
  getLibraryHandle
} from "../../shared/indexer/indexLibrary.js";


function highlight(text, query) {
  if (!text || !query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark key={i}>{part}</mark>
    ) : (
      part
    )
  );
}
export default function SearchTab({ subject, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null); // WebLLM download progress
  const [subjectFilter, setSubjectFilter] = useState(
    subject || "all"
  );
  const [pendingFiles, setPendingFiles] = useState([]);
const [checkingPending, setCheckingPending] = useState(true);
  const inputRef = useRef(null);


  // Auto-search if popup passed a query
  useEffect(() => {
    if (initialQuery) {
      handleSearch(null, initialQuery);
    }
    inputRef.current?.focus();
  }, [initialQuery]);
  useEffect(() => {

    loadPendingFiles();

    function onMessage(message) {

        if (
            message.type === "FILE_INDEXED" ||
            message.type === "FILE_PARSED"
        ) {
            loadPendingFiles();
        }

    }

    function onMessage(message) {

      switch (message.type) {
  
          case "FILE_DOWNLOADED":
  
              indexLibrary();
              break;
  
          case "FILE_INDEXED":
  
              loadPendingFiles();
              break;
  
          case "FILE_PARSED":
  
              loadPendingFiles();
              break;
  
      }
  
  }

    return () => {
        chrome.runtime.onMessage.removeListener(onMessage);
    };

}, []);

  async function handleSearch(e, overrideQuery) {
    e?.preventDefault();

    const q = overrideQuery || query;
    console.log("SEARCHING:", q);
    if (!q.trim()) return;

    setLoading(true);

    try {


      const start = performance.now();
      const result = await searchLibrary(q);
      const end = performance.now();

      console.log(
        `Search took ${(end - start).toFixed(2)} ms`
      );

      setResults({
        results: result
      });

    } finally {

      setLoading(false);

    }
  }
  function cleanPendingFilename(name) {

    return name
        .replace(/^WINSEM\d{4}-\d{2}_VL_[A-Z0-9]+_\d+_TH_\d{4}-\d{2}-\d{2}_/i, "")
        .replace(/^FALLSEM\d{4}-\d{2}_VL_[A-Z0-9]+_\d+_TH_\d{4}-\d{2}-\d{2}_/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}
  async function loadPendingFiles() {

    try {

        setCheckingPending(true);

        const handle = await getLibraryHandle();

        if (!handle) {
            setPendingFiles([]);
            return;
        }

        const index =
    (await chrome.storage.local.get("vitassist_file_index"))
        .vitassist_file_index || {};
        console.log("===== FILE INDEX =====");
console.log(index);
console.log("======================");

        const pending = [];

        async function scan(dir, prefix = "") {

            for await (const [name, entry] of dir.entries()) {

                if (entry.kind === "directory") {

                    await scan(entry, `${prefix}${name}/`);
                    continue;

                }

                const ext =
                    name.split(".").pop().toLowerCase();

                if (!["pdf", "ppt", "pptx"].includes(ext))
                    continue;

                    const relativePath = `VITAssist/${prefix}${name}`;

                    const indexedFile = Object.values(index).find(file =>
                      file.path === relativePath
                  );
                  
                  console.log("----------");
                  console.log("Relative:", relativePath);
                  console.log("Indexed:", indexedFile?.path);
                  console.log("Parsed:", indexedFile?.parsed);
                  console.log("Exists:", !!indexedFile);
                  console.log("----------");
                  
                  const exists = !!indexedFile;
                    
                    if (!exists) {
                    
                      pending.push({
                        name: cleanPendingFilename(name),
                        path: relativePath
                    });
                    
                    }

            }

        }

        await scan(handle);

        setPendingFiles(pending);

    } catch (err) {

        console.error(err);
        setPendingFiles([]);

    } finally {

        setCheckingPending(false);

    }

}

  async function openFile(file) {

    console.log("Opening file:");
console.log(JSON.stringify(file, null, 2));

    await chrome.runtime.sendMessage({
        type: "OPEN_FILE",
        payload: file
    });

}
  const filteredResults =
    results?.results?.filter(
      (r) =>
        subjectFilter === "all" ||
        r.subject === subjectFilter
    ) || [];
  return (
    <div className="tab-pane">

<button
    className="index-library-btn"
    onClick={async () => {

        const ok = await chooseLibraryFolder();

        if (!ok) return;

        
        await indexLibrary();

await loadPendingFiles();

setResults(null);

alert(
    pendingFiles.length === 0
        ? "Library is already up to date."
        : "Library indexed successfully!"
);

    }}
>
    Index Library
</button>
{!checkingPending && (

<div className="pending-files">

    <div className="section-label">
        {pendingFiles.length === 0
            ? "✅ Library is up to date"
            : `${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""} pending indexing`}
    </div>

    {pendingFiles.map(file => (

        <div
            key={file.path}
            className="pending-file"
        >
            📄 {file.name}
        </div>

    ))}

</div>

)}

      {/* Search input */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-bar">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={subject ? `Search in ${subject}…` : "Search all subjects…"}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="clear-btn" onClick={() => { setQuery(""); setResults(null); }}>
              ×
            </button>
          )}
        </div>
      </form>
      {results && (
        <select
          className="subject-filter"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="all">📚 All Subjects</option>

          {[...new Set(results.results.map(r => r.subject))]
            .sort()
            .map(subject => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
        </select>
      )}

      {/* WebLLM download progress */}
      {progress && (
        <div className="progress-banner">
          <div className="progress-text">
            Setting up on-device AI — {progress.percent}% (happens once)
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !progress && (
        <div className="loading-row">
          <div className="spinner-sm" />
          <span>Searching{subject ? ` in ${subject}` : ""}…</span>
        </div>
      )}

      {/* Results */}
      {results && !results.error && (
        <div className="results">
          {/* LLM Answer */}
          {results.answer && (
            <div className="llm-answer">
              <div className="llm-label">
                <span className="llm-dot" />
                {results.tierLabel}
              </div>
              <p className="llm-text">{results.answer}</p>
            </div>
          )}

          {/* File results */}
          {filteredResults.length > 0 ? (
            <>
              <div className="section-label">Found in your files</div>

              {filteredResults.map((r, i) => (
                <div key={i} className="result-card">

                  <div className="result-header">

                    <div>

                      <div className="result-title">
                        {r.type === "pdf" ? "📄" : "📊"} {r.lectureTitle || "Untitled"}
                      </div>

                      <div className="result-subject">
                        📚 {r.subject}
                      </div>

                    </div>

                    <button
                      className="open-file"
                      onClick={async () => {

                        console.log("Clicked Open");
                        console.log("RESULT");
console.log(r);

console.log("downloadId =", r.downloadId);
console.log("path =", r.path);
console.log("filename =", r.filename);

                        await chrome.storage.local.set({
                          vitassist_active_file: r.filename
                        });

                        chrome.storage.local.get(
                          "vitassist_active_file",
                          console.log
                        );

                        openFile(r);

                      }}
                    >
                      Open ↗
                    </button>

                  </div>

                  <div className="result-meta">

                    {r.slideNo && (
                      <span className="meta-chip">
                        📍 {r.type === "pdf"
                          ? `Page ${r.slideNo}`
                          : `Slide ${r.slideNo}`}
                      </span>
                    )}

                    {r.moduleNumber && (
                      <span className="meta-chip">
                        {r.moduleNumber}
                      </span>
                    )}

                    <span className="meta-chip">
                      {r.type === "pdf" ? "📄 PDF" : "📊 PPTX"}
                    </span>

                  </div>

                  {r.snippet && (
                    <div className="search-snippet">
                      {highlight(r.snippet, query)}
                    </div>
                  )}

                </div>

              ))}
            </>
          ) : (
            <div className="no-results">
              <p>No files found for "{query}"</p>
              <p>Try different keywords or download more materials from VTOP.</p>
            </div>
          )
          }
        </div>
      )}

      {/* Error */}
      {results?.error && (
        <div className="error-state">Search failed. Please try again.</div>
      )}

      {/* Empty state */}
      {!loading && !results && (
        <div className="empty-search">
          <p>Ask anything about your study materials.</p>
          <div className="suggestions">
            {["What is kernel mode?", "Explain TCP handshake", "Deadlock conditions"].map(s => (
              <button key={s} className="suggestion-chip" onClick={() => {
                setQuery(s);
                handleSearch(null, s);
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
