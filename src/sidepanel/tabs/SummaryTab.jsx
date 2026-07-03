// src/sidepanel/tabs/SummaryTab.jsx
import { useState, useEffect } from "react";
import { getFilesForSubject, getSummary, saveSummary, getNotesForFile } from "../../shared/storage/storage.js";
import { generateSummary } from "../../shared/llm/llmCascade.js";

export default function SummaryTab({ subject }) {
  const [files, setFiles]           = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [summary, setSummary]       = useState(null);
  const [notes, setNotes]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState(null);

  useEffect(() => {
    if (subject) loadFiles();
  }, [subject]);

  useEffect(() => {
    if (selectedFile) {
      loadSummaryAndNotes(selectedFile);
    }
  }, [selectedFile]);

  async function loadFiles() {
    const subjectFiles = await getFilesForSubject(subject);
    setFiles(subjectFiles);
    if (subjectFiles.length > 0) {
      setSelectedFile(subjectFiles[0]);
    }
  }

  async function loadSummaryAndNotes(file) {
    const [cached, fileNotes] = await Promise.all([
      getSummary(file.filename),
      getNotesForFile(file.filename),
    ]);
    setSummary(cached);
    setNotes(fileNotes);
  }

  async function handleGenerate(forceRegenerate = false) {
    if (!selectedFile) return;
    if (summary && !forceRegenerate) return;

    setLoading(true);
    setProgress(null);

    try {
      const bullets = await generateSummary(
        selectedFile.slides || [],
        subject,
        (p) => setProgress(p)
      );

      const { tier } = await import("../../shared/llm/llmCascade.js")
        .then(m => ({ tier: "auto" }));

      await saveSummary(selectedFile.filename, bullets, "auto");
      setSummary({ bullets, generatedAt: Date.now(), llmTier: "auto" });
    } catch (err) {
      console.error("[VITAssist] Summary failed:", err);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  function copyBullets() {
    if (!summary?.bullets) return;
    navigator.clipboard.writeText(summary.bullets.map(b => `• ${b}`).join("\n"));
  }

  if (!subject) {
    return <div className="empty-state">Select a subject to generate summaries.</div>;
  }

  return (
    <div className="tab-pane">
      {/* File selector */}
      <div className="file-selector">
        <select
          value={selectedFile?.filename || ""}
          onChange={e => {
            const f = files.find(f => f.filename === e.target.value);
            setSelectedFile(f || null);
            setSummary(null);
          }}
        >
          {files.length === 0
            ? <option>No files indexed</option>
            : files.map(f => (
              <option key={f.filename} value={f.filename}>{f.filename}</option>
            ))}
        </select>
      </div>

      {/* Generate button */}
      {selectedFile && !summary && !loading && (
        <div className="generate-section">
          <p className="generate-hint">
            Generate 5 exam-focused bullet points from this file using on-device AI.
          </p>
          <button className="generate-btn" onClick={() => handleGenerate()}>
            Generate exam bullets
          </button>
        </div>
      )}

      {/* Progress */}
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
          <span>Generating exam bullets…</span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="summary-section">
          <div className="summary-header">
            <span className="summary-label">5 exam bullets</span>
            <div className="summary-actions-inline">
              <button className="text-btn" onClick={copyBullets}>Copy</button>
              <button className="text-btn" onClick={() => handleGenerate(true)}>Regenerate</button>
            </div>
          </div>
          <div className="summary-box">
            {summary.bullets.map((bullet, i) => (
              <div key={i} className="bullet-row">
                <div className="bullet-dot" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
          <div className="summary-meta">
            Generated {new Date(summary.generatedAt).toLocaleDateString()} · on-device
          </div>
        </div>
      )}

      {/* Notes for this file */}
      {notes.length > 0 && (
        <div className="notes-section">
          <div className="section-label">Your notes on this file</div>
          {notes.map((note, i) => (
            <div key={i} className="note-card">
              <div className="note-slide">Slide {note.slideNo}</div>
              <div className="note-text">{note.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
