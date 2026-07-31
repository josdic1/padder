import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
} from "electron";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import Store from "electron-store";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

type SavedBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Tear = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  title?: string;
  body: string;
};

type TearMatch = Tear & {
  percent: number;
  commonWords: string[];
  longestMatch: string;
};

const store = new Store<{
  note: string;
  bounds?: SavedBounds;
  tears: Tear[];
  pinned: boolean;
}>({
  defaults: {
    note: "",
    tears: [],
    pinned: false,
  },
});

let win: BrowserWindow | null = null;

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "const",
  "div",
  "else",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "is",
  "it",
  "let",
  "of",
  "on",
  "or",
  "return",
  "the",
  "this",
  "to",
  "type",
  "var",
  "with",
  "class",
  "classname",
  "style",
  "span",
  "button",
  "html",
  "body",
  "root",
  "css",
  "rgba",
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !stopWords.has(word));
}

function getDefaultTitle(body: string) {
  const firstLine = body
    .split("\n")
    .find((line) => line.trim().length > 0)
    ?.trim();

  return firstLine ? firstLine.slice(0, 60) : "Untitled Tear";
}

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "untitled-tear";
}

function getTopWords(currentText: string, tearText: string) {
  const currentWords = new Set(tokenize(currentText));
  const tearWords = tokenize(tearText);

  const counts = new Map<string, number>();

  for (const word of tearWords) {
    if (!currentWords.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([word, count]) => `${word} ×${count}`);
}

function getMatchPercent(currentText: string, tearText: string) {
  const currentWords = new Set(tokenize(currentText));
  const tearWords = new Set(tokenize(tearText));

  if (currentWords.size === 0 || tearWords.size === 0) return 0;

  let overlap = 0;

  for (const word of currentWords) {
    if (tearWords.has(word)) overlap += 1;
  }

  const smallerSetSize = Math.min(currentWords.size, tearWords.size);

  return Math.round((overlap / smallerSetSize) * 100);
}

function getLongestTextMatch(currentText: string, tearText: string) {
  const currentWords = currentText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const tearWords = tearText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let bestMatch: string[] = [];

  for (let i = 0; i < currentWords.length; i += 1) {
    for (let j = 0; j < tearWords.length; j += 1) {
      const currentMatch: string[] = [];

      let currentIndex = i;
      let tearIndex = j;

      while (
        currentIndex < currentWords.length &&
        tearIndex < tearWords.length &&
        currentWords[currentIndex] === tearWords[tearIndex]
      ) {
        currentMatch.push(currentWords[currentIndex]);
        currentIndex += 1;
        tearIndex += 1;
      }

      if (currentMatch.length > bestMatch.length) {
        bestMatch = currentMatch;
      }
    }
  }

  return bestMatch.join(" ");
}

function getMiddleDisplay() {
  const displays = screen.getAllDisplays();

  const sorted = [...displays].sort((a, b) => {
    return a.bounds.x - b.bounds.x;
  });

  return sorted[Math.floor(sorted.length / 2)] ?? screen.getPrimaryDisplay();
}

function getDefaultBounds(): SavedBounds {
  const display = getMiddleDisplay();
  const { x, y, width, height } = display.workArea;

  const windowWidth = 1180;
  const windowHeight = 760;

  return {
    width: windowWidth,
    height: windowHeight,
    x: Math.round(x + (width - windowWidth) / 2),
    y: Math.round(y + (height - windowHeight) / 2),
  };
}

function saveBounds() {
  if (!win) return;

  const bounds = win.getBounds();

  store.set("bounds", {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}

function applyPinnedState() {
  if (!win) return;

  const pinned = store.get("pinned", false);
  win.setAlwaysOnTop(pinned, "floating");
}

function createWindow() {
  const savedBounds = store.get("bounds");
  const bounds = savedBounds ?? getDefaultBounds();
  const pinned = store.get("pinned", false);

  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 760,
    minHeight: 520,

    icon: path.join(__dirname, "../build/icons/icon.png"),

    show: false,
    frame: false,
    resizable: true,
    movable: true,
    alwaysOnTop: pinned,
    skipTaskbar: true,
    backgroundColor: "#f7eee4",

    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.on("resize", saveBounds);
  win.on("move", saveBounds);

  win.on("closed", () => {
    win = null;
  });
}

function togglePad() {
  if (!win) {
    createWindow();
  }

  if (!win) return;

  if (win.isVisible() && win.isFocused()) {
    win.hide();
    return;
  }

  win.show();
  win.focus();
  win.moveTop();

  const pinned = store.get("pinned", false);

  if (!pinned) {
    win.setAlwaysOnTop(true, "floating");

    setTimeout(() => {
      if (!win) return;
      win.setAlwaysOnTop(false);
    }, 250);
  }
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register("F1", togglePad);

  ipcMain.handle("note:get", () => {
    return store.get("note", "");
  });

  ipcMain.handle("note:set", (_event, value: string) => {
    store.set("note", value);
  });

  ipcMain.handle("pin:get", () => {
    return store.get("pinned", false);
  });

  ipcMain.handle("pin:set", (_event, pinned: boolean) => {
    store.set("pinned", pinned);
    applyPinnedState();
    return pinned;
  });

  ipcMain.handle("tear:create", (_event, body: string) => {
    const trimmed = body.trim();

    if (!trimmed) return;

    const tears = store.get("tears", []);
    const now = new Date().toISOString();

    const tear: Tear = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      title: getDefaultTitle(trimmed),
      body: trimmed,
    };

    store.set("tears", [tear, ...tears]);
    store.set("note", "");
  });

  ipcMain.handle("tear:rename", (_event, id: string, title: string) => {
    const tears = store.get("tears", []);

    const nextTears = tears.map((tear) => {
      if (tear.id !== id) return tear;

      return {
        ...tear,
        title: title.trim() || getDefaultTitle(tear.body),
        updatedAt: new Date().toISOString(),
      };
    });

    store.set("tears", nextTears);
  });

  ipcMain.handle("tear:download", async (_event, id: string) => {
    const tears = store.get("tears", []);
    const tear = tears.find((item) => item.id === id);

    if (!tear) return;

    const title = tear.title?.trim() || getDefaultTitle(tear.body);
    const fileName = `${safeFileName(title)}.txt`;

    const result = await dialog.showSaveDialog({
      title: "Download Tear",
      defaultPath: fileName,
      filters: [{ name: "Text File", extensions: ["txt"] }],
    });

    if (result.canceled || !result.filePath) return;

    const content = [
      title,
      "",
      `Created: ${tear.createdAt}`,
      tear.updatedAt ? `Updated: ${tear.updatedAt}` : "",
      "",
      tear.body,
    ]
      .filter(Boolean)
      .join("\n");

    fs.writeFileSync(result.filePath, content, "utf8");
  });

  ipcMain.handle("tear:matches", (_event, currentText: string) => {
    const tears = store.get("tears", []);

    const matches: TearMatch[] = tears
      .map((tear) => {
        return {
          ...tear,
          percent: getMatchPercent(currentText, tear.body),
          commonWords: getTopWords(currentText, tear.body),
          longestMatch: getLongestTextMatch(currentText, tear.body),
        };
      })
      .filter((match) => match.percent > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 5);

    return matches;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (!win) {
    createWindow();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
