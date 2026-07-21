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

    function onMessage(message) {
  
      if (message.type === "FILE_DOWNLOADED") {
  
        indexLibrary()
          .catch(console.error);
  
      }
  
    }
  
    chrome.runtime.onMessage.addListener(onMessage);
  
    return () => {
  
      chrome.runtime.onMessage.removeListener(onMessage);
  
    };
  
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
