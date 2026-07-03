export async function chooseLibraryFolder() {
    const handle = await window.showDirectoryPicker({
        mode: "read"
    });

    await chrome.storage.local.set({
        vitassist_folder_handle: handle
    });

    return handle;
}