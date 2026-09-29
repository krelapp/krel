import { useEffect, useRef, useState } from "react";
import config from "./config.js";
import { startOffice } from "./office.js";

const TILT = [-2, 1.5, -1, 2, -1.5];
const CODE_KEY = "pixel-office-code";

function Kbd({ children, hot = false }) {
  return (
    <kbd className={`inline-grid h-7 min-w-7 place-items-center px-1.5 text-[13px] font-bold text-ink shadow-[0_3px_0_#9c8f7b] ${hot ? "bg-mustard shadow-[0_3px_0_#a27a28]" : "bg-cream"}`}>
      {children}
    </kbd>
  );
}

function Keys({ children }) {
  return <span className="flex min-w-[132px] gap-1">{children}</span>;
}

function Cta({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer border-0 bg-tomato px-7 py-3.5 text-lg font-bold tracking-[2px] text-cream shadow-[0_5px_0_#7d2a1a] hover:-translate-y-0.5 hover:shadow-[0_7px_0_#7d2a1a] active:translate-y-[3px] active:shadow-[0_2px_0_#7d2a1a]"
    >
      {children}
    </button>
  );
}

function HudButton({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="pointer-events-auto cursor-pointer border-2 border-cream bg-panel px-2.5 py-1.5 text-[13px] text-cream hover:bg-line"
    >
      {children}
    </button>
  );
}

function ModalView({ name }) {
  if (name === "board") {
    return (
      <>
        <h2 className="mb-1.5 pr-10 text-[26px] text-mustard">The Wall</h2>
        <p className="my-2 text-base leading-normal">Posted. Don't take them down.</p>
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {config.projects.map((p, i) => (
            <div key={p.title} className="bg-cream p-3 text-ink shadow-[3px_3px_0_rgba(0,0,0,.35)]" style={{ transform: `rotate(${TILT[i % 5]}deg)` }}>
              <b className="block text-base">{p.title}</b>
              <p className="my-1.5 text-[13px]">{p.desc}</p>
              <small className="inline-block bg-ink px-1.5 py-0.5 text-[11px] tracking-wide text-cream uppercase">{p.tag}</small>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (name === "awards") {
    return (
      <>
        <h2 className="mb-1.5 pr-10 text-[26px] text-mustard">The Shelf</h2>
        <p className="my-2 text-base leading-normal">Marks. Not prizes.</p>
        <ul className="mt-3 grid gap-1">
          {config.awards.map((a) => (
            <li key={a.year} className="flex justify-between gap-3 border-b-2 border-dashed border-line py-2">
              {a.title}<span className="text-mustard">{a.year}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (name === "about") {
    return (
      <>
        <h2 className="mb-1.5 pr-10 text-[26px] text-mustard">About {config.studioName}</h2>
        {config.about.map((p) => <p key={p} className="my-2 text-base leading-normal">{p}</p>)}
      </>
    );
  }
  if (name === "contact") {
    return (
      <>
        <h2 className="mb-1.5 pr-10 text-[26px] text-mustard">The Other Room</h2>
        <p className="my-2 text-base leading-normal">You weren't supposed to find this.</p>
        <p className="my-2 text-base leading-normal">The lock only sleeps in the dark. Stay anyway.</p>
      </>
    );
  }
  return (
    <>
      <h2 className="mb-1.5 pr-10 text-[26px] text-mustard">Controls</h2>
      <ul className="mt-3 grid gap-2.5">
        <li className="flex items-center gap-3"><Keys><Kbd>W</Kbd><Kbd>A</Kbd><Kbd>S</Kbd><Kbd>D</Kbd></Keys> walk (arrow keys work too)</li>
        <li className="flex items-center gap-3"><Keys><Kbd>Mouse</Kbd></Keys> look around</li>
        <li className="flex items-center gap-3"><Keys><Kbd>Shift</Kbd></Keys> run</li>
        <li className="flex items-center gap-3"><Keys><Kbd hot>E</Kbd></Keys> interact — aim the crosshair at an object</li>
        <li className="flex items-center gap-3"><Keys><Kbd>M</Kbd></Keys> sound on / off</li>
        <li className="flex items-center gap-3"><Keys><Kbd>Esc</Kbd></Keys> release the cursor / close a panel</li>
      </ul>
      <p className="my-2 text-base leading-normal">Try to find everything you can interact with. There's a cat.</p>
    </>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const codeRef = useRef(null);
  const uiRef = useRef({});
  const officeRef = useRef(null);
  const toastTimer = useRef(null);
  const previewTimer = useRef(null);

  const [phase, setPhase] = useState("loading");
  const [load, setLoad] = useState({ pct: 0, label: "setting up the office", failed: false });
  const [loaderOn, setLoaderOn] = useState(true);
  const [loaderFade, setLoaderFade] = useState(false);
  const [blur, setBlur] = useState(true);
  const [hud, setHud] = useState(false);
  const [touch, setTouch] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const [crosshair, setCrosshair] = useState(false);
  const [modal, setModal] = useState(null);
  const [editor, setEditor] = useState(false);
  const [code, setCode] = useState(config.starterCode);
  const [preview, setPreview] = useState(config.starterCode);

  uiRef.current = {
    get code() { return codeRef.current; },
    setPrompt,
    setCrosshair,
    setMuted,
    setPhase,
    setLoad,
    setBlur,
    setHud,
    setTouch,
    openModal: (name) => setModal(name),
    openEditor() {
      const saved = localStorage.getItem(CODE_KEY) || config.starterCode;
      setCode(saved);
      setPreview(saved);
      setEditor(true);
      setTimeout(() => codeRef.current?.focus(), 30);
    },
    dismiss() {
      setModal(null);
      setEditor(false);
      codeRef.current?.blur();
    },
    toast(msg, ms = 2600) {
      setToast(msg);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), ms);
    },
    hideLoader() {
      setLoaderFade(true);
      setTimeout(() => setLoaderOn(false), 450);
    }
  };

  useEffect(() => {
    document.title = config.studioName;
    officeRef.current = startOffice(canvasRef.current, uiRef);
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(previewTimer.current);
      officeRef.current?.destroy();
    };
  }, []);

  function onCode(value) {
    setCode(value);
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      setPreview(value);
      localStorage.setItem(CODE_KEY, value);
    }, 250);
  }

  function onTab(e) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const s = el.selectionStart;
    const next = code.slice(0, s) + "  " + code.slice(el.selectionEnd);
    onCode(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = s + 2;
    });
  }

  function hold(key, e) {
    e.preventDefault();
    e.stopPropagation();
    officeRef.current?.hold(key);
  }

  const office = () => officeRef.current;

  return (
    <main className="fixed inset-0 font-pixel text-cream">
      <div className="sr-only">
        <h1>{config.studioName}</h1>
        <p>A pixel room you walk through in first person: desks, a radio, a live screen, a sofa, a cat, and a plug in the wall. The name on the wall is KREL.</p>
      </div>

      <canvas
        ref={canvasRef}
        aria-label="Interactive 3D pixel office"
        className={`absolute inset-0 h-full w-full [image-rendering:pixelated] transition-[filter] duration-500 ${blur ? "blur-[5px] brightness-[.55]" : ""}`}
      />

      {hud && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute top-3 right-3 left-3 flex items-center justify-between">
            <div className="text-lg font-bold [text-shadow:2px_2px_0_#c8452c]">{config.studioName}</div>
            <div className="flex gap-2">
              <HudButton title="Sound (M)" onClick={(e) => { office()?.toggleSound(); e.currentTarget.blur(); }}>
                Sound: {muted ? "OFF" : "ON"}
              </HudButton>
              <HudButton title="Controls (H)" onClick={(e) => { e.currentTarget.blur(); office()?.openHelp(); }}>?</HudButton>
            </div>
          </div>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${crosshair ? "h-3.5 w-3.5 border-[3px] border-mustard bg-transparent shadow-[0_0_0_2px_rgba(30,26,23,.6)]" : "h-1.5 w-1.5 bg-cream shadow-[0_0_0_2px_rgba(30,26,23,.6)]"}`} />
          {prompt && (
            <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2.5 border-[3px] border-cream bg-ink/90 py-2 pr-3.5 pl-2 text-base whitespace-nowrap shadow-[4px_4px_0_#c8452c]">
              <Kbd hot>E</Kbd><span>{prompt}</span>
            </div>
          )}
          {toast && (
            <div role="status" className="absolute top-14 left-1/2 max-w-[90vw] -translate-x-1/2 bg-cream px-3.5 py-2 text-center text-[15px] font-semibold text-ink shadow-[4px_4px_0_#c8452c]">
              {toast}
            </div>
          )}
        </div>
      )}

      {touch && (
        <div className="absolute right-0 bottom-0 left-0 z-[11] h-0">
          <div className="absolute bottom-[18px] left-[18px] grid grid-cols-3 grid-rows-3">
            {[
              ["up", "▲", "col-start-2 row-start-1"],
              ["left", "◀", "col-start-1 row-start-2"],
              ["right", "▶", "col-start-3 row-start-2"],
              ["down", "▼", "col-start-2 row-start-3"]
            ].map(([key, label, place]) => (
              <button
                key={key}
                type="button"
                className={`${place} h-[52px] w-[52px] touch-none border-2 border-cream bg-ink/70 text-xl text-cream select-none`}
                onPointerDown={(e) => hold(key, e)}
                onPointerUp={() => office()?.release(key)}
                onPointerLeave={() => office()?.release(key)}
                onPointerCancel={() => office()?.release(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="absolute right-[22px] bottom-10 h-[72px] w-[72px] touch-none rounded-full border-2 border-cream bg-tomato text-xl font-bold text-cream select-none"
            onPointerDown={(e) => hold("e", e)}
          >
            E
          </button>
        </div>
      )}

      {loaderOn && (
        <div className={`absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-ink p-6 text-center transition-opacity duration-500 ${loaderFade ? "pointer-events-none opacity-0" : ""}`}>
          <p className="text-[clamp(34px,6vw,60px)] font-bold tracking-wide [text-shadow:4px_4px_0_#c8452c]">{config.studioName}</p>
          <div className="h-3.5 w-[min(320px,80vw)] border-[3px] border-cream p-0.5">
            <div className="h-full bg-tomato transition-[width] duration-200" style={{ width: `${load.pct}%` }} />
          </div>
          <div className="flex w-[min(320px,80vw)] justify-between text-xs tracking-[2px] uppercase opacity-70">
            <span>{load.label}</span><span>{load.failed ? "failed" : `${load.pct}%`}</span>
          </div>
        </div>
      )}

      {phase === "intro" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 p-6 text-center">
          <p className="text-[clamp(34px,6vw,60px)] font-bold tracking-wide [text-shadow:4px_4px_0_#c8452c]">{config.studioName}</p>
          <p className="-mt-2 max-w-[440px] text-[17px] opacity-85">{config.tagline}</p>
          <ul className="grid min-w-[min(360px,92vw)] gap-2.5 border-[3px] border-cream bg-ink/90 px-5 py-4 text-left shadow-[6px_6px_0_#c8452c]">
            <li className="flex items-center gap-3 text-base"><Keys><Kbd>W</Kbd><Kbd>A</Kbd><Kbd>S</Kbd><Kbd>D</Kbd></Keys> Walk · arrow keys work too</li>
            <li className="flex items-center gap-3 text-base"><Keys><Kbd>Mouse</Kbd></Keys> Look around</li>
            <li className="flex items-center gap-3 text-base"><Keys><Kbd>Shift</Kbd></Keys> Run</li>
            <li className="flex items-center gap-3 text-base"><Keys><Kbd hot>E</Kbd></Keys> Interact · get close to a glowing object</li>
            <li className="flex items-center gap-3 text-base"><Keys><Kbd>Esc</Kbd></Keys> Release the cursor</li>
          </ul>
          <Cta onClick={() => office()?.enter()}>ENTER THE OFFICE →</Cta>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-[25] flex flex-col items-center justify-center gap-5 bg-[rgba(15,12,10,.45)] p-6 text-center">
          <Cta onClick={() => office()?.resume()}>CLICK TO CONTINUE</Cta>
          <p className="text-[13px] opacity-70">Press <Kbd>Esc</Kbd> anytime to release the cursor.</p>
        </div>
      )}

      {modal && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[rgba(15,12,10,.6)] p-4" onClick={(e) => { if (e.target === e.currentTarget) office()?.closePanel(); }}>
          <div role="dialog" aria-modal="true" className="relative max-h-[86vh] w-[min(580px,100%)] overflow-auto border-[3px] border-cream bg-panel px-6 pt-6 pb-6 shadow-[8px_8px_0_#c8452c]">
            <button type="button" aria-label="Close" onClick={() => office()?.closePanel()} className="absolute top-2.5 right-2.5 cursor-pointer border-2 border-cream bg-panel px-2.5 py-1.5 text-[13px] text-cream hover:bg-line">✕</button>
            <ModalView name={modal} />
          </div>
        </div>
      )}

      {editor && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[rgba(15,12,10,.6)] p-4" onClick={(e) => { if (e.target === e.currentTarget) office()?.closePanel(); }}>
          <div role="dialog" aria-modal="true" aria-label="Live code editor" className="flex h-[min(660px,90vh)] w-[min(1100px,100%)] flex-col border-[3px] border-cream bg-[#1b1714] shadow-[8px_8px_0_#c8452c]">
            <div className="flex items-center gap-3 border-b-[3px] border-cream bg-panel px-2.5 py-2">
              <span className="flex gap-1.5">
                <i className="block h-2.5 w-2.5 bg-tomato" />
                <i className="block h-2.5 w-2.5 bg-mustard" />
                <i className="block h-2.5 w-2.5 bg-[#6fae5b]" />
              </span>
              <span className="flex-1 text-sm opacity-85">index.html · live preview</span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="cursor-pointer border-2 border-cream bg-panel px-2.5 py-1.5 text-[13px] text-cream hover:bg-line"
                  onClick={() => {
                    localStorage.removeItem(CODE_KEY);
                    setCode(config.starterCode);
                    setPreview(config.starterCode);
                    codeRef.current?.focus();
                  }}
                >
                  Reset
                </button>
                <button type="button" className="cursor-pointer border-2 border-cream bg-panel px-2.5 py-1.5 text-[13px] text-cream hover:bg-line" onClick={() => office()?.closePanel()}>Close · Esc</button>
              </span>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
              <textarea
                ref={codeRef}
                value={code}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-label="HTML code"
                onChange={(e) => onCode(e.target.value)}
                onKeyDown={onTab}
                className="resize-none border-0 border-b-[3px] border-cream bg-[#1b1714] p-3.5 font-mono text-sm leading-relaxed text-cream outline-none md:border-r-[3px] md:border-b-0"
              />
              <iframe title="Code result" sandbox="allow-scripts" srcDoc={preview} className="h-full w-full border-0 bg-white" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
