import {
    getPendingFiles,
    updateFileMetadata,
    addFileToIndex,
    getFileIndex
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

    const permission = await saved.queryPermission({ mode: "read" });

if (permission !== "granted") {
    return false;
}

folderHandle = saved;
return true;
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
    const files = await getPendingFiles();

    console.log("FILES TO INDEX:", files.length);
console.table(files);

    for (const file of files) {

        try {
            console.log(file);
            const path = file.folderPath
                .replace(/^VITAssist\//, "")
                .split("/");

            let current = folderHandle;
            console.log(folderHandle.name);
            console.log(file.folderPath);
            console.log("Trying path:", path);

            for (const part of path) {

                console.log("Looking for:", `"${part}"`);

                const dirs = [];

                for await (const [name, handle] of current.entries()) {
                    if (handle.kind === "directory") {
                        dirs.push(name);
                    }
                }

                console.log("Available folders:", dirs);

                current = await current.getDirectoryHandle(part);

            }
            console.log("Current folder:", current.name);
            console.log("Looking for file:", file.filename);

            const files = [];

            for await (const [name, handle] of current.entries()) {
                if (handle.kind === "file") {
                    files.push(name);
                }
            }

            console.log(files);
            const fileHandle =
                await current.getFileHandle(file.filename);

            const realFile =
                await fileHandle.getFile();

            const buffer =
                await realFile.arrayBuffer();

            console.log("================================");
            console.log("INDEXING:", file.filename);

            const extension = file.filename.split(".").pop();

            console.log("Extension:", extension);

            const parsed = await parseFile(buffer, extension);

            console.log("PARSED OBJECT:");
            console.log(parsed);

            console.log("fullText length:", parsed.fullText?.length);
            console.log("slides:", parsed.slides?.length);
            console.log("pages:", parsed.pages?.length);

            console.log("================================");
            console.log("Parsing extension:", file.filename.split(".").pop());

            console.log("PARSED RESULT");
            console.log(parsed);
            await updateFileMetadata(file.filename, {

                ...parsed,

                parsed: true,

                parsingStatus: "completed"

            });
            const updated = await chrome.storage.local.get("vitassist_file_index");

            console.log("Saved metadata:");

            console.log(updated.vitassist_file_index[file.filename]);

            console.log(
                "[VITAssist] Indexed",
                file.filename
            );

        }
        catch (err) {

            console.error(err);

        }

    }

}
import {
    addFileToIndex,
    getFileIndex
} from "../storage/storage.js";
