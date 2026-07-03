// src/popup/popup.jsx
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import {
  getFileIndex,
  getAllSubjectsFromIndex,
  getSubjects,
  getChecklist,
} from "../shared/storage/storage.js";
import "./popup.css";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getDaysUntilExam(examDate) {
  if (!examDate) return null;
  const diff = new Date(examDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getExamBadgeStyle(days) {
  if (days === null) return { bg: "rgba(100,100,120,0.15)", color: "#888" };
  if (days <= 3) return { bg: "rgba(216,90,48,0.15)", color: "#D85A30" };
  if (days <= 7) return { bg: "rgba(186,117,23,0.15)", color: "#BA7517" };
  return { bg: "rgba(29,158,117,0.15)", color: "#1D9E75" };
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
function PopupApp() {
  const [subjects, setSubjects] = useState([]);
  const [subjectMeta, setSubjectMeta] = useState({});
  const [stats, setStats] = useState({ files: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [nextExam, setNextExam] = useState(null);

  useEffect(() => {
    loadData();
    // Refresh when new file is indexed
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "FILE_INDEXED") loadData();
    });
  }, []);

  async function loadData() {
    const [allSubjects, meta, index] = await Promise.all([
      getAllSubjectsFromIndex(),
      getSubjects(),
      getFileIndex(),
    ]);

    // Calculate checklist progress per subject
    const subjectsWithProgress = await Promise.all(
      allSubjects.map(async (subject) => {
        const checklist = await getChecklist(subject);
        const total = checklist.topics.length;
        const done = checklist.topics.filter(t => t.done).length;
        const files = Object.values(index).filter(f => f.subject === subject);
        return {
          name: subject,
          fileCount: files.length,
          topicsDone: done,
          topicsTotal: total,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
          examDate: meta[subject]?.examDate || null,
        };
      })
    );

    // Sort by exam urgency
    subjectsWithProgress.sort((a, b) => {
      const daysA = getDaysUntilExam(a.examDate) ?? 999;
      const daysB = getDaysUntilExam(b.examDate) ?? 999;
      return daysA - daysB;
    });

    
    const upcoming = subjectsWithProgress.find(
      s => s.examDate && getDaysUntilExam(s.examDate) >= 0
    );
    
    setNextExam(upcoming || null);
    console.log("Upcoming exam:", upcoming);
console.log(subjectsWithProgress);
    setSubjects(subjectsWithProgress);
    setSubjectMeta(meta);
    setStats({
      files: Object.keys(index).length,
      
    });
    setLoading(false);
  }

  async function openSidePanel(subject = null) {

    if (subject) {
      await chrome.storage.local.set({
        vitassist_active_tab: "library",
        vitassist_active_subject: subject,
      });
    } else {
      await chrome.storage.local.set({
        vitassist_active_tab: "library",
      });
    }
  
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
  
    await chrome.sidePanel.open({
      tabId: tab.id,
    });
  
    window.close();
  }

  function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Open side panel with search query pre-filled
    chrome.storage.local.set({ vitassist_pending_search: searchQuery.trim() });
    openSidePanel();
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Loading VITAssist...</span>
      </div>
    );
  }

  return (
    <div className="popup">
      {/* Header */}
      {/* Hero Dashboard */}
      <div className="hero">

        <div className="hero-top">

          <div>

            <h1>VITAssist</h1>

            <p>Your Smart Study Companion</p>

          </div>

          <span className="version">v1.0</span>

        </div>

        <div className="hero-cards">

          <div className="hero-card">

            <div className="hero-icon">📚</div>

            <div className="hero-number">{subjects.length}</div>

            <div className="hero-label">Subjects</div>

          </div>

          <div className="hero-card">

            <div className="hero-icon">📄</div>

            <div className="hero-number">{stats.files}</div>

            <div className="hero-label">Resources</div>

          </div>


        </div>

      </div>

      {nextExam && (
        <div className="next-exam-card">

          <div className="next-title">
            ⚠️ Next Exam
          </div>

          <div className="next-subject">
            {nextExam.name}
          </div>

          <div className="next-date">
            📅 {new Date(nextExam.examDate).toLocaleDateString()}
          </div>

          <div className="next-days">
            ⏳ {getDaysUntilExam(nextExam.examDate)} days left
          </div>

        </div>
      )}

      {/* Subject list */}
      <div className="subjects-section">
        <div className="section-label">Subjects</div>
        {subjects.length === 0 ? (
          <div className="empty-state">
            <p>No files indexed yet.</p>
            <p>Download study materials from VTOP to get started.</p>
          </div>
        ) : (
          subjects.map(subject => {
            const days = getDaysUntilExam(subject.examDate);
            const badge = getExamBadgeStyle(days);
            return (
              <div
                key={subject.name}
                className="subject-card"
                onClick={() => openSidePanel(subject.name)}
              >
                <div className="subject-info">
                  <div className="subject-name">{subject.name}</div>
                  <div className="subject-meta">
                    {subject.fileCount} files
                    {subject.topicsTotal > 0 &&
                      ` · ${subject.topicsDone}/${subject.topicsTotal} topics done`}
                  </div>
                  {subject.topicsTotal > 0 && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {days !== null && (
                  <div
                    className="exam-badge"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {days <= 0 ? "Today!" : `${days}d`}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="footer">
        <button className="footer-btn" onClick={() => openSidePanel()}>
          Open full workspace →
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("popup-root")).render(<PopupApp />);
