// src/content/content.js
// Runs inside the VTOP portal tab
//
// KEY INSIGHT: Don't try to infer the course from the filename later.
// Instead, intercept the click on every download link RIGHT NOW,
// read the currently selected course at that exact moment,
// and write it to storage BEFORE the download starts.
// Background.js then reads it immediately — zero race condition.

(function () {
  "use strict";

  // ─── PARSE COURSE OPTION TEXT ──────────────────────────────────────────────
  // "Winter Semester 2025-26 - BCSE305L - Embedded Systems - TH - Theory Only - 3.0"
  // Find course code by regex — don't rely on position
  function parseCourseOptionText(text) {
    if (!text || text.includes("-- Registered Courses --")) return null;

    const codeMatch = text.match(/\b([A-Z]{2,4}\d{3}[A-Z]?)\b/);
    if (!codeMatch) return null;

    const courseCode = codeMatch[1];
    const afterCode = text.substring(text.indexOf(courseCode) + courseCode.length);
    const namePart = afterCode.split(" - ").map(p => p.trim()).filter(p => p.length > 0)[0] || "";

    if (!namePart) return null;
    return { courseCode, name: namePart };
  }

  // ─── GET CURRENTLY SELECTED COURSE FROM DROPDOWN ──────────────────────────
  function getCurrentCourseFromDropdown() {
    const select = document.querySelector("#courseId");
    if (!select || !select.selectedOptions[0]) return null;
    return parseCourseOptionText(select.selectedOptions[0].textContent.trim());
  }

  // ─── SAVE ALL COURSES TO STORAGE ──────────────────────────────────────────
  function extractAndSaveAllCourses(select) {
    const courses = {};
    Array.from(select.options).forEach(option => {
      const parsed = parseCourseOptionText(option.textContent.trim());
      if (!parsed) return;
      courses[parsed.courseCode] = {
        name: parsed.name,
        portalId: option.value,
      };
    });
    chrome.storage.local.set({ vitassist_courses: courses }, () => {
      console.log("[VITAssist] Saved", Object.keys(courses).length, "courses");
    });
  }
  function extractMaterialMetadata(target) {
    const row = target.closest("tr");

    if (!row) return null;

    const cells = row.querySelectorAll("td");

    if (cells.length < 5) return null;

    // Material Detail column
    const materialCell = cells[2];

    const lines = materialCell.innerText
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);

      const title =
      lines[0]?.trim() || "";

    let moduleNumber = "";

    const moduleMatch = materialCell.innerText.match(/\b(\d+)\s*\((Document|Presentation|PDF|PPT)/i);

    if (moduleMatch) {
      moduleNumber = `Module ${moduleMatch[1]}`;
    }

    let fileType = "";

    if (/presentation/i.test(materialCell.innerText))
      fileType = "pptx";
    else if (/document/i.test(materialCell.innerText))
      fileType = "pdf";

    // Uploaded By column
    const uploaderCell = cells[3];

    const uploadLines = uploaderCell.innerText
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean);

    const uploader = uploadLines[0] || "";
    const uploadDate =
    uploadLines.at(-1)?.trim() || "";
    console.log("Material Cell:");
    console.log(materialCell.innerHTML);

    console.log("Material Text:");
    console.log(materialCell.innerText);


    return {
      title,
      moduleNumber,
      uploader,
      uploadDate,
      fileType
    };
  }
  // ─── STAMP CURRENT COURSE ON EVERY DOWNLOAD CLICK ─────────────────────────
  // Intercept clicks on download links and write vitassist_current_course
  // BEFORE the download fires — no race condition possible.
  function attachDownloadClickListeners() {

    document.addEventListener("click", (e) => {
  
      const target = e.target.closest(
        "a[href*='download'], a[href*='.ppt'], a[href*='.pptx'], a[href*='.pdf'], a[href*='.docx'], button, input[type='button']"
      );
  
      if (!target)
        return;
  
      const course = getCurrentCourseFromDropdown();
  
      if (!course)
        return;
  
      const material =
        extractMaterialMetadata(target);
  
      console.log("==========");
      console.log("DOWNLOAD CLICK");
      console.log("Course:", course);
      console.log("Material:", material);
      console.log("Target:", target);
      console.log("==========");
  
      const pending = {
  
        url:
          target.href ||
          target.getAttribute("href") ||
          null,
  
        extension:
          material?.fileType || "",
  
        title:
          material?.title || null,
  
        moduleNumber:
          material?.moduleNumber || null,
  
        uploader:
          material?.uploader || null,
  
        uploadDate:
          material?.uploadDate || null
  
      };
  
      console.log(
        "[VITAssist] Pending Download"
      );
  
      console.log(
        JSON.stringify(
          pending,
          null,
          2
        )
      );
  
      console.log("chrome =", chrome);
console.log("chrome.storage =", chrome.storage);
console.log("chrome.storage.local =", chrome.storage?.local);

if (!chrome.storage?.local) {
    console.error("Storage API unavailable");
    return;
}

chrome.storage.local.set({
    vitassist_current_course: course,
    vitassist_pending_download: pending
});
  
    }, true);
  
  }
  // ─── WATCH DROPDOWN CHANGES ────────────────────────────────────────────────
  function watchDropdown(select) {
    extractAndSaveAllCourses(select);

    // Save initial selection
    const initial = parseCourseOptionText(select.selectedOptions[0]?.textContent.trim());
    if (initial) {
      chrome.storage.local.set({ vitassist_current_course: initial }, () => {
        console.log("[VITAssist] Initial course set to:", initial.name, "(", initial.courseCode, ")");
      });
    }

    // Update on dropdown change
    select.addEventListener("change", () => {
      setTimeout(() => {
        const course = getCurrentCourseFromDropdown();
        if (!course) return;
        chrome.storage.local.set({ vitassist_current_course: course }, () => {
          console.log("[VITAssist] Course changed to:", course.name);
        });
      }, 100);
    });
  }

  // ─── WATCH FOR NEW FILE LINKS ──────────────────────────────────────────────
  let lastKnownFiles = new Set();

  function checkForNewFiles() {
    const links = Array.from(
      document.querySelectorAll("a[href*='.pptx'], a[href*='.pdf'], a[href*='.docx'], a[href*='download']")
    ).map(a => a.href).filter(Boolean);

    const newFiles = links.filter(f => !lastKnownFiles.has(f));
    if (newFiles.length > 0 && lastKnownFiles.size > 0) {
      chrome.runtime.sendMessage({
        type: "NEW_FILES_DETECTED",
        payload: { newFiles, allFiles: links },
      });
    }
    links.forEach(f => lastKnownFiles.add(f));
  }

  // ─── MUTATION OBSERVER ─────────────────────────────────────────────────────
  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some(m =>
      Array.from(m.addedNodes).some(n =>
        n.nodeType === 1 && (
          n.tagName === "TR" ||
          n.querySelector?.("a[href*='.pptx'], a[href*='.pdf']")
        )
      )
    );
    if (relevant) checkForNewFiles();
  });

  observer.observe(
    document.querySelector("#tableContent") ||
    document.querySelector("table") ||
    document.body,
    { childList: true, subtree: true }
  );

  checkForNewFiles();

  // ─── FLOATING VITASSIST BUTTON ─────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById("vitassist-btn")) return;
    const btn = document.createElement("button");
    btn.id = "vitassist-btn";
    btn.textContent = "VITAssist";
    btn.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: linear-gradient(
        135deg,
        #25184f 0%,
        #384a87 60%,
        #3b7b7b 100%
        );
      color: white; border: none; border-radius: 24px;
      padding: 10px 20px; font-size: 14px; font-weight: 600;
      cursor: pointer; box-shadow: 0 4px 16px rgba(83,74,183,0.4);
      font-family: system-ui, sans-serif;
    `;
    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    });
    document.body.appendChild(btn);
  }

  // ─── WAIT FOR DROPDOWN ────────────────────────────────────────────────────
  function waitForDropdown() {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const select = document.querySelector("#courseId");
      if (select && select.options.length > 1) {
        clearInterval(interval);
        console.log("[VITAssist] Dropdown ready after", attempts, "attempt(s)");
        watchDropdown(select);
      }
      if (attempts >= 20) {
        clearInterval(interval);
        console.warn("[VITAssist] Timed out waiting for dropdown.");
      }
    }, 1000);
  }

  // ─── INIT ──────────────────────────────────────────────────────────────────
  // Attach click listener IMMEDIATELY — before dropdown is even ready
  attachDownloadClickListeners();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectButton();
      waitForDropdown();
    });
  } else {
    injectButton();
    waitForDropdown();
  }

  console.log("[VITAssist] Content script active on VTOP portal");
})();