import { useEffect, useState } from "react";
import type { TearMatch } from "./types";
import { Pin, PinOff, Scissors } from "lucide-react";

type PadPanelProps = {
  note: string;
  pinned: boolean;
  onNoteChange: (value: string) => void;
  onTear: () => void;
  onToggleDrawer: () => void;
  onTogglePin: () => void;
};

function PadPanel({
  note,
  pinned,
  onNoteChange,
  onTear,
  onToggleDrawer,
  onTogglePin,
}: PadPanelProps) {
  return (
    <section className="pad-panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand">Padder</div>

          <button
            type="button"
            className={
              pinned
                ? "pin-button icon-button is-pinned"
                : "pin-button icon-button"
            }
            onClick={onTogglePin}
            title={pinned ? "Unpin Padder" : "Pin Padder on top"}
            aria-pressed={pinned}
          >
            {pinned ? (
              <PinOff size={16} strokeWidth={3} />
            ) : (
              <Pin size={16} strokeWidth={3} />
            )}
            <span>{pinned ? "Pinned" : "Pin"}</span>
          </button>
        </div>

        <div className="topbar-right">
          <button type="button" className="icon-button" onClick={onTear}>
            <Scissors size={16} strokeWidth={3} />
            <span>Strike / Tear</span>
          </button>

          <button type="button" onClick={onToggleDrawer}>
            Tears
          </button>
        </div>
      </div>

      <div className="paper match-flap">
        <textarea
          className="text-lines pad-input"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          autoFocus
          spellCheck="true"
          placeholder="Write here..."
        />
      </div>
    </section>
  );
}

type DrawerProps = {
  matches: TearMatch[];
  onOpenTear: (tear: TearMatch) => void;
};

function Drawer({ matches, onOpenTear }: DrawerProps) {
  return (
    <aside className="drawer">
      <div className="drawer-head">
        <strong>Match Sticks</strong>
        <span className="count">{matches.length}/5</span>
      </div>

      <div className="cards">
        {matches.length === 0 && (
          <div className="empty-card">
            Type something that overlaps with an old tear.
          </div>
        )}

        {matches.map((tear) => (
          <TearCard key={tear.id} tear={tear} onOpen={() => onOpenTear(tear)} />
        ))}
      </div>
    </aside>
  );
}

type TearCardProps = {
  tear: TearMatch;
  onOpen: () => void;
};

function TearCard({ tear, onOpen }: TearCardProps) {
  return (
    <article className="card" onClick={onOpen}>
      <div className="card-top">
        <span className="percent">{tear.percent}% match</span>
        <span className="date">{formatDate(tear.createdAt)}</span>
      </div>

      <div className="tear-title">{tear.title || getTearTitle(tear)}</div>

      <div className="thumb">{tear.body.slice(0, 220)}</div>

      <div className="match">
        {tear.longestMatch
          ? `Longest: "${tear.longestMatch}"`
          : "No exact phrase match"}
      </div>

      <div className="words">
        {tear.commonWords.length > 0
          ? `Most found: ${tear.commonWords.join(" · ")}`
          : "No repeated matching words"}
      </div>
    </article>
  );
}

type OpenedTearProps = {
  tear: TearMatch;
  onClose: () => void;
  onRenamed: (tearId: string, title: string) => void;
};

function OpenedTear({ tear, onClose, onRenamed }: OpenedTearProps) {
  const [title, setTitle] = useState(tear.title || getTearTitle(tear));

  useEffect(() => {
    setTitle(tear.title || getTearTitle(tear));
  }, [tear]);

  async function handleRename() {
    const nextTitle = title.trim() || getTearTitle(tear);

    setTitle(nextTitle);
    await window.f1pad.renameTear(tear.id, nextTitle);
    onRenamed(tear.id, nextTitle);
  }

  async function handleDownload() {
    await handleRename();
    await window.f1pad.downloadTear(tear.id);
  }

  return (
    <section className="opened-tear">
      <div className="opened-tear-head">
        <strong>{tear.percent}% match</strong>

        <input
          className="tear-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={handleRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          aria-label="Tear name"
        />

        <button type="button" onClick={handleDownload}>
          Download
        </button>

        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <pre>{tear.body}</pre>
    </section>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTearTitle(tear: TearMatch) {
  const firstLine = tear.body
    .split("\n")
    .find((line) => line.trim().length > 0)
    ?.trim();

  return firstLine ? firstLine.slice(0, 60) : "Untitled Tear";
}

type SplashProps = {
  onStart: () => void;
};

function Splash({ onStart }: SplashProps) {
  return (
    <main className="app">
      <section className="pad-panel splash-panel">
        <div className="topbar">
          <div className="topbar-left">
            <div className="brand">Padder</div>
          </div>

          <div className="topbar-right">
            <button type="button" onClick={onStart}>
              Start
            </button>
          </div>
        </div>

        <div className="splash-body">
          <div className="splash-kicker">Stop saving scraps everywhere.</div>

          <div className="splash-rules">
            <div className="splash-rule">
              <h1>Fuck text files.</h1>
              <p>Use one pad.</p>
            </div>

            <div className="splash-rule">
              <h1>Fuck Notepad.</h1>
              <p>Hit F1.</p>
            </div>

            <div className="splash-rule">
              <h1>Fuck searching folders.</h1>
              <p>Old tears match automatically.</p>
            </div>

            <div className="splash-rule">
              <h1>Fuck losing things.</h1>
              <p>Strike / Tear to save.</p>
            </div>
          </div>

          <button type="button" className="splash-start" onClick={onStart}>
            Open Padder
          </button>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [note, setNote] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [matches, setMatches] = useState<TearMatch[]>([]);
  const [openedTear, setOpenedTear] = useState<TearMatch | null>(null);
  const [pinned, setPinned] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    document.body.classList.add("matchbook");

    return () => {
      document.body.classList.remove("matchbook");
    };
  }, []);

  useEffect(() => {
    async function loadPadder() {
      const savedNote = await window.f1pad.getNote();
      const savedPinned = await window.f1pad.getPinned();

      setNote(savedNote);
      setPinned(savedPinned);

      const splashAlreadySeen = localStorage.getItem("padder-splash-seen");

      if (splashAlreadySeen !== "true") {
        setShowSplash(true);
      }
    }

    loadPadder();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.f1pad.setNote(note);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [note]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.f1pad.getTearMatches(note).then(setMatches);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [note]);

  function handleStartSplash() {
    localStorage.setItem("padder-splash-seen", "true");
    setShowSplash(false);
  }

  async function handleTear() {
    if (!note.trim()) return;

    await window.f1pad.createTear(note);

    setNote("");
    setOpenedTear(null);

    const nextMatches = await window.f1pad.getTearMatches("");
    setMatches(nextMatches);
    setDrawerOpen(true);
  }

  async function handleTogglePin() {
    const nextPinned = !pinned;
    const savedPinned = await window.f1pad.setPinned(nextPinned);
    setPinned(savedPinned);
  }

  if (showSplash) {
    return <Splash onStart={handleStartSplash} />;
  }

  return (
    <main className={drawerOpen ? "app app-has-drawer" : "app"}>
      <PadPanel
        note={note}
        pinned={pinned}
        onNoteChange={setNote}
        onTear={handleTear}
        onToggleDrawer={() => setDrawerOpen((current) => !current)}
        onTogglePin={handleTogglePin}
      />

      {drawerOpen && (
        <Drawer matches={matches} onOpenTear={(tear) => setOpenedTear(tear)} />
      )}

      {openedTear && (
        <OpenedTear
          tear={openedTear}
          onClose={() => setOpenedTear(null)}
          onRenamed={(tearId, title) => {
            setOpenedTear((current) =>
              current && current.id === tearId
                ? { ...current, title }
                : current,
            );

            setMatches((current) =>
              current.map((match) =>
                match.id === tearId ? { ...match, title } : match,
              ),
            );
          }}
        />
      )}
    </main>
  );
}

export default App;
