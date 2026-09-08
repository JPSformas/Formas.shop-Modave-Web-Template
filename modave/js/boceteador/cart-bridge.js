export function attachCartBridge({ getSketch, isSelfDesign }) {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".btn-add-to-cart");
    if (!btn) return;
    if (typeof isSelfDesign === "function" && !isSelfDesign()) return;
    const sketch = getSketch && getSketch();
    if (sketch) {
      document.dispatchEvent(new CustomEvent("formas:boceto-saved", { detail: sketch }));
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    window.alert("Guardá una personalización primero");
  }, true);
}
