// src/sidepanel/tabs/NotesTab.jsx
import { useState, useEffect } from "react";
import {
  getNotes,
  saveNote,
  deleteNote,
  togglePin,
  getFileIndex,
  getFilesForSubject,
  getAllSubjectsFromIndex
} from "../../shared/storage/storage.js";

export default function NotesTab({ subject }) {
  const [notes, setNotes] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [newNote, setNewNote] = useState({ filename: "", slideNo: "", text: "" });
  const [showNewNote, setShowNewNote] = useState(false);
  const [files, setFiles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [search, setSearch] = useState("");
  const [fileIndex, setFileIndex] = useState({});

  useEffect(() => {
    loadNotes();
    loadSubjects();
    if (subject) loadFiles();

    // Check if SearchTab triggered an "add note" action
    chrome.storage.local.get("vitassist_add_note", (result) => {
      if (result.vitassist_add_note) {
        const { filename, slideNo } = result.vitassist_add_note;
        setNewNote(prev => ({ ...prev, filename, slideNo: slideNo || "" }));
        chrome.storage.local.remove("vitassist_add_note");
      }
    });
  }, [subject]);

  async function loadNotes() {
    const index = await getFileIndex();
setFileIndex(index);
    const allNotes = await getNotes();
    const entries = Object.entries(allNotes).map(([key, val]) => {
      const [filename, slideNo] = key.split("::");
      return { key, filename, slideNo: Number(slideNo), ...val };
    })
    entries.sort((a,b)=>{

      if(a.pinned && !b.pinned) return -1;
  
      if(!a.pinned && b.pinned) return 1;
  
      return b.timestamp-a.timestamp;
  
  });

    // Filter by subject if selected
    if (subject) {
      const subjectFiles = await getFilesForSubject(subject);
      const subjectFilenames = new Set(subjectFiles.map(f => f.filename));
      setNotes(entries.filter(n => subjectFilenames.has(n.filename)));
    } else {
      setNotes(entries);
    }
  }

  async function loadFiles() {
    const subjectFiles = await getFilesForSubject(subject);
    setFiles(subjectFiles);
  }
  async function loadSubjects() {

    const all = await getAllSubjectsFromIndex();

    setSubjects(all);

  }

  async function handleSaveNew() {

    if (!newNote.filename) return;

    if (!newNote.text.trim()) return;

    await saveNote(

      newNote.filename,

      Number(newNote.slideNo) || 0,

      newNote.text.trim()

    );

    await loadNotes();
    setShowNewNote(false);

    setNewNote({

      filename: "",

      slideNo: "",

      text: ""

    });

    setSelectedSubject("");

    setFiles([]);

  }

  async function handleEdit(key, text) {
    const [filename, slideNo] = key.split("::");
    await saveNote(filename, parseInt(slideNo), text);
    setEditingKey(null);
    await loadNotes();
  }
  async function handleDelete(filename, slideNo) {
    console.log("Deleting", filename, slideNo);
  
    await deleteNote(filename, slideNo);
  
    await loadNotes();
  }
  const filteredNotes = notes.filter((note) => {

    const q = search.trim().toLowerCase();
  
    if (!q) return true;
    const file = fileIndex[note.filename];
  
    return (
  
      note.text.toLowerCase().includes(q) ||
  
      note.filename.toLowerCase().includes(q) ||

      (file?.lectureTitle || "")
          .toLowerCase()
          .includes(q) ||

      (file?.subject || "")
          .toLowerCase()
          .includes(q)
  
    );
  
  });


  return (
    <div className="tab-pane">

      <div className="notes-header">

        <div>

          <div className="notes-title">
            📝 My Notes
          </div>

          <div className="notes-subtitle">
            {notes.length} saved note{notes.length !== 1 ? "s" : ""}
          </div>

        </div>

        <button
          className="new-note-btn"
          onClick={() => {
            setNewNote({
              filename: "",
              slideNo: "",
              text: "",
            });

            setShowNewNote(true);
          }}
        >
          ＋ New
        </button>

      </div>

      <input
    className="notes-search"
    placeholder="Search notes..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
/>
      {showNewNote && (

        <div className="modal-overlay">

          <div className="note-modal">

            <div className="note-modal-header">

              <h2>New Note</h2>

              <button
                className="close-btn"
                onClick={() => setShowNewNote(false)}
              >
                ✕
              </button>

            </div>

            <select
              className="note-select"
              value={selectedSubject}
              onChange={async (e) => {

                const subject = e.target.value;

                setSelectedSubject(subject);

                const list = await getFilesForSubject(subject);

                setFiles(list);

                setNewNote({
                  ...newNote,
                  filename: ""
                });

              }}
            >

              <option value="">
                Select Subject...
              </option>

              {subjects.map(subject =>

                <option
                  key={subject}
                  value={subject}
                >
                  {subject}
                </option>

              )}

            </select>
            <select
              className="note-select"
              value={newNote.filename}
              onChange={(e) =>
                setNewNote({
                  ...newNote,
                  filename: e.target.value
                })
              }
            >

              <option value="">
                Select File...
              </option>

              {files.map(file =>

                <option
                  key={file.filename}
                  value={file.filename}
                >
                  {file.filename
                    .replace(".pdf", "")
                    .replace(".pptx", "")}
                </option>

              )}

            </select>

            <input
              className="slide-input"
              type="number"
              placeholder="Slide / Page (optional)"
              value={newNote.slideNo}
              onChange={(e) =>
                setNewNote({
                  ...newNote,
                  slideNo: e.target.value
                })
              }
            />

            <textarea

              className="note-textarea"

              rows={6}

              placeholder="Write your note..."

              value={newNote.text}

              onChange={(e) =>
                setNewNote({
                  ...newNote,
                  text: e.target.value
                })
              }

            />

            <button

              className="generate-btn"

              onClick={async () => {

                await handleSaveNew();

                setShowNewNote(false);

              }}

            >

              Save Note

            </button>

          </div>

        </div>

      )}
      {/* Notes list */}
      <div className="section-label" style={{ marginTop: "16px" }}>
        {notes.length} note{notes.length !== 1 ? "s" : ""}
        {subject ? ` in ${subject}` : ""}
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <p>No notes yet.</p>
          <p>Add notes above or click "Add note" on any search result.</p>
        </div>
      
    
      ) : (
        
        filteredNotes.map(note => (
          <div key={note.key} className="note-card">
            <div className="note-header">
  <div>

    <div className="note-title">
      {note.pinned && (
        <span style={{ marginRight: 6 }}>
          📌
        </span>
      )}

      {note.filename
        .replace(".pdf", "")
        .replace(".pptx", "")
        .replace(".ppt", "")}
    </div>

  </div>
</div>
              
            
            {editingKey === note.key ? (
              <div className="note-edit">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={3}
                  className="note-textarea"
                  autoFocus
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button className="generate-btn" style={{ flex: 1 }} onClick={() => handleEdit(note.key, editText)}>Save</button>
                  <button className="action-btn" onClick={() => setEditingKey(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
            
                <div className="note-body">
                  {note.text}
                </div>
            
                <div className="note-actions">
                    <button
                      className="text-btn"
                      onClick={async () => {

                        await togglePin(
                          note.filename,
                          note.slideNo
                        );

                        await loadNotes();

                      }}
                    >
                      {note.pinned ? "📌 Unpin" : "📍 Pin"}
                    </button>
                  <button
                    className="text-btn"
                    onClick={() => {
                      setEditingKey(note.key);
                      setEditText(note.text);
                    }}
                  >
                    ✏ Edit
                  </button>
            
                  <button
                    className="text-btn danger"
                    onClick={() =>
                      handleDelete(note.filename, note.slideNo)
                    }
                  >
                    🗑 Delete
                  </button>
            
                </div>
            
              </>
            )}
            <div className="note-meta">

              <span>
                {note.slideNo
                  ? `📍 Slide ${note.slideNo}`
                  : "📍 General"}
              </span>

              <span>
                {new Date(note.timestamp).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}
              </span>

            </div>
          </div>
        ))
      )}
    </div>
  );
}
