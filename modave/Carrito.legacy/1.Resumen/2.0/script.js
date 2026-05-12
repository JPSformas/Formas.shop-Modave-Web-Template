document.addEventListener("DOMContentLoaded", () => {
  // Get all checkboxes, summary elements, and checkout button
  const checkboxes = document.querySelectorAll('input[name="buy-item"]')
  const checkAllCheckbox = document.getElementById("check-all")
  const checkAllCheckboxMobile = document.getElementById("check-all-mobile")
  const itemCountElement = document.querySelector(".summary-item .item-count")
  const mobileItemCountElement = document.querySelector(".mobile-item-count")
  const subtotalElement = document.querySelector(".summary-item.subtotal .price-value")
  const ivaElement = document.querySelector(".summary-item.IVA .price-value")
  const totalElement = document.querySelector(".summary-item.total .price-value")
  const checkoutButtons = document.querySelectorAll(".checkout")
  const mobileSummary = document.querySelector('.mobile-order-summary');
  const recommendedSection = document.querySelector('.recommended');


  // Initial count of total items
  const totalItems = checkboxes.length

  // IVA rate (21%)
  const IVA_RATE = 0.21

  // Track the currently applied coupon
  let currentCoupon = null

  // Store deleted items for undo functionality
  let lastDeletedItem = null
  let notificationTimeout = null

  // Function to parse price string (handles Argentine format: $123.456,78)
  function parsePrice(priceString) {
    // Handle "Gratis" text
    if (priceString === "Gratis") return 0

    // Remove currency symbol and any spaces
    const cleanPrice = priceString.replace("$", "").replace(/\s/g, "")
    // Replace dots (thousands separator) with nothing and commas (decimal separator) with dots
    const normalizedPrice = cleanPrice.replace(/\./g, "").replace(",", ".")
    // Parse as float
    return Number.parseFloat(normalizedPrice)
  }

  // Function to format price (Argentine format: $123.456,78)
  function formatPrice(price) {
    // Convert to string with 2 decimal places
    const priceStr = price.toFixed(2)
    // Split into integer and decimal parts
    const parts = priceStr.split(".")
    // Add thousands separators to integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    // Join with comma as decimal separator
    return "$" + parts.join(",")
  }

  // Function to calculate subtotal of selected items
  function calculateSubtotal() {
    let subtotal = 0

    // Get fresh references to all checkboxes to ensure we're working with the current DOM state
    const currentCheckboxes = document.querySelectorAll('input[name="buy-item"]')

    // Loop through each checkbox
    currentCheckboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        // Find the price element for this cart item
        const priceElement = checkbox.closest(".cart-item").querySelector(".price-row.total-row .price-value")
        if (priceElement) {
          // Parse the price and add to subtotal
          subtotal += parsePrice(priceElement.textContent)
        }
      }
    })

    return subtotal
  }

  // Modify the updateUI function to ensure it properly updates the "check all" checkbox state
  function updateUI() {
    // Count checked items
    const checkedItems = document.querySelectorAll('input[name="buy-item"]:checked').length
    const totalRemainingItems = document.querySelectorAll('input[name="buy-item"]').length

    // NEW CODE: Add or remove .checked on each .cart-item based on checkbox state
    const allCheckboxes = document.querySelectorAll('input[name="buy-item"]')
    allCheckboxes.forEach((checkbox) => {
      const cartItem = checkbox.closest(".cart-item")
      if (checkbox.checked) {
        cartItem.classList.add("checked")
      } else {
        cartItem.classList.remove("checked")
      }
    })

    // Update item count in summary
    itemCountElement.textContent = checkedItems
    if (mobileItemCountElement) {
      mobileItemCountElement.textContent = checkedItems
    }

    // Calculate subtotal
    const subtotal = calculateSubtotal()

    // Update subtotal in summary
    subtotalElement.textContent = formatPrice(subtotal)

    // If there's a coupon applied, update the discount
    if (currentCoupon) {
      updateCouponDiscount(currentCoupon)
    } else {
      // No coupon applied, calculate IVA and total directly
      const iva = subtotal * IVA_RATE
      const total = subtotal + iva

      // Update IVA and total values
      ivaElement.textContent = formatPrice(iva)
      totalElement.textContent = formatPrice(total)

      // Remove total_sin_IVA if it exists and no coupon is applied
      const totalSinIvaElement = document.querySelector(".summary-item.total_sin_IVA")
      if (totalSinIvaElement) {
        totalSinIvaElement.remove()
      }
    }

    // Update checkout button text based on selection
    if (checkedItems === 0) {
      // No items selected
      checkoutButtons.forEach((button) => {
        button.textContent = "Comenzar compra"
        button.setAttribute("aria-disabled", "true")
        button.style.opacity = "0.5"
      })
    } else if (checkedItems === totalRemainingItems) {
      // All items selected
      checkoutButtons.forEach((button) => {
        button.textContent = "Comprar todos los productos"
        button.setAttribute("aria-disabled", "false")
        button.style.opacity = "1"
      })
    } else {
      // Some items selected
      checkoutButtons.forEach((button) => {
        button.textContent = "Comprar productos seleccionados"
        button.setAttribute("aria-disabled", "false")
        button.style.opacity = "1"
      })
    }

    // Update "check all" checkbox state
    checkAllCheckbox.checked = checkedItems > 0 && checkedItems === totalRemainingItems
    checkAllCheckbox.indeterminate = checkedItems > 0 && checkedItems < totalRemainingItems
    checkAllCheckboxMobile.checked = checkAllCheckbox.checked
    checkAllCheckboxMobile.indeterminate = checkAllCheckbox.indeterminate
  }

  // 1) Single function that reads the event target's .checked
  function handleCheckAllChange(e) {
    const isChecked = e.target.checked
    // Set all checkboxes to match the "select all" checkbox’s state
    checkboxes.forEach((checkbox) => {
      checkbox.checked = isChecked
    })
    // Update the UI
    updateUI()
  }

  // 2) Add event listeners for BOTH check-all inputs
  checkAllCheckbox.addEventListener("change", handleCheckAllChange)
  checkAllCheckboxMobile.addEventListener("change", handleCheckAllChange)

  // 3) Keep the per-item event listeners as is
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateUI)
  })

  // Add event listeners to quantity inputs to update totals when quantity changes
  document.querySelectorAll(".quantity input").forEach((input) => {
    input.addEventListener("change", function () {
      // Get the cart item
      const cartItem = this.closest(".cart-item")

      // Get the unit price and setup price
      const unitPriceElement = cartItem.querySelector(".price-row:first-child .price-value")
      const setupPriceElement = cartItem.querySelector(".price-row:nth-child(2) .price-value")
      const totalPriceElement = cartItem.querySelector(".price-row.total-row .price-value")

      if (unitPriceElement && totalPriceElement) {
        const unitPrice = parsePrice(unitPriceElement.textContent)
        const setupPrice = setupPriceElement ? parsePrice(setupPriceElement.textContent) : 0
        const quantity = Number.parseInt(this.value) || 0

        // Calculate new total for this item
        const itemTotal = unitPrice * quantity + setupPrice

        // Update the item total
        totalPriceElement.textContent = formatPrice(itemTotal)

        // Update the summary
        updateUI()
      }
    })

    input.addEventListener("click", function(e) {
      const cartItem = this.closest(".cart-item");
      if (cartItem && cartItem.classList.contains("cart-item-apparel")) {
        e.preventDefault();
        openSizeBreakdown(cartItem);
      }
    });
  })

  // Apply green color only to "Gratis" setup values
  document.querySelectorAll(".price-row:nth-child(2) .price-value").forEach((element) => {
    if (element.textContent === "Gratis") {
      element.classList.add("free-value")
    } else {
      element.classList.remove("free-value")
    }
  })

  // Initialize UI on page load
  updateUI()

  // Keep checkout links inactive while there are no selected items.
  checkoutButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      if (button.getAttribute("aria-disabled") === "true") {
        e.preventDefault()
      }
    })
  })

  // === Dropdowns para SIEMPRE ===
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".dropdown-toggle");   // ¿Se hizo click en un toggle?
    const openMenu = document.querySelector(".dropdown-menu.show");

    // 1) Click fuera de un dropdown -> cerrar el que esté abierto
    if (!toggle) {
      if (openMenu) openMenu.classList.remove("show");
      return;
    }

    // 2) Click en un toggle
    e.preventDefault();        // evita que un <button type="submit"> recargue la página
    e.stopPropagation();

    const menu = toggle.closest(".dropdown")?.querySelector(".dropdown-menu");
    if (!menu) return;

    // Cierra cualquier otro menú abierto antes de abrir este
    if (openMenu && openMenu !== menu) openMenu.classList.remove("show");

    menu.classList.toggle("show");
  });

  // NEW CODE: Identify apparel items and add size breakdown functionality

  // Function to check if a cart item is an apparel item
  function isApparelItem(cartItem) {
    // For this example, we'll identify the third item (Remera Fall) as an apparel item
    // In a real application, you might want to add a data attribute or class to identify apparel items
    const productName = cartItem.querySelector(".product-title")?.textContent.toLowerCase() || ""
    return (
      productName.includes("remera") ||
      productName.includes("camisa") ||
      productName.includes("pantalón") ||
      productName.includes("pantalon") ||
      productName.includes("campera") ||
      productName.includes("buzo")
    )
  }

  // Function to create size breakdown button and slide-out menu
  function addSizeBreakdownToApparelItems() {
    // Create the overlay for mobile
    if (!document.querySelector(".size-breakdown-overlay")) {
      const overlay = document.createElement("div")
      overlay.className = "size-breakdown-overlay"
      overlay.addEventListener("click", closeSizeBreakdown)
      document.body.appendChild(overlay)
    }

    // Create the slide-out menu container if it doesn't exist
    if (!document.querySelector(".size-breakdown-sidebar")) {
      const sidebar = document.createElement("div")
      sidebar.className = "size-breakdown-sidebar"

      const sidebarHeader = document.createElement("div")
      sidebarHeader.className = "sidebar-header"

      const sidebarTitle = document.createElement("h3")
      sidebarTitle.textContent = "Desglose de talles"

      const closeButton = document.createElement("button")
      closeButton.className = "close-sidebar"
      closeButton.innerHTML = "&times;"
      closeButton.addEventListener("click", closeSizeBreakdown)

      sidebarHeader.appendChild(sidebarTitle)
      sidebarHeader.appendChild(closeButton)
      sidebar.appendChild(sidebarHeader)

      const sidebarContent = document.createElement("div")
      sidebarContent.className = "sidebar-content"
      sidebar.appendChild(sidebarContent)

      document.body.appendChild(sidebar)
    }

    document.querySelectorAll(".cart-item").forEach((cartItem) => {
      if (isApparelItem(cartItem)) {
        // Add apparel class to the cart item
        cartItem.classList.add("cart-item-apparel")

        // Find the quantity container
        const quantityContainer = cartItem.querySelector(".quantity")

        // Check if the size breakdown button already exists
        if (!cartItem.querySelector(".size-breakdown-toggle")) {
          // Create size breakdown button
          const sizeBreakdownBtn = document.createElement("button")
          sizeBreakdownBtn.className = "size-breakdown-toggle"
          sizeBreakdownBtn.textContent = "Mostrar desglose de talles"

          // Add event listener to toggle size breakdown
          sizeBreakdownBtn.addEventListener("click", (e) => {
            e.preventDefault()
            openSizeBreakdown(cartItem)
          })

          // Add button to the DOM
          const productInfoDiv = cartItem.querySelector(".product-info div")
          if (quantityContainer) {
            const nextSibling = quantityContainer.nextSibling
            if (nextSibling) {
              productInfoDiv.insertBefore(sizeBreakdownBtn, nextSibling)
            } else {
              productInfoDiv.appendChild(sizeBreakdownBtn)
            }
          } else {
            productInfoDiv.appendChild(sizeBreakdownBtn)
          }
        }
        const quantityInput = cartItem.querySelector(".quantity input");
        if (quantityInput) {
          quantityInput.style.cursor = "pointer";
          quantityInput.readOnly = true // Make it read-only
        }
      }
    })
  }

  // Function to open the size breakdown sidebar
  function openSizeBreakdown(cartItem) {
    const productTitle = cartItem.querySelector(".product-title").textContent
    const sidebar = document.querySelector(".size-breakdown-sidebar")
    const sidebarContent = sidebar.querySelector(".sidebar-content")
    const overlay = document.querySelector(".size-breakdown-overlay")

    // Clear previous content
    sidebarContent.innerHTML = ""

    // Add product info to the sidebar
    const productInfo = document.createElement("div")
    productInfo.className = "sidebar-product-info"

    const productImage = cartItem.querySelector(".product-info img").cloneNode(true)
    productInfo.appendChild(productImage)

    const productDetails = document.createElement("div")
    productDetails.className = "sidebar-product-details"

    const productName = document.createElement("h4")
    productName.textContent = productTitle
    productDetails.appendChild(productName)

    productInfo.appendChild(productDetails)
    sidebarContent.appendChild(productInfo)

    // Sample size data - in a real application, this would come from your database
    const sizeData = [
      { size: "S", quantity: 2, stock: 262 },
      { size: "M", quantity: 3, stock: 5 },
      { size: "L", quantity: 1, stock: 1633 },
      { size: "XL", quantity: 4, stock: 30 },
    ]

    // Create size breakdown content
    const sizeBreakdownContent = document.createElement("div")
    sizeBreakdownContent.className = "sidebar-size-breakdown"

    // Add size rows
    sizeData.forEach((sizeItem) => {
      const sizeRow = document.createElement("div")
      sizeRow.className = "sidebar-size-row"

      const sizeLabel = document.createElement("div")
      sizeLabel.className = "sidebar-size-label"
      sizeLabel.innerHTML = `${sizeItem.size} <span class="stock-info">(${sizeItem.stock} un.)</span>`

      const sizeQuantityInput = document.createElement("div")
      sizeQuantityInput.className = "sidebar-size-quantity-input"

      const quantityInput = document.createElement("input")
      quantityInput.type = "number"
      quantityInput.className = "sidebar-size-quantity"
      quantityInput.placeholder = "Cantidad"
      quantityInput.value = sizeItem.quantity || 0
      quantityInput.min = "0"
      quantityInput.max = sizeItem.stock
      quantityInput.dataset.stock = sizeItem.stock

      // Add up/down arrows for the input
      const arrowsContainer = document.createElement("div")
      arrowsContainer.className = "sidebar-quantity-arrows"

      const upArrow = document.createElement("div")
      upArrow.className = "sidebar-arrow up"
      upArrow.innerHTML = "▲"
      upArrow.addEventListener("click", () => {
        const currentValue = Number.parseInt(quantityInput.value) || 0
        const maxStock = Number.parseInt(quantityInput.dataset.stock)

        if (currentValue < maxStock) {
          quantityInput.value = currentValue + 1
        } else {
          quantityInput.value = maxStock
          showStockNotification(quantityInput, maxStock)
        }

        // Trigger change event
        const event = new Event("change", { bubbles: true })
        quantityInput.dispatchEvent(event)
      })

      const downArrow = document.createElement("div")
      downArrow.className = "sidebar-arrow down"
      downArrow.innerHTML = "▼"
      downArrow.addEventListener("click", () => {
        const currentValue = Number.parseInt(quantityInput.value) || 0
        if (currentValue > 0) {
          quantityInput.value = currentValue - 1
          // Trigger change event
          const event = new Event("change", { bubbles: true })
          quantityInput.dispatchEvent(event)
        }
      })

      arrowsContainer.appendChild(upArrow)
      arrowsContainer.appendChild(downArrow)

      sizeQuantityInput.appendChild(quantityInput)
      sizeQuantityInput.appendChild(arrowsContainer)

      sizeRow.appendChild(sizeLabel)
      sizeRow.appendChild(sizeQuantityInput)

      sizeBreakdownContent.appendChild(sizeRow)

      // Add input validation
      quantityInput.addEventListener("input", function () {
        validateQuantityInput(this)
      })

      quantityInput.addEventListener("change", function () {
        validateQuantityInput(this)
      })
    })

    sidebarContent.appendChild(sizeBreakdownContent)

    // Add "Add units" button
    const addUnitsBtn = document.createElement("button")
    addUnitsBtn.className = "sidebar-add-units-btn"
    addUnitsBtn.textContent = "Agregar unidades"
    addUnitsBtn.addEventListener("click", () => {
      // Get all size inputs
      const sizeInputs = sizeBreakdownContent.querySelectorAll(".sidebar-size-quantity")
      let totalQuantity = 0

      // Calculate total quantity
      sizeInputs.forEach((input) => {
        totalQuantity += Number.parseInt(input.value) || 0
      })

      // Update the main quantity input
      const mainQuantityInput = cartItem.querySelector(".quantity input")
      if (mainQuantityInput) {
        mainQuantityInput.value = totalQuantity

        // Get the unit price and setup price
        const unitPriceElement = cartItem.querySelector(".price-row:first-child .price-value")
        const setupPriceElement = cartItem.querySelector(".price-row:nth-child(2) .price-value")
        const totalPriceElement = cartItem.querySelector(".price-row.total-row .price-value")

        if (unitPriceElement && totalPriceElement) {
          const unitPrice = parsePrice(unitPriceElement.textContent)
          const setupPrice = setupPriceElement ? parsePrice(setupPriceElement.textContent) : 0

          // Calculate new total for this item
          const itemTotal = unitPrice * totalQuantity + setupPrice

          // Update the item total
          totalPriceElement.textContent = formatPrice(itemTotal)
        }
        // Trigger change event to update totals
        const event = new Event("change", { bubbles: true })
        mainQuantityInput.dispatchEvent(event)
      }

      // Close the size breakdown
      closeSizeBreakdown()
    })

    sidebarContent.appendChild(addUnitsBtn)

    // Show the sidebar and overlay
    sidebar.classList.add("open")
    overlay.classList.add("show")
    document.body.classList.add("sidebar-open")
  }

  // Function to close the size breakdown sidebar
  function closeSizeBreakdown() {
    const sidebar = document.querySelector(".size-breakdown-sidebar")
    const overlay = document.querySelector(".size-breakdown-overlay")

    sidebar.classList.remove("open")
    overlay.classList.remove("show")
    document.body.classList.remove("sidebar-open")
  }

  // New function to validate quantity input
  function validateQuantityInput(inputElement) {
    const maxStock = Number.parseInt(inputElement.dataset.stock)
    const currentValue = Number.parseInt(inputElement.value) || 0

    if (currentValue > maxStock) {
      inputElement.value = maxStock

      // Show stock notification
      showStockNotification(inputElement, maxStock)
    }
  }

  // Extract the notification creation to a separate function
  function showStockNotification(inputElement, maxStock) {
    // Create notification
    const stockNotification = document.createElement("div")
    stockNotification.className = "stock-notification"
    stockNotification.textContent = `Máximo disponible: ${maxStock} un.`

    // Position the notification near the input
    const parent = inputElement.closest(".sidebar-size-quantity-input") || inputElement.closest(".size-quantity-input")

    // Remove any existing notification
    const existingNotification = parent.querySelector(".stock-notification")
    if (existingNotification) {
      existingNotification.remove()
    }

    parent.appendChild(stockNotification)

    // Remove the notification after 3 seconds
    setTimeout(() => {
      stockNotification.remove()
    }, 3000)
  }

  // Call the function to add size breakdown to apparel items
  addSizeBreakdownToApparelItems()

  // List of valid coupons with their discount percentages
  const validCoupons = [
    { code: "FP5", discount: 0.05 },
    { code: "FP10", discount: 0.1 },
    { code: "FP15", discount: 0.15 },
    { code: "FP20", discount: 0.2 },
    { code: "FRENZY30", discount: 0.3 },
  ]

  // Coupon validation functionality for both desktop and mobile order summaries
  const couponSections = document.querySelectorAll(".coupon-section");

  // For each coupon section (desktop and mobile) attach events
  couponSections.forEach(section => {
    const couponInput = section.querySelector(".coupon-input input");
    const couponButton = section.querySelector(".coupon-input button");

    couponButton.addEventListener("click", () => {
      validateCoupon(couponInput);
    });

    couponInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        validateCoupon(couponInput);
      }
    });

    couponInput.addEventListener("input", () => {
      // Clear any existing error or success messages in all coupon sections
      couponSections.forEach(sec => {
        const input = sec.querySelector(".coupon-input input");
        input.classList.remove("error", "success");
        const existingError = sec.querySelector(".coupon-error");
        if (existingError) existingError.remove();
      });
    });
  });

  // Modified coupon validation function that works for both sections
  function validateCoupon(fromInput) {
    const couponValue = fromInput.value.trim().toUpperCase();

    // Remove any existing error messages in all coupon sections
    couponSections.forEach(section => {
      const existingError = section.querySelector(".coupon-error");
      if (existingError) existingError.remove();
    });

    // If empty, just return
    if (!couponValue) return;

    // Check if coupon is valid
    const coupon = validCoupons.find((c) => c.code === couponValue);

    if (coupon) {
      // Coupon is valid – update every coupon section
      couponSections.forEach(section => {
        const input = section.querySelector(".coupon-input input");
        input.classList.remove("error");
        input.classList.add("success");
        const couponInputContainer = section.querySelector(".coupon-input");
        couponInputContainer.style.display = "none";
        // Remove any previously applied coupon UI if exists
        const existingApplied = section.querySelector(".applied-coupon");
        if (existingApplied) existingApplied.remove();

        // Create the applied coupon element
        const appliedCouponContainer = document.createElement("div");
        appliedCouponContainer.className = "applied-coupon";
        appliedCouponContainer.innerHTML = `
          <div class="coupon-check">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="coupon-info">
            <div class="coupon-code">${coupon.code} aplicado</div>
            <div class="coupon-discount">${coupon.discount * 100}% off</div>
          </div>
          <button class="remove-coupon">Quitar</button>
        `;
        section.appendChild(appliedCouponContainer);
        appliedCouponContainer.querySelector(".remove-coupon").addEventListener("click", removeCoupon);
      });
      // Store the current coupon globally and update discount info
      currentCoupon = coupon;
      updateCouponDiscount(coupon);
    } else {
      // Coupon is invalid – show error in every coupon section
      couponSections.forEach(section => {
        const input = section.querySelector(".coupon-input input");
        input.classList.remove("success");
        input.classList.add("error");
        if (!section.querySelector(".coupon-error")) {
          const errorMessage = document.createElement("div");
          errorMessage.className = "coupon-error";
          errorMessage.innerHTML = '<i class="fas fa-exclamation-circle"></i> Revisa que esté bien escrito';
          section.appendChild(errorMessage);
        }
      });
    }
  }

  // Update the discount UI in all order summaries (both desktop and mobile)
  function updateCouponDiscount(coupon) {
    const subtotal = calculateSubtotal();
    const discountAmount = subtotal * coupon.discount;

    // Find each order summary container (desktop and mobile)
    const summaryContainers = document.querySelectorAll(".order-summary, .mobile-summary-content");

    summaryContainers.forEach(container => {
      // Remove any existing discount or total_sin_IVA elements
      container.querySelectorAll(".summary-item.discount, .summary-item.total_sin_IVA").forEach(el => el.remove());

      // Create discount element
      const discountElement = document.createElement("div");
      discountElement.className = "summary-item discount";
      const discountLabel = document.createElement("span");
      discountLabel.textContent = "Descuento:";
      const discountValue = document.createElement("span");
      discountValue.className = "price-value discount-value";
      discountValue.textContent = "- " + formatPrice(discountAmount);
      discountElement.appendChild(discountLabel);
      discountElement.appendChild(discountValue);

      // Insert discount element before the IVA section
      const ivaContainer = container.querySelector(".summary-item.IVA");
      if (ivaContainer) {
        ivaContainer.parentNode.insertBefore(discountElement, ivaContainer);
      }

      // Create total sin impuestos element
      const totalSinIvaElement = document.createElement("div");
      totalSinIvaElement.className = "summary-item total_sin_IVA";
      const totalSinIvaLabel = document.createElement("span");
      totalSinIvaLabel.textContent = "Total sin impuestos:";
      const totalSinIvaValue = document.createElement("span");
      totalSinIvaValue.className = "price-value";
      const totalSinIva = subtotal - discountAmount;
      totalSinIvaValue.textContent = formatPrice(totalSinIva);
      totalSinIvaElement.appendChild(totalSinIvaLabel);
      totalSinIvaElement.appendChild(totalSinIvaValue);
      if (ivaContainer) {
        ivaContainer.parentNode.insertBefore(totalSinIvaElement, ivaContainer);
      }

      // Calculate IVA (21% rate) and new total
      const iva = totalSinIva * IVA_RATE;
      const total = totalSinIva + iva;

      // Update the IVA and Total elements in this container
      const ivaValueElem = container.querySelector(".summary-item.IVA .price-value");
      const totalValueElem = container.querySelector(".summary-item.total .price-value");
      if (ivaValueElem) ivaValueElem.textContent = formatPrice(iva);
      if (totalValueElem) totalValueElem.textContent = formatPrice(total);
    });
  }

  // Remove coupon and restore coupon input in all coupon sections
  function removeCoupon() {
    couponSections.forEach(section => {
      const appliedCouponContainer = section.querySelector(".applied-coupon");
      if (appliedCouponContainer) appliedCouponContainer.remove();
      const couponInputContainer = section.querySelector(".coupon-input");
      couponInputContainer.style.display = "flex";
      const input = section.querySelector(".coupon-input input");
      input.value = "";
      input.classList.remove("success", "error");
    });
    // Remove discount UI elements from both order summaries
    document.querySelectorAll(".summary-item.discount, .summary-item.total_sin_IVA").forEach(el => el.remove());
    currentCoupon = null;
    updateUI();
  }


  // Function to handle item deletion
  function handleDeleteItem(e) {
    // Get the cart item
    const cartItem = e.currentTarget.closest(".cart-item")

    if (cartItem) {
      // Store information about the deleted item for undo functionality
      lastDeletedItem = {
        element: cartItem,
        wasChecked: cartItem.querySelector('input[name="buy-item"]').checked,
        isFirst: !cartItem.previousElementSibling || cartItem.previousElementSibling.classList.contains("table-header"),
        previousItem:
          cartItem.previousElementSibling && !cartItem.previousElementSibling.classList.contains("table-header")
            ? cartItem.previousElementSibling
            : null,
      }

      // Remove the item from the DOM
      cartItem.remove()

      // Show the delete notification
      showDeleteNotification(cartItem)

      // Force recalculation of prices
      if (currentCoupon) {
        updateCouponDiscount(currentCoupon)
      }

      // Update the UI
      updateUI()

      // Update the "check all" checkbox state after deletion
      updateCheckAllState()
    }
  }

  // Function to update the "check all" checkbox state
  function updateCheckAllState() {
    const remainingCheckboxes = document.querySelectorAll('input[name="buy-item"]')
    const checkedCheckboxes = document.querySelectorAll('input[name="buy-item"]:checked')

    // If there are no remaining checkboxes, uncheck the "check all" checkbox
    if (remainingCheckboxes.length === 0) {
      checkAllCheckbox.checked = false
      checkAllCheckbox.indeterminate = false
    }
    // If all remaining checkboxes are checked, check the "check all" checkbox
    else if (checkedCheckboxes.length === remainingCheckboxes.length) {
      checkAllCheckbox.checked = true
      checkAllCheckbox.indeterminate = false
    }
    // If some but not all checkboxes are checked, set the "check all" checkbox to indeterminate
    else if (checkedCheckboxes.length > 0) {
      checkAllCheckbox.checked = false
      checkAllCheckbox.indeterminate = true
    }
    // If no checkboxes are checked, uncheck the "check all" checkbox
    else {
      checkAllCheckbox.checked = false
      checkAllCheckbox.indeterminate = false
    }
  }

  // Function to create and show the delete notification
  function showDeleteNotification(cartItem) {
    // Clear any existing notification timeout
    if (notificationTimeout) {
      clearTimeout(notificationTimeout)
    }

    // Remove any existing notification
    const existingNotification = document.querySelector(".delete-notification")
    if (existingNotification) {
      existingNotification.remove()
    }

    // Create notification element
    const notification = document.createElement("div")
    notification.className = "delete-notification"
    notification.innerHTML = `
      <span>¡Listo! Eliminaste el producto.</span>
      <button class="undo-button">DESHACER</button>
    `

    // Add notification to the body
    document.body.appendChild(notification)

    // Add event listener to the undo button
    const undoButton = notification.querySelector(".undo-button")
    undoButton.addEventListener("click", () => {
      // Restore the deleted item
      if (lastDeletedItem && lastDeletedItem.element) {
        // Get the cart table
        const cartTable = document.querySelector(".cart-table")

        // If the item was the first one, insert after the header
        if (lastDeletedItem.isFirst) {
          const tableHeader = cartTable.querySelector(".table-header")
          tableHeader.after(lastDeletedItem.element)
        }
        // Otherwise, insert after the previous item
        else if (lastDeletedItem.previousItem) {
          lastDeletedItem.previousItem.after(lastDeletedItem.element)
        }
        // If all else fails, just append to the cart table
        else {
          cartTable.appendChild(lastDeletedItem.element)
        }

        // Restore checkbox state
        const checkbox = lastDeletedItem.element.querySelector('input[name="buy-item"]')
        if (checkbox) {
          checkbox.checked = lastDeletedItem.wasChecked
        }

        // Re-add event listeners
        addDeleteButtonListeners()

        // Add event listeners to the restored checkbox
        if (checkbox) {
          checkbox.addEventListener("change", updateUI)
        }

        // Force recalculation of prices with coupon if applied
        if (currentCoupon) {
          updateCouponDiscount(currentCoupon)
        }

        // Update the UI to recalculate all prices
        updateUI()

        // Update the "check all" checkbox state after restoration
        updateCheckAllState()

        // Remove the notification
        notification.remove()

        // Clear the timeout
        if (notificationTimeout) {
          clearTimeout(notificationTimeout)
          notificationTimeout = null
        }
      }
    })

    // Set timeout to remove the notification after 5 seconds
    notificationTimeout = setTimeout(() => {
      notification.classList.add("fade-out")

      // Remove the notification after the fade-out animation
      setTimeout(() => {
        notification.remove()
        notificationTimeout = null
      }, 300)
    }, 5000)
  }

  // Function to add event listeners to all delete buttons
  function addDeleteButtonListeners() {
    document.querySelectorAll(".action-button.delete").forEach((button) => {
      // Remove any existing event listeners to prevent duplicates
      button.removeEventListener("click", handleDeleteItem)

      // Add the event listener
      button.addEventListener("click", handleDeleteItem)
    })
  }

  // Add event listeners to delete buttons
  addDeleteButtonListeners()

  // Function to check if we're on mobile
  function isMobileView() {
    return window.innerWidth <= 768
  }

  // Function to handle price info on mobile
  function setupMobilePriceInfo() {
    // Create the modal and overlay if they don't exist
    if (isMobileView() && !document.querySelector(".price-modal-overlay")) {
      // Create overlay
      const overlay = document.createElement("div")
      overlay.className = "price-modal-overlay"
      overlay.addEventListener("click", closePriceModal)
      document.body.appendChild(overlay)

      // Create modal
      const modal = document.createElement("div")
      modal.className = "price-modal"

      // Create modal header
      const header = document.createElement("div")
      header.className = "price-modal-header"

      const title = document.createElement("h3")
      title.textContent = "Desglose de precio"

      const closeButton = document.createElement("button")
      closeButton.className = "close-price-modal"
      closeButton.innerHTML = "&times;"
      closeButton.addEventListener("click", closePriceModal)

      header.appendChild(title)
      header.appendChild(closeButton)
      modal.appendChild(header)

      // Create modal content container
      const content = document.createElement("div")
      content.className = "price-modal-content"
      modal.appendChild(content)

      document.body.appendChild(modal)
    }

    // Process price info elements
    document.querySelectorAll(".cart-item").forEach((cartItem) => {
      // Get the product title
      const productTitle = cartItem ? cartItem.querySelector(".product-title").textContent : "Producto"

      // Find the price info element
      const priceInfo = cartItem.querySelector(".price-info")

      // If price info doesn't exist, skip this item
      if (!priceInfo) {
        return
      }

      // Store product title as data attribute
      priceInfo.dataset.product = productTitle

      // Only create mobile price info elements if we're in mobile view
      if (isMobileView()) {
        // Check if this price info has already been processed for mobile
        if (!cartItem.querySelector(".mobile-price-info")) {
          // Create mobile price info icon
          const mobileInfoIcon = document.createElement("div")
          mobileInfoIcon.className = "mobile-price-info"
          mobileInfoIcon.innerHTML = '<i class="fas fa-info-circle"></i>'
          mobileInfoIcon.dataset.product = productTitle

          // Add click event listener for mobile
          mobileInfoIcon.addEventListener("click", function (e) {
            e.preventDefault()
            e.stopPropagation()
            openPriceModal(this)
          })

          // Find the unit price row
          const unitPriceRow = cartItem.querySelector(".price-row:first-child")
          if (unitPriceRow) {
            const priceValue = unitPriceRow.querySelector(".price-value")
            if (priceValue) {
              // Create a container for the price value and info icon
              const container = document.createElement("div")
              container.className = "price-value-container"

              // Clone the price value
              const priceValueClone = priceValue.cloneNode(true)

              // Add the elements to the container
              container.appendChild(priceValueClone)
              container.appendChild(mobileInfoIcon)

              // Replace the original price value with the container
              priceValue.parentNode.replaceChild(container, priceValue)
            }
          }
        }
      } else {
        // If we're not in mobile view, restore original price values
        const mobileInfoContainer = cartItem.querySelector(".price-value-container")
        if (mobileInfoContainer) {
          const priceValue = mobileInfoContainer.querySelector(":first-child")
          if (priceValue && mobileInfoContainer.parentNode) {
            mobileInfoContainer.parentNode.replaceChild(priceValue, mobileInfoContainer)
          }
        }
      }
    })
    // Limpieza del modal si ya no estamos en vista mobile
    if (!isMobileView()) {
      const overlay = document.querySelector(".price-modal-overlay")
      const modal = document.querySelector(".price-modal")

      if (modal && overlay) {
        // Cerrar modal si estaba abierto
        modal.classList.remove("open")
        overlay.classList.remove("show")
        document.body.classList.remove("modal-open")

        // Esperar un breve instante para que se apliquen transiciones (opcional)
        setTimeout(() => {
          overlay.remove()
          modal.remove()
        }, 100) // podés ajustar este delay si tenés animaciones
      }
    }
  }

  // Function to open price modal
  function openPriceModal(priceInfoElement) {
    const modal = document.querySelector(".price-modal")
    const overlay = document.querySelector(".price-modal-overlay")
    const modalContent = modal.querySelector(".price-modal-content")
    const productTitle = priceInfoElement.dataset.product

    // Update modal title
    modal.querySelector(".price-modal-header h3").textContent = `Desglose de precio: ${productTitle}`

    // Clear previous content
    modalContent.innerHTML = ""

    // Find the cart item with this product title
    const cartItems = document.querySelectorAll(".cart-item")
    let targetCartItem = null

    for (let i = 0; i < cartItems.length; i++) {
      const title = cartItems[i].querySelector(".product-title").textContent
      if (title === productTitle) {
        targetCartItem = cartItems[i]
        break
      }
    }

    if (!targetCartItem) return

    // Get price tooltip content from the original price info element
    const originalPriceInfo = targetCartItem.querySelector(".price-info")
    const tooltipContent = originalPriceInfo ? originalPriceInfo.querySelector(".price-tooltip") : null

    if (tooltipContent) {
      // Clone the price info rows
      const priceInfoRows = tooltipContent.querySelectorAll(".price-info-row")

      priceInfoRows.forEach((row) => {
        const modalRow = document.createElement("div")
        modalRow.className = `price-modal-row ${row.classList.contains("total") ? "total" : ""} ${row.classList.contains("discount") ? "discount" : ""}`

        // Clone the content
        modalRow.innerHTML = row.innerHTML

        modalContent.appendChild(modalRow)
      })
    } else {
      // Fallback if tooltip content not found
      modalContent.innerHTML = "<p>No hay información de desglose disponible.</p>"
    }

    // Show modal and overlay
    modal.classList.add("open")
    overlay.classList.add("show")
    document.body.classList.add("modal-open")
  }

  // Function to close price modal
  function closePriceModal() {
    const modal = document.querySelector(".price-modal")
    const overlay = document.querySelector(".price-modal-overlay")

    if (modal && overlay) {
      modal.classList.remove("open")
      overlay.classList.remove("show")
      document.body.classList.remove("modal-open")
    }
  }

  // Call the setup function
  setupMobilePriceInfo()

  // Add resize listener to handle switching between mobile and desktop views
  window.addEventListener("resize", () => {
    setupMobilePriceInfo()
  })

  // Mobile Order Summary Toggle Functionality
  function setupMobileOrderSummary() {
    const mobileOrderSummary = document.querySelector(".mobile-order-summary");
    const mobileSummaryHeader = document.querySelector(".mobile-summary-header");
    const mobileSummaryTotal = document.querySelector(".mobile-summary-total");
    
    // Skip if elements don't exist
    if (!mobileOrderSummary || !mobileSummaryHeader) return;
    
    // Function to update the mobile summary with data from desktop summary
    function updateMobileSummary() {
      // Update selected items count
      const desktopItemCount = document.querySelector(".desktop-order-summary-container .item-count");
      const mobileItemCount = document.querySelector(".mobile-order-summary .item-count");
      if (desktopItemCount && mobileItemCount) {
        mobileItemCount.textContent = desktopItemCount.textContent;
      }
      
      // Update subtotal
      const desktopSubtotal = document.querySelector(".desktop-order-summary-container .subtotal .price-value");
      const mobileSubtotal = document.querySelector(".mobile-order-summary .subtotal .price-value");
      if (desktopSubtotal && mobileSubtotal) {
        mobileSubtotal.textContent = desktopSubtotal.textContent;
      }
      
      // Update IVA
      const desktopIVA = document.querySelector(".desktop-order-summary-container .IVA .price-value");
      const mobileIVA = document.querySelector(".mobile-order-summary .IVA .price-value");
      if (desktopIVA && mobileIVA) {
        mobileIVA.textContent = desktopIVA.textContent;
      }
      
      // Update total
      const desktopTotal = document.querySelector(".desktop-order-summary-container .total .price-value");
      const mobileTotal = document.querySelector(".mobile-order-summary .total .price-value");
      if (desktopTotal && mobileTotal) {
        mobileTotal.textContent = desktopTotal.textContent;
        mobileSummaryTotal.textContent = desktopTotal.textContent;
      }
      
      // Update checkout button text
      const desktopCheckout = document.querySelector(".desktop-order-summary-container .checkout");
      const mobileCheckout = document.querySelector(".mobile-order-summary .checkout");
      if (desktopCheckout && mobileCheckout) {
        mobileCheckout.textContent = desktopCheckout.textContent;
      }
    }
    
    // NEW CODE: Improved manual toggle and auto-expansion handling
    let isManuallyToggled = false
    let manualToggleTimeout = null
    let manualToggleState = null // Will store the manually set state (expanded or collapsed)
    let lastScrollPosition = 0

    // Calculate the trigger point (slightly above the middle of the viewport)
    function calculateTriggerPoint() {
      const viewportMiddle = window.innerHeight / 2
      const triggerOffset = 100 // 100px above the middle
      return viewportMiddle - triggerOffset
    }

    // Function to check if the summary should expand or collapse
    function checkSummaryPosition() {
      // If the user manually toggled the summary recently, respect that choice
      if (isManuallyToggled) return

      // Get the position of the mobile order summary
      const summaryRect = mobileOrderSummary.getBoundingClientRect()

      // Get the current trigger point
      const triggerPoint = calculateTriggerPoint()

      // Check if the top of the summary is at or above the trigger point
      if (summaryRect.top <= triggerPoint) {
        // Expand the summary
        mobileOrderSummary.classList.remove("collapsed")
      } else {
        // Collapse the summary
        mobileOrderSummary.classList.add("collapsed")
      }
    }

    // Function to handle scroll events
    function handleScroll() {
      // Skip position check if manually toggled recently
      if (!isManuallyToggled) {
        checkSummaryPosition()
      }

      // Store the last scroll position
      lastScrollPosition = window.scrollY
    }

    // Improved manual toggle handler
    mobileSummaryHeader.addEventListener("click", (e) => {
      e.stopPropagation() // Prevent event bubbling

      // Toggle the collapsed state
      const wasCollapsed = mobileOrderSummary.classList.contains("collapsed")

      if (wasCollapsed) {
        mobileOrderSummary.classList.remove("collapsed")
        manualToggleState = "expanded"
      } else {
        mobileOrderSummary.classList.add("collapsed")
        manualToggleState = "collapsed"
      }

      // Set the manual toggle flag
      isManuallyToggled = true

      // Clear any existing timeout
      if (manualToggleTimeout) {
        clearTimeout(manualToggleTimeout)
      }

      // Reset the flag after a longer delay (5 seconds)
      manualToggleTimeout = setTimeout(() => {
        // Only return to automatic behavior if the user hasn't scrolled significantly
        const currentScrollPosition = window.scrollY
        const hasScrolledSignificantly = Math.abs(currentScrollPosition - lastScrollPosition) > 50

        if (!hasScrolledSignificantly) {
          isManuallyToggled = false
          manualToggleState = null
          // Don't immediately check position - wait for next scroll
        }
      }, 5000)
    })

    // Add scroll event listener with throttling for better performance
    let scrollTimeout
    window.addEventListener(
      "scroll",
      () => {
        // Clear the previous timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }

        // Set a new timeout to run the scroll handler
        scrollTimeout = setTimeout(handleScroll, 10)
      },
      { passive: true },
    )

    // Check position on resize as well
    let resizeTimeout
    window.addEventListener("resize", () => {
      // Clear the previous timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }

      // Set a new timeout to run the resize handler
      resizeTimeout = setTimeout(checkSummaryPosition, 100)
    })

    // Initial check
    setTimeout(checkSummaryPosition, 500) // Slight delay to ensure proper rendering
    
    // Update mobile summary whenever desktop summary changes
    const desktopSummary = document.querySelector(".desktop-order-summary-container");
    if (desktopSummary) {
      const observer = new MutationObserver(updateMobileSummary);
      observer.observe(desktopSummary, { 
        childList: true, 
        subtree: true,
        characterData: true,
        attributes: true
      });
    }
    
    // Initial update of mobile summary
    updateMobileSummary();
  }
  
  // Call the setup function
  setupMobileOrderSummary();
  
  // Sync coupon functionality between desktop and mobile
  function syncCouponFunctionality() {
    const desktopCouponInput = document.querySelector(".desktop-order-summary-container .coupon-input input");
    const mobileCouponInput = document.querySelector(".mobile-order-summary .coupon-input input");
    const desktopCouponButton = document.querySelector(".desktop-order-summary-container .coupon-input button");
    const mobileCouponButton = document.querySelector(".mobile-order-summary .coupon-input button");
    
    if (desktopCouponInput && mobileCouponInput) {
      // Sync input values
      desktopCouponInput.addEventListener("input", () => {
        mobileCouponInput.value = desktopCouponInput.value;
      });
      
      mobileCouponInput.addEventListener("input", () => {
        desktopCouponInput.value = mobileCouponInput.value;
      });
      
      // Sync button clicks
      if (mobileCouponButton) {
        mobileCouponButton.addEventListener("click", () => {
          if (desktopCouponButton) {
            desktopCouponButton.click();
          }
        });
      }
    }
  }
  
  // Call the sync function
  syncCouponFunctionality();
})
