// This is the updated JavaScript code with the requested changes

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
  // Size Breakdown
  // =====================================================================
  (function () {
    /***  0. Selectores base ***************************************************/
    const ITEM_SEL         = '.cart-item';
    const TITLE_SEL        = '.product-title';
    const PRODUCT_DIV_SEL  = '.product-details';          // contenedor del botón
    const QTY_DISPLAY_SEL  = '.product-quantity span';    // texto "Cantidad: n"
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
  // Address Form
  // =====================================================================
  
  // Initialize shipping cost estimator
  function initShippingCostEstimator() {
    // This function will be called when the calculate shipping button is clicked
    // It's now empty because we'll handle this in the address form
  }
  
  // Initialize address form functionality
  function initAddressForm() {
    // Check if the shipping section exists
    const shippingSection = document.querySelector(".shipping-option-section");
    if (!shippingSection) return;
    
    // Check if address form already exists
    if (document.querySelector(".address-form-container")) return;
    
    // Get the add address button
    const addAddressBtn = document.querySelector(".add-address-btn");
    if (!addAddressBtn) return;
    
    // Create address form container
    const addressFormContainer = document.createElement("div");
    addressFormContainer.className = "address-form-container";
    addressFormContainer.style.display = "none";
    
    // Create address form HTML
    addressFormContainer.innerHTML = `
      <form id="addressForm" class="address-form">
        <div class="form-row">
          <div class="form-group">
            <label for="calle">Calle*</label>
            <input type="text" id="calle" name="calle" required>
          </div>
          <div class="form-group">
            <label for="numero">Número*</label>
            <input type="text" id="numero" name="numero" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="piso">Piso</label>
            <input type="text" id="piso" name="piso">
          </div>
          <div class="form-group">
            <label for="departamento">Departamento</label>
            <input type="text" id="departamento" name="departamento">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="codigo-postal">Código postal*</label>
            <input type="text" id="codigo-postal" name="codigo-postal" required>
          </div>
          <div class="form-group">
            <label for="ciudad">Ciudad*</label>
            <input type="text" id="ciudad" name="ciudad" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="provincia">Provincia*</label>
            <input type="text" id="provincia" name="provincia" required>
          </div>
          <div class="form-group">
            <label for="telefono">Número de teléfono*</label>
            <input type="tel" id="telefono" name="telefono" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group full-width">
            <label for="referencias">Referencias de entrega (opcional)</label>
            <textarea id="referencias" name="referencias" rows="3"></textarea>
          </div>
        </div>

        <div class="shipping-cost-container" style="display: none;">
          <div class="shipping-cost-estimator">
            <h3>Costo de envío estimado: $23.000</h3>
            <p class="shipping-cost-notice">El costo de envío es un aproximado y puede variar en la factura final. Consultar por mínimos de compra para envío bonificado.</p>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="cancel-btn" id="cancelAddressForm">Cancelar</button>
          <button type="button" class="calculate-shipping-btn" id="calculateShipping">Calcular costo de envío</button>
          <button type="submit" class="save-btn">Guardar dirección</button>
        </div>
      </form>
    `;
    
    // Create saved addresses container
    const savedAddressesContainer = document.createElement("div");
    savedAddressesContainer.className = "saved-addresses";
    savedAddressesContainer.style.display = "none";
    
    // Insert elements after the add address button
    const shippingOptionContent = addAddressBtn.parentNode;
    shippingOptionContent.appendChild(addressFormContainer);
    shippingOptionContent.appendChild(savedAddressesContainer);
    
    // Get form elements
    const addressForm = document.getElementById("addressForm");
    const cancelAddressFormBtn = document.getElementById("cancelAddressForm");
    
    // Toggle address form
    addAddressBtn.addEventListener("click", () => {
      addressFormContainer.style.display = "block";
      addAddressBtn.style.display = "none";
      
      // Reset shipping cost container when adding a new address
      const shippingCostContainer = addressFormContainer.querySelector(".shipping-cost-container");
      if (shippingCostContainer) {
        shippingCostContainer.style.display = "none";
      }
    });
    
    // Cancel address form
    cancelAddressFormBtn.addEventListener("click", () => {
      addressFormContainer.style.display = "none";
      addressForm.reset();
      
      // Reset shipping cost container
      const shippingCostContainer = addressFormContainer.querySelector(".shipping-cost-container");
      if (shippingCostContainer) {
        shippingCostContainer.style.display = "none";
      }
      
      // If there are saved addresses, don't show the add button
      // Otherwise, show it
      if (savedAddressesContainer.children.length === 0 || 
          (savedAddressesContainer.children.length === 1 && savedAddressesContainer.children[0].classList.contains("add-address-btn"))) {
        addAddressBtn.style.display = "flex";
      } else {
        // Find the "add another address" button
        const addAnotherBtn = savedAddressesContainer.querySelector(".add-address-btn");
        if (addAnotherBtn) {
          addAnotherBtn.style.display = "flex";
        }
      }
    });
    
    // Form submission
    addressForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Validate form
      if (!validateForm()) {
        return;
      }
      
      // Get form data
      const formData = new FormData(addressForm);
      const addressData = {
        calle: formData.get("calle"),
        numero: formData.get("numero"),
        piso: formData.get("piso"),
        departamento: formData.get("departamento"),
        codigoPostal: formData.get("codigo-postal"),
        ciudad: formData.get("ciudad"),
        provincia: formData.get("provincia"),
        telefono: formData.get("telefono"),
        referencias: formData.get("referencias")
      };
      
      // Get shipping cost if it's calculated
      const shippingCostContainer = addressFormContainer.querySelector(".shipping-cost-container");
      if (shippingCostContainer && shippingCostContainer.style.display !== "none") {
        addressData.shippingCost = "23.000"; // Get the actual value from the container
      }
      
      // Create address card
      createAddressCard(addressData);
      
      // Hide form and reset
      addressFormContainer.style.display = "none";
      addressForm.reset();
      
      // Reset shipping cost container
      if (shippingCostContainer) {
        shippingCostContainer.style.display = "none";
      }
    });

    // Calculate shipping button event listener
    const calculateShippingBtn = document.getElementById("calculateShipping");
    if (calculateShippingBtn) {
      calculateShippingBtn.addEventListener("click", () => {
        // Show shipping cost container
        const shippingCostContainer = document.querySelector(".shipping-cost-container");
        if (shippingCostContainer) {
          shippingCostContainer.style.display = "block";
        }
      });
    }
    
    // Validate form
    function validateForm() {
      const requiredFields = ["calle", "numero", "codigo-postal", "ciudad", "provincia", "telefono"];
      let isValid = true;
      
      // Remove previous error messages
      document.querySelectorAll(".error-message").forEach(el => el.remove());
      document.querySelectorAll(".error").forEach(el => el.classList.remove("error"));
      
      // Check required fields
      requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input.value.trim()) {
          input.classList.add("error");
          
          // Add error message
          const errorMessage = document.createElement("span");
          errorMessage.className = "error-message";
          errorMessage.textContent = "Este campo es obligatorio";
          input.parentNode.appendChild(errorMessage);
          
          isValid = false;
        }
      });
      
      return isValid;
    }
    
    // Create address card
    function createAddressCard(addressData) {
      // Show saved addresses container
      savedAddressesContainer.style.display = "flex";
      
      // Remove "add address" button if it exists
      const existingAddBtn = savedAddressesContainer.querySelector(".add-address-btn");
      if (existingAddBtn) {
        existingAddBtn.remove();
      }
      
      // Create address card
      const addressCard = document.createElement("div");
      addressCard.className = "address-card";
      
      // Create radio container
      const radioContainer = document.createElement("label");
      radioContainer.className = "radio-container";
      
      // Create radio input
      const radioInput = document.createElement("input");
      radioInput.type = "radio";
      radioInput.name = "delivery-address";
      radioInput.checked = true; // Select this address by default
      
      // Create radio checkmark
      const radioCheckmark = document.createElement("span");
      radioCheckmark.className = "radio-checkmark";
      
      // Create address details
      const addressDetails = document.createElement("div");
      addressDetails.className = "address-details";
      
      // Add address information
      addressDetails.innerHTML = `
        <p>${addressData.calle} ${addressData.numero}, ${addressData.piso} ${addressData.departamento} ${addressData.codigoPostal}</p>
        <p>${addressData.ciudad}, ${addressData.provincia}</p>
        <p>Teléfono: ${addressData.telefono}</p>
        ${addressData.referencias ? `<p class="delivery-instructions">Nota: ${addressData.referencias}</p>` : ""}
        ${addressData.shippingCost ? `
          <div class="address-shipping-cost">
            <h4>Costo de envío estimado: $${addressData.shippingCost}</h4>
            <p class="shipping-cost-notice">El costo de envío es un aproximado y puede variar en la factura final.</p>
          </div>
        ` : ""}
      `;
      
      // Create edit button
      const editButton = document.createElement("button");
      editButton.className = "edit-address-btn";
      editButton.innerHTML = '<i class="fas fa-edit"></i>';
      editButton.title = "Editar dirección";
      
      // Add edit button event listener
      editButton.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent triggering the address card click
        editAddress(addressCard, addressData);
      });
      
      // Append elements
      radioContainer.appendChild(radioInput);
      radioContainer.appendChild(radioCheckmark);
      radioContainer.appendChild(addressDetails);
      addressCard.appendChild(radioContainer);
      addressCard.appendChild(editButton);
      
      // Select this address card
      selectAddressCard(addressCard);
      
      // Add to saved addresses
      savedAddressesContainer.appendChild(addressCard);
      
      // Add "add another address" button
      const addAnotherBtn = document.createElement("button");
      addAnotherBtn.type = "button";
      addAnotherBtn.className = "add-address-btn";
      addAnotherBtn.innerHTML = '<i class="fas fa-plus"></i> Agregar otra dirección';
      
      addAnotherBtn.addEventListener("click", () => {
        addressFormContainer.style.display = "block";
        addAnotherBtn.style.display = "none";
        
        // Reset form and shipping cost container
        addressForm.reset();
        const shippingCostContainer = addressFormContainer.querySelector(".shipping-cost-container");
        if (shippingCostContainer) {
          shippingCostContainer.style.display = "none";
        }
      });
      
      savedAddressesContainer.appendChild(addAnotherBtn);
      
      // Add click event to select address
      addressCard.addEventListener("click", () => {
        selectAddressCard(addressCard);
      });
    }
    
    // Edit address function
    function editAddress(addressCard, addressData) {
      // Show the address form
      addressFormContainer.style.display = "block";
      
      // Hide the "add another address" button
      const addAnotherBtn = savedAddressesContainer.querySelector(".add-address-btn");
      if (addAnotherBtn) {
        addAnotherBtn.style.display = "none";
      }
      
      // Fill the form with address data
      document.getElementById("calle").value = addressData.calle;
      document.getElementById("numero").value = addressData.numero;
      document.getElementById("piso").value = addressData.piso || "";
      document.getElementById("departamento").value = addressData.departamento || "";
      document.getElementById("codigo-postal").value = addressData.codigoPostal;
      document.getElementById("ciudad").value = addressData.ciudad;
      document.getElementById("provincia").value = addressData.provincia;
      document.getElementById("telefono").value = addressData.telefono;
      document.getElementById("referencias").value = addressData.referencias || "";
      
      // Show shipping cost if it exists
      if (addressData.shippingCost) {
        const shippingCostContainer = addressFormContainer.querySelector(".shipping-cost-container");
        if (shippingCostContainer) {
          shippingCostContainer.style.display = "block";
        }
      }
      
      // Remove the address card
      addressCard.remove();
      
      // If there are no more address cards, show the main add address button
      if (savedAddressesContainer.querySelectorAll(".address-card").length === 0) {
        savedAddressesContainer.style.display = "none";
        addAddressBtn.style.display = "flex";
      }
    }
    
    // Select address card
    function selectAddressCard(selectedCard) {
      // Deselect all cards
      const addressCards = document.querySelectorAll(".address-card");
      addressCards.forEach(card => {
        card.classList.remove("selected");
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = false;
        }
      });
      
      // Select this card
      selectedCard.classList.add("selected");
      const radio = selectedCard.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }

      // Uncheck office option when address card is selected
      const officeRadio = document.querySelector('.office-option input[type="radio"]');
      if (officeRadio) {
        officeRadio.checked = false;
        document.querySelector(".office-option").classList.remove("selected");
      }
    }
  }

  // Initialize office option selection
  function initOfficeOption() {
    const officeOption = document.querySelector(".office-option");
    const officeRadio = officeOption?.querySelector('input[type="radio"]');

    if (officeOption && officeRadio) {
      // Add click event to select office option
      officeOption.addEventListener("click", () => {
        // Uncheck all address cards
        const addressCards = document.querySelectorAll(".address-card");
        addressCards.forEach((card) => {
          card.classList.remove("selected");
          const radio = card.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = false;
          }
        });

        // Select office option
        officeRadio.checked = true;
        officeOption.classList.add("selected");
      });
    }
  }

  // =====================================================================
  // Event Order Date
  // =====================================================================
  
  // Initialize event order date functionality
  function initEventOrderDate() {
    const eventCheckbox = document.querySelector('input[name="is-event"]');
    if (!eventCheckbox) return;
    
    // Create event date container if it doesn't exist
    let eventDateContainer = document.querySelector('.event-date-container');
    if (!eventDateContainer) {
      eventDateContainer = document.createElement('div');
      eventDateContainer.className = 'event-date-container';
      eventDateContainer.style.display = 'none';
      
      // Create event date HTML
      eventDateContainer.innerHTML = `
        <div class="event-date-field">
          <label for="event-date">Fecha de entrega solicitada</label>
          <div class="date-input-wrapper">
            <input type="text" id="event-date" name="event-date" placeholder="dd/mm/aaaa" readonly>
            <i class="fas fa-calendar-alt"></i>
          </div>
        </div>
        <div class="production-time-info">
          <i class="fas fa-info-circle"></i>
          <span>10 días hábiles es el tiempo estimado de producción, pero se puede acelerar en ciertos casos.</span>
        </div>
      `;
      
      // Insert after the event option
      const eventOption = document.querySelector('.event-option');
      if (eventOption) {
        eventOption.parentNode.insertBefore(eventDateContainer, eventOption.nextSibling);
      }
      
      // Initialize date picker
      const dateInput = document.getElementById('event-date');
      const dateIcon = eventDateContainer.querySelector('.fa-calendar-alt');
      
      // Create date picker
      if (dateInput) {
        // Create a simple date picker that opens when clicking on the input or icon
        dateInput.addEventListener('click', function() {
          showDatePicker(this);
        });
        
        if (dateIcon) {
          dateIcon.addEventListener('click', function() {
            showDatePicker(dateInput);
          });
        }
      }
    }
    
    // Toggle event date container based on checkbox
    eventCheckbox.addEventListener('change', function() {
      const eventDateContainer = document.querySelector('.event-date-container');
      if (eventDateContainer) {
        eventDateContainer.style.display = this.checked ? 'block' : 'none';
      }
    });
    
    // Check if checkbox is already checked (page refresh)
    if (eventCheckbox.checked) {
      const eventDateContainer = document.querySelector('.event-date-container');
      if (eventDateContainer) {
        eventDateContainer.style.display = 'block';
      }
    }
    
    // Simple date picker function
    function showDatePicker(inputElement) {
      // Create date picker if it doesn't exist
      let datePicker = document.querySelector('.date-picker');
      if (!datePicker) {
        datePicker = document.createElement('div');
        datePicker.className = 'date-picker';
        document.body.appendChild(datePicker);
        
        // Position the date picker
        positionDatePicker(datePicker, inputElement);
        
        // Generate calendar
        generateCalendar(datePicker, inputElement);
        
        // Close when clicking outside
        document.addEventListener('click', function closeOnClickOutside(e) {
          if (!datePicker.contains(e.target) && e.target !== inputElement && !e.target.classList.contains('fa-calendar-alt')) {
            datePicker.remove();
            document.removeEventListener('click', closeOnClickOutside);
          }
        });
      }
    }

    // Add window resize event listener to close date picker when resizing
    window.addEventListener("resize", () => {
      const datePicker = document.querySelector(".date-picker");
      if (datePicker) {
        datePicker.remove();
      }
    });
    
    // Position date picker
    function positionDatePicker(datePicker, inputElement) {
      const inputRect = inputElement.getBoundingClientRect();
      datePicker.style.position = 'absolute';
      datePicker.style.top = (inputRect.bottom + window.scrollY) + 'px';
      datePicker.style.left = (inputRect.left + window.scrollX) + 'px';
      datePicker.style.zIndex = '1000';
    }
    
    // Generate calendar
    function generateCalendar(datePicker, inputElement) {
      // Get current date
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Create calendar header
      const calendarHeader = document.createElement('div');
      calendarHeader.className = 'calendar-header';
      
      const prevMonthBtn = document.createElement('button');
      prevMonthBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevMonthBtn.className = 'prev-month';
      
      const monthYearDisplay = document.createElement('div');
      monthYearDisplay.className = 'month-year';
      monthYearDisplay.textContent = getMonthName(currentMonth) + ' ' + currentYear;
      
      const nextMonthBtn = document.createElement('button');
      nextMonthBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextMonthBtn.className = 'next-month';
      
      calendarHeader.appendChild(prevMonthBtn);
      calendarHeader.appendChild(monthYearDisplay);
      calendarHeader.appendChild(nextMonthBtn);
      
      // Create calendar days
      const calendarDays = document.createElement('div');
      calendarDays.className = 'calendar-days';
      
      // Add day headers
      const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
      dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarDays.appendChild(dayHeader);
      });
      
      // Add days
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day empty';
        calendarDays.appendChild(emptyDay);
      }
      
      // Add days of the month
      for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'day';
        day.textContent = i;
        
        // Highlight today
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
          day.classList.add('today');
        }
        
        // Add click event to select date
        day.addEventListener('click', function() {
          const selectedDate = new Date(currentYear, currentMonth, i);
          inputElement.value = formatDate(selectedDate);
          datePicker.remove();
        });
        
        calendarDays.appendChild(day);
      }
      
      // Add calendar to date picker
      datePicker.appendChild(calendarHeader);
      datePicker.appendChild(calendarDays);
      
      // Add event listeners for navigation
      prevMonthBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        navigateMonth(datePicker, inputElement, currentMonth - 1, currentYear);
      });
      
      nextMonthBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        navigateMonth(datePicker, inputElement, currentMonth + 1, currentYear);
      });
    }
    
    // Navigate to a different month
    function navigateMonth(datePicker, inputElement, month, year) {
      // Adjust year if month is out of range
      if (month < 0) {
        month = 11;
        year--;
      } else if (month > 11) {
        month = 0;
        year++;
      }
      
      // Clear date picker
      datePicker.innerHTML = '';
      
      // Regenerate calendar
      const calendarHeader = document.createElement('div');
      calendarHeader.className = 'calendar-header';
      
      const prevMonthBtn = document.createElement('button');
      prevMonthBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevMonthBtn.className = 'prev-month';
      
      const monthYearDisplay = document.createElement('div');
      monthYearDisplay.className = 'month-year';
      monthYearDisplay.textContent = getMonthName(month) + ' ' + year;
      
      const nextMonthBtn = document.createElement('button');
      nextMonthBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextMonthBtn.className = 'next-month';
      
      calendarHeader.appendChild(prevMonthBtn);
      calendarHeader.appendChild(monthYearDisplay);
      calendarHeader.appendChild(nextMonthBtn);
      
      // Create calendar days
      const calendarDays = document.createElement('div');
      calendarDays.className = 'calendar-days';
      
      // Add day headers
      const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
      dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarDays.appendChild(dayHeader);
      });
      
      // Add days
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day empty';
        calendarDays.appendChild(emptyDay);
      }
      
      // Add days of the month
      for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'day';
        day.textContent = i;
        
        // Highlight today
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
          day.classList.add('today');
        }
        
        // Add click event to select date
        day.addEventListener('click', function() {
          const selectedDate = new Date(year, month, i);
          inputElement.value = formatDate(selectedDate);
          datePicker.remove();
        });
        
        calendarDays.appendChild(day);
      }
      
      // Add calendar to date picker
      datePicker.appendChild(calendarHeader);
      datePicker.appendChild(calendarDays);
      
      // Add event listeners for navigation
      prevMonthBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        navigateMonth(datePicker, inputElement, month - 1, year);
      });
      
      nextMonthBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        navigateMonth(datePicker, inputElement, month + 1, year);
      });
    }
    
    // Helper functions
    function getMonthName(month) {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return monthNames[month];
    }
    
    function formatDate(date) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  
  // Initialize address form
  initAddressForm();

  // Initialize event order date
  initEventOrderDate();

  // Initialize office option selection
  initOfficeOption();
});

// Add CSS for the edit button
document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = `
    .address-card {
      position: relative;
    }
    
    .edit-address-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #666;
      padding: 5px;
      border-radius: 50%;
      transition: background-color 0.2s;
    }
    
    .edit-address-btn:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #333;
    }
    
    .address-shipping-cost {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
    
    .address-shipping-cost h4 {
      margin: 0 0 5px 0;
      font-size: 14px;
      font-weight: 600;
    }
    
    .address-shipping-cost .shipping-cost-notice {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
});

console.log("Script loaded successfully. The shipping cost estimator now works with each address, and edit buttons have been added.");