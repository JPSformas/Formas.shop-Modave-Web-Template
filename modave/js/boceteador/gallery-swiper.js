function swiperOf(el) {
  return el && (el.swiper || null);
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function slideHtml(composedUrl, color, thumb, width, height) {
  const colorAttr = escapeAttr(color || "rojo");
  const src = escapeAttr(composedUrl);
  const w = String(width || 800);
  const h = String(height || 800);
  if (thumb) {
    return (
      '<div class="swiper-slide stagger-item stagger-finished" data-boceto="1" data-color="' + colorAttr + '">' +
      '<div class="item"><img src="' + src + '" alt="Boceto personalizado"></div></div>'
    );
  }
  return (
    '<div class="swiper-slide" data-boceto="1" data-color="' + colorAttr + '">' +
    '<a href="' + src + '" target="_blank" class="item" data-pswp-width="' + w + 'px" data-pswp-height="' + h + 'px">' +
    '<img class="tf-image-zoom lazyload" data-zoom="' + src + '" data-src="' + src + '" src="' + src + '" alt="Boceto personalizado">' +
    "</a></div>"
  );
}

function removeBocetoSlides(sw, fallbackRoot) {
  if (sw && typeof sw.removeSlide === "function" && sw.slides) {
    const idxs = [];
    for (let i = 0; i < sw.slides.length; i++) {
      const slide = sw.slides[i];
      if (slide && slide.getAttribute && slide.getAttribute("data-boceto") === "1") {
        idxs.push(i);
      }
    }
    idxs.reverse().forEach((i) => sw.removeSlide(i));
    return;
  }
  if (fallbackRoot) {
    fallbackRoot.querySelectorAll("[data-boceto='1']").forEach((el) => el.remove());
  }
}

function addSlide(sw, wrapper, html) {
  if (sw && typeof sw.prependSlide === "function") {
    sw.prependSlide(html);
    return;
  }
  if (wrapper) wrapper.insertAdjacentHTML("afterbegin", html);
}

function refresh(el) {
  const sw = swiperOf(el);
  if (sw && typeof sw.update === "function") {
    sw.update();
    if (typeof sw.slideTo === "function") sw.slideTo(0, 0);
  }
}

function imageSize(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 800,
      });
    img.onerror = () => resolve({ width: 800, height: 800 });
    img.src = url;
  });
}

function applyPrepend(composedUrl, color, width, height, root) {
  const thumbsEl = root.querySelector(".tf-product-media-thumbs");
  const mainEl = root.querySelector(".tf-product-media-main");
  const thumbsWrap = root.querySelector(".tf-product-media-thumbs .swiper-wrapper");
  const mainWrap = root.querySelector(".tf-product-media-main .swiper-wrapper");
  const thumbsSw = swiperOf(thumbsEl);
  const mainSw = swiperOf(mainEl);

  removeBocetoSlides(thumbsSw, thumbsEl);
  removeBocetoSlides(mainSw, mainEl);
  root.querySelectorAll("[data-boceto='1']").forEach((el) => {
    if (el && typeof el.remove === "function") el.remove();
  });

  addSlide(thumbsSw, thumbsWrap, slideHtml(composedUrl, color, true, width, height));
  addSlide(mainSw, mainWrap, slideHtml(composedUrl, color, false, width, height));
  refresh(thumbsEl);
  refresh(mainEl);
}

export function prepend(composedUrl, color, root = document) {
  return imageSize(composedUrl).then(({ width, height }) => {
    applyPrepend(composedUrl, color, width, height, root);
  });
}

export function removeBocetos(root = document) {
  const thumbsEl = root.querySelector(".tf-product-media-thumbs");
  const mainEl = root.querySelector(".tf-product-media-main");
  removeBocetoSlides(swiperOf(thumbsEl), thumbsEl);
  removeBocetoSlides(swiperOf(mainEl), mainEl);
  root.querySelectorAll("[data-boceto='1']").forEach((el) => {
    if (el && typeof el.remove === "function") el.remove();
  });
  if (thumbsEl && thumbsEl.swiper) thumbsEl.swiper.update();
  if (mainEl && mainEl.swiper) mainEl.swiper.update();
}

export function showBoceto(root = document) {
  const thumbs = root.querySelector(".tf-product-media-thumbs");
  const main = root.querySelector(".tf-product-media-main");
  if (thumbs && thumbs.swiper) thumbs.swiper.slideTo(0, 0);
  if (main && main.swiper) main.swiper.slideTo(0, 0);
}
