// src/sidepanel/sidepanel.jsx
import { indexLibrary } from "../shared/indexer/indexLibrary.js";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import LibraryTab from "./library/LibraryTab.jsx";
import SearchTab from "./tabs/SearchTab.jsx";
import NotesTab from "./tabs/NotesTab.jsx";
import AskAITab from "./tabs/AskAITab.jsx";
import QuizTab from "./tabs/QuizTab";
import "./sidepanel.css";

const TABS = [
  "Library",
  "Search",
  "Notes",
  "Ask AI",
  "Quiz"
];

function SidePanelApp() {
  const [activeTab, setActiveTab] = useState("Library");
  const [pendingSearch, setPendingSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState(null);
  useEffect(() => {
    indexLibrary();
  }, []);
  useEffect(() => {
    chrome.storage.local.get(
      [
        "vitassist_pending_search",
        "vitassist_active_subject",
        "vitassist_active_tab",
      ],
      (result) => {

        if (result.vitassist_pending_search) {
          setPendingSearch(result.vitassist_pending_search);
          setActiveTab("Search");

          chrome.storage.local.remove(
            "vitassist_pending_search"
          );
        }

        if (result.vitassist_active_tab) {
          setActiveTab("Library");
        }

        if (result.vitassist_active_subject) {
          setActiveSubject(
            result.vitassist_active_subject
          );

          chrome.storage.local.remove(
            "vitassist_active_subject"
          );
        }

      }
    );
  }, []);


  return (
    <div className="sidepanel">
      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="logo">VITAssist</span>
        </div>

      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === "Library" && (
          <LibraryTab activeSubject={activeSubject} />
        )}
        {activeTab === "Search" && (
          <SearchTab

            initialQuery={pendingSearch}
          />
        )}

        {activeTab === "Notes" && (
          <NotesTab />
        )}
        {activeTab === "Ask AI" && (
          <AskAITab />
        )}
        {activeTab === "Quiz" && (
    <QuizTab />
)}

      </div>
    </div>
  );
}

createRoot(document.getElementById("sidepanel-root")).render(<SidePanelApp />);
