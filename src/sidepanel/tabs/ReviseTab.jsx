// src/sidepanel/tabs/ReviseTab.jsx
import { useState, useEffect } from "react";
import {
  getChecklist,
  saveChecklist,
  toggleChecklistTopic,
  getFilesForSubject,
} from "../../shared/storage/storage.js";

export default function ReviseTab({ subject }) {
  const [topics, setTopics]   = useState([]);
  const [newTopic, setNewTopic] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subject) loadChecklist();
  }, [subject]);

  async function loadChecklist() {
    setLoading(true);
    const checklist = await getChecklist(subject);

    // Auto-populate from file index if checklist is empty
    if (checklist.topics.length === 0) {
      const files = await getFilesForSubject(subject);
      const autoTopics = files.flatMap(f =>
        (f.slides || []).map(slide => ({
          id: `${f.filename}::${slide.slideNo}`,
          label: slide.title,
          done: false,
          source: f.filename,
          slideNo: slide.slideNo,
        }))
      ).slice(0, 20); // cap at 20 auto-topics

      if (autoTopics.length > 0) {
        await saveChecklist(subject, autoTopics);
        setTopics(autoTopics);
        setLoading(false);
        return;
      }
    }

    setTopics(checklist.topics);
    setLoading(false);
  }

  async function toggleTopic(topicId) {
    const updated = await toggleChecklistTopic(subject, topicId);
    setTopics(updated);
  }

  async function addTopic() {
    if (!newTopic.trim()) return;
    const topic = {
      id: `manual_${Date.now()}`,
      label: newTopic.trim(),
      done: false,
      source: "manual",
    };
    const updated = [...topics, topic];
    await saveChecklist(subject, updated);
    setTopics(updated);
    setNewTopic("");
  }

  async function deleteTopic(topicId) {
    const updated = topics.filter(t => t.id !== topicId);
    await saveChecklist(subject, updated);
    setTopics(updated);
  }

  if (!subject) {
    return <div className="empty-state">Select a subject to view checklist.</div>;
  }

  if (loading) {
    return <div className="loading-row"><div className="spinner-sm" /><span>Loading checklist…</span></div>;
  }

  const done = topics.filter(t => t.done).length;
  const percent = topics.length > 0 ? Math.round((done / topics.length) * 100) : 0;

  return (
    <div className="tab-pane">
      {/* Progress header */}
      <div className="checklist-header">
        <div className="checklist-progress-text">
          {done}/{topics.length} topics done · {percent}%
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Topic list */}
      <div className="checklist-list">
        {topics.length === 0 ? (
          <div className="empty-state">
            <p>No topics yet.</p>
            <p>Add topics below or download files from VTOP to auto-populate.</p>
          </div>
        ) : (
          topics.map(topic => (
            <div key={topic.id} className={`checklist-item ${topic.done ? "done" : ""}`}>
              <div
                className={`checkbox ${topic.done ? "checked" : ""}`}
                onClick={() => toggleTopic(topic.id)}
              >
                {topic.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                )}
              </div>
              <div className="checklist-label">
                <span className={topic.done ? "strikethrough" : ""}>{topic.label}</span>
                {topic.source && topic.source !== "manual" && (
                  <span className="topic-source">{topic.source}</span>
                )}
              </div>
              <button
                className="delete-btn"
                onClick={() => deleteTopic(topic.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add topic */}
      <div className="add-topic-form">
        <input
          type="text"
          placeholder="Add a topic manually…"
          value={newTopic}
          onChange={e => setNewTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTopic()}
        />
        <button onClick={addTopic} disabled={!newTopic.trim()}>Add</button>
      </div>
    </div>
  );
}
