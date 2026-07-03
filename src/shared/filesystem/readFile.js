export async function readFileFromFolder(folderHandle, relativePath) {

    const parts = relativePath.split("/");

    let current = folderHandle;

    for (let i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i]);
    }

    const fileHandle = await current.getFileHandle(
        parts[parts.length - 1]
    );

    const file = await fileHandle.getFile();

    return await file.arrayBuffer();
}