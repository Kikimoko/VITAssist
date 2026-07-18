import { useEffect, useMemo, useState, useRef } from "react";
import "./library.css";
import {
  indexLibrary
} from "../../shared/indexer/indexLibrary.js";
import {
  chooseLibraryFolder
} from "../../shared/indexer/indexLibrary.js";
import {
  openIndexedFile
} from "../../shared/indexer/indexLibrary.js";

export default function LibraryTab({ activeSubject }) {
  const [fileIndex, setFileIndex] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [highlighted, setHighlighted] = useState(null);
  const [query, setQuery] = useState("");
  const folderRefs = useRef({});
  const [libraryReady, setLibraryReady] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);
  useEffect(() => {

    if (!activeSubject) return;

    setExpanded(activeSubject);
    setHighlighted(activeSubject);

    setTimeout(() => {
      folderRefs.current[activeSubject]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);

    setTimeout(() => {
      setHighlighted(null);
    }, 1800);

  }, [activeSubject]);

  async function loadLibrary() {
    const { getFileIndex } = await import("../../shared/storage/storage.js");

    const index = await getFileIndex();

    setFileIndex(index || {});

    setLibraryReady(Object.keys(index).length > 0);
}

  const grouped = useMemo(() => {
    const map = {};

    Object.values(fileIndex).forEach((file) => {
      const subject = file.subject || "Unknown";

      if (!map[subject]) map[subject] = [];

      map[subject].push(file);
    });

    Object.values(map).forEach((files) =>
      files.sort((a, b) =>
        (a.path || "").localeCompare(b.path || "")
      )
    );

    return Object.entries(map).filter(([subject, files]) => {
      if (!query.trim()) return true;

      const q = query.toLowerCase();

      if (subject.toLowerCase().includes(q)) return true;

      return files.some((f) =>
        (f.path || "").toLowerCase().includes(q)
      );
    });

  }, [fileIndex, query]);

  async function openFile(file) {

    console.log("Opening file:");
console.log(JSON.stringify(file, null, 2));

    if (file.downloadId != null) {

        await chrome.runtime.sendMessage({
            type: "OPEN_FILE",
            payload: file
        });

        return;
    }

    await openIndexedFile(file);

}
async function deleteFile(file) {

  const ok = confirm(
      `Delete "${file.filename}"?`
  );

  if (!ok) return;

  const res = await chrome.runtime.sendMessage({
      type: "DELETE_FILE",
      payload: file
  });

  if (res?.success) {

      await loadLibrary();

      if (
          expanded &&
          !Object.values(await (await import("../../shared/storage/storage.js")).getFileIndex())
              .some(f => f.subject === expanded)
      ) {
          setExpanded(null);
      }
  }
}
  async function deleteSubject(subject) {
    const ok = confirm(
      `Delete "${subject}"?\n\nThis will permanently remove all downloaded files for this subject.`
    );

    if (!ok) return;

    const res = await chrome.runtime.sendMessage({
      type: "DELETE_SUBJECT",
      payload: { subject },
    });

    if (!res?.success) {
      alert("Failed to delete subject.");
      return;
    }

    await loadLibrary();
  }
  if (!libraryReady) {
    return (
        <div className="library-root">

            <div className="library-title">
                📚 My Library
            </div>

            <div className="empty-state">

                <h3>No library connected</h3>

                <p>
                    Connect your VITAssist folder to access
                    downloaded study materials.
                </p>

                <button
                    className="index-library-btn"
                    onClick={async () => {

                        const ok = await chooseLibraryFolder();

                        if (!ok) return;

                        await indexLibrary();

                        await loadLibrary();

                    }}
                >
                    📁 Connect Folder
                </button>

            </div>

        </div>
    );
}
  return (
    <div className="library-root">

      <div className="library-title">
        📚 My Library
      </div>

      <input
        className="library-search"
        placeholder="Search downloaded files..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="library-scroll">

        {grouped.map(([subject, files]) => (

          <div
            className={`folder ${highlighted === subject ? "folder-highlight" : ""
              }`}
            key={subject}
            ref={(el) => (folderRefs.current[subject] = el)}
          >

            <div className="folder-header">

              <div
                className="folder-left"
                onClick={() =>
                  setExpanded(expanded === subject ? null : subject)
                }
              >

                <span className="arrow">
                  {expanded === subject ? "▼" : "▶"}
                </span>

                <div className="folder-details">
                  <div className="folder-name">{subject}</div>
                  <div className="folder-count">
                    {files.length} resources
                  </div>
                </div>

              </div>

              <button
                className="delete-folder"
                title="Delete Subject"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSubject(subject);
                }}
              >
                🗑
              </button>

            </div>
            {expanded === subject && (
              <div className="files">
                {files.map((file) => (
                  <div className="file-row" key={file.path}>

                    <div className="file-type">
                      {file.path.toLowerCase().endsWith(".pdf")
                        ? "PDF"
                        : file.path.toLowerCase().endsWith(".ppt") ||
                          file.path.toLowerCase().endsWith(".pptx")
                          ? "PPT"
                          : file.path.toLowerCase().endsWith(".doc") ||
                            file.path.toLowerCase().endsWith(".docx")
                            ? "DOC"
                            : "FILE"}
                    </div>

                    <div className="file-info">

                      <div className="file-name">
                        {file.path
                          .split("/")
                          .pop()
                          .replace(`${subject} - `, "")
                          .replace(".pdf", "")
                          .replace(".pptx", "")
                          .replace(".ppt", "")
                        }
                      </div>

                      <div className="file-module">
                        {file.moduleNumber || "General"}
                      </div>

                    </div>

                    <div className="file-actions">

                      <button
                        className="open-file"
                        title="Open"
                        onClick={() => openFile(file)}
                      >
                        ↗
                      </button>

                      <button
                        className="delete-file"
                        title="Delete"
                        onClick={() => deleteFile(file)}
                      >
                        🗑️
                      </button>

                    </div>
                    

                  </div>
                ))}
              </div>
            )}

          </div>

        ))}

      </div>

    </div>
  );
}