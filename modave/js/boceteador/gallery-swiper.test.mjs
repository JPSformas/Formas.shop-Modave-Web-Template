import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepend, removeBocetos } from "./gallery-swiper.js";

function page(mainExtra = "") {
  const root = {
    thumbs: { slides: [], querySelectorAll(sel) { return sel.includes("boceto") ? this.slides.filter((s) => s.getAttribute("data-boceto") === "1") : []; } },
    mains: { slides: [], querySelectorAll(sel) { return sel.includes("boceto") ? this.slides.filter((s) => s.getAttribute("data-boceto") === "1") : []; } },
    querySelector(sel) {
      if (sel === ".tf-product-media-thumbs") return this.thumbsEl;
      if (sel === ".tf-product-media-main") return this.mainEl;
      if (sel === ".tf-product-media-thumbs .swiper-wrapper") return this.thumbsWrap;
      if (sel === ".tf-product-media-main .swiper-wrapper") return this.mainWrap;
      return null;
    },
    querySelectorAll(sel) {
      if (sel.includes("data-boceto")) {
        return [...this.thumbsWrap.children.filter((c) => c.includes("data-boceto")), ...this.mainWrap.children.filter((c) => c.includes("data-boceto"))];
      }
      return [];
    },
  };
  root.thumbsWrap = { children: [], insertAdjacentHTML(_pos, html) { this.children.unshift(html); } };
  root.mainWrap = { children: [], insertAdjacentHTML(_pos, html) { this.children.unshift(html); } };
  root.thumbsEl = {
    swiper: {
      slides: [],
      prependSlide(html) { this.slides.unshift({ html, getAttribute: (k) => (html.includes('data-boceto="1"') && k === "data-boceto" ? "1" : null) }); root.thumbsWrap.children.unshift(html); },
      removeSlide(i) { this.slides.splice(i, 1); root.thumbsWrap.children.splice(i, 1); },
      update() {},
      slideTo() {},
    },
  };
  root.mainEl = {
    swiper: {
      slides: [],
      prependSlide(html) { this.slides.unshift({ html, getAttribute: (k) => (html.includes('data-boceto="1"') && k === "data-boceto" ? "1" : null) }); root.mainWrap.children.unshift(html); },
      removeSlide(i) { this.slides.splice(i, 1); root.mainWrap.children.splice(i, 1); },
      update() {},
      slideTo() {},
    },
  };
  if (mainExtra) root.mainWrap.children.push(mainExtra);
  return root;
}

describe("gallery-swiper prepend", () => {
  it("injects PhotoSwipe size and a thumbs slide", async () => {
    const orig = globalThis.Image;
    class FakeImage {
      set src(url) {
        this.naturalWidth = 400;
        this.naturalHeight = 1200;
        queueMicrotask(() => this.onload && this.onload());
      }
    }
    globalThis.Image = FakeImage;
    try {
      const root = page();
      await prepend("data:image/png;base64,xx", "rojo", root);
      assert.equal(root.thumbsEl.swiper.slides.length, 1);
      assert.equal(root.mainEl.swiper.slides.length, 1);
      const mainHtml = root.mainEl.swiper.slides[0].html;
      assert.match(mainHtml, /data-pswp-width="400px"/);
      assert.match(mainHtml, /data-pswp-height="1200px"/);
      assert.match(root.thumbsEl.swiper.slides[0].html, /data-boceto="1"/);
      assert.match(root.thumbsEl.swiper.slides[0].html, /stagger-finished/);
    } finally {
      globalThis.Image = orig;
    }
  });

  it("removeBocetos drops injected slides from both swipers", async () => {
    const orig = globalThis.Image;
    class FakeImage {
      set src(url) {
        this.naturalWidth = 800;
        this.naturalHeight = 800;
        queueMicrotask(() => this.onload && this.onload());
      }
    }
    globalThis.Image = FakeImage;
    try {
      const root = page();
      await prepend("data:image/png;base64,xx", "rojo", root);
      removeBocetos(root);
      assert.equal(root.thumbsEl.swiper.slides.length, 0);
      assert.equal(root.mainEl.swiper.slides.length, 0);
    } finally {
      globalThis.Image = orig;
    }
  });
});
