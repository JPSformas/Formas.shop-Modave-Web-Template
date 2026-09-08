import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listStills, getCurrent, samePhotoUrl } from "./photo-swiper.js";

function img(src, alt) {
  return {
    currentSrc: src,
    getAttribute(k) {
      if (k === "src" || k === "data-src") return src;
      if (k === "alt") return alt || "";
      return null;
    },
  };
}

function slide(opts) {
  return {
    className: "swiper-slide" + (opts.active ? " swiper-slide-active" : ""),
    getAttribute(k) {
      if (k === "data-boceto") return opts.boceto || null;
      if (k === "data-color") return opts.color || "";
      return null;
    },
    querySelector(sel) {
      if (sel === ".item-video") return opts.video ? {} : null;
      if (sel === "img") return opts.video ? null : opts.img;
      return null;
    },
  };
}

function page(slides) {
  const main = {
    querySelector(sel) {
      if (sel === ".swiper-slide-active") return slides.find((s) => s.className.includes("swiper-slide-active")) || null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".swiper-slide") return slides;
      return [];
    },
  };
  return {
    querySelector(sel) {
      if (sel === ".tf-product-media-main") return main;
      if (sel === ".variant-picker-values input:checked") return { id: "c-rojo" };
      if (sel === 'label[for="c-rojo"]') return { getAttribute: (k) => (k === "data-color" ? "rojo" : null) };
      return null;
    },
  };
}

describe("photo-swiper listStills", () => {
  it("skips videos, boceto slides, other colors, and duplicates", () => {
    const root = page([
      slide({ img: img("images/a.jpg", "A"), color: "rojo", active: true }),
      slide({ img: img("images/a.jpg"), color: "rojo" }),
      slide({ video: true, color: "rojo" }),
      slide({ img: img("images/mock.png"), color: "rojo", boceto: "1" }),
      slide({ img: img("images/b.jpg", "B"), color: "rojo" }),
      slide({ img: img("images/violeta.jpg"), color: "violeta" }),
    ]);
    const stills = listStills(root);
    assert.deepEqual(stills.map((s) => s.url), ["images/a.jpg", "images/b.jpg"]);
    assert.equal(stills[0].alt, "A");
  });

  it("getCurrent skips an active boceto slide", () => {
    const root = page([
      slide({ img: img("images/mock.png"), color: "rojo", boceto: "1", active: true }),
      slide({ img: img("images/a.jpg", "A"), color: "rojo" }),
    ]);
    const cur = getCurrent(root);
    assert.equal(cur.url, "images/a.jpg");
    assert.equal(cur.color, "rojo");
  });

  it("samePhotoUrl matches relative vs filename", () => {
    assert.equal(samePhotoUrl("images/products/x.jpg", "images/products/x.jpg"), true);
    assert.equal(samePhotoUrl("/modave/images/products/x.jpg", "images/products/x.jpg"), true);
    assert.equal(samePhotoUrl("images/a.jpg", "images/b.jpg"), false);
  });
});
