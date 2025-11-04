
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
      sale: false,
    };

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

    $('input[name="category"]').change(function () {
      const categoryId = $(this).attr("id");
      let categoryLabel = $(this).next("label").text().trim();
      categoryLabel = categoryLabel.replace(/\s*\(\d+\)$/, "");

      if ($(this).is(":checked")) {
        filters.categories.push({ id: categoryId, label: categoryLabel });
      } else {
        filters.categories = filters.categories.filter((category) => category.id !== categoryId);
      }
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

      if (filters.sale) {
        appliedFilters.append(
          `<span class="filter-tag on-sale d-none">On Sale <span class="remove-tag icon-close" data-filter="sale"></span></span>`
        );
      }

      const hasFiltersApplied = appliedFilters.children().length > 0;
      metaFilterShop.toggle(hasFiltersApplied);

      $("#remove-all").toggle(hasFiltersApplied);
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
        $(`input[name="category"][id="${filterValue}"]`).prop("checked", false);
      }
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
      filters.minPrice = minPrice;
      filters.maxPrice = maxPrice;
      filters.maxMinOrderQuantity = maxMinOrder;
      filters.sale = false;

      $(".shop-sale-text").removeClass("active");
      $('input[name="brand"]').prop("checked", false);
      $('input[name="category"]').prop("checked", false);
      $('input[name="availability"]').prop("checked", false);
      $(".size-check, .color-check").removeClass("active");
      if (priceMinInput) priceMinInput.value = "";
      if (priceMaxInput) priceMaxInput.value = "";
      if (minOrderInput) minOrderInput.value = "";

      applyFilters();
      updateMetaFilter();
    });

    function applyFilters() {
      let visibleProductCountGrid = 0;
      let visibleProductCountList = 0;

      $(".wrapper-shop .card-product").each(function () {
        const product = $(this);
        let showProduct = true;

        // Parse the price range using the custom function
        const priceRange = parsePriceFromHTML(product);
        
        // Check if there's overlap between product's price range and filter range
        // Show product if any part of its price range falls within the filter range
        if (priceRange.max < filters.minPrice || priceRange.min > filters.maxPrice) {
          showProduct = false;
        }

        if (
          filters.size &&
          !product.find(`.size-item:contains('${filters.size}')`).length
        ) {
          showProduct = false;
        }

        if (
          filters.color &&
          !product.find(`.color-swatch:contains('${filters.color}')`).length
        ) {
          showProduct = false;
        }

        if (filters.availability) {
          const availabilityStatus = product.data("availability");
          if (filters.availability !== availabilityStatus) {
            showProduct = false;
          }
        }

        if (filters.sale) {
          // Check if product has sale indicator (either on-sale-wrap or price-text-discount)
          if (!product.find(".on-sale-wrap, .price-text-discount").length) {
            showProduct = false;
          }
        }

        // Filter by minimum order quantity
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

        if (filters.categories.length > 0) {
          const categoryId = product.attr("data-category");
          if (!filters.categories.some((category) => category.id === categoryId)) {
            showProduct = false;
          }
        }

        product.toggle(showProduct);

        if (showProduct) {
          if (product.hasClass("grid")) {
            visibleProductCountGrid++;
          } else if (product.hasClass("style-list")) {
            visibleProductCountList++;
          }
        }
      });

      $("#product-count-grid").html(
        `<span class="count">${visibleProductCountGrid}</span> Products Found`
      );
      $("#product-count-list").html(
        `<span class="count">${visibleProductCountList}</span> Products Found`
      );
      updateLastVisibleItem();
      if (visibleProductCountGrid >= 12 || visibleProductCountList >= 12) {
        $(".wg-pagination,.tf-loading").show();
      } else {
        $(".wg-pagination,.tf-loading").hide();
      }
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
        $(".color-swatch").on("click, mouseover", function () {
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
          "Page does not contain a valid layout (2-7 columns), skipping layout adjustments."
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
          setGridLayout("tf-col-2");
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

      if (windowWidth <= 767) {
        if (!currentLayout.includes("tf-col-2")) {
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
