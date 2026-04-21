
import PhotoSwipeLightbox from './photoswipe-lightbox.esm.min.js';
import PhotoSwipe from './photoswipe.esm.min.js';

if ($(".thumbs-slider").length > 0) {
    var direction = $(".tf-product-media-thumbs").data("direction");
    var thumbs = new Swiper(".tf-product-media-thumbs", {
      spaceBetween: 10,
      slidesPerView: "auto",
      freeMode: true,
      direction: "vertical",
      watchSlidesProgress: true,
      observer: true,
      observeParents: true,
      breakpoints: {
        0: {
          direction: "horizontal",
        },
        1200: {
          direction: "vertical",
          direction: direction,
        },
      },
      450: {
        direction: "vertical",
      },
    });
    var main = new Swiper(".tf-product-media-main", {
      spaceBetween: 0,
      observer: true,
      observeParents: true,
      navigation: {
        nextEl: ".thumbs-next",
        prevEl: ".thumbs-prev",
      },
      thumbs: {
        swiper: thumbs,
      },
    });

    // color
    function updateActiveColorButton(activeIndex) {
        $(".color-btn").removeClass("active");
    
        var currentSlide = $(".tf-product-media-main .swiper-slide").eq(activeIndex);
        var currentColor = currentSlide.data("color");
        if (currentColor) {
          $(".color-btn[data-color='" + currentColor + "']").addClass("active");
          $('.value-currentColor').text(currentColor);
          $(".select-currentColor").text(currentColor);
        }
    }
    main.on('slideChange', function () {
        updateActiveColorButton(this.activeIndex);
    });

    // Function scroll to the correct slide and thumb
    function scrollToColor(color) {
    var matchingSlides = $(".tf-product-media-main .swiper-slide").filter(function() {
        return $(this).data("color") === color;
    });
    if (matchingSlides.length > 0) {
        var firstIndex = matchingSlides.first().index();
        main.slideTo(firstIndex,1000,false);
        thumbs.slideTo(firstIndex,1000,false);
    }
    }
    $(".color-btn").on("click", function() {
    var color = $(this).data("color");
    
    $(".color-btn").removeClass("active");
    $(this).addClass("active");

    scrollToColor(color);
    });
    updateActiveColorButton(main.activeIndex);

    // material
    function updateActiveOtherVariantBtn(activeIndex) {
        $(".other-variant-btn").removeClass("active");
    
        var currentSlide = $(".tf-product-media-main .swiper-slide").eq(activeIndex);
        var currentOtherVariant = currentSlide.data("other-variant");
        if (currentOtherVariant) {
          $(".other-variant-btn[data-other-variant='" + currentOtherVariant + "']").addClass("active");
          $('.value-currentVariant').text(currentOtherVariant);
          $(".select-currentVariant").text(currentOtherVariant);
        }
    }
    main.on('slideChange', function () {
        updateActiveOtherVariantBtn(this.activeIndex);
    });

    // Function scroll to the correct slide and thumb
    function scrollToOtherVariant(otherVariant) {
    var matchingSlides = $(".tf-product-media-main .swiper-slide").filter(function() {
        return $(this).data("other-variant") === otherVariant;
    });
    if (matchingSlides.length > 0) {
        var firstIndex = matchingSlides.first().index();
        main.slideTo(firstIndex,1000,false);
        thumbs.slideTo(firstIndex,1000,false);
        }
    }
    $(".other-variant-btn").on("click", function() {
    var otherVariant = $(this).data("other-variant");
    
    $(".other-variant-btn").removeClass("active");
    $(this).addClass("active");
    scrollToOtherVariant(otherVariant);
    });
    updateActiveOtherVariantBtn(main.activeIndex);

}

(function ($) {
    "use strict";

    var section_zoom = function () {
        $(".tf-image-zoom").on("mouseover", function () {
            $(this).closest(".section-image-zoom").addClass("zoom-active");
        });
        $(".tf-image-zoom").on("mouseleave", function () {
            $(this).closest(".section-image-zoom").removeClass("zoom-active");
        });
    }

    var image_zoom = function () {
        if (matchMedia("only screen and (min-width: 768px)").matches) {
            var driftAll = document.querySelectorAll('.tf-image-zoom');
            var pane = document.querySelector('.tf-zoom-main');
            $(driftAll).each(function(i, el) {
                new Drift(
                    el, {
                    zoomFactor: 2,
                    paneContainer: pane,
                    inlinePane: false,
                    handleTouch: false,
                    hoverBoundingBox: true,
                    containInline: true,
                    }
                );
            });
        }
    }

    var image_zoom_magnifier = function () {
        var driftAll = document.querySelectorAll('.tf-image-zoom-magnifier');
        $(driftAll).each(function(i, el) {
            new Drift(
                el, {
                zoomFactor: 2,
                inlinePane: true,
                containInline: false,
                }
            );
        });
    }

    var image_zoom_inner = function () {
        var driftAll = document.querySelectorAll('.tf-image-zoom-inner');
        var pane = document.querySelector('.tf-product-zoom-inner');
        $(driftAll).each(function(i, el) {
            new Drift(
                el, {
                paneContainer: pane,
                zoomFactor: 2,
                inlinePane: false,
                containInline: false,
                }
            );
        });
    }

    // Helper functions for YouTube/Vimeo URL parsing
    var getYouTubeVideoId = function(url) {
        if (!url) return null;
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        var match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    var getVimeoVideoId = function(url) {
        if (!url) return null;
        var regExp = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
        var match = url.match(regExp);
        return match ? match[1] : null;
    };

    var isYouTubeUrl = function(url) {
        return /(youtube\.com|youtu\.be)/i.test(url);
    };

    var isVimeoUrl = function(url) {
        return /vimeo\.com/i.test(url);
    };

    var getVideoEmbedUrl = function(url) {
        if (isYouTubeUrl(url)) {
            var videoId = getYouTubeVideoId(url);
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
            }
        } else if (isVimeoUrl(url)) {
            var videoId = getVimeoVideoId(url);
            if (videoId) {
                return `https://player.vimeo.com/video/${videoId}?autoplay=0`;
            }
        }
        return null;
    };

    var getVideoThumbnail = function(url) {
        if (isYouTubeUrl(url)) {
            var videoId = getYouTubeVideoId(url);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        } else if (isVimeoUrl(url)) {
            // Vimeo thumbnails require API call, so we'll use a placeholder
            // or fetch via oEmbed API if needed
            return null;
        }
        return null;
    };

    var lightboxswiper = function () {

        const lightbox = new PhotoSwipeLightbox({
            gallery: '#gallery-swiper-started',
            children: 'a',
            pswpModule: PhotoSwipe,
            bgOpacity: 1,
            secondaryZoomLevel: 2,
            maxZoomLevel: 3,
        });

        // Modify items before PhotoSwipe processes them
        lightbox.on('itemData', (e) => {
            const linkEl = e.itemData.element;
            
            // Check if this is a video
            if (linkEl && linkEl.dataset.type === 'video') {
                // Check for data-video-url first (for YouTube/Vimeo), then fall back to href
                const videoSrc = linkEl.dataset.videoUrl || linkEl.href;
                const videoPoster = linkEl.dataset.videoPoster || '';
                const width = parseInt(linkEl.dataset.pswpWidth) || 1920;
                const height = parseInt(linkEl.dataset.pswpHeight) || 1080;
                
                // Check if it's a YouTube or Vimeo URL
                var embedUrl = getVideoEmbedUrl(videoSrc);
                
                if (embedUrl) {
                    // Create iframe for YouTube/Vimeo
                    const videoHtml = `
                        <iframe 
                            src="${embedUrl}"
                            width="100%" 
                            height="100%"
                            frameborder="0" 
                            allow="autoplay; fullscreen; picture-in-picture" 
                            allowfullscreen
                            style="width: 100%; height: 100%; border: none;"
                        ></iframe>
                    `;
                    
                    e.itemData.src = videoSrc;
                    e.itemData.width = width;
                    e.itemData.height = height;
                    e.itemData.html = videoHtml;
                    e.itemData.type = 'html';
                } else {
                    // Create video HTML for local videos
                    const videoHtml = `
                        <video 
                            src="${videoSrc}" 
                            ${videoPoster ? `poster="${videoPoster}"` : ''}
                            controls 
                            playsinline 
                            style="width: 100%; height: 100%; object-fit: contain; background: #000;"
                        ></video>
                    `;
                    
                    e.itemData.src = videoSrc;
                    e.itemData.width = width;
                    e.itemData.height = height;
                    e.itemData.html = videoHtml;
                    e.itemData.type = 'html';
                }
            }
        });

        lightbox.init();

        lightbox.on('change', () => {
            const { pswp } = lightbox;
            main.slideTo(pswp.currIndex, 0, false);
        });

        lightbox.on('afterInit', () => {
            if (main.params.autoplay.enabled) {
                main.autoplay.stop();
            };
        });

        lightbox.on('closingAnimationStart', () => {
            const { pswp } = lightbox;
            main.slideTo(pswp.currIndex, 0, false);
            if (main.params.autoplay.enabled) {
                main.autoplay.start();
            }
        });

        // Pause videos when closing lightbox
        lightbox.on('close', () => {
            const videos = document.querySelectorAll('#pswp video');
            videos.forEach(video => {
                video.pause();
                video.currentTime = 0;
            });
            // Remove iframes to stop YouTube/Vimeo playback
            const iframes = document.querySelectorAll('#pswp iframe');
            iframes.forEach(iframe => {
                iframe.src = '';
            });
        });

        // Pause videos when changing slides
        lightbox.on('beforeChange', () => {
            const videos = document.querySelectorAll('#pswp video');
            videos.forEach(video => {
                video.pause();
            });
            // Remove iframes to stop YouTube/Vimeo playback
            const iframes = document.querySelectorAll('#pswp iframe');
            iframes.forEach(iframe => {
                iframe.src = '';
            });
        });

    }
    
    var lightbox = function () {

        const lightbox = new PhotoSwipeLightbox({
            gallery: '#gallery-started',
            children: 'a',
            pswpModule: PhotoSwipe,
            bgOpacity: 1,
            secondaryZoomLevel: 2,
            maxZoomLevel: 3,
        });
        lightbox.init();

    }

    // Producciones anteriores: open images in PhotoSwipe lightbox (natural dimensions from img)
    var lightboxProducciones = function () {
        if (document.querySelector('#gallery-producciones-anteriores')) {
            const lb = new PhotoSwipeLightbox({
                gallery: '#gallery-producciones-anteriores',
                children: 'a.item',
                pswpModule: PhotoSwipe,
                bgOpacity: 1,
                secondaryZoomLevel: 2,
                maxZoomLevel: 3,
            });
            // Use natural width/height from the img inside each link (no fixed data-pswp-* needed)
            lb.addFilter('domItemData', (itemData, element, linkEl) => {
                if (linkEl) {
                    const img = linkEl.querySelector('img');
                    if (img && img.naturalWidth && img.naturalHeight) {
                        itemData.width = img.naturalWidth;
                        itemData.height = img.naturalHeight;
                    } else {
                        // Fallback when img not loaded yet (e.g. lazy load)
                        itemData.width = itemData.width || 800;
                        itemData.height = itemData.height || 600;
                    }
                }
                return itemData;
            });
            lb.init();
        }
    }

    var model_viewer = function () {

        if ($(".tf-model-viewer").length) {
   
            $(".tf-model-viewer-ui-button").on("click", function (e) {
                $(this).closest(".tf-model-viewer").find("model-viewer").removeClass("disabled");
                $(this).closest(".tf-model-viewer").toggleClass("active");
            });
            $(".tf-model-viewer-ui").on("dblclick", function (e) {
                $(this).closest(".tf-model-viewer").find("model-viewer").addClass("disabled");
                $(this).closest(".tf-model-viewer").toggleClass("active");
            });
        }

    }

    var video_support = function () {
        // Handle video thumbnail clicks - load video source for lazy loading
        $(".tf-product-media-thumbs .item-video").each(function() {
            var $item = $(this);
            var $video = $item.find("video");
            var $img = $item.find("img");
            
            // Check if it's a YouTube/Vimeo URL
            var videoUrl = $item.data("video-url");
            
            if (videoUrl && (isYouTubeUrl(videoUrl) || isVimeoUrl(videoUrl))) {
                // For YouTube/Vimeo, ensure we have a thumbnail image
                if (!$img.length && $video.length) {
                    // Replace video element with thumbnail image
                    var thumbnailUrl = getVideoThumbnail(videoUrl);
                    if (thumbnailUrl && isYouTubeUrl(videoUrl)) {
                        var $newImg = $('<img>', {
                            class: 'lazyload',
                            'data-src': thumbnailUrl,
                            src: thumbnailUrl,
                            alt: 'Video thumbnail'
                        });
                        $video.replaceWith($newImg);
                    } else {
                        // For Vimeo or if no thumbnail, use poster or placeholder
                        var poster = $video.attr('poster') || 'images/products/video-poster.jpg';
                        var $newImg = $('<img>', {
                            class: 'lazyload',
                            'data-src': poster,
                            src: poster,
                            alt: 'Video thumbnail'
                        });
                        $video.replaceWith($newImg);
                    }
                }
            } else if ($video.length) {
                // Handle local video files
                var $source = $video.find("source");
                if ($source.length && $source.data("src")) {
                    $source.attr("src", $source.data("src"));
                }
            }
        });

        // Handle video clicks in main area - open in lightbox
        $(".tf-product-media-main .item-video").on("click", function(e) {
            // Let the lightbox handle it, but ensure video source is loaded
            var $item = $(this);
            var $link = $item.closest('a');
            var $video = $item.find("video");
            var videoUrl = $item.data("video-url") || ($link.length ? $link.attr('href') : null);
            
            // If it's a YouTube/Vimeo URL and link doesn't have it, update the href
            if (videoUrl && (isYouTubeUrl(videoUrl) || isVimeoUrl(videoUrl)) && $link.length) {
                if ($link.attr('href') !== videoUrl) {
                    $link.attr('href', videoUrl);
                }
            } else if (!videoUrl && $video.length) {
                // Handle local video files
                var $source = $video.find("source");
                if ($source.length && $source.data("src")) {
                    $source.attr("src", $source.data("src"));
                }
            }
        });

        // Handle video thumbnail click to switch main slide
        $(".tf-product-media-thumbs .item-video").on("click", function() {
            var $slide = $(this).closest(".swiper-slide");
            var index = $slide.index();
            var videoUrl = $(this).data("video-url");
            
            // Update the corresponding main slide link if it's a YouTube/Vimeo video
            if (videoUrl && (isYouTubeUrl(videoUrl) || isVimeoUrl(videoUrl))) {
                var $mainSlide = $(".tf-product-media-main .swiper-slide").eq(index);
                var $mainLink = $mainSlide.find("a.item-video");
                if ($mainLink.length) {
                    $mainLink.attr('href', videoUrl);
                    $mainLink.attr('data-video-url', videoUrl);
                }
            }
            
            if (typeof main !== 'undefined') {
                main.slideTo(index);
            }
        });
    }

  // Dom Ready
  $(function () {
    section_zoom();
    image_zoom();
    image_zoom_magnifier();
    image_zoom_inner();
    lightboxswiper();
    lightbox();
    lightboxProducciones();
    model_viewer();
    video_support();
  });
})(jQuery);


