// src/background/background.js

import { buildCleanFilename } from "../shared/fileNameHelper.js";
import {
  addFileToIndex,
  deleteSubject,
  getPortalCache,
  savePortalCache,
  getSettings,
} from "../shared/storage/storage.js";

// ─── INSTALL / STARTUP ───────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[VITAssist] Installed");
  setupAlarms();
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
});

function setupAlarms() {
  chrome.alarms.create("portalPoll", { periodInMinutes: 30 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "portalPoll") await pollPortalForNewFiles();
});

// ─── DOWNLOAD INTERCEPTION ────────────────────────────────────────────────────
chrome.downloads.onDeterminingFilename.addListener(
  (downloadItem, suggest) => {
    (async () => {
      const originalFilename = downloadItem.filename;

      if (!isVITDownload(downloadItem)) {
        suggest();
        return;
      }

      // Read vitassist_current_course — content.js stamped this at click time
      // so it is always the course the student was looking at when they clicked
      const stored = await chrome.storage.local.get("vitassist_current_course");
      const course = stored.vitassist_current_course;

      if (!course?.name) {
        console.warn(
          "[VITAssist] No course in storage. " +
          "Visit the VTOP study material page and select a course before downloading."
        );
        suggest();
        return;
      }

      const cleanName  = buildCleanFilename(originalFilename, course.name);
      const folderPath = `VITAssist/${course.name}`;

      console.log("[VITAssist] Download intercepted for course:", course.name);
      console.log("[VITAssist] Saving as:", `${folderPath}/${cleanName}`);

      suggest({
        filename:       `${folderPath}/${cleanName}`,
        conflictAction: "uniquify",
      });

      const onChanged = (delta) => {
        if (delta.id === downloadItem.id && delta.state?.current === "complete") {
          chrome.downloads.onChanged.removeListener(onChanged);
          indexDownloadedFile(downloadItem.id, course, cleanName, folderPath);
        }
      };
      chrome.downloads.onChanged.addListener(onChanged);

    })();
    return true;
  }
);

// ─── DETECT VIT DOWNLOAD ─────────────────────────────────────────────────────
function isVITDownload(downloadItem) {
  const vitDomains = ["vtopcc.vit.ac.in", "vtop.vit.ac.in"];
  try {
    const url = new URL(downloadItem.url);
    return vitDomains.some(d => url.hostname.includes(d));
  } catch {
    return /^(?:WIN|FALL|SUM)SEM\d{4}[-\s]\d{2}[\s_]/.test(
      downloadItem.filename.split("/").pop()
    );
  }
}

// ─── INDEX FILE AFTER DOWNLOAD ────────────────────────────────────────────────
function extractModuleFromCleanName(cleanName) {
  const match = cleanName.match(/Module\s+(\d+)/i);
  return match ? `M${match[1]}` : null;
}

async function indexDownloadedFile(downloadId, course, cleanName, folderPath) {
  try {

    const [download] = await chrome.downloads.search({ id: downloadId });
    console.log("DOWNLOAD OBJECT");
    console.log(JSON.stringify(download, null, 2));
    if (!download) return;

    const {
      vitassist_pending_download: pending
    } = await chrome.storage.local.get("vitassist_pending_download");

    // Parse the downloaded file
    let parsed = {
      lectureTitle: null,
      moduleNumber: null,
      fullText: "",
      pages: [],
      slides: [],
      pageCount: 0,
      slideCount: 0,
    };

    try {

      const response = await fetch(download.url);
      const buffer = await response.arrayBuffer();

      const extension = cleanName.split(".").pop().toLowerCase();


      console.log("[VITAssist] Parsed", cleanName);

    } catch (err) {

      console.warn("[VITAssist] Parser failed", err);

    }

    await addFileToIndex(cleanName, {

      subject: course.name,

      courseCode: course.code || course.courseCode,

      lectureTitle:
        pending?.title ||
        parsed.lectureTitle,

      moduleNumber:
        pending?.moduleNumber ||
        parsed.moduleNumber ||
        extractModuleFromCleanName(cleanName),

      uploader: pending?.uploader || null,

      uploadDate: pending?.uploadDate || null,

      path: download.filename,

      folderPath,
      
      realFilename: download.filename,
      downloadId: download.id,

      fullText: parsed.fullText,

      pages: parsed.pages,

      slides: parsed.slides,

      pageCount: parsed.pageCount,

      slideCount: parsed.slideCount,

      parsed: true,

      parsingStatus: "completed",

    });
    
    await chrome.storage.local.remove("vitassist_pending_download");

    chrome.runtime.sendMessage({
      type: "FILE_INDEXED",
      payload: {
        filename: cleanName,
        subject: course.name,
      },
    }).catch(() => {});

    console.log("[VITAssist] Indexed:", cleanName);
    

  } catch (err) {

    console.error(err);

  }
}

// ─── PORTAL POLLING ──────────────────────────────────────────────────────────
async function pollPortalForNewFiles() {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  try {
    const response = await fetch(
      "https://vtopcc.vit.ac.in/vtop/studyMaterial/studyMaterial",
      { credentials: "include" }
    );
    if (!response.ok) return;

    const html          = await response.text();
    const currentFiles  = extractFileListFromHTML(html);
    const cache         = await getPortalCache();
    const previousFiles = new Set(cache.fileList);
    const newFiles      = currentFiles.filter(f => !previousFiles.has(f));

    await savePortalCache(currentFiles);

    if (newFiles.length > 0) {
      chrome.notifications.create({
        type:    "basic",
        iconUrl: "icons/icon48.png",
        title:   "VITAssist — New Materials",
        message: `${newFiles.length} new file${newFiles.length > 1 ? "s" : ""} uploaded to VTOP`,
        buttons: [{ title: "Open VTOP" }],
      });
    }
  } catch (err) {
    console.warn("[VITAssist] Portal poll failed:", err.message);
  }
}

function extractFileListFromHTML(html) {
  const doc   = new DOMParser().parseFromString(html, "text/html");
  const links = doc.querySelectorAll(
    "a[href*='download'], a[href*='.pptx'], a[href*='.pdf'], a[href*='.docx']"
  );
  return Array.from(links)
    .map(a => a.href || a.getAttribute("href"))
    .filter(Boolean);
}

// ─── MESSAGE ROUTER ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case "GET_STATS": {
      const { getFileIndex, getAllSubjectsFromIndex } =
        await import("../shared/storage/storage.js");
      const [index, subjects] = await Promise.all([
        getFileIndex(),
        getAllSubjectsFromIndex(),
      ]);
      return { fileCount: Object.keys(index).length, subjectCount: subjects.length };
    }

    case "POLL_PORTAL_NOW":
      await pollPortalForNewFiles();
      return { success: true };

    case "OPEN_SIDE_PANEL": {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { error: "No active tab" };
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch (e) {
        return { error: e.message };
      }
      return { success: true };
    }
    case "DELETE_SUBJECT": {
      const files = await deleteSubject(message.payload.subject);
    
      for (const file of files) {
        if (file.downloadId) {
          try {
            await chrome.downloads.removeFile(file.downloadId);
          } catch (e) {
            console.warn("Couldn't remove file", e);
          }
    
          try {
            await chrome.downloads.erase({
              id: file.downloadId,
            });
          } catch {}
        }
      }
    
      return {
        success: true,
      };
    }

    case "OPEN_FILE": {

      try {
  
          await chrome.downloads.open(
              message.payload.downloadId
          );
  
          return {
              success: true,
          };
  
      } catch (err) {
  
          console.error(err);
  
          return {
              success: false,
          };
  
      }
  
  }

    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

chrome.notifications.onButtonClicked.addListener((notifId, btnIndex) => {
  if (btnIndex === 0) chrome.tabs.create({ url: "https://vtopcc.vit.ac.in" });
});