import { getPendingFiles, updateFileMetadata } from "../storage/storage.js";
import { parseFile } from "../parser/parseFile.js";

let folderHandle = null;

export async function chooseLibraryFolder() {

    folderHandle = await window.showDirectoryPicker({
        mode: "read"
    });
    console.log("Selected root:", folderHandle.name);

for await (const [name, handle] of folderHandle.entries()) {
    console.log(name, handle.kind);
}
    if (folderHandle.name !== "VITAssist") {
        alert("Please choose the VITAssist folder, not a subject folder.");
        folderHandle = null;
        return;
    }

}

export async function indexLibrary() {

    if (!folderHandle) {

        alert("Choose your VITAssist folder first.");

        return;
    }

    const files = await getPendingFiles();
    console.log("FILES TO INDEX:", files.length);

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

for (const part of path)  {

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

            const parsed =
                await parseFile(
                    buffer,
                    file.filename.split(".").pop()
                );
                console.log("PARSED RESULT");
                console.log(parsed);
            await updateFileMetadata(file.filename,{

                ...parsed,

                parsed:true,

                parsingStatus:"completed"

            });

            console.log(
                "[VITAssist] Indexed",
                file.filename
            );

        }
        catch(err){

            console.error(err);

        }

    }

}