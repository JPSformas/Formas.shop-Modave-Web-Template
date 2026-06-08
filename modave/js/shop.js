
/**
  * Range Two Price
  * Filter Products
  * Filter Sort 
  * Switch Layout
  * Handle Sidebar Filter
  * Handle Dropdown Filter
 */
(function ($) {
  "use strict";

  /* Parse Price from HTML format
  -------------------------------------------------------------------------------------*/
  var parsePriceFromHTML = function (priceElement) {
    // Try to find price-text first (format: desde<span class="price"> $116.062<sup class="cents">33</sup> </span> - <span class="price"> $129.557<sup class="cents">95</sup></span>)
    var priceText = priceElement.find(".price-text, .price-text-discount");
    if (priceText.length > 0) {
      // Get all prices in the price-text
      var prices = priceText.find(".price");
      if (prices.length > 0) {
        // Get both min and max prices from the range
        var priceArray = [];
        prices.each(function() {
          // Clone the price element and remove the cents sup tag to get just the main price
          var priceClone = $(this).clone();
          priceClone.find(".cents").remove();
          var mainPrice = priceClone.text().trim();
          var cents = $(this).find(".cents").text().trim();
          
          // Remove $ sign and dots (thousand separators)
          mainPrice = mainPrice.replace("$", "").replace(/\./g, "");
          
          // Combine main price and cents with dot as decimal separator
          var fullPrice = parseFloat(mainPrice + "." + cents);
          priceArray.push(fullPrice);
        });
        
        // Return min and max prices from the range
        var minPrice = Math.min.apply(null, priceArray);
        var maxPrice = Math.max.apply(null, priceArray);
        return { min: minPrice, max: maxPrice };
      }
    }
    
    // Fallback to current-price if available (format: $199.25)
    var currentPrice = priceElement.find(".current-price");
    if (currentPrice.length > 0) {
      var price = currentPrice.text().replace("$", "");
      var numericPrice;
      // Handle prices with decimal points already
      if (price.indexOf('.') !== -1) {
        numericPrice = parseFloat(price);
      } else {
        // No decimal, remove dots as thousand separators
        numericPrice = parseFloat(price.replace(/\./g, ""));
      }
      // For single price, min and max are the same
      return { min: numericPrice, max: numericPrice };
    }
    
    return { min: 0, max: 0 };
  };

  /* Parse Minimum Order Quantity from HTML format
  -------------------------------------------------------------------------------------*/
  var parseMinOrderQuantity = function (priceElement) {
    // Look for the stock-status section with "Min.:" label
    var stockStatus = priceElement.find(".stock-status");
    if (stockStatus.length > 0) {
      // Find all stock-items
      var stockItems = stockStatus.find(".stock-item");
      var result = 0;
      
      stockItems.each(function() {
        var label = $(this).find(".stock-label").text().trim();
        // Check if this is the Min order quantity
        if (label.indexOf("Min.") !== -1 || label.indexOf("Min:") !== -1) {
          var valueText = $(this).find(".stock-value").text().trim();
          // Extract just the number (remove " u." if present)
          result = parseInt(valueText.replace(" u.", "").trim()) || 0;
          return false; // break the loop
        }
      });
      return result;
    }
    return 0;
  };

  /* Filter Products
  -------------------------------------------------------------------------------------*/
  var filterProducts = function () {
    const priceMinInput = document.getElementById("price-min-input");
    const priceMaxInput = document.getElementById("price-max-input");
    const priceFilterElement = $(".widget-facet.facet-price");
    
    // Read min and max values from HTML data attributes
    const minPrice = parseInt(priceFilterElement.attr("data-price-min")) || 0;
    const maxPrice = parseInt(priceFilterElement.attr("data-price-max")) || 999999;
    
    const minOrderInput = document.getElementById("min-order-quantity-input");
    const minOrderFilterElement = $(".widget-facet.facet-min-order-quantity");
    const maxMinOrder = parseInt(minOrderFilterElement.attr("data-min-order-max")) || 9999;

    const filters = {
      minPrice: minPrice,
      maxPrice: maxPrice,
      maxMinOrderQuantity: maxMinOrder,
      size: null,
      color: null,
      availability: null,
      brands: [],
      categories: [],
      contextualCategories: [],
      subcategories: [],
      sale: false,
    };

    var MAIN_SUB = {};
    var MAIN_LABELS = {};
    var CTX_LABELS = {};
    var SUB_LABELS = {};
    var CTX_SUB_DYNAMIC = {};

    function slugToLabel(slug) {
      if (!slug) return slug;
      return slug.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    /** Resolve display label: use CategoriesConfig if loaded, else slugToLabel(slug). */
    function getLabelForSlug(slug, configMap) {
      if (typeof CategoriesConfig !== "undefined" && configMap && configMap[slug]) return configMap[slug];
      return slugToLabel(slug);
    }

    /** Products source: use grid only so grid and list (same products, different layout) are not double-counted. */
    function getProductsForFilterData() {
      return $("#gridLayout .card-product");
    }

    /** Build all category filter data from grid .card-product: main from data-category, contextual from data-contextual-categories, main→sub from data-subcategory. */
    function buildCategoryDataFromProducts() {
      var mainLabels = {};
      var ctxLabels = {};
      var mainSub = {};
      var subLabels = {};
      var mainConfig = (typeof CategoriesConfig !== "undefined" && CategoriesConfig.MAIN_CATEGORIES) ? CategoriesConfig.MAIN_CATEGORIES : null;
      var ctxConfig = (typeof CategoriesConfig !== "undefined" && CategoriesConfig.CONTEXTUAL_CATEGORIES) ? CategoriesConfig.CONTEXTUAL_CATEGORIES : null;
      var subConfig = (typeof CategoriesConfig !== "undefined" && CategoriesConfig.SUBCATEGORY_LABELS) ? CategoriesConfig.SUBCATEGORY_LABELS : null;
      getProductsForFilterData().each(function () {
        var mainSlug = ($(this).attr("data-category") || "").trim();
        var subSlug = ($(this).attr("data-subcategory") || "").trim();
        var ctxStr = $(this).attr("data-contextual-categories") || "";
        if (mainSlug) {
          if (!mainLabels[mainSlug]) mainLabels[mainSlug] = getLabelForSlug(mainSlug, mainConfig);
          if (subSlug) {
            if (!mainSub[mainSlug]) mainSub[mainSlug] = [];
            if (mainSub[mainSlug].indexOf(subSlug) === -1) mainSub[mainSlug].push(subSlug);
            if (!subLabels[subSlug]) subLabels[subSlug] = getLabelForSlug(subSlug, subConfig);
          }
        }
        ctxStr.trim().split(/\s+/).filter(Boolean).forEach(function (ctxSlug) {
          if (!ctxLabels[ctxSlug]) ctxLabels[ctxSlug] = getLabelForSlug(ctxSlug, ctxConfig);
        });
      });
      return { MAIN_LABELS: mainLabels, CTX_LABELS: ctxLabels, MAIN_SUB: mainSub, SUB_LABELS: subLabels };
    }

    /** Build contextual → subcategory list from product data (data-contextual-categories + data-subcategory). */
    function buildContextualSubcategoriesFromProducts() {
      var map = {};
      getProductsForFilterData().each(function () {
        var ctxStr = $(this).attr("data-contextual-categories") || "";
        var subSlug = ($(this).attr("data-subcategory") || "").trim();
        if (!subSlug) return;
        ctxStr.trim().split(/\s+/).filter(Boolean).forEach(function (ctxSlug) {
          if (!map[ctxSlug]) map[ctxSlug] = [];
          if (map[ctxSlug].indexOf(subSlug) === -1) map[ctxSlug].push(subSlug);
        });
      });
      return map;
    }

    function buildCategoryFilterUI() {
      var data = buildCategoryDataFromProducts();
      MAIN_LABELS = data.MAIN_LABELS;
      CTX_LABELS = data.CTX_LABELS;
      MAIN_SUB = data.MAIN_SUB;
      SUB_LABELS = data.SUB_LABELS;
      CTX_SUB_DYNAMIC = buildContextualSubcategoriesFromProducts();

      var $mainList = $("#filter-main-categories-list");
      var $ctxList = $("#filter-contextual-categories-list");
      if (!$mainList.length || !$ctxList.length) return;

      $mainList.empty();
      $ctxList.empty();

      Object.keys(MAIN_LABELS).forEach(function (mainSlug) {
        var label = MAIN_LABELS[mainSlug];
        var subs = MAIN_SUB[mainSlug] || [];
        var rowId = "cat-row-" + mainSlug;
        var inputId = "cat-" + mainSlug;
        var subHtml = subs.map(function (subSlug) {
          var subLabel = SUB_LABELS[subSlug] || subSlug;
          var subInputId = "sub-main-" + mainSlug + "-" + subSlug;
          return '<fieldset class="fieldset-item filter-sub-item">' +
            '<input type="checkbox" name="subcategory" class="tf-check" id="' + subInputId + '" value="' + subSlug + '" data-main="' + mainSlug + '">' +
            '<label for="' + subInputId + '">' + subLabel + ' <span class="count-subcategory">(0)</span></label>' +
            '</fieldset>';
        }).join("");
        var $row = $('<div class="filter-category-row" id="' + rowId + '" data-main-slug="' + mainSlug + '">' +
          '<div class="filter-category-head d-flex align-items-center justify-content-between">' +
          '<fieldset class="fieldset-item">' +
          '<input type="checkbox" name="category" class="tf-check" id="' + inputId + '" value="' + mainSlug + '">' +
          '<label for="' + inputId + '">' + label + ' <span class="count-category">(0)</span></label>' +
          '</fieldset>' +
          '<span class="filter-expand icon icon-arrow-down" data-expanded="0" aria-label="Expand"></span>' +
          '</div>' +
          '<div class="filter-subcategories" style="display:none;">' + subHtml + '</div>' +
          '</div>');
        $mainList.append($row);
      });

      Object.keys(CTX_LABELS).forEach(function (ctxSlug) {
        var label = CTX_LABELS[ctxSlug];
        var inputId = "ctx-" + ctxSlug;
        var $row = $('<div class="filter-contextual-row" data-contextual-slug="' + ctxSlug + '">' +
          '<div class="filter-category-head d-flex align-items-center justify-content-between">' +
          '<fieldset class="fieldset-item">' +
          '<input type="checkbox" name="contextual-category" class="tf-check" id="' + inputId + '" value="' + ctxSlug + '">' +
          '<label for="' + inputId + '">' + label + ' <span class="count-contextual">(0)</span></label>' +
          '</fieldset>' +
          '</div>');
        $ctxList.append($row);
      });

      $(".filter-expand").on("click", function (e) {
        e.preventDefault();
        var $t = $(this);
        var $row = $t.closest(".filter-category-row, .filter-contextual-row");
        var $sub = $row.find(".filter-subcategories");
        var expanded = $t.attr("data-expanded") === "1";
        if (expanded) {
          $sub.slideUp(200);
          $t.attr("data-expanded", "0").removeClass("filter-expand-open");
        } else {
          $sub.slideDown(200);
          $t.attr("data-expanded", "1").addClass("filter-expand-open");
        }
      });

      $(".filter-category-head").on("click", function (e) {
        if ($(e.target).is("input") || $(e.target).is("label") || $(e.target).closest(".filter-expand").length) return;
        $(this).find(".filter-expand").trigger("click");
      });
    }
    buildCategoryFilterUI();

    // Handle price input changes
    if (priceMinInput && priceMaxInput) {
      // Set placeholder values from data attributes
      priceMinInput.placeholder = minPrice.toString();
      priceMaxInput.placeholder = maxPrice.toString();
      
      const updatePriceFilters = function() {
        const inputMin = parseFloat(priceMinInput.value) || minPrice;
        const inputMax = parseFloat(priceMaxInput.value) || maxPrice;
        
        filters.minPrice = inputMin;
        filters.maxPrice = inputMax;
        
        applyFilters();
        updateMetaFilter();
      };

      priceMinInput.addEventListener("input", updatePriceFilters);
      priceMaxInput.addEventListener("input", updatePriceFilters);
    }

    // Handle minimum order quantity input changes
    if (minOrderInput) {
      // Set placeholder value from data attribute
      minOrderInput.placeholder = maxMinOrder.toString();
      
      minOrderInput.addEventListener("input", function() {
        const inputValue = parseInt(minOrderInput.value) || maxMinOrder;
        filters.maxMinOrderQuantity = inputValue;
        applyFilters();
        updateMetaFilter();
      });
    }

    $(".size-check").click(function () {
      filters.size = $(this).hasClass("free-size")
        ? null
        : $(this).text().trim();
      applyFilters();
      updateMetaFilter();
    });

    $(".color-check").click(function () {
      // Remove active class from all color items
      $(".color-check").removeClass("active");
      
      // Add active class to clicked item
      $(this).addClass("active");
      
      // Store the color text
      filters.color = $(this).text().trim();
      
      applyFilters();
      updateMetaFilter();
    });

    $('input[name="availability"]').change(function () {
      filters.availability =
        $(this).attr("id") === "inStock" ? "In stock" : "Out of stock";
      applyFilters();
      updateMetaFilter();
    });

    $('input[name="brand"]').change(function () {
      const brandId = $(this).attr("id");
      let brandLabel = $(this).next("label").text().trim();
      brandLabel = brandLabel.replace(/\s*\(\d+\)$/, "");

      if ($(this).is(":checked")) {
        filters.brands.push({ id: brandId, label: brandLabel });
      } else {
        filters.brands = filters.brands.filter((brand) => brand.id !== brandId);
      }
      applyFilters();
      updateMetaFilter();
    });

    function syncCategoryFiltersFromUI() {
      filters.categories = [];
      $('input[name="category"]:checked').each(function () {
        var slug = $(this).val();
        var label = $(this).closest("fieldset").find("label").text().trim().replace(/\s*\(\d+\)$/, "");
        filters.categories.push({ id: slug, label: label });
      });
      filters.contextualCategories = [];
      $('input[name="contextual-category"]:checked').each(function () {
        var slug = $(this).val();
        var label = $(this).closest("fieldset").find("label").text().trim().replace(/\s*\(\d+\)$/, "");
        filters.contextualCategories.push({ id: slug, label: label });
      });
      filters.subcategories = [];
      $('input[name="subcategory"]:checked').each(function () {
        var id = $(this).val();
        var label = SUB_LABELS[id] || id;
        if (!filters.subcategories.some(function (s) { return s.id === id; })) {
          filters.subcategories.push({ id: id, label: label });
        }
      });
    }

    function updateReactiveVisibility() {
      var mainSlugs = filters.categories.map(function (c) { return c.id; });
      var ctxSlugs = filters.contextualCategories.map(function (c) { return c.id; });

      var mainSubs = {};
      mainSlugs.forEach(function (m) {
        (MAIN_SUB[m] || []).forEach(function (s) { mainSubs[s] = true; });
      });
      var ctxSubs = {};
      ctxSlugs.forEach(function (c) {
        (CTX_SUB_DYNAMIC[c] || []).forEach(function (s) { ctxSubs[s] = true; });
      });

      function setVisible($row, visible) {
        $row.toggleClass("filter-hidden", !visible);
      }

      if (mainSlugs.length > 0) {
        $("#filter-contextual-categories-list .filter-contextual-row").each(function () {
          var ctxSlug = $(this).data("contextual-slug");
          var subs = CTX_SUB_DYNAMIC[ctxSlug] || [];
          var hasIntersection = subs.some(function (s) { return mainSubs[s]; });
          setVisible($(this), hasIntersection);
        });
      } else {
        $("#filter-contextual-categories-list .filter-contextual-row").each(function () {
          setVisible($(this), true);
        });
      }

      if (ctxSlugs.length > 0) {
        $("#filter-categories-principales .filter-category-row").each(function () {
          var mainSlug = $(this).data("main-slug");
          var subs = MAIN_SUB[mainSlug] || [];
          var hasIntersection = subs.some(function (s) { return ctxSubs[s]; });
          setVisible($(this), hasIntersection);
        });
      } else {
        $("#filter-categories-principales .filter-category-row").each(function () {
          setVisible($(this), true);
        });
      }
    }

    $(document).on("change", "input[name='category']", function () {
      var $categoryInput = $(this);
      var $row = $categoryInput.closest(".filter-category-row");
      var $expand = $row.find(".filter-expand");
      if ($expand.length) {
        var shouldExpand = $categoryInput.is(":checked");
        var isExpanded = $expand.attr("data-expanded") === "1";
        if (shouldExpand !== isExpanded) {
          $expand.trigger("click");
        }
      }
      syncCategoryFiltersFromUI();
      updateReactiveVisibility();
      applyFilters();
      updateMetaFilter();
    });
    $(document).on("change", "input[name='contextual-category']", function () {
      syncCategoryFiltersFromUI();
      updateReactiveVisibility();
      applyFilters();
      updateMetaFilter();
    });
    $(document).on("change", "input[name='subcategory']", function () {
      syncCategoryFiltersFromUI();
      applyFilters();
      updateMetaFilter();
    });

    $(".shop-sale-text").click(function () {
      filters.sale = !filters.sale;
      $(this).toggleClass("active", filters.sale);
      applyFilters();
      updateMetaFilter();
    });

    function updateMetaFilter() {
      const appliedFilters = $("#applied-filters");
      const metaFilterShop = $(".meta-filter-shop");
      appliedFilters.empty();

      if (filters.availability) {
        appliedFilters.append(
          `<span class="filter-tag">${filters.availability} <span class="remove-tag icon-close" data-filter="availability"></span></span>`
        );
      }
      if (filters.size) {
        appliedFilters.append(
          `<span class="filter-tag">${filters.size} <span class="remove-tag icon-close" data-filter="size"></span></span>`
        );
      }
      if (filters.minPrice > minPrice || filters.maxPrice < maxPrice) {
        appliedFilters.append(
          `<span class="filter-tag">$${filters.minPrice} - $${filters.maxPrice} <span class="remove-tag icon-close" data-filter="price"></span></span>`
        );
      }
      if (filters.color) {
        // Find the exact color element that was clicked (has 'active' class)
        const colorElement = $(`.color-check.active:contains('${filters.color}')`);
        const backgroundClass = colorElement
          .find(".color")
          .attr("class")
          .split(" ")
          .find((cls) => cls.startsWith("bg-"));
        const line = backgroundClass === "bg-white" ? "line-black" : "";
        appliedFilters.append(
          `<span class="filter-tag color-tag">
                  <span class="color ${backgroundClass} ${line}"></span>
                  ${filters.color}
                  <span class="remove-tag icon-close" data-filter="color"></span>
              </span>`
        );
      }

      if (filters.maxMinOrderQuantity < maxMinOrder) {
        appliedFilters.append(
          `<span class="filter-tag">Min. compra: ≤${filters.maxMinOrderQuantity} u. <span class="remove-tag icon-close" data-filter="minOrderQuantity"></span></span>`
        );
      }

      if (filters.brands.length > 0) {
        filters.brands.forEach((brand) => {
          appliedFilters.append(
            `<span class="filter-tag">${brand.label} <span class="remove-tag icon-close" data-filter="brand" data-value="${brand.id}"></span></span>`
          );
        });
      }

      if (filters.categories.length > 0) {
        filters.categories.forEach((category) => {
          appliedFilters.append(
            `<span class="filter-tag">${category.label} <span class="remove-tag icon-close" data-filter="category" data-value="${category.id}"></span></span>`
          );
        });
      }
      if (filters.contextualCategories.length > 0) {
        filters.contextualCategories.forEach((ctx) => {
          appliedFilters.append(
            `<span class="filter-tag">${ctx.label} <span class="remove-tag icon-close" data-filter="contextual-category" data-value="${ctx.id}"></span></span>`
          );
        });
      }
      if (filters.subcategories.length > 0) {
        filters.subcategories.forEach((sub) => {
          appliedFilters.append(
            `<span class="filter-tag">${sub.label} <span class="remove-tag icon-close" data-filter="subcategory" data-value="${sub.id}"></span></span>`
          );
        });
      }

      if (filters.sale) {
        appliedFilters.append(
          `<span class="filter-tag on-sale d-none">On Sale <span class="remove-tag icon-close" data-filter="sale"></span></span>`
        );
      }

      const hasFiltersApplied = appliedFilters.children().length > 0;
      metaFilterShop.toggle(hasFiltersApplied);

      $("#remove-all").toggle(hasFiltersApplied);

      if (!shopUrlSyncSuppress) syncUrlFromFilters();
    }

    /** Query keys owned by the shop filter (preserved when merging; stripped then re-applied). */
    var SHOP_FILTER_URL_KEYS = [
      "category", "contextual", "subcategory", "min_price", "max_price", "max_min_order",
      "size", "color", "availability", "brand", "sale"
    ];

    var shopUrlSyncTimer = null;
    var shopUrlSyncSuppress = false;

    function escapeForCssId(s) {
      if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(String(s));
      return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }

    function buildFilterParamsFromState() {
      var p = new URLSearchParams();
      filters.categories.forEach(function (c) { p.append("category", c.id); });
      filters.contextualCategories.forEach(function (c) { p.append("contextual", c.id); });
      filters.subcategories.forEach(function (s) { p.append("subcategory", s.id); });
      if (Number(filters.minPrice) !== Number(minPrice)) p.set("min_price", String(filters.minPrice));
      if (Number(filters.maxPrice) !== Number(maxPrice)) p.set("max_price", String(filters.maxPrice));
      if (Number(filters.maxMinOrderQuantity) !== Number(maxMinOrder)) p.set("max_min_order", String(filters.maxMinOrderQuantity));
      if (filters.size) p.set("size", filters.size);
      if (filters.color) p.set("color", filters.color);
      if (filters.availability) p.set("availability", filters.availability);
      filters.brands.forEach(function (b) { p.append("brand", b.id); });
      if (filters.sale) p.set("sale", "1");
      return p;
    }

    function syncUrlFromFilters() {
      if (shopUrlSyncSuppress) return;
      clearTimeout(shopUrlSyncTimer);
      shopUrlSyncTimer = setTimeout(function () {
        var merged = new URLSearchParams(window.location.search);
        SHOP_FILTER_URL_KEYS.forEach(function (k) { merged.delete(k); });
        buildFilterParamsFromState().forEach(function (value, key) {
          merged.append(key, value);
        });
        var qs = merged.toString();
        var next = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
        var cur = window.location.pathname + window.location.search + window.location.hash;
        if (next !== cur && typeof history !== "undefined" && history.replaceState) {
          history.replaceState({}, "", next);
        }
      }, 100);
    }

    $("#applied-filters").on("click", ".remove-tag", function () {
      const filterType = $(this).data("filter");
      const filterValue = $(this).data("value");

      if (filterType === "size") {
        filters.size = null;
        $(".size-check").removeClass("active");
      }
      if (filterType === "color") {
        filters.color = null;
        $(".color-check").removeClass("active");
      }
      if (filterType === "availability") {
        filters.availability = null;
        $('input[name="availability"]').prop("checked", false);
      }
      if (filterType === "brand") {
        filters.brands = filters.brands.filter(
          (brand) => brand.id !== filterValue
        );
        $(`input[name="brand"][id="${filterValue}"]`).prop("checked", false);
      }
      if (filterType === "category") {
        filters.categories = filters.categories.filter(
          (category) => category.id !== filterValue
        );
        $("#cat-" + filterValue).prop("checked", false);
        $(".filter-category-row[data-main-slug='" + filterValue + "'] input[name='subcategory']").prop("checked", false);
      }
      if (filterType === "contextual-category") {
        filters.contextualCategories = filters.contextualCategories.filter(
          (ctx) => ctx.id !== filterValue
        );
        $("#ctx-" + filterValue).prop("checked", false);
      }
      if (filterType === "subcategory") {
        filters.subcategories = filters.subcategories.filter(
          (sub) => sub.id !== filterValue
        );
        $('input[name="subcategory"][value="' + filterValue + '"]').prop("checked", false);
      }
      syncCategoryFiltersFromUI();
      updateReactiveVisibility();
      if (filterType === "price") {
        filters.minPrice = minPrice;
        filters.maxPrice = maxPrice;
        if (priceMinInput) priceMinInput.value = "";
        if (priceMaxInput) priceMaxInput.value = "";
      }

      if (filterType === "minOrderQuantity") {
        filters.maxMinOrderQuantity = maxMinOrder;
        if (minOrderInput) minOrderInput.value = "";
      }

      if (filterType === "sale") {
        filters.sale = false;
        $(".shop-sale-text").removeClass("active");
      }

      applyFilters();
      updateMetaFilter();
    });

    $("#remove-all,#reset-filter").click(function () {
      filters.size = null;
      filters.color = null;
      filters.availability = null;
      filters.brands = [];
      filters.categories = [];
      filters.contextualCategories = [];
      filters.subcategories = [];
      filters.minPrice = minPrice;
      filters.maxPrice = maxPrice;
      filters.maxMinOrderQuantity = maxMinOrder;
      filters.sale = false;

      $(".shop-sale-text").removeClass("active");
      $('input[name="brand"]').prop("checked", false);
      $('input[name="category"]').prop("checked", false);
      $('input[name="contextual-category"]').prop("checked", false);
      $('input[name="subcategory"]').prop("checked", false);
      $('input[name="availability"]').prop("checked", false);
      $(".size-check, .color-check").removeClass("active");
      if (priceMinInput) priceMinInput.value = "";
      if (priceMaxInput) priceMaxInput.value = "";
      if (minOrderInput) minOrderInput.value = "";

      updateReactiveVisibility();
      applyFilters();
      updateMetaFilter();
    });

    /**
     * Category filters: subs only → OR among subs. Main/contextual only → match any selected.
     * Main + subs all under those mains → AND (narrow within category).
     * Main + subs from other mains (e.g. Drinkware + Gorros) → OR union (all drinkware ∪ selected subs).
     */
    function productMatchesCategoryFilters(product) {
      var hasMain = filters.categories.length > 0;
      var hasCtx = filters.contextualCategories.length > 0;
      var hasSub = filters.subcategories.length > 0;
      if (!hasMain && !hasCtx && !hasSub) return true;

      var categoryId = (product.attr("data-category") || "").trim();
      var productSub = (product.attr("data-subcategory") || "").trim();
      var productContextual = (product.attr("data-contextual-categories") || "")
        .trim().split(/\s+/).filter(Boolean);

      var matchesMain = hasMain && filters.categories.some(function (c) { return c.id === categoryId; });
      var matchesCtx = hasCtx && filters.contextualCategories.some(function (ctx) {
        return productContextual.indexOf(ctx.id) !== -1;
      });
      var matchesSub = hasSub && filters.subcategories.some(function (sub) { return sub.id === productSub; });

      if (!hasSub) {
        return (!hasMain || matchesMain) && (!hasCtx || matchesCtx);
      }

      var hasExternalSubs = hasMain && filters.subcategories.some(function (sub) {
        return !filters.categories.some(function (cat) {
          return (MAIN_SUB[cat.id] || []).indexOf(sub.id) !== -1;
        });
      });

      if (hasExternalSubs) {
        return matchesMain || matchesCtx || matchesSub;
      }

      var mainCtxOk = (!hasMain || matchesMain) && (!hasCtx || matchesCtx);
      return mainCtxOk && matchesSub;
    }

    function applyFilters() {
      const $gridProducts = $("#gridLayout .card-product");
      const $listProducts = $("#listLayout .card-product");
      let visibleProductCount = 0;

      // Grid and list are the same products in the same order; compute visibility once per index and apply to both layouts
      $gridProducts.each(function (index) {
        const $gridProduct = $(this);
        const $listProduct = $listProducts.eq(index);
        // Use grid product for filter logic (same data as list)
        const product = $gridProduct;
        let showProduct = true;

        // Parse the price range using the custom function
        const priceRange = parsePriceFromHTML(product);
        
        // Check if there's overlap between product's price range and filter range
        if (priceRange.max < filters.minPrice || priceRange.min > filters.maxPrice) {
          showProduct = false;
        }

        // Size: only hide if product has size variants and none match (list layout may not have .size-item)
        if (filters.size) {
          const $sizeItems = product.find(".size-item");
          if ($sizeItems.length && !product.find(".size-item:contains('" + filters.size + "')").length) {
            showProduct = false;
          }
        }

        // Color: check .color-swatch or .color-filter text (list uses .color-filter inside .list-color-item.color-swatch)
        if (filters.color) {
          const hasColor = product.find(".color-swatch:contains('" + filters.color + "')").length ||
            product.find(".color-filter:contains('" + filters.color + "')").length;
          if (!hasColor) {
            showProduct = false;
          }
        }

        if (filters.availability) {
          const availabilityStatus = product.data("availability");
          if (filters.availability !== availabilityStatus) {
            showProduct = false;
          }
        }

        if (filters.sale) {
          if (!product.find(".on-sale-wrap, .price-text-discount").length) {
            showProduct = false;
          }
        }

        if (filters.maxMinOrderQuantity < maxMinOrder) {
          const productMinOrder = parseMinOrderQuantity(product);
          if (productMinOrder > filters.maxMinOrderQuantity) {
            showProduct = false;
          }
        }

        if (filters.brands.length > 0) {
          const brandId = product.attr("data-brand");
          if (!filters.brands.some((brand) => brand.id === brandId)) {
            showProduct = false;
          }
        }

        if (
          filters.categories.length > 0 ||
          filters.contextualCategories.length > 0 ||
          filters.subcategories.length > 0
        ) {
          if (!productMatchesCategoryFilters(product)) {
            showProduct = false;
          }
        }

        // Use class filter-hidden so CSS display:flex !important on list items doesn't override visibility
        $gridProduct.toggleClass("filter-hidden", !showProduct).toggle(showProduct);
        if ($listProduct.length) {
          $listProduct.toggleClass("filter-hidden", !showProduct).toggle(showProduct);
        }
        if (showProduct) {
          visibleProductCount++;
        }
      });

      $("#product-count-grid").html(
        `<span class="count">${visibleProductCount}</span> Products Found`
      );
      $("#product-count-list").html(
        `<span class="count">${visibleProductCount}</span> Products Found`
      );
      updateLastVisibleItem();
      if (visibleProductCount >= 12) {
        $(".wg-pagination,.tf-loading").show();
      } else {
        $(".wg-pagination,.tf-loading").hide();
      }
      updateCategoryCounts();
      $(document).trigger("shopFiltersApplied");
    }

    function productPassesNonCategoryFilters(product) {
      var priceRange = parsePriceFromHTML(product);
      if (priceRange.max < filters.minPrice || priceRange.min > filters.maxPrice) return false;
      if (filters.size) {
        var $sizeItems = product.find(".size-item");
        if ($sizeItems.length && !product.find(".size-item:contains('" + filters.size + "')").length) return false;
      }
      if (filters.color) {
        var hasColor = product.find(".color-swatch:contains('" + filters.color + "')").length ||
          product.find(".color-filter:contains('" + filters.color + "')").length;
        if (!hasColor) return false;
      }
      if (filters.availability && product.data("availability") !== filters.availability) return false;
      if (filters.sale && !product.find(".on-sale-wrap, .price-text-discount").length) return false;
      if (filters.maxMinOrderQuantity < maxMinOrder && parseMinOrderQuantity(product) > filters.maxMinOrderQuantity) return false;
      if (filters.brands.length > 0) {
        var brandId = product.attr("data-brand");
        if (!filters.brands.some(function (b) { return b.id === brandId; })) return false;
      }
      return true;
    }

    function updateCategoryCounts() {
      var mainCounts = {};
      var ctxCounts = {};
      var subCounts = {};
      Object.keys(MAIN_LABELS).forEach(function (slug) { mainCounts[slug] = 0; });
      Object.keys(CTX_LABELS).forEach(function (slug) { ctxCounts[slug] = 0; });
      var selectedCtxSlugs = filters.contextualCategories.map(function (c) { return c.id; });
      var selectedMainSlugs = filters.categories.map(function (c) { return c.id; });
      var hasContextualFilter = selectedCtxSlugs.length > 0;
      var hasMainFilter = selectedMainSlugs.length > 0;

      getProductsForFilterData().each(function () {
        var product = $(this);
        if (!productPassesNonCategoryFilters(product)) return;
        var mainSlug = (product.attr("data-category") || "").trim();
        var ctxStr = product.attr("data-contextual-categories") || "";
        var productCtxSlugs = ctxStr.trim().split(/\s+/).filter(Boolean);
        var productInSelectedContextual = !hasContextualFilter || productCtxSlugs.some(function (ctx) { return selectedCtxSlugs.indexOf(ctx) !== -1; });
        var productInSelectedMain = !hasMainFilter || (mainSlug && selectedMainSlugs.indexOf(mainSlug) !== -1);

        if (productInSelectedContextual && mainSlug && mainCounts.hasOwnProperty(mainSlug)) mainCounts[mainSlug]++;
        if (productInSelectedMain) {
          productCtxSlugs.forEach(function (ctxSlug) {
            if (ctxCounts.hasOwnProperty(ctxSlug)) ctxCounts[ctxSlug]++;
          });
        }
        if (productInSelectedContextual) {
          var subSlug = product.attr("data-subcategory") || "";
          if (subSlug) subCounts[subSlug] = (subCounts[subSlug] || 0) + 1;
        }
      });

      Object.keys(mainCounts).forEach(function (slug) {
        $(".filter-category-row[data-main-slug='" + slug + "'] .count-category").text("(" + mainCounts[slug] + ")");
      });
      Object.keys(ctxCounts).forEach(function (slug) {
        $(".filter-contextual-row[data-contextual-slug='" + slug + "'] .count-contextual").text("(" + ctxCounts[slug] + ")");
      });
      Object.keys(subCounts).forEach(function (slug) {
        $('input[name="subcategory"][value="' + slug + '"]').each(function () {
          $(this).closest("fieldset").find(".count-subcategory").text("(" + subCounts[slug] + ")");
        });
      });
      $('input[name="subcategory"]').each(function () {
        var slug = $(this).val();
        var n = subCounts[slug] || 0;
        $(this).closest("fieldset").find(".count-subcategory").text("(" + n + ")");
      });
    }

    function updateLastVisibleItem() {
      setTimeout(() => {
        $(".card-product.style-list").removeClass("last");
        const lastVisible = $(".card-product.style-list:visible").last();
        if (lastVisible.length > 0) {
          lastVisible.addClass("last");
        }
      }, 50);
    }

    function applyQueryParamsToFilters() {
      var params = new URLSearchParams(window.location.search);

      $('input[name="category"]').prop("checked", false);
      $('input[name="contextual-category"]').prop("checked", false);
      $('input[name="subcategory"]').prop("checked", false);
      $('input[name="brand"]').prop("checked", false);
      $('input[name="availability"]').prop("checked", false);
      $(".size-check, .color-check").removeClass("active");
      $(".shop-sale-text").removeClass("active");

      filters.minPrice = minPrice;
      filters.maxPrice = maxPrice;
      filters.maxMinOrderQuantity = maxMinOrder;
      filters.size = null;
      filters.color = null;
      filters.availability = null;
      filters.sale = false;
      filters.brands = [];
      if (priceMinInput) priceMinInput.value = "";
      if (priceMaxInput) priceMaxInput.value = "";
      if (minOrderInput) minOrderInput.value = "";

      (params.getAll("category") || []).forEach(function (slug) {
        var $cat = $("#cat-" + escapeForCssId(slug));
        if ($cat.length) $cat.prop("checked", true);
      });
      (params.getAll("contextual") || []).forEach(function (slug) {
        var $ctx = $("#ctx-" + escapeForCssId(slug));
        if ($ctx.length) $ctx.prop("checked", true);
      });
      (params.getAll("subcategory") || []).forEach(function (slug) {
        $('input[name="subcategory"]').filter(function () { return $(this).val() === slug; }).prop("checked", true);
      });

      var mp = params.get("min_price");
      var xp = params.get("max_price");
      if (mp !== null && mp !== "") {
        filters.minPrice = parseFloat(mp) || minPrice;
        if (priceMinInput) priceMinInput.value = String(filters.minPrice);
      }
      if (xp !== null && xp !== "") {
        filters.maxPrice = parseFloat(xp) || maxPrice;
        if (priceMaxInput) priceMaxInput.value = String(filters.maxPrice);
      }

      var mo = params.get("max_min_order");
      if (mo !== null && mo !== "") {
        filters.maxMinOrderQuantity = parseInt(mo, 10) || maxMinOrder;
        if (minOrderInput) minOrderInput.value = String(filters.maxMinOrderQuantity);
      }

      var sz = params.get("size");
      if (sz) {
        filters.size = sz;
        $(".size-check").each(function () {
          if ($(this).text().trim() === sz) $(this).addClass("active");
        });
      }

      var cl = params.get("color");
      if (cl) {
        filters.color = cl;
        $(".color-check").each(function () {
          if ($(this).text().trim() === cl) $(this).addClass("active");
        });
      }

      var av = params.get("availability");
      if (av) {
        if (av === "instock") av = "In stock";
        if (av === "outofstock") av = "Out of stock";
        filters.availability = av;
        if (av === "In stock") $("#inStock").prop("checked", true);
        else if (av === "Out of stock") $("#outStock").prop("checked", true);
      }

      (params.getAll("brand") || []).forEach(function (brandId) {
        var el = document.getElementById(brandId);
        if (el && el.name === "brand") {
          $(el).prop("checked", true);
          var brandLabel = $(el).next("label").text().trim().replace(/\s*\(\d+\)$/, "");
          filters.brands.push({ id: brandId, label: brandLabel });
        }
      });

      if (params.get("sale") === "1" || params.get("sale") === "true") {
        filters.sale = true;
        $(".shop-sale-text").addClass("active");
      }
    }

    setTimeout(function () {
      shopUrlSyncSuppress = true;
      applyQueryParamsToFilters();
      syncCategoryFiltersFromUI();
      updateReactiveVisibility();
      applyFilters();
      updateMetaFilter();
      shopUrlSyncSuppress = false;
      syncUrlFromFilters();
    }, 0);

    window.addEventListener("popstate", function () {
      shopUrlSyncSuppress = true;
      applyQueryParamsToFilters();
      syncCategoryFiltersFromUI();
      updateReactiveVisibility();
      applyFilters();
      updateMetaFilter();
      shopUrlSyncSuppress = false;
    });
  };

  /* Filter Sort
  -------------------------------------------------------------------------------------*/  
  var filterSort = function () {
    let isListActive = $(".sw-layout-list").hasClass("active");
    let originalProductsList = $("#listLayout .card-product").clone();
    let originalProductsGrid = $("#gridLayout .card-product").clone();
    let paginationList = $("#listLayout .wg-pagination").clone();
    let paginationGrid = $("#gridLayout .wg-pagination").clone();

    $(".select-item").on("click", function () {
      const sortValue = $(this).data("sort-value");
      $(".select-item").removeClass("active");
      $(this).addClass("active");
      $(".text-sort-value").text($(this).find(".text-value-item").text());

      applyFilter(sortValue, isListActive);
    });

    $(".tf-view-layout-switch").on("click", function () {
      const layout = $(this).data("value-layout");

      if (layout === "list") {
        isListActive = true;
        $("#gridLayout").hide();
        $("#listLayout").show();
      } else {
        isListActive = false;
        $("#listLayout").hide();
        setGridLayout(layout);
      }
    });

    function applyFilter(sortValue, isListActive) {
      let products;

      if (isListActive) {
        products = $("#listLayout .card-product");
      } else {
        products = $("#gridLayout .card-product");
      }

      if (sortValue === "best-selling") {
        if (isListActive) {
          $("#listLayout").empty().append(originalProductsList.clone());
        } else {
          $("#gridLayout").empty().append(originalProductsGrid.clone());
        }
        bindProductEvents();
        displayPagination(products, isListActive);
        return;
      }

      if (sortValue === "price-low-high") {
        products.sort(
          (a, b) =>
            parseFloat($(a).find(".current-price").text().replace("$", "")) -
            parseFloat($(b).find(".current-price").text().replace("$", ""))
        );
      } else if (sortValue === "price-high-low") {
        products.sort(
          (a, b) =>
            parseFloat($(b).find(".current-price").text().replace("$", "")) -
            parseFloat($(a).find(".current-price").text().replace("$", ""))
        );
      } else if (sortValue === "a-z") {
        products.sort((a, b) =>
          $(a).find(".title").text().localeCompare($(b).find(".title").text())
        );
      } else if (sortValue === "z-a") {
        products.sort((a, b) =>
          $(b).find(".title").text().localeCompare($(a).find(".title").text())
        );
      }

      if (isListActive) {
        $("#listLayout").empty().append(products);
      } else {
        $("#gridLayout").empty().append(products);
      }
      bindProductEvents();
      displayPagination(products, isListActive);
    }

    function displayPagination(products, isListActive) {
      if (products.length >= 12) {
        if (isListActive) {
          $("#listLayout").append(paginationList.clone());
        } else {
          $("#gridLayout").append(paginationGrid.clone());
        }
      }
    }

    function setGridLayout(layoutClass) {
      $("#gridLayout")
        .show()
        .removeClass()
        .addClass(`wrapper-shop tf-grid-layout ${layoutClass}`);
      $(".tf-view-layout-switch").removeClass("active");
      $(`.tf-view-layout-switch[data-value-layout="${layoutClass}"]`).addClass(
        "active"
      );
    }
    function bindProductEvents() {
      if ($(".card-product").length > 0) {
        //$(".color-swatch").on("click, mouseover", function () {//
        $(".color-swatch").on("click", function () {  
          var swatchColor = $(this).find("img").attr("src");
          var imgProduct = $(this)
            .closest(".card-product")
            .find(".img-product");
          imgProduct.attr("src", swatchColor);
          $(this)
            .closest(".card-product")
            .find(".color-swatch.active")
            .removeClass("active");
          $(this).addClass("active");
        });
      }
      $(".size-box").on("click", ".size-item", function () {
        $(this).closest(".size-box").find(".size-item").removeClass("active");
        $(this).addClass("active");
      });
    }
    bindProductEvents();
  };

  /* Switch Layout 
  -------------------------------------------------------------------------------------*/   
  var swLayoutShop = function () {
    let isListActive = $(".sw-layout-list").hasClass("active");
    let userSelectedLayout = null;

    function hasValidLayout() {
      return (
        $("#gridLayout").hasClass("tf-col-1") ||
        $("#gridLayout").hasClass("tf-col-2") ||
        $("#gridLayout").hasClass("tf-col-3") ||
        $("#gridLayout").hasClass("tf-col-4") ||
        $("#gridLayout").hasClass("tf-col-5") ||
        $("#gridLayout").hasClass("tf-col-6") ||
        $("#gridLayout").hasClass("tf-col-7")
      );
    }

    function updateLayoutDisplay() {
      const windowWidth = $(window).width();
      const currentLayout = $("#gridLayout").attr("class");

      if (!hasValidLayout()) {
        console.warn(
          "Page does not contain a valid layout (1-7 columns), skipping layout adjustments."
        );
        return;
      }

      if (isListActive) {
        $("#gridLayout").hide();
        $("#listLayout").show();
        $(".wrapper-control-shop")
          .addClass("listLayout-wrapper")
          .removeClass("gridLayout-wrapper");
        return;
      }

      if (userSelectedLayout) {
        if (windowWidth <= 767) {
          setGridLayout(
            userSelectedLayout === "tf-col-1" ? "tf-col-1" : "tf-col-2"
          );
        } else if (
          userSelectedLayout === "tf-col-1" ||
          userSelectedLayout === "tf-col-2"
        ) {
          setGridLayout(windowWidth <= 1200 ? "tf-col-3" : "tf-col-4");
        } else if (windowWidth <= 1200 && userSelectedLayout !== "tf-col-2") {
          setGridLayout("tf-col-3");
        } else if (
          windowWidth <= 1400 &&
          (userSelectedLayout === "tf-col-5" ||
            userSelectedLayout === "tf-col-6" ||
            userSelectedLayout === "tf-col-7")
        ) {
          setGridLayout("tf-col-4");
        } else {
          setGridLayout(userSelectedLayout);
        }
        return;
      }

      if (
        windowWidth > 767 &&
        (currentLayout.includes("tf-col-1") ||
          currentLayout.includes("tf-col-2"))
      ) {
        setGridLayout(windowWidth <= 1200 ? "tf-col-3" : "tf-col-4");
        return;
      }

      if (windowWidth <= 767) {
        if (
          !currentLayout.includes("tf-col-1") &&
          !currentLayout.includes("tf-col-2")
        ) {
          setGridLayout("tf-col-2");
        }
      } else if (windowWidth <= 1200) {
        if (!currentLayout.includes("tf-col-3")) {
          setGridLayout("tf-col-3");
        }
      } else if (windowWidth <= 1400) {
        if (
          currentLayout.includes("tf-col-5") ||
          currentLayout.includes("tf-col-6") ||
          currentLayout.includes("tf-col-7")
        ) {
          setGridLayout("tf-col-4");
        }
      } else {
        $("#listLayout").hide();
        $("#gridLayout").show();
        $(".wrapper-control-shop")
          .addClass("gridLayout-wrapper")
          .removeClass("listLayout-wrapper");
      }
    }

    function setGridLayout(layoutClass) {
      $("#listLayout").hide();
      $("#gridLayout")
        .show()
        .removeClass()
        .addClass(`wrapper-shop tf-grid-layout ${layoutClass}`);
      $(".tf-view-layout-switch").removeClass("active");
      $(`.tf-view-layout-switch[data-value-layout="${layoutClass}"]`).addClass(
        "active"
      );
      $(".wrapper-control-shop")
        .addClass("gridLayout-wrapper")
        .removeClass("listLayout-wrapper");
      isListActive = false;
    }

    $(document).ready(function () {
      if (isListActive) {
        $("#gridLayout").hide();
        $("#listLayout").show();
        $(".wrapper-control-shop")
          .addClass("listLayout-wrapper")
          .removeClass("gridLayout-wrapper");
      } else {
        $("#listLayout").hide();
        $("#gridLayout").show();
        updateLayoutDisplay();
      }
    });

    $(window).on("resize", updateLayoutDisplay);

    $(".tf-view-layout-switch").on("click", function () {
      const layout = $(this).data("value-layout");
      $(".tf-view-layout-switch").removeClass("active");
      $(this).addClass("active");

      if (layout === "list") {
        isListActive = true;
        userSelectedLayout = null;
        $("#gridLayout").hide();
        $("#listLayout").show();
        $(".wrapper-control-shop")
          .addClass("listLayout-wrapper")
          .removeClass("gridLayout-wrapper");
      } else {
        userSelectedLayout = layout;
        setGridLayout(layout);
      }
    });
  };

  /* Handle Sidebar Filter 
  -------------------------------------------------------------------------------------*/ 
  var handleSidebarFilter = function () {
    $(".filterShop").click(function () {
      if ($(window).width() <= 1200) {
        $(".sidebar-filter,.overlay-filter").addClass("show");
      }
    });
    $(".close-filter ,.overlay-filter").click(function () {
      $(".sidebar-filter,.overlay-filter").removeClass("show");
    });
  };

  /* Handle Dropdown Filter 
  -------------------------------------------------------------------------------------*/   
  var handleDropdownFilter = function () {
    if (".wrapper-filter-dropdown".length > 0) {
      $(".filterDropdown").click(function (event) {
        event.stopPropagation();
        $(".dropdown-filter").toggleClass("show");
        $(this).toggleClass("active");
        var icon = $(this).find(".icon");
        if ($(this).hasClass("active")) {
          icon.removeClass("icon-filter").addClass("icon-close");
        } else {
          icon.removeClass("icon-close").addClass("icon-filter");
        }
        if ($(window).width() <= 1200) {
          $(".overlay-filter").addClass("show");
        }
      });
      $(document).click(function (event) {
        if (!$(event.target).closest(".wrapper-filter-dropdown").length) {
          $(".dropdown-filter").removeClass("show");
          $(".filterDropdown").removeClass("active");
          $(".filterDropdown .icon")
            .removeClass("icon-close")
            .addClass("icon-filter");
        }
      });
      $(".close-filter ,.overlay-filter").click(function () {
        $(".dropdown-filter").removeClass("show");
        $(".filterDropdown").removeClass("active");
        $(".filterDropdown .icon")
          .removeClass("icon-close")
          .addClass("icon-filter");
        $(".overlay-filter").removeClass("show");
      });
    }
  };

  $(function () {
    filterProducts();
    filterSort();
    swLayoutShop();
    handleSidebarFilter();
    handleDropdownFilter();
  });
})(jQuery);
