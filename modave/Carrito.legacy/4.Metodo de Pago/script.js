document.addEventListener("DOMContentLoaded", () => {
  // =====================================================================
  // Order Summary Toggle
  // =====================================================================
  const toggleButton = document.querySelector(".toggle-button")
  const orderSummary = document.querySelector(".order-summary")

  // Set the initial total price in the toggle button
  const totalPriceElement = document.querySelector(".price-row.total .price-value")
  if (totalPriceElement) {
    const totalPrice = totalPriceElement.textContent
    document.querySelector(".total-price").textContent = totalPrice
  }

  // Add click event to toggle button
  if (toggleButton && orderSummary) {
    toggleButton.addEventListener("click", function () {
      // Toggle active class on button
      this.classList.toggle("active")

      // Toggle active class on order summary
      orderSummary.classList.toggle("active")
    })
  }

  // =====================================================================
  //  Dropdown Menu
  // =====================================================================
  const dropdownToggle = document.querySelector(".dropdown-toggle")
  const dropdownMenu = document.querySelector(".dropdown-menu")

  if (dropdownToggle && dropdownMenu) {
    dropdownToggle.addEventListener("click", (e) => {
      e.stopPropagation()
      dropdownMenu.classList.toggle("show")
    })

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      if (dropdownMenu.classList.contains("show")) {
        dropdownMenu.classList.remove("show")
      }
    })
  }

  // =====================================================================
  // PAYMENT OPTIONS FUNCTIONALITY
  // =====================================================================
  const paymentOptions = document.querySelectorAll(".payment-option")
  const paymentForm = document.querySelector(".payment-form")

  // Function to unselect all payment options
  const unselectAllPaymentOptions = () => {
    paymentOptions.forEach((opt) => {
      // Remove selected class
      opt.classList.remove("selected")

      // Remove expanded class
      opt.classList.remove("expanded")

      // Uncheck radio button
      const radio = opt.querySelector('input[type="radio"]')
      if (radio) {
        radio.checked = false
      }

      // Hide bank details
      const details = opt.querySelector(".bank-details")
      if (details) {
        details.style.display = "none"
      }
    })
  }

  // Add bank details to transferencia option
  const addBankDetailsToTransferencia = () => {
    // Find the transferencia payment option
    const transferenciaOption = document
      .querySelector('.payment-option input[value="transferencia"]')
      .closest(".payment-option")

    // Check if bank details already exist
    if (transferenciaOption.querySelector(".bank-details")) {
      return
    }

    // Create bank details element
    const bankDetails = document.createElement("div")
    bankDetails.className = "bank-details"
    bankDetails.innerHTML = `
      <p class="clarification">Los datos bancarios que se encuentran a continuación también te los enviaremos junto con la factura al correo electrónico.</p>
      <p class="bank-name">BANCO SUPERVIELLE Cuenta Corriente</p>
      <div class="bank-info">
        <div class="bank-info-row">
          <span class="bank-info-label">NOMBRE:</span>
          <span class="bank-info-value">FORMAS PUBLICITARIAS SA</span>
        </div>
        <div class="bank-info-row">
          <span class="bank-info-label">SUCURSAL y CUENTA:</span>
          <span class="bank-info-value">55-004136797/2</span>
        </div>
        <div class="bank-info-row">
          <span class="bank-info-label">CUIT:</span>
          <span class="bank-info-value">33709951519</span>
        </div>
        <div class="bank-info-row">
          <span class="bank-info-label">CBU:</span>
          <span class="bank-info-value">0270055710004136790021</span>
        </div>
        <div class="bank-info-row">
          <span class="bank-info-label">ALIAS:</span>
          <span class="bank-info-value">BANCOSUPERVIELLEPP (todo en mayúscula)</span>
        </div>
      </div>
    `

    // Initially hide the bank details
    bankDetails.style.display = "none"

    // Append bank details to the transferencia option
    transferenciaOption.appendChild(bankDetails)
  }

  // Initialize payment options
  const initPaymentOptions = () => {
    // Add bank details to transferencia option
    addBankDetailsToTransferencia()

    // Add click event to each payment option
    paymentOptions.forEach((option) => {
      const radioInput = option.querySelector('input[type="radio"]')
      const bankDetails = option.querySelector(".bank-details")

      // Add click event to the entire payment option
      option.addEventListener("click", (e) => {
        // Stop propagation to prevent document click from triggering immediately
        e.stopPropagation()

        // If this option is already selected, do nothing (let document click handle unselection)
        if (option.classList.contains("selected")) {
          return
        }

        // Unselect all options first
        unselectAllPaymentOptions()

        // Check the radio input
        radioInput.checked = true

        // Add selected class to clicked option
        option.classList.add("selected")

        // Show bank details if transferencia is selected and has bank details
        if (radioInput.value === "transferencia" && bankDetails) {
          bankDetails.style.display = "block"
          // Expand the payment option to fit the bank details
          option.classList.add("expanded")
        }
      })
    })

    // Add click event to document to unselect when clicking outside
    document.addEventListener("click", (e) => {
      // Check if click is outside any payment option and payment form
      if (!paymentForm.contains(e.target) || (paymentForm.contains(e.target) && !e.target.closest(".payment-option"))) {
        unselectAllPaymentOptions()
      }
    })

    // Check if transferencia is already selected on page load
    const transferenciaInput = document.querySelector('input[value="transferencia"]:checked')
    if (transferenciaInput) {
      const transferenciaOption = transferenciaInput.closest(".payment-option")
      transferenciaOption.classList.add("selected")
      const bankDetails = transferenciaOption.querySelector(".bank-details")
      if (bankDetails) {
        bankDetails.style.display = "block"
        transferenciaOption.classList.add("expanded")
      }
    }
  }

  // Initialize payment options
  initPaymentOptions()

  // =====================================================================
  // Size Breakdown
  // =====================================================================
  ;(() => {
    /***  0. Selectores base ***************************************************/
    const ITEM_SEL = ".cart-item"
    const TITLE_SEL = ".product-title"
    const PRODUCT_DIV_SEL = ".product-details" // contenedor del botón
    const QTY_DISPLAY_SEL = ".product-quantity span" // texto "Cantidad: n"
    const SIZE_INFO_SEL = ".size-info" // bloque con desglose

    /***  1. Stock simulado – reemplázalo por tu API ***************************/
    const STOCK = { S: 262, M: 5, L: 1633, XL: 30 } // TODO sustituir

    /***  2. Utilitarios *******************************************************/
    function isApparel(cartItem) {
      const n = cartItem.querySelector(TITLE_SEL)?.textContent.toLowerCase() || ""
      return /remera|camisa|pantal(|ó)n|campera|buzo/.test(n)
    }

    function currentQty(cartItem) {
      const span = cartItem.querySelector(QTY_DISPLAY_SEL)
      return span ? +span.textContent.match(/\d+/)[0] : 0
    }

    function setQty(cartItem, q) {
      const span = cartItem.querySelector(QTY_DISPLAY_SEL)
      if (span) span.textContent = `Cantidad: ${q}`
    }

    /***  3. Sidebar shell (overlay + contenedor) ******************************/
    function ensureShell() {
      if (!document.querySelector(".size-breakdown-overlay")) {
        const ov = document.createElement("div")
        ov.className = "size-breakdown-overlay"
        ov.addEventListener("click", closeSidebar)
        document.body.appendChild(ov)
      }
      if (!document.querySelector(".size-breakdown-sidebar")) {
        const sb = document.createElement("div")
        sb.className = "size-breakdown-sidebar"
        sb.innerHTML = `
          <div class="sidebar-header">
            <h3>Desglose de talles</h3>
            <button class="close-sidebar">&times;</button>
          </div>
          <div class="sidebar-content"></div>`
        sb.querySelector(".close-sidebar").addEventListener("click", closeSidebar)
        document.body.appendChild(sb)
      }
    }

    function openSidebar(cartItem) {
      ensureShell()
      const sb = document.querySelector(".size-breakdown-sidebar")
      const overlay = document.querySelector(".size-breakdown-overlay")
      const content = sb.querySelector(".sidebar-content")
      content.innerHTML = ""

      /* --- Encabezado producto -------------------------------------------- */
      const img = cartItem.querySelector(".product-img img")?.cloneNode(true) || ""
      const title = cartItem.querySelector(TITLE_SEL)?.textContent || "Producto"
      content.insertAdjacentHTML(
        "beforeend",
        `<div class="sidebar-product-info">
          ${img.outerHTML || ""}
          <div class="sidebar-product-details"><h4>${title}</h4></div>
        </div>`,
      )

      /* --- Tabla de talles ------------------------------------------------- */
      const sizeWrap = document.createElement("div")
      sizeWrap.className = "sidebar-size-breakdown"
      Object.entries(STOCK).forEach(([size, stock]) => {
        sizeWrap.insertAdjacentHTML(
          "beforeend",
          `<div class="sidebar-size-row">
            <div class="sidebar-size-label">${size} <span class="stock-info">(${stock} un.)</span></div>
            <div class="sidebar-size-quantity-input">
              <input type="number" class="sidebar-size-quantity" min="0" max="${stock}" data-stock="${stock}" value="0" disabled>
              <div class="sidebar-quantity-arrows" style="display:none">
                <div class="sidebar-arrow up">▲</div>
                <div class="sidebar-arrow down">▼</div>
              </div>
            </div>
          </div>`,
        )
      })
      content.appendChild(sizeWrap)

      /* --- Autorreparto de cantidades --- */
      const total = currentQty(cartItem)
      const inputs = [...sizeWrap.querySelectorAll("input")]
      const base = Math.floor(total / inputs.length)
      let restos = total % inputs.length
      inputs.forEach((inp) => {
        inp.value = base + (restos-- > 0 ? 1 : 0)
      })

      /* --- Mostrar --------------------------------------------------------- */
      sb.classList.add("open")
      overlay.classList.add("show")
      document.body.classList.add("sidebar-open")
    }

    function closeSidebar() {
      document.querySelector(".size-breakdown-sidebar")?.classList.remove("open")
      document.querySelector(".size-breakdown-overlay")?.classList.remove("show")
      document.body.classList.remove("sidebar-open")
    }

    /***  4. Inyección de botón & listeners ***********************************/
    function prepareItems(scope = document) {
      scope.querySelectorAll(ITEM_SEL).forEach((item) => {
        if (!isApparel(item)) return

        item.classList.add("cart-item-apparel")

        /* Botón externo «Mostrar desglose…» */
        if (!item.querySelector(".size-breakdown-toggle")) {
          const btn = document.createElement("button")
          btn.className = "size-breakdown-toggle"
          btn.textContent = "Mostrar desglose de talles"
          btn.onclick = (e) => {
            e.preventDefault()
            openSidebar(item)
          }
          item.querySelector(PRODUCT_DIV_SEL).appendChild(btn)
        }

        /* Click en la fila de cantidad */
        const qtyRow = item.querySelector(".product-quantity")
        if (qtyRow && !qtyRow.dataset.sbReady) {
          qtyRow.style.cursor = "pointer"
          qtyRow.onclick = () => openSidebar(item)
          qtyRow.dataset.sbReady = "1"
        }
      })
    }

    /***  5. Bootstrap ********************************************************/
    // YA estamos dentro del primer DOMContentLoaded, así que ejecutamos directo
    prepareItems()

    // Si el carrito cambia dinámicamente
    const obs = new MutationObserver(() => prepareItems())
    obs.observe(document.body, { childList: true, subtree: true })
  })()
})
