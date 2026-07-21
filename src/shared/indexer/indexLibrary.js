import {
    getFileIndex,
    getPendingFiles,
    getFileMetadata,
    updateFileMetadata,
    addFileToIndex
} from "../storage/storage.js";
import { parseFile } from "../parser/parseFile.js";
import {
    saveFolderHandle,
    getFolderHandle
} from "../database/indexedDB.js";

let folderHandle = null;

export async function chooseLibraryFolder() {

    if (await restoreFolderHandle()) {
        return true;
    }

    try {
        folderHandle = await window.showDirectoryPicker({
            mode: "read"
        });

        await saveFolderHandle(folderHandle);

        console.log("[VITAssist] Folder handle saved");

        if (folderHandle.name !== "VITAssist") {
            alert("Please choose the VITAssist folder.");
            folderHandle = null;
            return false;
        }

        return true;

    } catch (err) {
        console.error(err);
        return false;
    }
}
export async function getLibraryHandle() {

    if (folderHandle) {
        return folderHandle;
    }

    const restored = await restoreFolderHandle();

    if (!restored) {
        return null;
    }

    return folderHandle;

}
export async function restoreFolderHandle() {
    console.log("[VITAssist] Attempting to restore folder...");

    if (folderHandle) {
        console.log("[VITAssist] Already in memory");
        return true;
    }

    const saved = await getFolderHandle();
    console.log("[VITAssist] Saved handle:", saved);

    if (!saved) {
        console.log("[VITAssist] No saved handle");
        return false;
    }

    let permission =
    await saved.queryPermission({
        mode: "read"
    });

if (permission !== "granted") {

    const permission = await saved.queryPermission({
        mode: "read"
    });
    
    if (permission !== "granted") {
        console.log("[VITAssist] Folder permission not granted.");
        return false;
    }
    
    folderHandle = saved;
    return true;
}



if (permission !== "granted")
    return false;

    folderHandle = saved;
    return true;
}
export async function openIndexedFile(file) {
    console.log("Opening indexed file:", file);
console.log("realFilename:", file.realFilename);
console.log("filename:", file.filename);
console.log("folderPath:", file.folderPath);

    if (!folderHandle) {

        const restored = await restoreFolderHandle();

        if (!restored)
            throw new Error("Library folder not connected.");

    }

    let current = folderHandle;

    const parts = file.folderPath
        .replace(/^VITAssist\//, "")
        .split("/");

    for (const part of parts) {
        current = await current.getDirectoryHandle(part);
    }

    const fileHandle =
        await current.getFileHandle(
            file.realFilename || file.filename
        );

    const realFile =
        await fileHandle.getFile();

        const name = file.realFilename.toLowerCase();

if (name.endsWith(".pdf")) {

    const url = URL.createObjectURL(realFile);

    await chrome.tabs.create({ url });

}
else {

    // Different handling for ppt/pptx
}

}
async function parseAndStore(file, fileHandle) {

    const realFile = await fileHandle.getFile();

    const buffer = await realFile.arrayBuffer();

    const extension = file.filename.split(".").pop().toLowerCase();

    const parsed = await parseFile(buffer, extension);

    await updateFileMetadata(file.filename, {

        ...parsed,

        parsed: true,

        parsingStatus: "completed"

    });

}
async function getFileHandleFromIndex(file) {

    let current = folderHandle;

    const path = file.folderPath
        .replace(/^VITAssist\//, "")
        .split("/");

    for (const part of path) {
        current = await current.getDirectoryHandle(part);
    }

    return current.getFileHandle(
        file.realFilename || file.filename
    );
}

export async function indexLibrary() {

    if (!folderHandle) {

        const restored = await restoreFolderHandle();

        if (!restored) {
            console.log("[VITAssist] No library folder connected yet.");
            return;
        }

    }

    await buildIndexFromFolder(folderHandle);
    const files = (await getPendingFiles()).filter(
        file => !file.parsed
    );

    console.log("FILES TO INDEX:", files.length);
    console.table(files);

    for (const file of files) {


        try {
            console.log(file);
            const fileHandle =
    await getFileHandleFromIndex(file);

    await parseAndStore(file, fileHandle);

    await relinkDownload(file);
    
    console.log("[VITAssist] Indexed", file.filename);

        }
        catch (err) {

            console.error(err);

        }

    }
    await chrome.storage.local.set({
        vitassist_last_index: Date.now()
    });

}
async function buildIndexFromFolder(dir, path = "VITAssist") {

    const index = await getFileIndex();

    for await (const [name, handle] of dir.entries()) {

        const entryPath = `${path}/${name}`;

        if (
            entryPath.includes("node_modules") ||
            entryPath.includes("fixtures") ||
            entryPath.includes("__tests__")
        ) {
            continue;
        }

        if (handle.kind === "directory") {

            await buildIndexFromFolder(handle, entryPath);
            continue;

        }

        const ext = name.split(".").pop().toLowerCase();

        if (!["pdf", "ppt", "pptx"].includes(ext)) continue;

        const alreadyIndexed = Object.values(index).some(file =>
            file.path === entryPath
        );

        if (alreadyIndexed) continue;

        const subject = path.split("/").pop();

        await addFileToIndex(name, {

            subject,

            folderPath: path,

            path: entryPath,

            filename: name,

            realFilename: name,

            extension: ext,

            downloadId: null,

            lectureTitle: null,

            moduleNumber: null,

            uploader: null,

            uploadDate: null,

            fullText: "",

            pages: [],

            slides: [],

            pageCount: 0,

            slideCount: 0,

            parsed: false,

            parsingStatus: "pending",

            status: "active"

        });

    }

}
async function relinkDownload(file) {

    const downloads = await chrome.downloads.search({
        filenameRegex: file.realFilename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"
    });

    if (!downloads.length)
        return;

    await updateFileMetadata(file.realFilename, {
        downloadId: downloads[0].id
    });

}