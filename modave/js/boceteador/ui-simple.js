import {
  createEditorState,
  snapshotPlacement,
  restorePlacement,
  composeFoto,
  clamp,
  placeOnPhoto,
  alignLogo,
  simpleCanSave,
} from "./core.js";
import {
  rasterizeFile,
  computeTrim,
  rebuildLogoSrc,
  padNarrowPhoto,
  MSG_EPS,
  MSG_VEC_ERR,
  esEps,
} from "./logo-pipeline.js";
import { createSketch } from "./payload.js";
import { samePhotoUrl } from "./photo-swiper.js";

const TECH_NOSOTROS = "Sugerido por Formas";
const TECH_NOSOTROS_LEGACY = "Lo elegimos nosotros";

const TECHNIQUE_HINTS = {
  "": "Elegí cómo se aplica el logo sobre el producto.",
  [TECH_NOSOTROS]: "Elegimos el método de aplicación que mejor se adecue al producto.",
  "DTP Full Color": "Impresión digital a todo color. Sirve cuando el logo tiene muchos colores o degradés.",
  DTF: "El logo se imprime en un film y se pega con calor. Sirve en varios tipos de tela.",
  "Serigrafía": "Tinta a través de una malla. Buena para cantidades y colores planos.",
  "Tampografía": "Un tampón estampa el logo en superficies chicas o curvas (lapiceras, mates).",
  "Grabado láser": "El láser marca el material. Queda permanente, sin tinta; típico en metal.",
  "Bordado": "El logo se cose con hilo. Textura y durabilidad en textiles.",
  "Vinilo": "Un recorte adhesivo sobre el producto. Colores sólidos y bordes nítidos.",
  "Sublimación": "El logo se mete en el material con calor. Típico en productos preparados para sublimar.",
};

export async function createSimpleUi(mountEl) {
  if (!mountEl) throw new Error("createSimpleUi requires a mount element");
  if (!mountEl.querySelector(".bm-shell")) {
    const res = await fetch(new URL("./modal-simple.html", import.meta.url));
    const html = await res.text();
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const modal = wrap.querySelector("#formas-boceto-modal") || wrap.firstElementChild;
    mountEl.replaceWith(modal);
    mountEl = modal;
  }
  const root = mountEl.id === "formas-boceto-modal" ? mountEl : mountEl.querySelector("#formas-boceto-modal") || mountEl;
  const $ = (id) => root.querySelector("#" + id);
  const photo = $("photo");
  const frame = $("frame");
  const applyBtn = $("applyBtn");

  const state = createEditorState();
  const deletedLogos = [];
  let saveCb = null;
  let photoName = "producto";
  let productId = "";
  let variantColor = "";
  let sourcePhotoUrl = "";
  let catalogPhotos = [];
  let pendingAdd = false;
  let active = null;
  let cropState = null;
  let cropActive = null;

  const selLogo = () => state.logos[state.sel] || null;
  const frameRect = () => ({ w: frame.clientWidth || 1, h: frame.clientHeight || 1 });

  function setTechPath(path) {
    const us = $("techLetUsChoose");
    const me = $("techPickMyself");
    const wrap = $("techPickWrap");
    const body = $("techPickBody");
    const nosotros = path === "nosotros";
    const pick = path === "pick";
    if (us) {
      us.setAttribute("aria-pressed", String(nosotros));
      us.setAttribute("aria-checked", String(nosotros));
    }
    if (me) {
      me.setAttribute("aria-pressed", String(pick));
      me.setAttribute("aria-checked", String(pick));
    }
    if (wrap) wrap.classList.toggle("is-on", pick);
    if (body) body.hidden = !pick;
    if (!pick && $("technique")) $("technique").value = "";
  }

  function techValue() {
    const us = $("techLetUsChoose");
    if (us && us.getAttribute("aria-checked") === "true") return TECH_NOSOTROS;
    const sel = $("technique");
    return sel ? sel.value.trim() : "";
  }

  function notesValue() {
    const el = $("bocetoNotes");
    return el ? el.value.trim() : "";
  }

  function setNotes(value) {
    const el = $("bocetoNotes");
    if (el) el.value = value || "";
  }

  function clampPan() {
    const Z = state.zoom;
    const W = frame.clientWidth;
    const H = frame.clientHeight;
    state.pan.x = clamp(state.pan.x, W * (1 - Z), 0);
    state.pan.y = clamp(state.pan.y, H * (1 - Z), 0);
  }

  function applyView() {
    clampPan();
    frame.style.transform = "translate(" + state.pan.x + "px, " + state.pan.y + "px) scale(" + state.zoom + ")";
    frame.style.setProperty("--Z", String(state.zoom));
    frame.classList.toggle("panable", state.zoom > 1);
    if ($("zoomLabel")) $("zoomLabel").textContent = Math.round(state.zoom * 100) + "%";
  }

  function setZoomAt(newZ, clientX, clientY) {
    newZ = clamp(newZ, 1, 4);
    const oldZ = state.zoom;
    if (newZ === oldZ) return;
    const r = frame.getBoundingClientRect();
    const lx = (clientX - r.left) / oldZ;
    const ly = (clientY - r.top) / oldZ;
    state.pan.x += lx * (oldZ - newZ);
    state.pan.y += ly * (oldZ - newZ);
    state.zoom = newZ;
    applyView();
  }

  function zoomCentro(factor) {
    const r = $("frameWrap").getBoundingClientRect();
    setZoomAt(state.zoom * factor, r.left + r.width / 2, r.top + r.height / 2);
  }

  function updateTechHint() {
    const hint = $("techHint");
    if (!hint) return;
    const key = techValue();
    hint.hidden = !key || key === TECH_NOSOTROS || key === TECH_NOSOTROS_LEGACY;
    hint.textContent = TECHNIQUE_HINTS[key] || TECHNIQUE_HINTS[""];
  }

  function setStepStates() {
    $("step2").classList.toggle("locked", frame.hidden);
    $("step3").classList.toggle("locked", !state.logos.length);
    $("step1").classList.toggle("done", !frame.hidden);
    $("step2").classList.toggle("done", state.logos.length > 0);
    applyBtn.disabled = !simpleCanSave(state, techValue());
    updateTechHint();
  }

  function render() {
    state.logos.forEach((l, i) => {
      if (!l.el) return;
      Object.assign(l.el.style, {
        left: l.x * 100 + "%",
        top: l.y * 100 + "%",
        width: l.w * 100 + "%",
        height: l.h * 100 + "%",
      });
      l.el.style.transform = "rotate(" + (l.rot || 0) + "deg)";
      if (l.img) l.img.style.opacity = String(l.opacity == null ? 1 : l.opacity);
      l.el.classList.toggle("selected", i === state.sel);
    });

    setStepStates();
  }

  function setThumb(el, src) {
    el.textContent = "";
    if (!src) return;
    const img = document.createElement("img");
    img.alt = "";
    img.src = src;
    el.appendChild(img);
  }

  function setTxt(el, title, small) {
    el.textContent = "";
    el.appendChild(document.createTextNode(title));
    const s = document.createElement("small");
    s.textContent = small;
    el.appendChild(s);
  }

  function syncUndoUI() {
    const note = $("undoNote");
    if (deletedLogos.length) {
      const last = deletedLogos[deletedLogos.length - 1].logo;
      $("undoNoteTxt").textContent = "Se quitó \"" + (last.name || "logo") + "\".";
      note.hidden = false;
    } else note.hidden = true;
  }

  function syncLogoUI() {
    const L = selLogo();
    const chips = $("logoChips");
    chips.textContent = "";
    chips.hidden = state.logos.length < 2;
    state.logos.forEach((l, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "logoChip";
      b.title = l.name || ("Logo " + (i + 1));
      b.setAttribute("aria-pressed", String(i === state.sel));
      const im = document.createElement("img");
      im.alt = "";
      im.src = l.img && l.img.src ? l.img.src : "";
      b.appendChild(im);
      b.onclick = () => selectLogo(i);
      chips.appendChild(b);
    });
    $("addLogoBtn").hidden = !state.logos.length;
    const ajustes = $("logoAjustes");
    if (ajustes) ajustes.hidden = !L;
    $("logoTools").hidden = !L;
    const btn = $("removeWhiteBtn");
    btn.hidden = !L;
    if (L) {
      btn.disabled = false;
      btn.textContent = L.whiteRemoved ? "Restaurar fondo original" : "Quitar fondo blanco";
      setThumb($("logoThumb"), L.img && L.img.src);
      setTxt($("logoTxt"), L.name || "logo", "clic para reemplazar este logo");
      $("jpgNote").hidden = !(L.isJpg && !L.whiteRemoved);
      $("cropEditBtn").hidden = false;
      $("trimNote").hidden = !(L.crop && L.crop.trimmed);
      if (L.crop && L.crop.trimmed) {
        const activo = L.useTrim !== false;
        $("trimUndo").textContent = activo ? "Deshacer recorte" : "Volver a recortar";
        $("trimNoteTxt").textContent = !activo
          ? "Recorte deshecho: se usa el archivo completo, con sus márgenes."
          : (L.crop.manual
            ? "Recorte manual aplicado."
            : "Se recortaron los márgenes vacíos del logo.");
      }
      $("logoOpacity").value = String(Math.round((L.opacity == null ? 1 : L.opacity) * 100));
      $("opacityVal").textContent = $("logoOpacity").value + "%";
      root.querySelectorAll("#tintSeg [data-tint]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.tint === L.tint)));
    } else {
      $("logoThumb").textContent = "◐";
      setTxt($("logoTxt"), "Elegir logo", "PNG sin fondo recomendado · también SVG, JPG, PDF o AI");
      $("jpgNote").hidden = true;
      $("trimNote").hidden = true;
      $("cropEditBtn").hidden = true;
    }
  }

  function selectLogo(i) {
    if (i === state.sel) return;
    state.sel = i;
    syncLogoUI();
    render();
  }

  function makeLogoEl(logo) {
    const el = document.createElement("div");
    el.className = "logoItem";
    const img = document.createElement("img");
    img.alt = logo.name || "Logo";
    el.appendChild(img);
    ["tl", "tr", "bl", "br"].forEach((c) => {
      const h = document.createElement("span");
      h.className = "handle " + c;
      h.dataset.corner = c;
      el.appendChild(h);
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "logoDelete";
    del.setAttribute("aria-label", "Quitar logo");
    del.title = "Quitar este logo";
    del.textContent = "×";
    del.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    del.addEventListener("click", () => deleteLogo(logo));
    el.appendChild(del);
    const rot = document.createElement("span");
    rot.className = "logoRotate";
    rot.title = "Rotá el logo";
    rot.textContent = "⟳";
    el.appendChild(rot);
    frame.appendChild(el);
    logo.el = el;
    logo.img = img;
    return el;
  }

  async function rebuildLogo(logo, done) {
    const src = await rebuildLogoSrc(logo);
    logo.img.onload = () => {
      logo.img.onload = null;
      if (done) done();
      else {
        syncLogoUI();
        render();
      }
    };
    logo.img.src = src;
  }

  function deleteLogo(logo) {
    const i = state.logos.indexOf(logo);
    if (i < 0) return;
    logo.el.remove();
    state.logos.splice(i, 1);
    deletedLogos.push({ logo, index: i });
    state.sel = state.logos.length ? Math.min(i, state.logos.length - 1) : -1;
    $("logoInput").value = "";
    syncUndoUI();
    syncLogoUI();
    setStepStates();
    render();
  }

  function showStageChrome() {
    $("emptyState").hidden = true;
    frame.hidden = false;
    $("cleanToggle").hidden = false;
    frame.classList.remove("clean");
    $("cleanToggle").setAttribute("aria-pressed", "false");
    $("cleanToggle").textContent = "👁 Ocultar guías";
    $("zoomCtrls").hidden = false;
    $("alignCtrls").hidden = false;
    syncPhotoPick();
  }

  function syncPhotoPick() {
    const box = $("photoPick");
    const row = $("photoPickRow");
    if (!box || !row) return;
    box.hidden = catalogPhotos.length < 1;
    row.textContent = "";
    catalogPhotos.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "photoPick-btn";
      b.setAttribute("aria-pressed", String(samePhotoUrl(p.url, sourcePhotoUrl)));
      b.title = p.alt || ("Foto " + (i + 1));
      const im = document.createElement("img");
      im.alt = "";
      im.src = p.thumb || p.url;
      b.appendChild(im);
      b.addEventListener("click", () => pickPhoto(p));
      row.appendChild(b);
    });
  }

  async function pickPhoto(item) {
    if (!item || !item.url || samePhotoUrl(item.url, sourcePhotoUrl)) return;
    try {
      await loadPhotoSrc(item.url, item.alt || "Foto del producto");
      clearLogos();
      state.zone = null;
      syncPhotoPick();
      setStepStates();
      render();
    } catch (err) {
      window.alert(err.message || "No pude cargar esa foto.");
    }
  }

  function loadPhotoSrc(url, name) {
    sourcePhotoUrl = url;
    photoName = name || "producto";
    return new Promise((resolve, reject) => {
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.onload = () => {
        photo.onload = () => {
          showStageChrome();
          if (!state.ruler) state.ruler = { x1: 0.08, y1: 0.5, x2: 0.92, y2: 0.5 };
          state.rulerVisible = true;
          state.zoom = 1;
          state.pan = { x: 0, y: 0 };
          applyView();
          syncLogoUI();
          setStepStates();
          render();
          resolve();
        };
        photo.onerror = () => reject(new Error("No pude cargar la foto del producto."));
        photo.crossOrigin = "anonymous";
        photo.src = padNarrowPhoto(probe) || url;
      };
      probe.onerror = () => reject(new Error("No pude cargar la foto del producto."));
      probe.src = url;
    });
  }

  async function loadLogoSrc(url, name, isJpg) {
    const probe = new Image();
    await new Promise((resolve, reject) => {
      probe.onload = resolve;
      probe.onerror = () => reject(new Error("No se pudo leer el tamaño de \"" + (name || "ese archivo") + "\"."));
      probe.src = url;
    });
    if (!(probe.naturalWidth > 0 && probe.naturalHeight > 0)) {
      window.alert("No se pudo leer el tamaño de \"" + (name || "ese archivo") + "\".\nProbá exportarlo como PNG o volver a guardar el SVG desde el editor.");
      pendingAdd = false;
      $("logoInput").value = "";
      syncLogoUI();
      return;
    }
    const crop = computeTrim(probe);
    const aspect = crop.w / crop.h;
    let logo;
    if (pendingAdd || !state.logos.length) {
      logo = {
        src: url,
        name,
        isJpg: !!isJpg,
        aspect,
        crop,
        useTrim: true,
        fullW: probe.naturalWidth,
        fullH: probe.naturalHeight,
        whiteRemoved: false,
        tint: "original",
        opacity: 1,
        cmW: 0,
        cmH: 0,
        rot: 0,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        el: null,
        img: null,
      };
      makeLogoEl(logo);
      placeOnPhoto(logo, state.logos.length, frameRect());
      state.logos.push(logo);
      state.sel = state.logos.length - 1;
    } else {
      logo = selLogo();
      logo.src = url;
      logo.name = name;
      logo.isJpg = !!isJpg;
      logo.aspect = aspect;
      logo.crop = crop;
      logo.useTrim = true;
      logo.fullW = probe.naturalWidth;
      logo.fullH = probe.naturalHeight;
      logo.whiteRemoved = false;
      logo.tint = "original";
      logo.opacity = 1;
      const { w: FW, h: FH } = frameRect();
      logo.h = (logo.w * FW / aspect) / FH;
    }
    pendingAdd = false;
    await rebuildLogo(logo, () => {
      syncLogoUI();
      setStepStates();
      render();
    });
  }

  async function loadLogo(file) {
    if (esEps(file)) {
      window.alert(MSG_EPS);
      $("logoInput").value = "";
      pendingAdd = false;
      return;
    }
    try {
      setTxt($("logoTxt"), "Procesando " + (file.name || "logo") + "…", "convirtiendo a imagen");
      const raster = await rasterizeFile(file);
      const isJpg = /jpe?g/i.test(file.type || file.name || "");
      await loadLogoSrc(raster.png, raster.name, isJpg);
    } catch (err) {
      window.alert(err.message && err.message.includes("EPS") ? MSG_EPS : MSG_VEC_ERR);
      pendingAdd = false;
      syncLogoUI();
      $("logoInput").value = "";
    }
  }

  function resizeRect(s, corner, dxn, dyn, minW, minH) {
    let { x, y, w, h } = s;
    if (corner.includes("l")) {
      const nx = clamp(x + dxn, 0, x + w - minW);
      w += x - nx;
      x = nx;
    }
    if (corner.includes("r")) w = clamp(w + dxn, minW, 1 - x);
    if (corner.includes("t")) {
      const ny = clamp(y + dyn, 0, y + h - minH);
      h += y - ny;
      y = ny;
    }
    if (corner.includes("b")) h = clamp(h + dyn, minH, 1 - y);
    return { x, y, w, h };
  }

  function resizeLogo(a, cur, FW, FH) {
    const s = a.start;
    const L = a.logo;
    const asp = L.aspect || 1;
    const sx = s.x * FW;
    const sy = s.y * FH;
    const sw = s.w * FW;
    const sh = s.h * FH;
    if (s.rot) {
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      const d0 = Math.max(Math.hypot(a.startPx.x - cx, a.startPx.y - cy), 1);
      const d1 = Math.hypot(cur.x - cx, cur.y - cy);
      const k = Math.max(d1 / d0, 0.05);
      let w = sw * k;
      let h = w / asp;
      if (w > FW) {
        w = FW;
        h = w / asp;
      }
      if (h > FH) {
        h = FH;
        w = h * asp;
      }
      if (w < 20) {
        w = 20;
        h = w / asp;
      }
      if (h < 20) {
        h = 20;
        w = h * asp;
      }
      L.x = clamp((cx - w / 2) / FW, 0, 1 - w / FW);
      L.y = clamp((cy - h / 2) / FH, 0, 1 - h / FH);
      L.w = w / FW;
      L.h = h / FH;
      return;
    }
    const anchor = {
      x: a.corner.includes("l") ? sx + sw : sx,
      y: a.corner.includes("t") ? sy + sh : sy,
    };
    const dirX = a.corner.includes("l") ? -1 : 1;
    const dirY = a.corner.includes("t") ? -1 : 1;
    let w = Math.max((cur.x - anchor.x) * dirX, 20);
    let h = w / asp;
    if (h < 20) {
      h = 20;
      w = h * asp;
    }
    const maxW = dirX > 0 ? FW - anchor.x : anchor.x;
    const maxH = dirY > 0 ? FH - anchor.y : anchor.y;
    if (w > maxW) {
      w = maxW;
      h = w / asp;
    }
    if (h > maxH) {
      h = maxH;
      w = h * asp;
    }
    const nx = dirX > 0 ? anchor.x : anchor.x - w;
    const ny = dirY > 0 ? anchor.y : anchor.y - h;
    L.x = nx / FW;
    L.y = ny / FH;
    L.w = w / FW;
    L.h = h / FH;
  }

  function renderCrop() {
    if (!cropState) return;
    Object.assign($("cropRect").style, {
      left: cropState.x * 100 + "%",
      top: cropState.y * 100 + "%",
      width: cropState.w * 100 + "%",
      height: cropState.h * 100 + "%",
    });
  }

  function applyTechnique(value) {
    if (!value) return;
    if (value === TECH_NOSOTROS || value === TECH_NOSOTROS_LEGACY) {
      setTechPath("nosotros");
      return;
    }
    setTechPath("pick");
    const sel = $("technique");
    if (!sel) return;
    const match = [...sel.options].find((o) => o.value === value || o.textContent === value);
    if (match) sel.value = match.value;
  }

  function clearLogos() {
    state.logos.forEach((l) => l.el && l.el.remove());
    state.logos = [];
    state.sel = -1;
    pendingAdd = false;
    deletedLogos.length = 0;
    syncUndoUI();
  }

  $("bocetoClose").addEventListener("click", close);
  $("bocetoBackdrop").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !root.hidden) {
      if (!$("cropModal").hidden) {
        $("cropModal").hidden = true;
        return;
      }
      close();
    }
  });

  $("zoomIn").addEventListener("click", () => zoomCentro(1.25));
  $("zoomOut").addEventListener("click", () => zoomCentro(1 / 1.25));
  $("zoomReset").addEventListener("click", () => {
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    applyView();
  });
  $("frameWrap").addEventListener("wheel", (e) => {
    if (frame.hidden) return;
    e.preventDefault();
    setZoomAt(state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
  }, { passive: false });

  $("alignH").addEventListener("click", () => {
    const L = selLogo();
    if (!L) return;
    alignLogo(L, "h");
    render();
  });
  $("alignV").addEventListener("click", () => {
    const L = selLogo();
    if (!L) return;
    alignLogo(L, "v");
    render();
  });

  $("logoInput").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadLogo(file);
  });
  $("addLogoBtn").addEventListener("click", () => {
    pendingAdd = true;
    $("logoInput").value = "";
    $("logoInput").click();
  });

  $("undoDeleteBtn").addEventListener("click", () => {
    const entry = deletedLogos.pop();
    if (!entry) {
      syncUndoUI();
      return;
    }
    const logo = entry.logo;
    makeLogoEl(logo);
    const idx = Math.min(entry.index, state.logos.length);
    state.logos.splice(idx, 0, logo);
    state.sel = idx;
    rebuildLogo(logo, () => {
      syncUndoUI();
      syncLogoUI();
      setStepStates();
      render();
    });
  });

  $("cropEditBtn").addEventListener("click", () => {
    const L = selLogo();
    if (!L) return;
    const img = $("cropImg");
    img.onload = () => {
      img.onload = null;
      const c = L.useTrim !== false && L.crop ? L.crop : { x: 0, y: 0, w: L.fullW, h: L.fullH };
      cropState = { x: c.x / L.fullW, y: c.y / L.fullH, w: c.w / L.fullW, h: c.h / L.fullH };
      renderCrop();
    };
    img.src = L.src;
    $("cropModal").hidden = false;
  });
  $("cropStage").addEventListener("pointerdown", (e) => {
    if (!cropState) return;
    const r = $("cropArea").getBoundingClientRect();
    const px = {
      x: clamp((e.clientX - r.left) / r.width, 0, 1),
      y: clamp((e.clientY - r.top) / r.height, 0, 1),
    };
    if (e.target.dataset && e.target.dataset.corner) {
      cropActive = { mode: "resize", corner: e.target.dataset.corner, startPx: px, start: { ...cropState } };
    } else if (e.target.id === "cropRect") {
      cropActive = { mode: "move", startPx: px, start: { ...cropState } };
    } else {
      cropState = { x: px.x, y: px.y, w: 0, h: 0 };
      cropActive = { mode: "draw", startPx: px };
    }
    $("cropStage").setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  $("cropStage").addEventListener("pointermove", (e) => {
    if (!cropActive) return;
    const r = $("cropArea").getBoundingClientRect();
    const px = {
      x: clamp((e.clientX - r.left) / r.width, 0, 1),
      y: clamp((e.clientY - r.top) / r.height, 0, 1),
    };
    const dx = px.x - cropActive.startPx.x;
    const dy = px.y - cropActive.startPx.y;
    if (cropActive.mode === "move") {
      const s = cropActive.start;
      cropState = { ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) };
    } else if (cropActive.mode === "resize") {
      cropState = resizeRect(cropActive.start, cropActive.corner, dx, dy, 0.02, 0.02);
    } else if (cropActive.mode === "draw") {
      const s = cropActive.startPx;
      cropState = { x: Math.min(s.x, px.x), y: Math.min(s.y, px.y), w: Math.abs(px.x - s.x), h: Math.abs(px.y - s.y) };
    }
    renderCrop();
  });
  ["pointerup", "pointercancel"].forEach((ev) => $("cropStage").addEventListener(ev, () => {
    if (cropActive && cropActive.mode === "draw" && (cropState.w < 0.02 || cropState.h < 0.02)) {
      cropState = { x: 0, y: 0, w: 1, h: 1 };
      renderCrop();
    }
    cropActive = null;
  }));
  $("cropClose").addEventListener("click", () => {
    $("cropModal").hidden = true;
  });
  $("cropBgBtn").addEventListener("click", () => {
    const on = $("cropStage").classList.toggle("dark");
    $("cropBgBtn").setAttribute("aria-pressed", String(on));
    $("cropBgBtn").textContent = on ? "☀ Fondo claro" : "🌙 Fondo oscuro";
  });
  $("cropAuto").addEventListener("click", () => {
    const L = selLogo();
    if (!L) return;
    const probe = new Image();
    probe.onload = () => {
      const c = computeTrim(probe);
      cropState = { x: c.x / L.fullW, y: c.y / L.fullH, w: c.w / L.fullW, h: c.h / L.fullH };
      renderCrop();
    };
    probe.src = L.src;
  });
  $("cropApply").addEventListener("click", () => {
    const L = selLogo();
    if (!L || !cropState) return;
    const x = Math.round(cropState.x * L.fullW);
    const y = Math.round(cropState.y * L.fullH);
    const w = Math.max(2, Math.round(cropState.w * L.fullW));
    const h = Math.max(2, Math.round(cropState.h * L.fullH));
    const esTodo = x === 0 && y === 0 && w >= L.fullW - 1 && h >= L.fullH - 1;
    L.crop = { x, y, w, h, trimmed: !esTodo, manual: !esTodo };
    L.useTrim = true;
    const { w: FW, h: FH } = frameRect();
    L.aspect = w / h;
    L.h = (L.w * FW / L.aspect) / FH;
    $("cropModal").hidden = true;
    rebuildLogo(L, () => {
      syncLogoUI();
      render();
    });
  });

  $("trimUndo").addEventListener("click", () => {
    const L = selLogo();
    if (!L || !L.crop || !L.crop.trimmed) return;
    L.useTrim = L.useTrim === false;
    const newAspect = L.useTrim ? L.crop.w / L.crop.h : L.fullW / L.fullH;
    const { w: FW, h: FH } = frameRect();
    L.aspect = newAspect;
    L.h = (L.w * FW / newAspect) / FH;
    rebuildLogo(L, () => {
      syncLogoUI();
      render();
    });
  });

  $("removeWhiteBtn").addEventListener("click", () => {
    const L = selLogo();
    if (!L) return;
    const btn = $("removeWhiteBtn");
    const quitando = !L.whiteRemoved;
    btn.disabled = true;
    btn.textContent = quitando ? "Quitando fondo…" : "Restaurando…";
    L.whiteRemoved = quitando;
    rebuildLogo(L, () => {
      syncLogoUI();
      render();
    });
  });

  root.querySelectorAll("#tintSeg [data-tint]").forEach((b) => b.addEventListener("click", () => {
    const L = selLogo();
    if (!L) return;
    L.tint = b.dataset.tint;
    if (L.tint === "engrave" && !techValue()) {
      applyTechnique("Grabado láser");
      setStepStates();
    }
    rebuildLogo(L, () => {
      syncLogoUI();
      render();
    });
  }));

  $("logoOpacity").addEventListener("input", () => {
    const L = selLogo();
    if (!L) return;
    L.opacity = parseInt($("logoOpacity").value, 10) / 100;
    $("opacityVal").textContent = $("logoOpacity").value + "%";
    render();
  });

  frame.addEventListener("pointerdown", (e) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) document.activeElement.blur();
    const r = frame.getBoundingClientRect();
    const Z = state.zoom;
    const px = { x: (e.clientX - r.left) / Z, y: (e.clientY - r.top) / Z };

    const item = e.target.closest && e.target.closest(".logoItem");
    if (item) {
      const idx = state.logos.findIndex((l) => l.el === item);
      if (idx >= 0) {
        if (idx !== state.sel) {
          state.sel = idx;
          syncLogoUI();
        }
        const L = state.logos[idx];
        if (e.target.classList.contains("logoRotate")) {
          active = { mode: "logo-rotate", logo: L, startPx: px, start: { x: L.x, y: L.y, w: L.w, h: L.h, rot: L.rot } };
        } else if (e.target.dataset && e.target.dataset.corner) {
          active = { mode: "logo-resize", logo: L, corner: e.target.dataset.corner, startPx: px, start: { x: L.x, y: L.y, w: L.w, h: L.h, rot: L.rot } };
        } else {
          active = { mode: "logo-move", logo: L, startPx: px, start: { x: L.x, y: L.y, w: L.w, h: L.h, rot: L.rot } };
        }
        frame.setPointerCapture(e.pointerId);
        e.preventDefault();
        render();
        return;
      }
    }

    if (state.zoom > 1 && (e.target === photo || e.target === frame)) {
      active = { mode: "pan", startClient: { x: e.clientX, y: e.clientY }, start: { ...state.pan } };
      frame.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  frame.addEventListener("pointermove", (e) => {
    if (!active) return;
    if (active.mode === "pan") {
      state.pan.x = active.start.x + (e.clientX - active.startClient.x);
      state.pan.y = active.start.y + (e.clientY - active.startClient.y);
      applyView();
      return;
    }
    const { w: FW, h: FH } = frameRect();
    const r = frame.getBoundingClientRect();
    const Z = state.zoom;
    const px = { x: clamp((e.clientX - r.left) / Z, 0, FW), y: clamp((e.clientY - r.top) / Z, 0, FH) };
    const dx = px.x - active.startPx.x;
    const dy = px.y - active.startPx.y;

    if (active.mode === "logo-move") {
      const s = active.start;
      const L = active.logo;
      L.x = clamp(s.x + dx / FW, 0, 1 - s.w);
      L.y = clamp(s.y + dy / FH, 0, 1 - s.h);
    } else if (active.mode === "logo-resize") {
      resizeLogo(active, px, FW, FH);
    } else if (active.mode === "logo-rotate") {
      const s = active.start;
      const L = active.logo;
      const cx = (s.x + s.w / 2) * FW;
      const cy = (s.y + s.h / 2) * FH;
      let ang = (Math.atan2(px.y - cy, px.x - cx) * 180) / Math.PI + 90;
      ang = ((ang % 360) + 360) % 360;
      const snap = [0, 45, 90, 135, 180, 225, 270, 315, 360].find((a) => Math.abs(ang - a) <= 5);
      if (snap !== undefined) ang = snap % 360;
      L.rot = ang;
    }
    render();
  });

  ["pointerup", "pointercancel"].forEach((ev) => frame.addEventListener(ev, () => {
    active = null;
    render();
  }));

  $("technique").addEventListener("change", setStepStates);
  $("techLetUsChoose").addEventListener("click", () => {
    setTechPath("nosotros");
    setStepStates();
  });
  $("techPickMyself").addEventListener("click", () => {
    setTechPath("pick");
    setStepStates();
    $("technique").focus();
  });

  $("cleanToggle").addEventListener("click", () => {
    const on = !frame.classList.contains("clean");
    frame.classList.toggle("clean", on);
    $("cleanToggle").setAttribute("aria-pressed", String(on));
    $("cleanToggle").textContent = on ? "👁 Mostrar guías" : "👁 Ocultar guías";
  });

  applyBtn.addEventListener("click", () => {
    if (!simpleCanSave(state, techValue()) || !saveCb) return;
    const principal = state.logos[0];
    saveCb(createSketch({
      productId,
      variantColor,
      sourcePhotoUrl,
      composedImage: composeFoto(photo, frame, state.logos),
      logoFiles: state.logos.map((l) => ({ name: l.name, src: l.img ? l.img.src : l.src })),
      placement: snapshotPlacement(state),
      medidaW: "",
      medidaH: "",
      technique: techValue(),
      notes: notesValue(),
      engraved: principal.tint === "engrave",
      printColors: [],
      editorMode: "simple",
      status: "attached",
    }));
    close();
  });

  $("downloadBtn").addEventListener("click", () => {
    if (!state.logos.length) return;
    const a = document.createElement("a");
    a.download = "boceto-producto.png";
    a.href = composeFoto(photo, frame, state.logos);
    a.click();
  });

  function restore(placement) {
    clearLogos();
    restorePlacement(state, placement);
    state.logos.forEach((logo) => {
      makeLogoEl(logo);
      rebuildLogo(logo, () => {
        syncLogoUI();
        render();
      });
    });
    syncLogoUI();
    setStepStates();
    render();
  }

  function open(opts = {}) {
    productId = opts.productId || productId;
    variantColor = opts.variantColor || variantColor;
    catalogPhotos = Array.isArray(opts.photos) ? opts.photos.slice() : [];
    if (opts.photoUrl && !catalogPhotos.some((p) => samePhotoUrl(p.url, opts.photoUrl))) {
      catalogPhotos.unshift({
        url: opts.photoUrl,
        thumb: opts.photoUrl,
        alt: opts.photoName || "",
        color: variantColor,
      });
    }
    root.hidden = false;
    document.body.style.overflow = "hidden";
    const run = async () => {
      if (!opts.placement) {
        clearLogos();
        state.zone = null;
        state.drawMode = false;
        $("technique").value = "";
        setNotes("");
      }
      setTechPath("nosotros");
      const startUrl = opts.photoUrl || (catalogPhotos[0] && catalogPhotos[0].url);
      const startName = opts.photoName || (catalogPhotos[0] && catalogPhotos[0].alt) || "producto";
      try {
        if (startUrl) await loadPhotoSrc(startUrl, startName);
      } catch (err) {
        window.alert(err.message || "No pude cargar la foto del producto.");
      }
      if (opts.placement) restore(opts.placement);
      if (opts.technique) applyTechnique(opts.technique);
      setNotes(opts.notes);
      syncPhotoPick();
      setStepStates();
      render();
    };
    run();
  }

  function close() {
    root.hidden = true;
    document.body.style.overflow = "";
  }

  syncLogoUI();
  setStepStates();
  render();

  return {
    open,
    close,
    restore,
    onSave(cb) { saveCb = cb; },
    root,
  };
}
