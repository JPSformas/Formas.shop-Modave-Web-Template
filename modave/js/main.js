/**

  * Select Image
  * Button Quantity
  * Delete File  
  * Go Top
  * Variant Picker
  * Color Swatch 
  * Change Value
  * Range Size
  * Sidebar Mobile
  * Tab
  * Check Active 
  * Check Payment Card 
  * Button Loading
  * Infinite Scroll
  * Stagger Wrap
  * Modal Second
  * Header Sticky
  * Auto Popup
  * Toggle Control
  * Write Review
  * Custom Input
  * Choose Option
  * Discount
  * Total Price Variant
  * Scroll Grid Product
  * Scroll Quick View
  * Hover Video
  * Hover Pin
  * Toggle Password
  * Custom Dropdown
  * Load More Search
  * Hover Image Cursor
  * Purchased
  * Handle Progress
  * Height Modal Menu
  * Handle Footer
  * Contact Form
  * Subscribe Mail
  * Preloader
 */

(function ($) {
    "use strict";

    /* Formas checkout cart is owned by js/carrito.js — never handle its UI here. */
    var isFormasCarrito = function (el) {
        return (
            $(el).closest(
                "[data-cart-tbody], .tf-cart-item[data-cart-id], .size-breakdown-sidebar, .carrito-undo-toast, #shoppingCart.minicart-formas"
            ).length > 0
        );
    };

    /* Select Image
  -------------------------------------------------------------------------------------*/
    var selectImages = function () {
        if ($(".image-select").length > 0) {
            const selectIMG = $(".image-select");

            selectIMG.find("option").each((idx, elem) => {
                const selectOption = $(elem);
                const imgURL = selectOption.attr("data-thumbnail");
                if (imgURL) {
                    selectOption.attr(
                        "data-content",
                        `<img src="${imgURL}" /> ${selectOption.text()}`
                    );
                }
            });
            selectIMG.selectpicker();
        }
    };

    /* Button Quantity
  -------------------------------------------------------------------------------------*/
    var btnQuantity = function () {
        $(".minus-btn").on("click", function (e) {
            e.preventDefault();
            var $this = $(this);
            var $input = $this.closest("div").find("input");
            var value = parseInt($input.val());

            if (value > 1) {
                value = value - 1;
            }
            $input.val(value);
        });

        $(".plus-btn").on("click", function (e) {
            e.preventDefault();
            var $this = $(this);
            var $input = $this.closest("div").find("input");
            var value = parseInt($input.val());

            if (value > -1) {
                value = value + 1;
            }
            $input.val(value);
        });
    };

    /* Delete File 
  -------------------------------------------------------------------------------------*/
    var deleteFile = function () {
        // Delegated so theme mini-cart/compare still work; Formas cart skips to carrito.js
        $(document).on("click", ".remove", function (e) {
            if (isFormasCarrito(this)) return;
            e.preventDefault();
            $(this).closest(".file-delete").remove();
        });
        $(document).on("click", ".clear-file-delete", function (e) {
            if (isFormasCarrito(this)) return;
            e.preventDefault();
            $(this).closest(".list-file-delete").find(".file-delete").remove();
        });
    };

    /* Go Top
  -------------------------------------------------------------------------------------*/
    var goTop = function () {
        let scrollTopButton = $("#scroll-top");
        let filterBubble = $(".floating-filter-bubble");
        let isButtonVisible = false;

        function checkScroll() {
            let scrollTop = $(window).scrollTop();

            if (scrollTop > 500 && !isButtonVisible) {
                scrollTopButton.addClass("show");
                filterBubble.addClass("show");
                isButtonVisible = true;
            } else if (scrollTop <= 500 && isButtonVisible) {
                scrollTopButton.removeClass("show");
                filterBubble.removeClass("show");
                isButtonVisible = false;
            }
        }

        function onScroll() {
            requestAnimationFrame(checkScroll);
        }

        $(window).on("scroll", onScroll);

        scrollTopButton.on("click", function (e) {
            e.preventDefault();
            $("html, body").scrollTop(0);
        });
    };

    /* Variant Picker
  -------------------------------------------------------------------------*/
    var variantPicker = function () {
        if ($(".variant-picker-item").length) {
            $(".variant-picker-item label").on("click", function (e) {
                $(this)
                    .closest(".variant-picker-item")
                    .find(".variant-picker-label-value")
                    .text($(this).data("value"));
            });
        }
        if ($(".variant-picker-item").length) {
            $(".select-size").on("click", function (e) {
                $(this)
                    .closest(".variant-picker-item")
                    .find(".variant-picker-label-value")
                    .text($(this).data("value"));
            });
        }
    };

    /* Color Swatch 
  -------------------------------------------------------------------------*/
    var swatchColor = function () {
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
    };

    /* Change Value
  ------------------------------------------------------------------------------------- */
    var changeValue = function () {
        if ($(".tf-dropdown-sort").length > 0) {
            $(".select-item").click(function (event) {
                $(this)
                    .closest(".tf-dropdown-sort")
                    .find(".text-sort-value")
                    .text($(this).find(".text-value-item").text());

                $(this)
                    .closest(".dropdown-menu")
                    .find(".select-item.active")
                    .removeClass("active");

                $(this).addClass("active");

                var color = $(this).data("value-color");
                $(this)
                    .closest(".tf-dropdown-sort")
                    .find(".btn-select")
                    .find(".current-color")
                    .css("background", color);
            });
        }
    };

    /* Range Size
  -------------------------------------------------------------------------*/
    var rangeSize = function () {
        $(".widget-size").each(function () {
            var $rangeInput = $(this).find(".range-input input");
            var $progress = $(this).find(".progress-size");
            var $maxPrice = $(this).find(".max-size");

            $rangeInput.on("input", function () {
                var maxValue = parseInt($rangeInput.val(), 10);

                var percentMax = (maxValue / $rangeInput.attr("max")) * 100;
                $progress.css("width", percentMax + "%");

                $maxPrice.html(maxValue);
            });
        });
    };

    /* Sidebar Mobile
  -------------------------------------------------------------------------*/
    var sidebarMobile = function () {
        if ($(".wrap-sidebar-account").length > 0) {
            var sidebar = $(".wrap-sidebar-account").html();
            $(".sidebar-mobile-append").append(sidebar);
        }
    };

    /* Tab
  -------------------------------------------------------------------------*/
    var tabs = function () {
        $(".widget-tabs").each(function () {
            $(this)
                .find(".widget-menu-tab")
                .children(".item-title")
                .on("click", function () {
                    var liActive = $(this).index();
                    var contentActive = $(this)
                        .siblings()
                        .removeClass("active")
                        .parents(".widget-tabs")
                        .find(".widget-content-tab")
                        .children()
                        .eq(liActive);
                    contentActive.addClass("active").fadeIn("slow");
                    contentActive.siblings().removeClass("active");
                    $(this)
                        .addClass("active")
                        .parents(".widget-tabs")
                        .find(".widget-content-tab")
                        .children()
                        .eq(liActive);
                });
        });
    };

    /* Check Active 
  -------------------------------------------------------------------------*/
    var checkClick = function () {
        $(".size-box,.facet-color-box").on(
            "click",
            ".size-item,.color-item",
            function () {
                $(this)
                    .closest(".size-box,.facet-color-box")
                    .find(".size-item,.color-item")
                    .removeClass("active");
                $(this).addClass("active");
            }
        );
    };

    /* Check Payment Card 
  -------------------------------------------------------------------------*/
    var checkPaymentCard = function () {
        $(".payment-box").on(
            "click",
            ".payment-choose-card .payment-header",
            function (event) {
                var paymentItem = $(this).closest(".payment-choose-card");
                $(".payment-box .payment-choose-card")
                    .not(paymentItem)
                    .removeClass("active");
                paymentItem.toggleClass("active");
            }
        );
        $(".payment-box").on("show.bs.collapse", function (e) {
            $(e.target).closest(".payment-choose-card").addClass("active");
        });

        $(".payment-box").on("hide.bs.collapse", function (e) {
            $(e.target).closest(".payment-choose-card").removeClass("active");
        });
    };

    /* Button Loading
  -------------------------------------------------------------------------*/
    var btnLoading = function () {
        if ($(".tf-loading").length) {
            $(".tf-loading").on("click", function (e) {
                $(this).addClass("loading");
                var $this = $(this);
                setTimeout(function () {
                    $this.removeClass("loading");
                }, 600);
            });
        }
    };

    /* Infinite Scroll
  -------------------------------------------------------------------------*/
    var loadItem = function () {
        const gridInitialItems = 10;
        const listInitialItems = 10;
        const gridItemsPerPage = 10;
        const listItemsPerPage = 5;

        let listItemsDisplayed = listInitialItems;
        let gridItemsDisplayed = gridInitialItems;
        let scrollTimeout;

        /** Hide items by position among *filter-visible* items so infinite scroll works with filters. */
        function hideExtraItems(layout, itemsDisplayed) {
            var $layout = layout;
            $layout.find(".loadItem").removeClass("hidden");
            var visibleItems = $layout.find(".loadItem").filter(function () {
                return $(this).css("display") !== "none";
            });
            visibleItems.each(function (index) {
                if (index >= itemsDisplayed) {
                    $(this).addClass("hidden");
                }
            });
            if ($layout.is("#listLayout")) updateLastVisible($layout);
        }

        function showMoreItems(layout, itemsPerPage, itemsDisplayed) {
            const hiddenItems = layout.find(".loadItem.hidden");

            setTimeout(function () {
                hiddenItems.slice(0, itemsPerPage).removeClass("hidden");
                if (layout.is("#listLayout")) updateLastVisible(layout);
                checkLoadMoreButton(layout);
            }, 600);

            return itemsDisplayed + itemsPerPage;
        }

        function updateLastVisible(layout) {
            layout.find(".loadItem").removeClass("last-visible");
            layout
                .find(".loadItem")
                .not(".hidden")
                .last()
                .addClass("last-visible");
        }
        function checkLoadMoreButton(layout) {
            var hasHidden = layout.find(".loadItem.hidden").length > 0;
            if (layout.is("#listLayout")) {
                if (hasHidden) {
                    $("#loadMoreListBtn").show();
                    $("#infiniteScrollList").show();
                } else {
                    $("#loadMoreListBtn").hide();
                    $("#infiniteScrollList").hide();
                }
            } else if (layout.is("#gridLayout")) {
                if (hasHidden) {
                    $("#loadMoreGridBtn").show();
                    $("#infiniteScrollGrid").show();
                } else {
                    $("#loadMoreGridBtn").hide();
                    $("#infiniteScrollGrid").hide();
                }
            }
        }

        hideExtraItems($("#listLayout"), listItemsDisplayed);
        hideExtraItems($("#gridLayout"), gridItemsDisplayed);

        $("#loadMoreListBtn").on("click", function () {
            listItemsDisplayed = showMoreItems(
                $("#listLayout"),
                listItemsPerPage,
                listItemsDisplayed
            );
        });

        $("#loadMoreGridBtn").on("click", function () {
            gridItemsDisplayed = showMoreItems(
                $("#gridLayout"),
                gridItemsPerPage,
                gridItemsDisplayed
            );
        });

        // Infinite Scrolling
        function onScroll() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function () {
                const infiniteScrollList = $("#infiniteScrollList");
                const infiniteScrollGrid = $("#infiniteScrollGrid");

                if (
                    infiniteScrollList.is(":visible") &&
                    isElementInViewport(infiniteScrollList)
                ) {
                    listItemsDisplayed = showMoreItems(
                        $("#listLayout"),
                        listItemsPerPage,
                        listItemsDisplayed
                    );
                }

                if (
                    infiniteScrollGrid.is(":visible") &&
                    isElementInViewport(infiniteScrollGrid)
                ) {
                    gridItemsDisplayed = showMoreItems(
                        $("#gridLayout"),
                        gridItemsPerPage,
                        gridItemsDisplayed
                    );
                }
            }, 300);
        }
        function isElementInViewport(el) {
            const rect = el[0].getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <=
                    (window.innerHeight ||
                        document.documentElement.clientHeight) &&
                rect.right <=
                    (window.innerWidth || document.documentElement.clientWidth)
            );
        }
        $(window).on("scroll", onScroll);

        // Re-apply pagination when shop filters change so infinite scroll works on filtered results
        $(document).on("shopFiltersApplied", function () {
            listItemsDisplayed = listInitialItems;
            gridItemsDisplayed = gridInitialItems;
            hideExtraItems($("#listLayout"), listItemsDisplayed);
            hideExtraItems($("#gridLayout"), gridItemsDisplayed);
            checkLoadMoreButton($("#listLayout"));
            checkLoadMoreButton($("#gridLayout"));
            if ($("#listLayout").length) updateLastVisible($("#listLayout"));
            if ($("#gridLayout").length) updateLastVisible($("#gridLayout"));
        });
    };

    /* Stagger Wrap
  -------------------------------------------------------------------------*/
    var staggerWrap = function () {
        if ($(".stagger-wrap").length) {
            var count = $(".stagger-item").length;
            // Reduced delay from 0.2s to 0.05s for faster animation
            for (var i = 1, time = 0.05; i <= count; i++) {
                $(".stagger-item:nth-child(" + i + ")")
                    .css("transition-delay", time * i + "s")
                    .addClass("stagger-finished");
            }
        }
    };

    /* Modal Second
  -------------------------------------------------------------------------*/
    var clickModalSecond = function () {
        $(".btn-add-to-cart").click(function () {
            $(".tf-add-cart-success").addClass("active");
        });
        $(".tf-add-cart-success .tf-add-cart-close").click(function () {
            $(".tf-add-cart-success").removeClass("active");
        });
        $(".show-size-guide").click(function () {
            $("#size-guide").modal("show");
        });
        $(".show-shopping-cart").click(function () {
            $("#shoppingCart").modal("show");
        });
        $(".btn-icon-action.wishlist").click(function () {
            $("#wishlist").modal("show");
        });

        $(".btn-add-note").click(function () {
            $(".add-note").addClass("open");
        });
        $(".btn-add-coupon").click(function () {
            $(".add-coupon").addClass("open");
        });
        $(".btn-estimate-shipping").click(function () {
            $(".estimate-shipping").addClass("open");
        });
        $(".btn-add-gift").click(function () {
            $(".add-gift").addClass("open");
        });
        $(".tf-mini-cart-tool-close").click(function () {
            $(".tf-mini-cart-tool-openable").removeClass("open");
        });
    };

    /* Setup cost per unit message
  -------------------------------------------------------------------------*/
    var formatArsAmount = function (amount) {
        return Number(amount).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    var updateSetupCostMessage = function () {
        var $boxes = $(".setup-cost-message");
        if (!$boxes.length) return;

        var noPersonalization = $(".personalization-tab.active").first().data("tab") === "sin-personalizacion";
        if (noPersonalization) {
            $boxes.addClass("d-none");
            return;
        }
        $boxes.removeClass("d-none");

        var $quantitySection = $(".tf-product-info-list .tf-product-info-quantity").first();
        if (!$quantitySection.length) {
            $quantitySection = $(".tf-product-info-quantity").first();
        }

        var minOrder = parseInt($quantitySection.data("min-order"), 10) || 1;
        var setupPrice = parseFloat($quantitySection.data("setup-price"));
        if (isNaN(setupPrice) || setupPrice < 0) setupPrice = 100000;

        var qty = parseInt($quantitySection.find(".quantity-product").val(), 10);
        if (!qty || qty < minOrder) qty = minOrder;

        var perUnit = qty > 0 ? setupPrice / qty : setupPrice;
        var html =
            '<div class="message-icon"><i class="fa-solid fa-print"></i></div>' +
            '<div class="message-content">' +
                '<div class="message-text">Costo de aplicación <strong>' + qty + ' unidades</strong>: <strong>$' + formatArsAmount(perUnit) + ' + IVA</strong> por unidad.</div>' +
                '<div class="message-subtext">Incluye 1 logo de hasta 2 colores en tampografía o serigrafía, un logo en DTF o 1 grabado láser</div>' +
            '</div>';

        $boxes.html(html);
    };

    /* Personalization Tabs
  -------------------------------------------------------------------------*/
    var personalizationTabs = function () {
        // Personalization type tabs
        $(".personalization-tab").on("click", function () {
            var $tab = $(this);
            var tabId = $tab.data("tab");
            
            // Remove active class from all tabs and content
            $(".personalization-tab").removeClass("active");
            $(".personalization-tab-content").removeClass("active");
            
            // Add active class to clicked tab and corresponding content
            $tab.addClass("active");
            $("#" + tabId).addClass("active");
            updateSetupCostMessage();
        });

        // Print method tabs
        $(".print-method-tab").on("click", function () {
            var $tab = $(this);
            
            // Remove active class from all print method tabs
            $(".print-method-tab").removeClass("active");
            
            // Add active class to clicked tab
            $tab.addClass("active");
        });

        // Initialize file storage for each upload input
        $(".tf-product-personalization .tf-product-image-upload input[type='file']").each(function() {
            if (!$(this).data('files-storage')) {
                $(this).data('files-storage', []);
            }
        });

        // File upload handler with validation
        $(document).on("change", ".tf-product-personalization .tf-product-image-upload input[type='file']", function () {
            var $input = $(this);
            var files = this.files;
            var $attachedFiles = $input.closest(".personalization-tab-content").find(".attached-files");
            var storedFiles = $input.data('files-storage') || [];
            
            // Valid file extensions
            var validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.ai', '.eps'];
            var maxFileSize = 10 * 1024 * 1024; // 10MB
            
            if (files.length > 0) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var fileName = file.name;
                    var fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
                    var fileSize = file.size;
                    
                    // Check if file already exists
                    var fileExists = storedFiles.some(function(f) {
                        return f.name === fileName && f.size === fileSize && f.lastModified === file.lastModified;
                    });
                    
                    if (fileExists) {
                        continue; // Skip duplicate files
                    }
                    
                    // Validate file extension
                    if (validExtensions.indexOf(fileExtension) === -1) {
                        alert('El archivo "' + fileName + '" no tiene un formato válido. Formatos aceptados: JPG, PNG, PDF, AI, EPS');
                        continue;
                    }
                    
                    // Validate file size
                    if (fileSize > maxFileSize) {
                        alert('El archivo "' + fileName + '" es demasiado grande. Tamaño máximo: 10MB');
                        continue;
                    }
                    
                    // Store file data
                    var fileData = {
                        file: file,
                        name: fileName,
                        size: fileSize,
                        lastModified: file.lastModified,
                        id: Date.now() + '_' + i // Unique ID for tracking
                    };
                    storedFiles.push(fileData);
                    
                    // Format file size for display
                    var fileSizeFormatted = formatFileSize(fileSize);
                    
                    // Create file item with unique ID
                    var fileItem = $('<div class="attached-file-item d-flex align-items-center justify-content-between mb_4" data-file-id="' + fileData.id + '">' +
                        '<span class="text-caption-1">' + fileName + ' <span class="text-secondary-2">(' + fileSizeFormatted + ')</span></span>' +
                        '<button type="button" class="btn-remove-file" title="Eliminar archivo"><i class="fa-regular fa-trash-can"></i></button>' +
                        '</div>');
                    
                    $attachedFiles.append(fileItem);
                }
                
                // Update stored files
                $input.data('files-storage', storedFiles);
                
                // Update the input with stored files using DataTransfer
                updateFileInput($input, storedFiles);
                
                // Reset input to allow selecting the same file again
                $input.val('');
            }
        });

        // File removal handler (using event delegation)
        $(document).on("click", ".btn-remove-file", function (e) {
            var $fileItem = $(this).closest(".attached-file-item");
            if (!$fileItem.length) return;

            e.preventDefault();
            e.stopPropagation();
            
            var fileId = $fileItem.data('file-id');
            var $input = $fileItem.closest(".personalization-tab-content").find(".tf-product-image-upload input[type='file']");
            var storedFiles = $input.data('files-storage') || [];
            
            // Remove file from storage
            var updatedFiles = storedFiles.filter(function(f) {
                return f.id !== fileId;
            });
            
            // Update stored files
            $input.data('files-storage', updatedFiles);
            
            // Update the input
            updateFileInput($input, updatedFiles);
            
            // Remove from DOM with animation
            $fileItem.fadeOut(300, function () {
                $(this).remove();
            });
        });

        // Function to update file input with stored files
        function updateFileInput($input, files) {
            if (files.length === 0) {
                $input.val('');
                return;
            }
            
            // Create a new DataTransfer object
            var dataTransfer = new DataTransfer();
            
            // Add all stored files to DataTransfer
            files.forEach(function(fileData) {
                dataTransfer.items.add(fileData.file);
            });
            
            // Update the input's files
            $input[0].files = dataTransfer.files;
        }

        // Helper function to format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            var k = 1024;
            var sizes = ['Bytes', 'KB', 'MB', 'GB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
    };

    /* Quantity with Bonified Logo Message
  -------------------------------------------------------------------------*/
    var quantityBonifiedLogo = function () {
        var $quantitySection = $(".tf-product-info-quantity");
        
        if ($quantitySection.length === 0) return;
        
        var minOrder = parseInt($quantitySection.data("min-order")) || 1;
        var minBonified = parseInt($quantitySection.data("min-bonified")) || 100;
        var logoPricePerUnit = parseFloat($quantitySection.data("logo-price-per-unit")) || 0;
        
        var $quantityInput = $quantitySection.find(".quantity-product");
        var $quantityDisplay = $quantitySection.find(".quantity-display");
        var $minOrderDisplay = $quantitySection.find(".min-order-display");
        var $bonifiedMessage = $quantitySection.closest(".tf-product-info-list").find("#bonified-logo-message").first();
        if ($bonifiedMessage.length === 0) {
            $bonifiedMessage = $("#bonified-logo-message").first();
        }
        var $btnDecrease = $quantitySection.find(".btn-decrease");
        var $btnIncrease = $quantitySection.find(".btn-increase");
        
        // Initialize global flag to prevent circular updates when updating from sizes
        if (typeof window.isUpdatingFromSizes === 'undefined') {
            window.isUpdatingFromSizes = false;
        }
        
        // Ensure input is editable
        $quantityInput.prop('readonly', false);
        $quantityInput.prop('disabled', false);
        
        // Initialize
        updateQuantityDisplay();
        updateBonifiedMessage();
        updateSetupCostMessage();
        
        // Update min order display
        $minOrderDisplay.text(minOrder);
        
        // Initialize size distribution
        distributeQuantityToSizes();
        
        // Remove any existing handlers to prevent double-firing
        $btnIncrease.off("click.quantityBonified");
        $btnDecrease.off("click.quantityBonified");
        
        // Quantity increase/decrease handlers with namespaced events
        $btnIncrease.on("click.quantityBonified", function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            var currentValue = parseInt($quantityInput.val()) || minOrder;
            $quantityInput.val(currentValue + 1);
            updateQuantityDisplay();
            updateBonifiedMessage();
            updateSetupCostMessage();
            distributeQuantityToSizes();
        });
        
        $btnDecrease.on("click.quantityBonified", function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            var currentValue = parseInt($quantityInput.val()) || minOrder;
            if (currentValue > minOrder) {
                $quantityInput.val(currentValue - 1);
                updateQuantityDisplay();
                updateBonifiedMessage();
                updateSetupCostMessage();
                distributeQuantityToSizes();
            }
        });
        
        // Direct input handler - allow typing and erasing
        $quantityInput.on("keydown", function (e) {
            // Allow: backspace, delete, tab, escape, enter, home, end, and arrow keys
            if ([46, 8, 9, 27, 13, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
                (e.ctrlKey === true && [65, 67, 86, 88, 90].indexOf(e.keyCode) !== -1) ||
                // Allow Meta key combinations (Mac)
                (e.metaKey === true && [65, 67, 86, 88, 90].indexOf(e.keyCode) !== -1)) {
                return;
            }
            // Allow numbers: 0-9 on main keyboard and numpad
            if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105)) {
                return;
            }
            // Block everything else
            e.preventDefault();
        });
        
        // Handle paste - clean non-numeric characters
        $quantityInput.on("paste", function (e) {
            var $input = $(this);
            setTimeout(function() {
                var originalValue = $input.val();
                var numericValue = originalValue.replace(/[^0-9]/g, '');
                if (numericValue !== originalValue) {
                    $input.val(numericValue);
                }
            }, 10);
        });
        
        // Real-time update while typing (with debounce) - allow empty input while typing
        var typingTimeout;
        $quantityInput.on("input", function () {
            clearTimeout(typingTimeout);
            var $input = $(this);
            var inputValue = $input.val().trim();
            
            // Remove non-numeric characters
            var numericValue = inputValue.replace(/[^0-9]/g, '');
            if (numericValue !== inputValue) {
                $input.val(numericValue);
                inputValue = numericValue;
            }
            
            // Update display only if there's a valid number >= minimum
            if (inputValue !== '' && !isNaN(inputValue)) {
                var value = parseInt(inputValue);
                if (value >= minOrder) {
                    typingTimeout = setTimeout(function() {
                        updateQuantityDisplay();
                        updateBonifiedMessage();
                        updateSetupCostMessage();
                        distributeQuantityToSizes();
                    }, 300);
                }
            }
        });
        
        // Validate and enforce minimum on blur or Enter key
        function validateAndSetMinimum() {
            var inputValue = $quantityInput.val().trim();
            var value;
            
            // If empty or invalid, set to minimum
            if (inputValue === '' || isNaN(inputValue)) {
                value = minOrder;
            } else {
                value = parseInt(inputValue);
                // If below minimum, set to minimum
                if (value < minOrder) {
                    value = minOrder;
                }
            }
            
            // Update input value
            $quantityInput.val(value);
            updateQuantityDisplay();
            updateBonifiedMessage();
            updateSetupCostMessage();
            // Distribute to sizes after validation
            distributeQuantityToSizes();
        }
        
        $quantityInput.on("blur", function () {
            validateAndSetMinimum();
        });
        
        // Handle Enter key to confirm input
        $quantityInput.on("keypress", function (e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                validateAndSetMinimum();
                $(this).blur();
            }
        });
        
        function updateQuantityDisplay() {
            var currentQuantity = parseInt($quantityInput.val()) || minOrder;
            $quantityDisplay.text(currentQuantity);
            
            // Disable decrease button if at minimum
            if (currentQuantity <= minOrder) {
                $btnDecrease.prop('disabled', true);
            } else {
                $btnDecrease.prop('disabled', false);
            }
        }
        
        function updateBonifiedMessage() {
            var currentQuantity = parseInt($quantityInput.val()) || minOrder;
            var $message = $bonifiedMessage;
            
            if (currentQuantity >= minBonified) {
                // Bonified minimum reached - show success message
                $message.removeClass("not-reached").addClass("reached");
                $message.html(
                    '<div class="message-icon"><i class="fa-solid fa-gift"></i></div>' +
                    '<div class="message-content">' +
                        '<div class="message-text">Tenés el <strong>logo gratis</strong>!</div>' +
                    '</div>' +
                    '<div class="info-icon"><i class="fa-solid fa-circle-question"></i></div>'
                );
            } else {
                // Bonified minimum not reached - show encouragement message
                var unitsNeeded = minBonified - currentQuantity;
                var logoPriceFormatted = logoPricePerUnit.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                $message.removeClass("reached").addClass("not-reached");
                $message.html(
                    '<div class="message-content">' +
                        '<div class="message-text">Sumá <strong>' + unitsNeeded + ' u. más</strong> y llevate el <strong>logo gratis</strong> <i class="fa-solid fa-circle-question"></i></div>' +
                        '<div class="message-subtext">Llevando la cantidad actual, aplicar el logo tiene un valor de <strong>$' + logoPriceFormatted + ' +iva</strong> por unidad</div>' +
                    '</div>'
                    
                );
            }
        }
        
        // Distribute quantity equally across all sizes
        function distributeQuantityToSizes() {
            // Don't distribute if update is coming from size changes
            if (window.isUpdatingFromSizes) return;
            
            var totalQuantity = parseInt($quantityInput.val()) || minOrder;
            var $sizeInputs = $(".size-quantity-input");
            
            if ($sizeInputs.length === 0) return;
            
            // Calculate quantity per size (equal distribution)
            var quantityPerSize = Math.floor(totalQuantity / $sizeInputs.length);
            var remainder = totalQuantity % $sizeInputs.length;
            
            // Distribute quantity respecting stock limits
            var distributedTotal = 0;
            var $sizeCards = $(".size-card");
            
            $sizeCards.each(function(index) {
                var $card = $(this);
                var $input = $card.find(".size-quantity-input");
                var stock = parseInt($card.data("stock")) || 0;
                
                // Calculate quantity for this size
                var sizeQuantity = quantityPerSize;
                // Add remainder to first sizes
                if (index < remainder) {
                    sizeQuantity += 1;
                }
                
                // Respect stock limit
                if (sizeQuantity > stock) {
                    sizeQuantity = stock;
                }
                
                // Update input value
                $input.val(sizeQuantity);
                distributedTotal += sizeQuantity;
            });
            
            // If total distributed is less than requested (due to stock limits),
            // distribute remaining quantity to sizes with available stock
            if (distributedTotal < totalQuantity) {
                var remaining = totalQuantity - distributedTotal;
                distributeRemainingQuantity(remaining);
            }
        }
        
        // Distribute remaining quantity to sizes with available stock
        function distributeRemainingQuantity(remaining) {
            var $sizeCards = $(".size-card");
            var attempts = 0;
            var maxAttempts = $sizeCards.length * 2;
            
            while (remaining > 0 && attempts < maxAttempts) {
                $sizeCards.each(function() {
                    if (remaining <= 0) return false;
                    
                    var $card = $(this);
                    var $input = $card.find(".size-quantity-input");
                    var stock = parseInt($card.data("stock")) || 0;
                    var currentValue = parseInt($input.val()) || 0;
                    
                    if (currentValue < stock) {
                        var available = stock - currentValue;
                        var toAdd = Math.min(remaining, available);
                        $input.val(currentValue + toAdd);
                        remaining -= toAdd;
                    }
                });
                attempts++;
            }
        }
        
    };

    /* Size Quantity Inputs with Stock Restrictions
  -------------------------------------------------------------------------*/
    var sizeQuantityInputs = function () {
        var $sizeInputs = $(".size-quantity-input");
        
        if ($sizeInputs.length === 0) return;
        
        // Handle keydown - only allow numbers
        $sizeInputs.on("keydown", function (e) {
            var $input = $(this);
            // Allow: backspace, delete, tab, escape, enter, home, end, and arrow keys
            if ([46, 8, 9, 27, 13, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
                (e.ctrlKey === true && [65, 67, 86, 88, 90].indexOf(e.keyCode) !== -1) ||
                // Allow Meta key combinations (Mac)
                (e.metaKey === true && [65, 67, 86, 88, 90].indexOf(e.keyCode) !== -1)) {
                return;
            }
            // Allow numbers: 0-9 on main keyboard and numpad
            if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105)) {
                return;
            }
            // Block everything else
            e.preventDefault();
        });
        
        // Handle paste - clean non-numeric characters
        $sizeInputs.on("paste", function (e) {
            var $input = $(this);
            setTimeout(function() {
                var originalValue = $input.val();
                var numericValue = originalValue.replace(/[^0-9]/g, '');
                if (numericValue !== originalValue) {
                    $input.val(numericValue);
                }
                validateSizeInput($input);
            }, 10);
        });
        
        // Real-time update while typing in size inputs
        var sizeTypingTimeout;
        $sizeInputs.on("input", function () {
            var $input = $(this);
            var originalValue = $input.val();
            var numericValue = originalValue.replace(/[^0-9]/g, '');
            
            if (numericValue !== originalValue) {
                $input.val(numericValue);
            }
            
            // Remove error class while typing
            $input.removeClass("error");
            
            // Update main quantity with debounce
            clearTimeout(sizeTypingTimeout);
            sizeTypingTimeout = setTimeout(function() {
                updateMainQuantityFromSizes();
            }, 300);
        });
        
        // Validate on blur or Enter
        function validateSizeInput($input) {
            var $sizeCard = $input.closest(".size-card");
            var stock = parseInt($sizeCard.data("stock")) || 0;
            var inputValue = $input.val().trim();
            var value;
            
            // If empty, set to 0
            if (inputValue === '' || isNaN(inputValue)) {
                value = 0;
            } else {
                value = parseInt(inputValue);
            }
            
            // Check if exceeds stock
            if (value > stock) {
                value = stock;
                $input.addClass("error");
            } else {
                $input.removeClass("error");
            }
            
            // Update input value
            $input.val(value);
            
            // Update main quantity field based on sum of all sizes
            updateMainQuantityFromSizes();
        }
        
        // Calculate sum of all size quantities and update main quantity field
        function updateMainQuantityFromSizes() {
            var $quantitySection = $(".tf-product-info-quantity");
            if ($quantitySection.length === 0) return;
            
            var $quantityInput = $quantitySection.find(".quantity-product");
            var $quantityDisplay = $quantitySection.find(".quantity-display");
            var $minOrderDisplay = $quantitySection.find(".min-order-display");
            var $bonifiedMessage = $quantitySection.closest(".tf-product-info-list").find("#bonified-logo-message").first();
            if ($bonifiedMessage.length === 0) {
                $bonifiedMessage = $("#bonified-logo-message").first();
            }
            var $btnDecrease = $quantitySection.find(".btn-decrease");
            var minOrder = parseInt($quantitySection.data("min-order")) || 1;
            var minBonified = parseInt($quantitySection.data("min-bonified")) || 100;
            var logoPricePerUnit = parseFloat($quantitySection.data("logo-price-per-unit")) || 0;
            
            // Calculate total from all size inputs
            var total = 0;
            $(".size-quantity-input").each(function() {
                var value = parseInt($(this).val()) || 0;
                total += value;
            });
            
            // Ensure minimum order quantity
            if (total < minOrder) {
                total = minOrder;
            }
            
            // Set flag to prevent circular update
            if (typeof window.isUpdatingFromSizes === 'undefined') {
                window.isUpdatingFromSizes = false;
            }
            window.isUpdatingFromSizes = true;
            
            // Update main quantity input
            $quantityInput.val(total);
            
            // Update display
            $quantityDisplay.text(total);
            
            // Update decrease button state
            if (total <= minOrder) {
                $btnDecrease.prop('disabled', true);
            } else {
                $btnDecrease.prop('disabled', false);
            }
            
            // Update bonified message
            if (total >= minBonified) {
                $bonifiedMessage.removeClass("not-reached").addClass("reached");
                $bonifiedMessage.html(
                    '<div class="message-icon"><i class="fa-solid fa-gift"></i></div>' +
                    '<div class="message-content">' +
                        '<div class="message-text">Tenés el <strong>logo gratis</strong>!</div>' +
                    '</div>' +
                    '<div class="info-icon"><i class="fa-solid fa-circle-question"></i></div>'
                );
            } else {
                var unitsNeeded = minBonified - total;
                var logoPriceFormatted = logoPricePerUnit.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                $bonifiedMessage.removeClass("reached").addClass("not-reached");
                $bonifiedMessage.html(
                    '<div class="message-icon"><i class="fa-solid fa-circle-info"></i></div>' +
                    '<div class="message-content">' +
                        '<div class="message-text">Sumá <strong>' + unitsNeeded + ' u. más</strong> y llevate el <strong>logo gratis</strong> <i class="fa-solid fa-circle-question"></i></div>' +
                        '<div class="message-subtext">Llevando la cantidad actual, aplicar el logo tiene un valor de <strong>$' + logoPriceFormatted + ' +iva</strong> por unidad</div>' +
                    '</div>' +
                    '<div class="info-icon"><i class="fa-solid fa-circle-question"></i></div>'
                );
            }
            
            updateSetupCostMessage();
            
            // Reset flag after a short delay
            setTimeout(function() {
                window.isUpdatingFromSizes = false;
            }, 100);
        }
        
        $sizeInputs.on("blur", function () {
            validateSizeInput($(this));
        });
        
        $sizeInputs.on("keypress", function (e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                validateSizeInput($(this));
                $(this).blur();
            }
        });
    };

    /* Header Sticky
  -------------------------------------------------------------------------*/
    var headerSticky = function () {
        let lastScrollTop = 0;
        let delta = 5;
        let navbarHeight = $("header").outerHeight();
        let didScroll = false;

        $(window).scroll(function () {
            didScroll = true;
        });

        setInterval(function () {
            if (didScroll) {
                let st = $(window).scrollTop();
                navbarHeight = $("header").outerHeight();

                if (st > navbarHeight) {
                    if (st > lastScrollTop + delta) {
                        $("header").css("top", `-${navbarHeight}px`);
                    } else if (st < lastScrollTop - delta) {
                        $("header").css("top", "0");
                        $("header").addClass("header-bg");
                    }
                } else {
                    $("header").css("top", "unset");
                    $("header").removeClass("header-bg");
                }
                lastScrollTop = st;
                didScroll = false;
            }
        }, 250);
    };

    /* Header Full Bar (Pill to Bar Transformation - Sticky)
  -------------------------------------------------------------------------*/
    var headerFullBar = function () {
        var $header = $("header.enable-full-bar").first();
        if (!$header.length) {
            return;
        }

        var host = document.getElementById("wrapper") || document.body;
        var sentinel = document.createElement("div");
        sentinel.className = "header-full-bar-sentinel";
        sentinel.setAttribute("aria-hidden", "true");
        sentinel.style.cssText =
            "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;";

        if (window.getComputedStyle(host).position === "static") {
            host.style.position = "relative";
        }
        host.insertBefore(sentinel, host.firstChild);

        function apply(isAtTop) {
            $header.toggleClass("header-full-bar header-bg", !isAtTop);
        }

        function applyFromScroll() {
            apply(window.scrollY <= 0);
        }

        var ticking = false;
        window.addEventListener(
            "scroll",
            function () {
                if (ticking) {
                    return;
                }
                ticking = true;
                requestAnimationFrame(function () {
                    applyFromScroll();
                    ticking = false;
                });
            },
            { passive: true }
        );

        applyFromScroll();
        $(window).on("pageshow", applyFromScroll);

        if (!("IntersectionObserver" in window)) {
            $(window).on("load", applyFromScroll);
            return;
        }

        var observer = new IntersectionObserver(
            function (entries) {
                apply(entries[0].isIntersecting);
            },
            { root: null, threshold: 0 }
        );
        observer.observe(sentinel);
    };

    /* Auto Popup
  ------------------------------------------------------------------------------------- */
    var autoPopup = function () {
        if ($(".auto-popup").length > 0) {
            let showPopup = sessionStorage.getItem("showPopup");
            if (!JSON.parse(showPopup)) {
                setTimeout(function () {
                    $(".auto-popup").modal("show");
                }, 3000);
            }
        }
        $(".btn-hide-popup").on("click", function () {
            sessionStorage.setItem("showPopup", true);
        });
    };

    /* Toggle Control
  ------------------------------------------------------------------------------------- */
    var clickControl = function () {
        $(".btn-address").click(function () {
            $(".show-form-address").toggle();
        });
        $(".btn-hide-address").click(function () {
            $(".show-form-address").hide();
        });
        $(".btn-edit-address").click(function () {
            $(this)
                .closest(".account-address-item")
                .find(".edit-form-address")
                .toggle();
        });
        $(".btn-hide-edit-address").click(function () {
            $(this)
                .closest(".account-address-item")
                .find(".edit-form-address")
                .hide();
        });
        $(".btn-delete-address").click(function () {
            $(this).closest(".account-address-item").remove();
        });
    };

    /* Write Review
  ------------------------------------------------------------------------------------- */
    var writeReview = function () {
        if ($(".write-cancel-review-wrap").length > 0) {
            $(".btn-comment-review").click(function () {
                $(this)
                    .closest(".write-cancel-review-wrap")
                    .toggleClass("write-review");
            });
        }
    };

    /* Custom Input
  ------------------------------------------------------------------------------------- */
    var customInput = function () {
        $("input[type=file]").change(function (e) {
            $(this)
                .parents(".uploadfile")
                .find(".filename")
                .text(e.target.files[0].name);
        });
    };

    /* Choose Option
  ------------------------------------------------------------------------------------- */
    var chooseOption = function () {
        $(".choose-option-item").click(function () {
            $(this)
                .closest(".choose-option-list")
                .find(".select-option")
                .removeClass("select-option");
            $(this).toggleClass("select-option");
        });
    };

    /* Discount
  ------------------------------------------------------------------------------------- */
    var withDiscount = function () {
        $(".btn-discount-apply").click(function () {
            var number = $(this)
                .closest(".tf-product-discount-item")
                .find(".number-discount")
                .text();
            $(this)
                .closest(".tf-product-info-list")
                .find(".tf-product-info-heading")
                .find(".tf-product-info-price")
                .find(".badges-on-sale")
                .text("-" + number);
        });
    };

    /* Total Price Variant
  ------------------------------------------------------------------------------------- */
    var totalPriceVariant = function () {
        $(".tf-product-info-list,.tf-cart-item").each(function () {
            var productItem = $(this);
            // Formas cart rows: owned by carrito.js
            if (isFormasCarrito(productItem) || productItem.is("[data-cart-id]")) {
                return;
            }
            var basePrice =
                parseFloat(
                    productItem.find(".price-on-sale").data("base-price")
                ) ||
                parseFloat(
                    productItem.find(".price-on-sale").text().replace("$", "")
                );
            var quantityInput = productItem.find(".quantity-product");

            productItem.find(".color-btn, .size-btn").on("click", function () {
                var newPrice = parseFloat($(this).data("price")) || basePrice;
                // Use minimum order quantity if product has tf-product-info-quantity with data-min-order
                var $quantitySection = productItem.find(".tf-product-info-quantity");
                var minOrder = $quantitySection.length
                    ? parseInt($quantitySection.data("min-order")) || 1
                    : 1;
                quantityInput.val(minOrder);
                // Trigger blur so quantity display and size distribution update (quantityBonifiedLogo)
                if ($quantitySection.length) {
                    quantityInput.trigger("blur");
                }
                productItem
                    .find(".price-on-sale")
                    .text(
                        "$" +
                            newPrice
                                .toFixed(2)
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    );
                updateTotalPrice(newPrice, productItem);
            });

            productItem.find(".btn-increase").on("click", function (e) {
                // Skip product-detail qty (quantityBonifiedLogo)
                if ($(this).closest(".tf-product-info-quantity").length > 0) {
                    return;
                }
                var currentQuantity = parseInt(quantityInput.val());
                quantityInput.val(currentQuantity + 1);
                updateTotalPrice(null, productItem);
            });

            productItem.find(".btn-decrease").on("click", function (e) {
                // Skip product-detail qty (quantityBonifiedLogo)
                if ($(this).closest(".tf-product-info-quantity").length > 0) {
                    return;
                }
                var currentQuantity = parseInt(quantityInput.val());
                if (currentQuantity > 1) {
                    quantityInput.val(currentQuantity - 1);
                    updateTotalPrice(null, productItem);
                }
            });

            function updateTotalPrice(price, scope) {
                var currentPrice =
                    price ||
                    parseFloat(
                        scope.find(".price-on-sale").text().replace("$", "")
                    );
                var quantity = parseInt(scope.find(".quantity-product").val());
                var totalPrice = currentPrice * quantity;
                scope
                    .find(".total-price")
                    .text(
                        "$" +
                            totalPrice
                                .toFixed(2)
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    );
            }
        });
    };

    /* Scroll Grid Product
  ------------------------------------------------------------------------------------- */
    var scrollGridProduct = function () {
        var headerHeight = $("#header").outerHeight();
        var activescrollBtn = null;
        $(".btn-scroll-target").on("click", function () {
            var scroll = $(this).data("scroll");
            var target = $(".item-scroll-target[data-scroll='" + scroll + "']");
            $("html, body").animate(
                {
                    scrollTop: target.offset().top - headerHeight,
                },
                100
            );

            $(".btn-scroll-target").removeClass("active");
            $(this).addClass("active");
            activescrollBtn = $(this);
        });

        $(window).on("scroll", function () {
            var isActiveSet = false;
            $(".item-scroll-target").each(function () {
                var targetTop = $(this).offset().top - headerHeight;
                if (
                    $(window).scrollTop() >= targetTop &&
                    $(window).scrollTop() < targetTop + $(this).outerHeight()
                ) {
                    var scroll = $(this).data("scroll");
                    if (
                        !isActiveSet &&
                        (activescrollBtn === null ||
                            activescrollBtn.data("scroll") !== scroll)
                    ) {
                        $(".btn-scroll-target").removeClass("active");
                        $(
                            ".btn-scroll-target[data-scroll='" + scroll + "']"
                        ).addClass("active");
                    }
                    isActiveSet = true;
                }
            });
            if (!isActiveSet && activescrollBtn !== null) {
                $(".btn-scroll-target").removeClass("active");
                activescrollBtn.addClass("active");
            }
        });
    };

    /* Scroll Quick View
  ------------------------------------------------------------------------------------- */
    var scrollQuickView = function () {
        var scrollContainer = $(".modal-quick-view .wrapper-scroll-quickview");
        var activescrollBtn = null;
        var offsetTolerance = 100;

        function getTargetScroll(target, isHorizontal) {
            if (isHorizontal) {
                return (
                    target.offset().left -
                    scrollContainer.offset().left +
                    scrollContainer.scrollLeft()
                );
            } else {
                return (
                    target.offset().top -
                    scrollContainer.offset().top +
                    scrollContainer.scrollTop()
                );
            }
        }

        function isHorizontalMode() {
            return window.innerWidth < 767;
        }

        $(".btn-scroll-quickview").on("click", function () {
            var scroll = $(this).data("scroll-quickview");
            var target = $(
                `.item-scroll-quickview[data-scroll-quickview='${scroll}']`
            );

            if (target.length > 0) {
                var isHorizontal = isHorizontalMode();
                var targetScroll = getTargetScroll(target, isHorizontal);

                if (isHorizontal) {
                    scrollContainer.animate({ scrollLeft: targetScroll }, 600);
                } else {
                    scrollContainer.animate({ scrollTop: targetScroll }, 600);
                }

                $(".btn-scroll-quickview").removeClass("active");
                $(this).addClass("active");
                activescrollBtn = $(this);
            } else {
                console.error("Target not found for scroll:", scroll);
            }
        });

        scrollContainer.on("scroll", function () {
            var isHorizontal = isHorizontalMode();

            $(".item-scroll-quickview").each(function () {
                var targetStart =
                    getTargetScroll($(this), isHorizontal) - offsetTolerance;
                var targetEnd =
                    targetStart +
                    (isHorizontal
                        ? $(this).outerWidth()
                        : $(this).outerHeight()) +
                    offsetTolerance;

                var currentScroll = isHorizontal
                    ? scrollContainer.scrollLeft()
                    : scrollContainer.scrollTop();

                if (currentScroll >= targetStart && currentScroll < targetEnd) {
                    var scroll = $(this).data("scroll-quickview");

                    $(".btn-scroll-quickview").removeClass("active");
                    $(
                        `.btn-scroll-quickview[data-scroll-quickview='${scroll}']`
                    ).addClass("active");
                }
            });
        });
    };

    /* Hover Video
  ------------------------------------------------------------------------------------- */
    var hoverVideo = function () {
        $(".collection-social").each(function () {
            const container = $(this);
            const video = container.find("video");
            const poster = container.find(".poster");

            container.on("mouseenter", function () {
                if (video[0].readyState >= 3) {
                    poster.addClass("hide");
                    video[0].play();
                } else {
                    console.warn("Video not ready");
                }
            });
            container.on("mouseleave", function () {
                video[0].pause();
                poster.removeClass("hide");
            });
        });
    };

    /* Hover Pin
  -------------------------------------------------------------------------*/
    var hoverPin = function () {
        if ($(".wrap-lookbook-hover").length) {
            $(".bundle-pin-item").on("mouseover", function () {
                $(".bundle-hover-wrap").addClass("has-hover");
                var $el = $("." + this.id).show();
                $(".bundle-hover-wrap .bundle-hover-item")
                    .not($el)
                    .addClass("no-hover");
            });
            $(".bundle-pin-item").on("mouseleave", function () {
                $(".bundle-hover-wrap").removeClass("has-hover");
                $(".bundle-hover-item").removeClass("no-hover");
            });
        }
    };

    /* Toggle Password
  -------------------------------------------------------------------------*/
    var togglePassword = function () {
        $(".form-has-password")
            .find(".toggle-password")
            .on("click", function () {
                const $passwordInput = $(this)
                    .closest(".password-item")
                    .find(".input-password");
                const type =
                    $passwordInput.attr("type") === "password"
                        ? "text"
                        : "password";
                $passwordInput.attr("type", type);
                $(this).toggleClass("unshow");
            });
    };

    /* Custom Dropdown
  -------------------------------------------------------------------------*/
    var customDropdown = function () {
        function updateDropdownClass() {
            const $dropdown = $(".dropdown-custom");

            if ($(window).width() <= 991) {
                $dropdown.addClass("dropup").removeClass("dropend");
            } else {
                $dropdown.addClass("dropend").removeClass("dropup");
            }
        }
        updateDropdownClass();
        $(window).resize(updateDropdownClass);
    };

    /* Load More Search
  -------------------------------------------------------------------------*/
    var loadMoreSearch = function () {
        if ($(".loadmore-item").length > 0) {
            var display = $(".loadmore-item").data("display");
            var count = $(".loadmore-item").data("count");
            $(".fl-item").slice(0, display).show();

            $(".btn-loadmore").on("click", function () {
                setTimeout(() => {
                    $(".fl-item:hidden").slice(0, count).show();
                    if ($(".fl-item:hidden").length == 0) {
                        $(".view-more-button").hide();
                    }
                    updateHeight();
                }, 300);
            });
        }

        function updateHeight() {
            var firstItem = $(".fl-item").first();
            if (firstItem.length) {
                var height = firstItem.height();
                if (height > 0) {
                    $(".modal-search .tf-grid-layout").height(height);
                } else {
                    setTimeout(updateHeight, 100);
                }
            }
        }

        $(window).on("load", function () {
            // setTimeout(updateHeight, 300);
            updateHeight();
        });

        $(window).resize(function () {
            // setTimeout(updateHeight, 300);
            updateHeight();
        });
        var observer = new MutationObserver(() => {
            updateHeight();
        });
        var target = document.querySelector(".loadmore-item");
        if (target) {
            observer.observe(target, { childList: true, subtree: true });
        }
    };

    /* Hover Image Cursor
  -------------------------------------------------------------------------*/
    var hoverImgCursor = function () {
        let offsetX = 20;
        let offsetY = 20;
        $(".hover-cursor-img").on("mousemove", function (e) {
            let hoverImage = $(this).find(".hover-image");
            hoverImage.css({
                top: e.clientY + offsetY + "px",
                left: e.clientX + offsetX + "px",
            });
        });

        $(".hover-cursor-img").on("mouseenter", function () {
            let hoverImage = $(this).find(".hover-image");
            hoverImage.css({
                transform: "scale(1)",
                opacity: 1,
            });
        });

        $(".hover-cursor-img").on("mouseleave", function () {
            let hoverImage = $(this).find(".hover-image");
            hoverImage.css({
                transform: "scale(0)",
                opacity: 0,
            });
        });
    };

    /* Purchased
  ------------------------------------------------------------------------------------- */
    var hasPurchased = function () {
        if ($(".tf-has-purchased").length > 0) {
            let closedManually = false;
            let interval;

            function showNotification() {
                if (!closedManually) {
                    $(".tf-has-purchased").addClass("active");

                    setTimeout(function () {
                        $(".tf-has-purchased").removeClass("active");
                    }, 6000);
                }
            }
            setTimeout(showNotification, 6000);
            interval = setInterval(showNotification, 10000);

            $(".tf-has-purchased-close").on("click", function () {
                $(".tf-has-purchased").removeClass("active");
                closedManually = true;
                clearInterval(interval);
            });
        }
    };

    /* Handle Progress
  ------------------------------------------------------------------------------------- */
    var handleProgress = function () {
        if ($(".progress-cart").length > 0) {
            var progressValue = $(".progress-cart .value").data("progress");
            setTimeout(function () {
                $(".progress-cart .value").css("width", progressValue + "%");
            }, 1000);
        }

        if ($(".modal-shopping-cart").length > 0) {
            $(".modal-shopping-cart").on("hide.bs.modal", function () {
                $(".tf-progress-bar .value").css("width", "0%");
            });
            $(".modal-shopping-cart").on("show.bs.modal", function () {
                setTimeout(function () {
                    var progressValue = $(".tf-progress-bar .value").data(
                        "progress"
                    );
                    $(".tf-progress-bar .value").css(
                        "width",
                        progressValue + "%"
                    );
                }, 600);
            });
        }
    };

    /* Height Modal Menu
  ------------------------------------------------------------------------------------- */
    var heightModalMenu = function () {
        var columnsPerRow = 6;
        var maxVisibleRows = 2;

        function setHeight() {
            $("header .mega-menu .row-demo").each(function () {
                var $row = $(this);
                var $items = $row.find(".demo-item:visible");

                if (!$items.length) {
                    $row.height("auto");
                    return;
                }

                var itemHeight = $items.first().outerHeight();
                var gap =
                    parseFloat($row.css("row-gap")) ||
                    parseFloat($row.css("gap")) ||
                    20;
                var rows = Math.ceil($items.length / columnsPerRow);
                var visibleRows = Math.min(rows, maxVisibleRows);

                $row.height(
                    itemHeight * visibleRows + gap * (visibleRows - 1)
                );
            });
        }

        setHeight();
        $(window).resize(setHeight);
    };

    /* Handle Footer
  -------------------------------------------------------------------------*/
    var handleFooter = function () {
        var footerAccordion = function () {
            var args = { duration: 250 };
            $(".footer-heading-mobile").on("click", function () {
                $(this).parent(".footer-col-block").toggleClass("open");
                if (!$(this).parent(".footer-col-block").is(".open")) {
                    $(this).next().slideUp(args);
                } else {
                    $(this).next().slideDown(args);
                }
            });
        };
        function handleAccordion() {
            if (matchMedia("only screen and (max-width: 767px)").matches) {
                if (
                    !$(".footer-heading-mobile").data("accordion-initialized")
                ) {
                    footerAccordion();
                    $(".footer-heading-mobile").data(
                        "accordion-initialized",
                        true
                    );
                }
            } else {
                $(".footer-heading-mobile").off("click");
                $(".footer-heading-mobile")
                    .parent(".footer-col-block")
                    .removeClass("open");
                $(".footer-heading-mobile").next().removeAttr("style");
                $(".footer-heading-mobile").data(
                    "accordion-initialized",
                    false
                );
            }
        }
        handleAccordion();
        window.addEventListener("resize", function () {
            handleAccordion();
        });
    };

    /* Contact Form
  ------------------------------------------------------------------------------------- */
    var ajaxContactForm = function () {
        $("#contactform").each(function () {
            $(this).validate({
                submitHandler: function (form) {
                    var $form = $(form),
                        str = $form.serialize(),
                        loading = $("<div />", { class: "loading" });

                    $.ajax({
                        type: "POST",
                        url: $form.attr("action"),
                        data: str,
                        beforeSend: function () {
                            $form.find(".send-wrap").append(loading);
                        },
                        success: function (msg) {
                            var result, cls;
                            if (msg == "Success") {
                                result =
                                    "Email Sent Successfully. Thank you, Your application is accepted - we will contact you shortly";
                                cls = "msg-success";
                            } else {
                                result = "Error sending email.";
                                cls = "msg-error";
                            }
                            $form.prepend(
                                $("<div />", {
                                    class: "flat-alert " + cls,
                                    text: result,
                                }).append(
                                    $(
                                        '<a class="close" href="#"><i class="icon icon-close2"></i></a>'
                                    )
                                )
                            );

                            $form.find(":input").not(".submit").val("");
                        },
                        complete: function (xhr, status, error_thrown) {
                            $form.find(".loading").remove();
                        },
                    });
                },
            });
        });
    };

    /* Subscribe Mail
  ------------------------------------------------------------------------------------- */
    var ajaxSubscribe = {
        obj: {
            subscribeEmail: $("#subscribe-email"),
            subscribeButton: $("#subscribe-button"),
            subscribeMsg: $("#subscribe-msg"),
            subscribeContent: $("#subscribe-content"),
            dataMailchimp: $("#subscribe-form").attr("data-mailchimp"),
            success_message:
                '<div class="notification_ok text-success">Thank you for joining our mailing list!</div>',
            failure_message:
                '<div class="notification_error text-critical">Error! <strong>There was a problem processing your submission.</strong></div>',
            noticeError: '<div class="notification_error">{msg}</div>',
            noticeInfo: '<div class="notification_error">{msg}</div>',
            basicAction: "mail/subscribe.php",
            mailChimpAction: "mail/subscribe-mailchimp.php",
        },

        eventLoad: function () {
            var objUse = ajaxSubscribe.obj;

            $(objUse.subscribeButton).on("click", function () {
                if (window.ajaxCalling) return;
                var isMailchimp = objUse.dataMailchimp === "true";

                ajaxSubscribe.ajaxCall(objUse.basicAction);
            });
        },

        ajaxCall: function (action) {
            window.ajaxCalling = true;
            var objUse = ajaxSubscribe.obj;
            var messageDiv = objUse.subscribeMsg.html("").hide();
            $.ajax({
                url: action,
                type: "POST",
                dataType: "json",
                data: {
                    subscribeEmail: objUse.subscribeEmail.val(),
                },
                success: function (responseData, textStatus, jqXHR) {
                    if (responseData.status) {
                        objUse.subscribeContent.fadeOut(500, function () {
                            messageDiv.html(objUse.success_message).fadeIn(500);
                        });
                    } else {
                        switch (responseData.msg) {
                            case "email-required":
                                messageDiv.html(
                                    objUse.noticeError.replace(
                                        "{msg}",
                                        "Error! <strong>Email is required.</strong>"
                                    )
                                );
                                break;
                            case "email-err":
                                messageDiv.html(
                                    objUse.noticeError.replace(
                                        "{msg}",
                                        "Error! <strong>Email invalid.</strong>"
                                    )
                                );
                                break;
                            case "duplicate":
                                messageDiv.html(
                                    objUse.noticeError.replace(
                                        "{msg}",
                                        "Error! <strong>Email is duplicate.</strong>"
                                    )
                                );
                                break;
                            case "filewrite":
                                messageDiv.html(
                                    objUse.noticeInfo.replace(
                                        "{msg}",
                                        "Error! <strong>Mail list file is open.</strong>"
                                    )
                                );
                                break;
                            case "undefined":
                                messageDiv.html(
                                    objUse.noticeInfo.replace(
                                        "{msg}",
                                        "Error! <strong>undefined error.</strong>"
                                    )
                                );
                                break;
                            case "api-error":
                                objUse.subscribeContent.fadeOut(
                                    500,
                                    function () {
                                        messageDiv.html(objUse.failure_message);
                                    }
                                );
                        }
                        messageDiv.fadeIn(500);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    alert("Connection error");
                },
                complete: function (data) {
                    window.ajaxCalling = false;
                },
            });
        },
    };
    /* parallaxImage 
  -------------------------------------------------------------------------------------*/
    var efectparalax = function () {
        if ($(".effect-paralax").length > 0) {
            $(".effect-paralax").each(function () {
                new SimpleParallax(this, {
                    delay: 0.5,
                    orientation: "up",
                    scale: 1.3,
                    transition: "cubic-bezier(0.2, 0.8, 1, 1)",
                    customContainer: "",
                    customWrapper: "",
                });
            });
        }
    };
    /* RTL
  ------------------------------------------------------------------------------------- */
    var RTL = function () {
        if (localStorage.getItem("dir") === "rtl") {
            $("html").attr("dir", "rtl");
            $("body").addClass("rtl");
            $("#toggle-rtl").text("ltr");
            $(
                ".tf-slideshow .tf-btn,.view-all-demo .tf-btn, .pagination-link, .pagination-item, .tf-breadcrumb-list,.tf-list-categories.style-1, .tf-list-categories .categories-item"
            )
                .find(".icon-arrRight")
                .removeClass("icon-arrRight")
                .addClass("icon-arrLeft");
        } else {
            $("html").attr("dir", "ltr");
            $("body").removeClass("rtl");
            $("#toggle-rtl").text("rtl");
        }
        $("#toggle-rtl").on("click", function () {
            if ($("html").attr("dir") === "rtl") {
                localStorage.setItem("dir", "ltr");
                $("#toggle-rtl").text("rtl");
            } else {
                localStorage.setItem("dir", "rtl");
                $("#toggle-rtl").text("ltr");
            }
            location.reload();
        });
    };

    /* Sticky bar — sync summary with variant steps
    -------------------------------------------------------------------------*/
    var updateStickyBarSummary = function () {
        var $stickyImage = $("#sticky-bar-image");
        var $stickyTitle = $("#sticky-bar-title");
        var $stickySummary = $("#sticky-bar-summary");
        var $stickyQuantity = $("#sticky-bar-quantity");

        if (!$stickySummary.length) return;

        function refresh() {
            var $activeColor = $(".color-btn.active");
            var colorName = $activeColor.length
                ? $activeColor.data("value")
                : $(".value-currentColor").text().trim();

            var colorImg = $activeColor.find("img").attr("src");
            if (colorImg) {
                $stickyImage.attr("src", colorImg);
            }

            var personalization = $(".personalization-tab.active .text").text().trim();
            var quantity = $(".quantity-product").val() || "";

            var parts = [];
            if (colorName) parts.push(colorName);
            if (quantity) parts.push(quantity + " u.");
            if (personalization) parts.push(personalization);
            $stickySummary.text(parts.join(" · "));

            if (quantity && $stickyQuantity.length) {
                $stickyQuantity.text(quantity + " u.");
            }

            var productName = $("h3.name").first().text().trim();
            if (productName) $stickyTitle.text(productName);
        }

        $(document).on("click", ".color-btn", function () { setTimeout(refresh, 50); });
        $(document).on("click", ".personalization-tab", function () { setTimeout(refresh, 50); });
        $(document).on("change input", ".quantity-product", function () { setTimeout(refresh, 50); });
        $(document).on("change input", ".size-quantity-input", function () { setTimeout(refresh, 50); });
        $(document).on("click", ".btn-decrease, .btn-increase", function () {
            if (isFormasCarrito(this)) return;
            setTimeout(refresh, 250);
        });

        var lastQty = $(".quantity-product").val();
        setInterval(function () {
            var cur = $(".quantity-product").val();
            if (cur !== lastQty) { lastQty = cur; refresh(); }
        }, 300);

        refresh();
    };

    /* Quick Add — sync header image with selected color
    -------------------------------------------------------------------------*/
    var syncQuickAddVariantImage = function () {
        var $quickAdd = $("#quickAdd");
        if (!$quickAdd.length) return;

        function getVariantImageSrc($colorBtn) {
            var $img = $colorBtn.find("img").first();
            if (!$img.length) return "";
            return $img.attr("src") || $img.attr("data-src") || "";
        }

        function updateHeaderImage($context) {
            var $modal = $context && $context.length ? $context.closest("#quickAdd") : $quickAdd;
            if (!$modal.length) return;

            var $activeColor = $modal.find(".variant-picker-values .color-btn.active").first();
            if (!$activeColor.length) {
                var $checkedInput = $modal.find(".variant-picker-values input[type='radio']:checked").first();
                if ($checkedInput.length) {
                    $activeColor = $modal.find("label[for='" + $checkedInput.attr("id") + "']").first();
                }
            }
            if (!$activeColor.length) {
                $activeColor = $modal.find(".variant-picker-values .color-btn").first();
            }

            var imageSrc = getVariantImageSrc($activeColor);
            if (!imageSrc) return;

            var $headerImage = $modal.find(".modal-header .tf-product-info-item .image img").first();
            if ($headerImage.length) {
                $headerImage.attr("src", imageSrc);
                if ($headerImage.attr("data-src")) {
                    $headerImage.attr("data-src", imageSrc);
                }
            }
        }

        $quickAdd.on("click", ".variant-picker-values .color-btn", function () {
            $(this).closest(".variant-picker-values").find(".color-btn.active").removeClass("active");
            $(this).addClass("active");
            updateHeaderImage($(this));
        });

        $quickAdd.on("shown.bs.modal", function () {
            updateHeaderImage($quickAdd);
        });

        updateHeaderImage($quickAdd);
    };

    /* bottom sticky — dock into page when anchor scrolls into viewport; on mobile show only after scrolling past product heading
    -------------------------------------------------------------------------*/
    var scrollBottomSticky = function () {
        var stickyBar = $(".tf-sticky-btn-atc");
        var anchor = $(".tf-sticky-bar-anchor");
        var heading = $(".tf-product-info-heading").first();
        if (!stickyBar.length || !anchor.length) return;

        function syncScrollTopClearance() {
            var clearanceVar = "--scroll-top-clearance";
            var isMobile = window.matchMedia("(max-width: 991px)").matches;
            var shouldLift = isMobile
                && stickyBar.hasClass("sticky-bar-show")
                && !stickyBar.hasClass("docked");

            if (shouldLift) {
                document.documentElement.style.setProperty(
                    clearanceVar,
                    Math.ceil(stickyBar.outerHeight()) + 12 + "px"
                );
            } else {
                document.documentElement.style.removeProperty(clearanceVar);
            }
        }

        function update() {
            var scrollTop = $(window).scrollTop();
            var barHeight = stickyBar.outerHeight();
            var anchorTop = anchor.offset().top;
            var viewportBottom = scrollTop + $(window).height();
            var isMobile = window.matchMedia("(max-width: 991px)").matches;

            if (viewportBottom >= anchorTop + barHeight) {
                stickyBar.addClass("docked");
            } else {
                stickyBar.removeClass("docked");
            }

            if (isMobile && heading.length) {
                var viewportCenter = scrollTop + $(window).height() / 2;
                var headingTop = heading.offset().top;
                if (headingTop <= viewportCenter) {
                    stickyBar.addClass("sticky-bar-show");
                } else {
                    stickyBar.removeClass("sticky-bar-show");
                }
            } else {
                stickyBar.addClass("sticky-bar-show");
            }

            syncScrollTopClearance();
        }

        $(window).on("scroll resize", update);
        update();
    };

    /* Preloader
  -------------------------------------------------------------------------------------*/
    var preloader = function () {
        if ($("body").hasClass("preload-wrapper")) {
            setTimeout(function () {
                $(".preload").fadeOut("slow", function () {
                    $(this).remove();
                });
            }, 100);
        }
    };

    /* Product Variant Swatches
  -------------------------------------------------------------------------------------*/
    var productVariantSwatches = function () {
        $('.variant-swatch').on('click', function() {
            var $this = $(this);
            var variant = $this.data('variant');
            var $swatches = $this.closest('.variant-swatches').find('.variant-swatch');
            
            // Remove active class from all swatches
            $swatches.removeClass('active');
            
            // Add active class to clicked swatch
            $this.addClass('active');
            
            // Update product image if available
            var $productImg = $this.closest('.card-product').find('.product-img img');
            var swatchImg = $this.find('.swatch-img').attr('src');
            
            if ($productImg.length && swatchImg) {
                $productImg.attr('src', swatchImg);
                $productImg.attr('data-src', swatchImg);
            }
            
            // You can add more functionality here like updating price, stock, etc.
            console.log('Selected variant:', variant);
        });
    };

    // Dom Ready
    $(function () {
        selectImages();
        btnQuantity();
        deleteFile();
        goTop();
        variantPicker();
        swatchColor();
        changeValue();
        rangeSize();
        sidebarMobile();
        tabs();
        checkClick();
        checkPaymentCard();
        btnLoading();
        loadItem();
        staggerWrap();
        clickModalSecond();
        //headerSticky();
        headerFullBar(); // Uncomment to use full bar version instead of sticky
        autoPopup();
        clickControl();
        writeReview();
        customInput();
        chooseOption();
        withDiscount();
        totalPriceVariant();
        scrollGridProduct();
        scrollQuickView();
        hoverVideo();
        hoverPin();
        togglePassword();
        customDropdown();
        loadMoreSearch();
        hoverImgCursor();
        hasPurchased();
        handleProgress();
        heightModalMenu();
        handleFooter();
        ajaxContactForm();
        ajaxSubscribe.eventLoad();
        efectparalax();
        new WOW().init();
        RTL();
        scrollBottomSticky();
        updateStickyBarSummary();
        preloader();
        productVariantSwatches();
        personalizationTabs();
        quantityBonifiedLogo();
        sizeQuantityInputs();
        syncQuickAddVariantImage();
    });
})(jQuery);
