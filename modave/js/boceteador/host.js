import { createUi } from "./ui.js";
import { createSimpleUi } from "./ui-simple.js";
import { resolveEditorMode } from "./mode.js";
import { getCurrent, listStills } from "./photo-swiper.js";
import { prepend, removeBocetos } from "./gallery-swiper.js";
import { createPageStore } from "./store-page.js";
import { attachCartBridge } from "./cart-bridge.js";

const listeners = { saved: [], cleared: [], invalidated: [] };

function emit(name, detail) {
  (listeners[name] || []).forEach((fn) => fn(detail));
}

function isSelfDesign() {
  const tab = document.querySelector(".personalization-tab.active");
  return tab && tab.getAttribute("data-tab") === "personalizar-ahora";
}

function productIdFromPage() {
  const el = document.querySelector("[data-product-id]");
  return (el && el.getAttribute("data-product-id")) || "pdp-product";
}

function editorModeFromPage() {
  const el = document.querySelector("[data-boceteador-mode]")
    || document.querySelector("[data-product-id]");
  return resolveEditorMode(el && el.getAttribute("data-boceteador-mode"));
}

function setOpenLabel(btn, sketch) {
  if (!btn) return;
  const text = btn.querySelector(".text") || btn;
  text.textContent = sketch ? "Editar personalización" : "Personaliza ahora";
}

async function boot() {
  const openButton = document.getElementById("btn-personaliza-ahora");
  let modalRoot = document.getElementById("formas-boceto-modal");
  const jsonInput = document.getElementById("formas-boceto-json");
  if (!openButton || !modalRoot) return;

  const store = createPageStore({
    input: jsonInput,
    storage: window.sessionStorage,
  });
  const ui = editorModeFromPage() === "simple"
    ? await createSimpleUi(modalRoot)
    : await createUi(modalRoot);
  modalRoot = ui.root;

  let current = store.load();
  setOpenLabel(openButton, current);
  if (current && current.composedImage) {
    prepend(current.composedImage, current.variantColor);
  }

  ui.onSave((sketch) => {
    current = sketch;
    store.save(sketch);
    prepend(sketch.composedImage, sketch.variantColor);
    setOpenLabel(openButton, sketch);
    emit("saved", sketch);
  });

  function open() {
    const photo = getCurrent();
    const opts = {
      productId: productIdFromPage(),
      variantColor: photo.color,
      photoUrl: (current && current.sourcePhotoUrl) || photo.url,
      photoName: photo.alt,
      photos: listStills(),
    };
    if (current && current.placement && current.variantColor === photo.color) {
      opts.placement = current.placement;
      opts.photoUrl = current.sourcePhotoUrl || photo.url;
      opts.technique = current.technique;
      opts.printColors = current.printColors;
    }
    ui.open(opts);
  }

  function clear() {
    current = null;
    store.clear();
    removeBocetos();
    setOpenLabel(openButton, null);
    emit("cleared");
  }

  openButton.addEventListener("click", open);

  function colorFromEvent(e) {
    const colorBtn = e.target.closest && e.target.closest(".variant-picker-values .color-btn");
    if (colorBtn) return colorBtn.getAttribute("data-color") || "";
    const input = e.target.closest && e.target.closest(".variant-picker-values input");
    if (!input || !input.id) return "";
    const lab = document.querySelector('label[for="' + input.id + '"]');
    return (lab && lab.getAttribute("data-color")) || "";
  }

  function maybeInvalidate(e) {
    if (!current) return;
    const next = colorFromEvent(e);
    if (next && next !== current.variantColor) {
      clear();
      emit("invalidated");
    }
  }

  document.addEventListener("click", maybeInvalidate);
  document.addEventListener("change", maybeInvalidate);

  attachCartBridge({
    getSketch: () => current,
    isSelfDesign,
  });

  window.FormasBoceto = {
    mount() {},
    open,
    getSketch: () => current,
    clear,
    on(event, fn) {
      if (listeners[event]) listeners[event].push(fn);
    },
  };
}

boot().catch((err) => {
  console.error("FormasBoceto failed to start", err);
});
