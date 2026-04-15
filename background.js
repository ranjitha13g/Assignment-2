// Create the context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "quick-annotate",
        title: "Quick Annotate",
        contexts: ["all"]
    });
});

// Listen for clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "quick-annotate") {
        // 1. Capture the current tab as an image
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            // 2. Send the image data to the content script
            chrome.tabs.sendMessage(tab.id, {
                action: "start_annotate",
                image: dataUrl
            });
        });
    }
});