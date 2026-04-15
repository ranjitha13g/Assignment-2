# ✏️ Quick Annotate

A lightweight Chrome extension that lets you annotate, highlight, erase, snip, and take notes — all directly on top of any webpage — without leaving the browser.

---

## ✨ Features

| Tool | Description |
|------|-------------|
| ✏️ **Pencil** | Draw freehand red strokes on the page |
| 🖊️ **Highlighter** | Apply a semi-transparent yellow highlight over text or areas |
| 🧹 **Eraser** | Erase annotation strokes — background screenshot is never affected |
| ✂️ **Snip** | Drag a selection box to crop and download a specific region |
| 🗒️ **Notepad** | Open a floating, draggable notepad to jot down notes |
| 💾 **Save PNG** | Download the full annotated screenshot as a PNG |

---

## 🚀 Installation

> **No internet connection required. Load the extension directly from your local files.**

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `quick-annotate/` folder
5. The extension is now installed!

---

## 🛠️ How to Use

1. Navigate to **any webpage** you want to annotate
2. **Right-click** anywhere on the page
3. Select **Quick Annotate** from the context menu
4. The annotation overlay will open with the toolbar at the top

### Tool Guide

#### ✏️ Pencil
- Click **Pencil** in the toolbar (active by default)
- Click and drag on the page to draw freehand

#### 🖊️ Highlighter
- Click **Highlight** in the toolbar
- Drag over text or regions to apply a yellow highlight

#### 🧹 Eraser
- Click **Eraser** in the toolbar
- A circular cursor ring appears to show the erase area
- Drag over any strokes to remove them
- The original screenshot underneath is **never affected**

#### ✂️ Snip
- Click **Snip** in the toolbar
- Click and drag to draw a selection rectangle
- A live size label (e.g. `640 × 400`) appears as you drag
- Release the mouse — the selected area is saved as **`snip.png`**

#### 🗒️ Notepad
- Click **🗒️ Notepad** to toggle the floating notepad panel
- **Drag** the notepad by its header to reposition it
- Use **📋 Copy** to copy all text to the clipboard
- Use **🗑 Clear** to wipe the notepad
- Click **✖** to close it

#### 💾 Save PNG
- Click **💾 Save PNG** to download the full annotated view as **`annotation.png`**
- This composites the original screenshot + all annotations into a single image

#### ✖ Exit
- Click **✖ Exit** to close the annotation overlay and return to the normal page

---

## 📁 Project Structure

```
quick-annotate/
├── manifest.json     # Extension manifest (MV3)
├── background.js     # Service worker — context menu + screenshot capture
├── content.js        # Annotation logic — drawing, eraser, snip, notepad
├── styles.css        # Premium glassmorphic UI styles
└── README.md         # This file
```

---

## 🏗️ Architecture

```
Right-click → Background Service Worker
                    │
                    ├─ Captures screenshot (captureVisibleTab)
                    └─ Sends message to Content Script
                                │
                                └─ Injects overlay into the page
                                        │
                                        ├─ <img id="qa-bg">     ← screenshot layer
                                        ├─ <canvas id="qa-canvas"> ← annotation layer
                                        └─ #qa-notepad, #qa-snip-box, etc.
```

**Why two layers?**  
The background screenshot is rendered as an `<img>` element while all annotations live on a **transparent canvas** on top. This allows the Eraser to use `destination-out` compositing — erasing only the annotation pixels — without ever touching the screenshot beneath.

**Save composite:**  
When saving (full or snip), both layers are composited onto a temporary off-screen canvas before downloading.

---

## 🔐 Permissions

| Permission | Reason |
|------------|--------|
| `contextMenus` | Register the right-click "Quick Annotate" menu item |
| `activeTab` | Access the currently active tab |
| `tabs` | Take a screenshot of the visible tab |
| `clipboardWrite` | Allow the Notepad's Copy button to write to the clipboard |

---

## 🌐 Compatibility

- **Chrome** 88+ (Manifest V3)
- **Edge** (Chromium-based) — should work with the same load-unpacked process

---

## 📝 Notes

- Annotations are **session-based** — they are cleared when you exit the annotator or reload the page.
- The Notepad content is also session-based and is not persisted between uses.
- The extension works on **all URLs** (`<all_urls>` match pattern), including `http` and `https` pages.
