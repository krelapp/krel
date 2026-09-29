window.PO = window.PO || {};

// Panel, toast, prompt, dan editor kode yang dipakai versi 3D.
PO.ui = (() => {
  const { config } = PO;
  const $ = (id) => document.getElementById(id);

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const keys = (...k) => `<span class="keys">${k.map((x) => `<kbd${x === "E" ? ' class="hot"' : ""}>${x}</kbd>`).join("")}</span>`;

  const views = {
    board: () => `<h2>The Wall</h2><p>Posted. Don't take them down.</p>
      <div class="cards">${config.projects.map((p, i) => `<div class="card" style="--r:${[-2, 1.5, -1, 2, -1.5][i % 5]}deg"><b>${esc(p.title)}</b><p>${esc(p.desc)}</p><small>${esc(p.tag)}</small></div>`).join("")}</div>`,
    awards: () => `<h2>The Shelf</h2><p>Marks. Not prizes.</p>
      <ul class="awards">${config.awards.map((a) => `<li>${esc(a.title)}<span>${esc(a.year)}</span></li>`).join("")}</ul>`,
    about: () => `<h2>About ${esc(config.studioName)}</h2>${config.about.map((p) => `<p>${esc(p)}</p>`).join("")}`,
    contact: () => `<h2>The Door</h2><p>It doesn't open. Yet</p>`,
    help: () => `<h2>Controls</h2><ul class="help-list">
      <li>${keys("W", "A", "S", "D")} walk (arrow keys work too)</li>
      <li>${keys("Mouse")} look around</li>
      <li>${keys("Shift")} run</li>
      <li>${keys("E")} interact — aim the crosshair at an object</li>
      <li>${keys("M")} sound on / off</li>
      <li>${keys("Esc")} release the cursor / close a panel</li></ul>
      <p>Try to find everything you can interact with. There's a cat.</p>`
  };

  const modal = $("modal"), modalBody = $("modal-body");
  const editor = $("editor"), code = $("ed-code"), preview = $("ed-preview");
  const promptEl = $("prompt"), promptText = $("prompt-text"), toastEl = $("toast");
  let toastTimer = null, lastPrompt = null, previewTimer = null;
  const CODE_KEY = "pixel-office-code";

  const api = {
    open: null,
    onclose: null,
    esc,
    code,

    toast(msg, ms = 2600) {
      toastEl.textContent = msg;
      toastEl.classList.remove("hidden");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.add("hidden"), ms);
    },

    setPrompt(txt) {
      if (txt === lastPrompt) return;
      lastPrompt = txt;
      promptEl.classList.toggle("hidden", !txt);
      if (txt) promptText.textContent = txt;
    },

    openModal(name) {
      modalBody.innerHTML = views[name]();
      modal.classList.remove("hidden");
      api.open = "modal";
      api.setPrompt(null);
    },

    openEditor() {
      code.value = localStorage.getItem(CODE_KEY) || config.starterCode;
      preview.srcdoc = code.value;
      editor.classList.remove("hidden");
      api.open = "editor";
      api.setPrompt(null);
      setTimeout(() => code.focus(), 30);
    },

    close() {
      if (!api.open) return;
      modal.classList.add("hidden");
      editor.classList.add("hidden");
      code.blur();
      api.open = null;
      lastPrompt = undefined;
      if (api.onclose) api.onclose();
    }
  };

  code.addEventListener("input", () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      preview.srcdoc = code.value;
      localStorage.setItem(CODE_KEY, code.value);
    }, 250);
  });
  code.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const s = code.selectionStart, en = code.selectionEnd;
    code.value = code.value.slice(0, s) + "  " + code.value.slice(en);
    code.selectionStart = code.selectionEnd = s + 2;
    code.dispatchEvent(new Event("input"));
  });
  $("ed-reset").addEventListener("click", () => {
    code.value = config.starterCode;
    localStorage.removeItem(CODE_KEY);
    preview.srcdoc = code.value;
    code.focus();
  });
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", api.close));
  [modal, editor].forEach((el) => el.addEventListener("click", (e) => { if (e.target === el) api.close(); }));

  return api;
})();
