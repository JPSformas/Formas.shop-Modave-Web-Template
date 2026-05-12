document.addEventListener("DOMContentLoaded", () => {

  // =====================================================================
  // Order Summary Toggle
  // =====================================================================

  // Get the toggle button and order summary
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

      // Change icon based on state
      const icon = this.querySelector(".toggle-icon i")
      if (orderSummary.classList.contains("active")) {
        icon.className = "fas fa-chevron-up"
      } else {
        icon.className = "fas fa-chevron-down"
      }
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
  // Size Breakdown
  // =====================================================================

  (function () {
    /***  0. Selectores base ***************************************************/
    const ITEM_SEL         = '.cart-item';
    const TITLE_SEL        = '.product-title';
    const PRODUCT_DIV_SEL  = '.product-details';          // contenedor del botón
    const QTY_DISPLAY_SEL  = '.product-quantity span';    // texto “Cantidad: n”
    const SIZE_INFO_SEL    = '.size-info';                // bloque con desglose

    /***  1. Stock simulado – reemplázalo por tu API ***************************/
    const STOCK = { S: 262, M: 5, L: 1633, XL: 30 };      // TODO sustituir

    /***  2. Utilitarios *******************************************************/
    function isApparel(cartItem) {
      const n = cartItem.querySelector(TITLE_SEL)?.textContent.toLowerCase() || '';
      return /remera|camisa|pantal(|ó)n|campera|buzo/.test(n);
    }

    function currentQty(cartItem) {
      const span = cartItem.querySelector(QTY_DISPLAY_SEL);
      return span ? +span.textContent.match(/\d+/)[0] : 0;
    }

    function setQty(cartItem, q) {
      const span = cartItem.querySelector(QTY_DISPLAY_SEL);
      if (span) span.textContent = `Cantidad: ${q}`;
    }

    /***  3. Sidebar shell (overlay + contenedor) ******************************/
    function ensureShell() {
      if (!document.querySelector('.size-breakdown-overlay')) {
        const ov = document.createElement('div');
        ov.className = 'size-breakdown-overlay';
        ov.addEventListener('click', closeSidebar);
        document.body.appendChild(ov);
      }
      if (!document.querySelector('.size-breakdown-sidebar')) {
        const sb = document.createElement('div');
        sb.className = 'size-breakdown-sidebar';
        sb.innerHTML = `
          <div class="sidebar-header">
            <h3>Desglose de talles</h3>
            <button class="close-sidebar">&times;</button>
          </div>
          <div class="sidebar-content"></div>`;
        sb.querySelector('.close-sidebar').addEventListener('click', closeSidebar);
        document.body.appendChild(sb);
      }
    }

    function openSidebar(cartItem) {
      ensureShell();
      const sb      = document.querySelector('.size-breakdown-sidebar');
      const overlay = document.querySelector('.size-breakdown-overlay');
      const content = sb.querySelector('.sidebar-content');
      content.innerHTML = '';

      /* --- Encabezado producto -------------------------------------------- */
      const img    = cartItem.querySelector('.product-img img')?.cloneNode(true) || '';
      const title  = cartItem.querySelector(TITLE_SEL)?.textContent || 'Producto';
      content.insertAdjacentHTML(
        'beforeend',
        `<div class="sidebar-product-info">
          ${img.outerHTML || ''}
          <div class="sidebar-product-details"><h4>${title}</h4></div>
        </div>`
      );

      /* --- Tabla de talles ------------------------------------------------- */
      const sizeWrap = document.createElement('div');
      sizeWrap.className = 'sidebar-size-breakdown';
      Object.entries(STOCK).forEach(([size, stock]) => {
        sizeWrap.insertAdjacentHTML(
          'beforeend',
          `<div class="sidebar-size-row">
            <div class="sidebar-size-label">${size} <span class="stock-info">(${stock} un.)</span></div>
            <div class="sidebar-size-quantity-input">
              <input type="number" class="sidebar-size-quantity" min="0" max="${stock}" data-stock="${stock}" value="0" disabled>
              <div class="sidebar-quantity-arrows" style="display:none">
                <div class="sidebar-arrow up">▲</div>
                <div class="sidebar-arrow down">▼</div>
              </div>
            </div>
          </div>`
        );
      });
      content.appendChild(sizeWrap);

      /* --- Autorreparto de cantidades --- */
      const total   = currentQty(cartItem);
      const inputs  = [...sizeWrap.querySelectorAll('input')];
      const base    = Math.floor(total / inputs.length);
      let restos    = total % inputs.length;
      inputs.forEach(inp => {
        inp.value = base + (restos-- > 0 ? 1 : 0);
      });

      /* --- Mostrar --------------------------------------------------------- */
      sb.classList.add('open');
      overlay.classList.add('show');
      document.body.classList.add('sidebar-open');
    }

    function closeSidebar() {
      document.querySelector('.size-breakdown-sidebar')?.classList.remove('open');
      document.querySelector('.size-breakdown-overlay')?.classList.remove('show');
      document.body.classList.remove('sidebar-open');
    }

    /***  4. Inyección de botón & listeners ***********************************/
    function prepareItems(scope = document) {
      scope.querySelectorAll(ITEM_SEL).forEach(item => {
        if (!isApparel(item)) return;

        item.classList.add('cart-item-apparel');

        /* Botón externo «Mostrar desglose…» */
        if (!item.querySelector('.size-breakdown-toggle')) {
          const btn = document.createElement('button');
          btn.className = 'size-breakdown-toggle';
          btn.textContent = 'Mostrar desglose de talles';
          btn.onclick = e => { e.preventDefault(); openSidebar(item); };
          item.querySelector(PRODUCT_DIV_SEL).appendChild(btn);
        }

        /* Click en la fila de cantidad */
        const qtyRow = item.querySelector('.product-quantity');
        if (qtyRow && !qtyRow.dataset.sbReady) {
          qtyRow.style.cursor = 'pointer';
          qtyRow.onclick = () => openSidebar(item);
          qtyRow.dataset.sbReady = '1';
        }
      });
    }

    /***  5. Bootstrap ********************************************************/
    // YA estamos dentro del primer DOMContentLoaded, así que ejecutamos directo
    prepareItems();

    // Si el carrito cambia dinámicamente
    const obs = new MutationObserver(() => prepareItems());
    obs.observe(document.body, { childList: true, subtree: true });
  })();


  // =====================================================================
  // File upload functionality
  // =====================================================================
  
  const uploadBtn = document.querySelector(".upload-btn")
  const uploadedLogosDiv = document.querySelector(".uploaded-logos")

  if (uploadBtn && uploadedLogosDiv) {
    // Create a hidden file input element
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.multiple = true
    fileInput.accept = ".png,.pdf,.ai,.eps"
    fileInput.style.display = "none"
    uploadBtn.parentNode.appendChild(fileInput)

    // Store uploaded files
    const uploadedFiles = []

    // Initialize with default message
    if (!uploadedLogosDiv.querySelector("ul")) {
      uploadedLogosDiv.innerHTML = "<p>Ningún logo adjuntado</p>"
    }

    // Function to update the file list display
    const updateFileListDisplay = () => {
      // Clear the current content
      uploadedLogosDiv.innerHTML = ""

      if (uploadedFiles.length === 0) {
        uploadedLogosDiv.innerHTML = "<p>Ningún logo adjuntado</p>"
        return
      }

      // Create a list of uploaded files
      const fileList = document.createElement("ul")
      fileList.className = "uploaded-files-list"

      // Add each file to the list
      uploadedFiles.forEach((file, index) => {
        const listItem = document.createElement("li")
        listItem.className = "uploaded-file-item"

        // File info container
        const fileInfo = document.createElement("div")
        fileInfo.className = "file-info"

        // Add file icon based on extension
        const fileExtension = file.name.split(".").pop().toLowerCase()
        let iconClass = "fa-file"

        if (fileExtension === "pdf") iconClass = "fa-file-pdf"
        else if (fileExtension === "png") iconClass = "fa-file-image"
        else if (fileExtension === "ai" || fileExtension === "eps") iconClass = "fa-file-image"

        fileInfo.innerHTML = `
          <i class="fas ${iconClass} file-icon"></i>
          <span>${file.name}</span>
        `

        // Delete button
        const deleteBtn = document.createElement("button")
        deleteBtn.className = "file-delete-btn"
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>'
        deleteBtn.title = "Eliminar archivo"

        // Delete file when button is clicked
        deleteBtn.addEventListener("click", () => {
          uploadedFiles.splice(index, 1)
          updateFileListDisplay()
        })

        listItem.appendChild(fileInfo)
        listItem.appendChild(deleteBtn)
        fileList.appendChild(listItem)
      })

      uploadedLogosDiv.appendChild(fileList)
    }

    // Trigger file input when upload button is clicked
    uploadBtn.addEventListener("click", () => {
      fileInput.click()
    })

    // Handle file selection
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        // Add new files to the existing collection
        Array.from(fileInput.files).forEach((file) => {
          // Check if file with same name already exists
          const fileExists = uploadedFiles.some(
            (existingFile) => existingFile.name === file.name && existingFile.size === file.size,
          )

          // Only add if it doesn't exist already
          if (!fileExists) {
            uploadedFiles.push(file)
          }
        })

        // Update the display
        updateFileListDisplay()

        // Reset file input to allow selecting the same file again
        fileInput.value = ""
      }
    })
  }
})

