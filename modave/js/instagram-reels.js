(function () {
  var EMBED_SRC = "https://www.instagram.com/embed.js";
  var FEED_URL = "api/instagram-reels.php";

  function slidesPerViewFor(swiperEl, width) {
    var mobile = parseInt(swiperEl.getAttribute("data-mobile"), 10) || 2;
    var mobileSm = parseInt(swiperEl.getAttribute("data-mobile-sm"), 10) || mobile;
    var tablet = parseInt(swiperEl.getAttribute("data-tablet"), 10) || 3;
    var preview = parseInt(swiperEl.getAttribute("data-preview"), 10) || 5;
    if (width >= 1200) return preview;
    if (width >= 768) return tablet;
    if (width >= 575) return mobileSm;
    return mobile;
  }

  function neighborIndexes(activeIndex, perView, total) {
    var start = Math.max(0, activeIndex - 1);
    var end = Math.min(total - 1, activeIndex + perView);
    var out = [];
    for (var i = start; i <= end; i++) out.push(i);
    return out;
  }

  function loadEmbedScript() {
    if (window.instgrm && window.instgrm.Embeds) {
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + EMBED_SRC + '"]');
      if (existing) {
        if (existing.readyState === "complete" || window.instgrm) {
          resolve();
          return;
        }
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", reject);
        return;
      }
      var s = document.createElement("script");
      s.async = true;
      s.src = EMBED_SRC;
      s.onload = function () { resolve(); };
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  var EMBED_UPDATE_MAX = 10;
  var EMBED_UPDATE_MS = 200;
  var embedWatchState = null;

  function stopEmbedWatch(state) {
    if (!state) return;
    if (state.observer) state.observer.disconnect();
    if (state.timer) clearTimeout(state.timer);
    (state.iframes || []).forEach(function (iframe) {
      iframe.removeEventListener("load", state.onLoad);
    });
  }

  function iframeHasSize(iframe) {
    var h = iframe.offsetHeight;
    if (!h && iframe.getBoundingClientRect) {
      h = iframe.getBoundingClientRect().height;
    }
    return h >= 80;
  }

  function visibleEmbedsReady(slides) {
    var any = false;
    var ready = true;
    for (var s = 0; s < slides.length; s++) {
      var iframes = slides[s].querySelectorAll("iframe");
      if (!iframes.length) {
        if (slides[s].querySelector("blockquote.instagram-media")) ready = false;
        continue;
      }
      any = true;
      for (var i = 0; i < iframes.length; i++) {
        if (!iframeHasSize(iframes[i])) ready = false;
      }
    }
    return any && ready;
  }

  function watchEmbedsThenUpdate(swiper, slides) {
    stopEmbedWatch(embedWatchState);
    var state = {
      observer: null,
      timer: null,
      tries: 0,
      iframes: [],
      onLoad: null,
    };
    embedWatchState = state;

    function bindIframes() {
      slides.forEach(function (slide) {
        var iframes = slide.querySelectorAll("iframe");
        for (var i = 0; i < iframes.length; i++) {
          if (state.iframes.indexOf(iframes[i]) !== -1) continue;
          state.iframes.push(iframes[i]);
          iframes[i].addEventListener("load", state.onLoad);
        }
      });
    }

    function maybeFinish() {
      if (embedWatchState !== state) return;
      swiper.update();
      if (visibleEmbedsReady(slides) || state.tries >= EMBED_UPDATE_MAX) {
        stopEmbedWatch(state);
        if (embedWatchState === state) embedWatchState = null;
      }
    }

    state.onLoad = function () {
      maybeFinish();
    };

    bindIframes();

    if (typeof MutationObserver !== "undefined") {
      state.observer = new MutationObserver(function () {
        bindIframes();
        maybeFinish();
      });
      slides.forEach(function (slide) {
        state.observer.observe(slide, {
          childList: true,
          subtree: true,
        });
      });
    }

    function retry() {
      if (embedWatchState !== state) return;
      state.tries += 1;
      bindIframes();
      maybeFinish();
      if (embedWatchState === state) {
        state.timer = setTimeout(retry, EMBED_UPDATE_MS);
      }
    }

    swiper.update();
    if (visibleEmbedsReady(slides)) {
      stopEmbedWatch(state);
      embedWatchState = null;
      return;
    }
    state.timer = setTimeout(retry, EMBED_UPDATE_MS);
  }

  function processVisible(swiper, swiperEl) {
    if (!swiper || !window.instgrm || !window.instgrm.Embeds) return;
    var perView = slidesPerViewFor(swiperEl, window.innerWidth);
    var indexes = neighborIndexes(swiper.activeIndex || 0, perView, swiper.slides.length);
    var watched = [];
    indexes.forEach(function (i) {
      var slide = swiper.slides[i];
      if (!slide) return;
      watched.push(slide);
      if (slide.getAttribute("data-embed-processed") === "1") return;
      var permalink = slide.getAttribute("data-permalink");
      if (!permalink) return;
      if (!slide.querySelector("blockquote.instagram-media")) {
        var bq = document.createElement("blockquote");
        bq.className = "instagram-media";
        bq.setAttribute("data-instgrm-permalink", permalink);
        bq.setAttribute("data-instgrm-version", "14");
        slide.appendChild(bq);
      }
      slide.setAttribute("data-embed-processed", "1");
    });
    window.instgrm.Embeds.process();
    watchEmbedsThenUpdate(swiper, watched);
  }

  function initSwiper(swiperEl) {
    var $el = $(swiperEl);
    var preview = $el.data("preview");
    var tablet = $el.data("tablet");
    var mobile = $el.data("mobile");
    var mobileSm = $el.data("mobile-sm") !== undefined ? $el.data("mobile-sm") : mobile;
    var spacingLg = $el.data("space-lg");
    var spacingMd = $el.data("space-md");
    var spacing = $el.data("space");
    var perGroup = $el.data("pagination") || 1;
    var perGroupMd = $el.data("pagination-md") || 1;
    var perGroupLg = $el.data("pagination-lg") || 1;
    return new Swiper(swiperEl, {
      slidesPerView: mobile,
      spaceBetween: spacing,
      speed: 1000,
      pagination: {
        el: ".sw-pagination-instagram",
        clickable: true,
      },
      observer: true,
      observeParents: true,
      slidesPerGroup: perGroup,
      breakpoints: {
        575: {
          slidesPerView: mobileSm,
          spaceBetween: spacing,
          slidesPerGroup: perGroup,
        },
        768: {
          slidesPerView: tablet,
          spaceBetween: spacingMd,
          slidesPerGroup: perGroupMd,
        },
        1200: {
          slidesPerView: preview,
          spaceBetween: spacingLg,
          slidesPerGroup: perGroupLg,
        },
      },
    });
  }

  function applyProfileLink(url) {
    var a = document.querySelector("[data-instagram-profile-link]");
    if (!a) return;
    if (url) {
      a.href = url;
      a.style.display = "";
      return;
    }
    a.removeAttribute("href");
    a.style.display = "none";
  }

  function render(items) {
    var swiperEl = document.querySelector(".tf-sw-instagram");
    if (!swiperEl) return;
    var wrapper = swiperEl.querySelector(".swiper-wrapper");
    if (!items || !items.length) {
      swiperEl.style.display = "none";
      return;
    }
    swiperEl.style.display = "";
    wrapper.innerHTML = "";
    items.forEach(function (item) {
      var slide = document.createElement("div");
      slide.className = "swiper-slide";
      slide.setAttribute("data-permalink", item.permalink);
      wrapper.appendChild(slide);
    });
    var swiper = initSwiper(swiperEl);
    loadEmbedScript()
      .then(function () {
        processVisible(swiper, swiperEl);
      })
      .catch(function () {
        swiperEl.style.display = "none";
      });
    ["slideChange", "resize", "breakpoint"].forEach(function (evt) {
      swiper.on(evt, function () {
        processVisible(swiper, swiperEl);
      });
    });
  }

  var el = document.querySelector(".tf-sw-instagram");
  if (!el) return;

  fetch(FEED_URL, { credentials: "same-origin" })
    .then(function (res) {
      if (!res.ok) throw new Error("feed http " + res.status);
      return res.json();
    })
    .then(function (data) {
      applyProfileLink(data && data.profile_url ? data.profile_url : "");
      render(data && data.items ? data.items : []);
    })
    .catch(function () {
      applyProfileLink("");
      render([]);
    });
})();
