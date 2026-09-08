function imgUrl(img) {
  if (!img) return "";
  return img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || "";
}

function isStillSlide(slide) {
  if (!slide) return false;
  if (slide.getAttribute("data-boceto") === "1") return false;
  if (slide.querySelector(".item-video")) return false;
  return !!slide.querySelector("img");
}

function activeColor(root) {
  const checked = root.querySelector(".variant-picker-values input:checked");
  const colorBtn = (checked && root.querySelector('label[for="' + checked.id + '"]'))
    || root.querySelector(".variant-picker-values .color-btn.active")
    || root.querySelector(".variant-picker-values .color-btn");
  return (colorBtn && colorBtn.getAttribute("data-color")) || "rojo";
}

export function samePhotoUrl(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const na = String(a).split("?")[0].replace(/^\.\//, "");
  const nb = String(b).split("?")[0].replace(/^\.\//, "");
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

export function stillFromSlide(slide, color) {
  if (!isStillSlide(slide)) return null;
  const img = slide.querySelector("img");
  const url = imgUrl(img);
  if (!url) return null;
  return {
    url,
    thumb: url,
    alt: (img && img.getAttribute("alt")) || "",
    color: slide.getAttribute("data-color") || color || "",
  };
}

export function listStills(root = document) {
  const main = root.querySelector(".tf-product-media-main");
  const color = activeColor(root);
  if (!main) return [];
  const seen = new Set();
  const out = [];
  const slides = [...main.querySelectorAll(".swiper-slide")];
  slides.forEach((slide) => {
    const still = stillFromSlide(slide, color);
    if (!still) return;
    const slideColor = slide.getAttribute("data-color") || "";
    if (color && slideColor && slideColor !== color) return;
    const key = still.url.split("?")[0];
    if (seen.has(key)) return;
    seen.add(key);
    out.push(still);
  });
  return out;
}

export function getCurrent(root = document) {
  const main = root.querySelector(".tf-product-media-main");
  const color = activeColor(root);
  let slide = main && main.querySelector(".swiper-slide-active");
  if (!isStillSlide(slide)) {
    const slides = main ? [...main.querySelectorAll(".swiper-slide")] : [];
    slide = slides.find((s) => isStillSlide(s)) || null;
  }
  const still = stillFromSlide(slide, color) || { url: "", alt: "", color, thumb: "" };
  return { url: still.url, color: still.color || color, alt: still.alt };
}
