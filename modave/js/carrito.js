/* =====================================================================
 * Formas Carrito — Shared state, ARS/IVA math, sidebar renderer,
 * and per-step initializers for the multi-page checkout flow.
 *
 * Single sessionStorage key carries data across:
 *   shopping-cart.html -> checkout-buyer.html -> checkout-shipping.html
 *   -> checkout-payment.html -> checkout-confirmation.html -> order-success.html
 * ===================================================================== */
(function (window, document) {
  "use strict";

  var STORAGE_KEY = "formas:carrito:v1";
  var IVA_RATE = 0.21;

  var COUPONS = [
    { code: "FP5", discount: 0.05 },
    { code: "FP10", discount: 0.10 },
    { code: "FP15", discount: 0.15 },
    { code: "FP20", discount: 0.20 },
    { code: "FRENZY30", discount: 0.30 }
  ];

  var DEFAULT_CART = [
    {
      id: "herschel-classic",
      title: "Herschel Classic Backpack",
      image: "images/products/womens/women-19.jpg",
      unitPrice: 97553.50,
      setupPrice: 0,
      qty: 5,
      selected: true,
      logoIncluded: true,
      apparel: false
    },
    {
      id: "remera-fall",
      title: "Remera Fall",
      image: "images/products/womens/women-1.jpg",
      unitPrice: 7364.00,
      setupPrice: 100000,
      qty: 10,
      selected: true,
      logoIncluded: true,
      apparel: true,
      sizes: { S: 2, M: 3, L: 1, XL: 4 }
    },
    {
      id: "botella-toms",
      title: "Botella Toms",
      image: "images/products/womens/women-29.jpg",
      unitPrice: 15811.72,
      setupPrice: 100000,
      qty: 4,
      selected: true,
      logoIncluded: true,
      apparel: false
    },
    {
      id: "botella-toms-nologo",
      title: "Botella Toms (sin logo)",
      image: "images/products/womens/women-176.jpg",
      unitPrice: 15811.72,
      setupPrice: 0,
      qty: 4,
      selected: true,
      logoIncluded: false,
      apparel: false
    }
  ];

  var DEFAULT_STATE = {
    cart: null,
    coupon: null,
    buyer: { nombre: "", apellido: "", razonSocial: "", cuit: "", telefono: "" },
    logos: [],
    shipping: {
      mode: null,
      addresses: [],
      selectedAddressIndex: -1,
      pickupSelected: false,
      isEvent: false,
      eventDate: "",
      cost: 0
    },
    payment: null,
    orderNumber: null
  };

  var APPAREL_STOCK = { S: 262, M: 5, L: 1633, XL: 30 };

  /* ------- Storage ------- */
  function read() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_STATE_WITH_CART());
      var parsed = JSON.parse(raw);
      return Object.assign(clone(DEFAULT_STATE_WITH_CART()), parsed);
    } catch (err) {
      return clone(DEFAULT_STATE_WITH_CART());
    }
  }

  function write(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) { /* ignore quota */ }
  }

  function reset() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function DEFAULT_STATE_WITH_CART() {
    var s = clone(DEFAULT_STATE);
    s.cart = clone(DEFAULT_CART);
    return s;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* ------- Money ------- */
  function parsePrice(text) {
    if (typeof text === "number") return text;
    if (!text || text === "Gratis") return 0;
    var clean = String(text).replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
    var normalized = clean.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  function formatPrice(value) {
    if (value === 0) return "$0,00";
    var negative = value < 0;
    var abs = Math.abs(value);
    var fixed = abs.toFixed(2);
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (negative ? "-$" : "$") + parts.join(",");
  }

  /* ------- Cart math ------- */
  function lineTotal(line) {
    var qty = parseInt(line.qty, 10) || 0;
    var unit = parseFloat(line.unitPrice) || 0;
    var setup = parseFloat(line.setupPrice) || 0;
    return unit * qty + setup;
  }

  function selectedLineTotal(state) {
    var sub = 0;
    state.cart.forEach(function (line) {
      if (line.selected) sub += lineTotal(line);
    });
    return sub;
  }

  function selectedCount(state) {
    return state.cart.filter(function (l) { return l.selected; }).length;
  }

  function findCoupon(code) {
    if (!code) return null;
    var up = String(code).trim().toUpperCase();
    return COUPONS.find(function (c) { return c.code === up; }) || null;
  }

  function computeTotals(state) {
    var subtotal = selectedLineTotal(state);
    var coupon = state.coupon || null;
    var discount = coupon ? subtotal * coupon.discount : 0;
    var totalSinIva = subtotal - discount;
    var iva = totalSinIva * IVA_RATE;
    var shippingCost = (state.shipping && state.shipping.cost) ? parseFloat(state.shipping.cost) || 0 : 0;
    var total = totalSinIva + iva + shippingCost;
    return {
      subtotal: subtotal,
      coupon: coupon,
      discount: discount,
      totalSinIva: totalSinIva,
      iva: iva,
      shippingCost: shippingCost,
      total: total,
      itemCount: selectedCount(state)
    };
  }

  /* ------- Sidebar renderer ------- */
  function renderSidebar(root, opts) {
    if (!root) return;
    var state = read();
    var totals = computeTotals(state);
    opts = opts || {};

    root.querySelectorAll("[data-totals='itemCount']").forEach(function (el) {
      el.textContent = totals.itemCount;
    });
    root.querySelectorAll("[data-totals='subtotal']").forEach(function (el) {
      el.textContent = formatPrice(totals.subtotal);
    });
    root.querySelectorAll("[data-totals='discount']").forEach(function (el) {
      el.textContent = "-" + formatPrice(totals.discount);
    });
    root.querySelectorAll("[data-totals='totalSinIva']").forEach(function (el) {
      el.textContent = formatPrice(totals.totalSinIva);
    });
    root.querySelectorAll("[data-totals='iva']").forEach(function (el) {
      el.textContent = formatPrice(totals.iva);
    });
    root.querySelectorAll("[data-totals='shipping']").forEach(function (el) {
      el.textContent = totals.shippingCost > 0 ? formatPrice(totals.shippingCost) : "A calcular";
    });
    root.querySelectorAll("[data-totals='total']").forEach(function (el) {
      el.textContent = formatPrice(totals.total);
    });

    var discountRow = root.querySelector("[data-totals-row='discount']");
    var totalSinIvaRow = root.querySelector("[data-totals-row='totalSinIva']");
    if (discountRow) discountRow.style.display = totals.coupon ? "" : "none";
    if (totalSinIvaRow) totalSinIvaRow.style.display = totals.coupon ? "" : "none";

    var shippingRow = root.querySelector("[data-totals-row='shipping']");
    if (shippingRow) shippingRow.style.display = (opts.showShipping !== false) ? "" : "none";

    renderCouponSection(root, state);

    if (opts.renderItems !== false) {
      renderSidebarItems(root, state);
    }

    document.querySelectorAll("[data-mobile-total]").forEach(function (el) {
      el.textContent = formatPrice(totals.total);
    });

    var cta = root.querySelector("[data-cart-cta]");
    if (cta) {
      var disabled = totals.itemCount === 0;
      var label;
      if (disabled) {
        label = "Comenzar compra";
      } else if (totals.itemCount === state.cart.length) {
        label = cta.dataset.cartCtaAll || "Comprar todos los productos";
      } else {
        label = cta.dataset.cartCtaSome || "Comprar productos seleccionados";
      }
      var labelNode = cta.querySelector("[data-cta-label]") || cta;
      if (labelNode === cta) labelNode.textContent = label;
      else labelNode.textContent = label;
      cta.classList.toggle("disabled", disabled);
      cta.setAttribute("aria-disabled", disabled ? "true" : "false");
    }
  }

  function renderCouponSection(root, state) {
    root.querySelectorAll("[data-coupon-section]").forEach(function (section) {
      var input = section.querySelector("[data-coupon-input]");
      var inputBox = section.querySelector("[data-coupon-input-box]");
      var applied = section.querySelector("[data-coupon-applied]");
      if (!applied) return;
      if (state.coupon) {
        if (inputBox) inputBox.style.display = "none";
        applied.style.display = "";
        var codeEl = applied.querySelector("[data-coupon-code]");
        var pctEl = applied.querySelector("[data-coupon-pct]");
        if (codeEl) codeEl.textContent = state.coupon.code + " aplicado";
        if (pctEl) pctEl.textContent = Math.round(state.coupon.discount * 100) + "% off";
      } else {
        if (inputBox) inputBox.style.display = "";
        applied.style.display = "none";
        if (input) {
          input.classList.remove("error", "success");
          var err = section.querySelector(".coupon-error");
          if (err) err.remove();
        }
      }
    });
  }

  function renderSidebarItems(root, state) {
    var listRoot = root.querySelector("[data-sidebar-items]");
    if (!listRoot) return;
    var items = state.cart.filter(function (l) { return l.selected; });
    if (!items.length) {
      listRoot.innerHTML = '<div class="sidebar-empty text-caption-1 text-secondary">No hay productos seleccionados.</div>';
      return;
    }
    listRoot.innerHTML = items.map(function (line) {
      var total = lineTotal(line);
      return '' +
        '<div class="item-product">' +
          '<a href="javascript:void(0);" class="img-product">' +
            '<img src="' + escapeHtml(line.image) + '" alt="' + escapeHtml(line.title) + '">' +
          '</a>' +
          '<div class="content-box">' +
            '<div class="info">' +
              '<a href="javascript:void(0);" class="name-product link text-title">' + escapeHtml(line.title) + '</a>' +
              '<div class="variant text-caption-1 text-secondary">Cantidad: ' + line.qty + '</div>' +
            '</div>' +
            '<div class="total-price-line text-button">' + formatPrice(total) + '</div>' +
          '</div>' +
        '</div>';
    }).join("");
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  /* ------- Coupons ------- */
  function bindCouponSections(rootDoc, onChange) {
    rootDoc.querySelectorAll("[data-coupon-section]").forEach(function (section) {
      var input = section.querySelector("[data-coupon-input]");
      var apply = section.querySelector("[data-coupon-apply]");
      var remove = section.querySelector("[data-coupon-remove]");
      if (apply && input) {
        apply.addEventListener("click", function (e) {
          e.preventDefault();
          handleCoupon(rootDoc, input.value, onChange);
        });
        input.addEventListener("keypress", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCoupon(rootDoc, input.value, onChange);
          }
        });
      }
      if (remove) {
        remove.addEventListener("click", function (e) {
          e.preventDefault();
          var s = read();
          s.coupon = null;
          write(s);
          if (onChange) onChange();
        });
      }
    });
  }

  function handleCoupon(rootDoc, value, onChange) {
    var coupon = findCoupon(value);
    rootDoc.querySelectorAll("[data-coupon-section]").forEach(function (section) {
      var input = section.querySelector("[data-coupon-input]");
      var existingErr = section.querySelector(".coupon-error");
      if (existingErr) existingErr.remove();
      if (input) input.classList.remove("error", "success");
    });
    if (!value || !value.trim()) return;
    if (coupon) {
      var s = read();
      s.coupon = coupon;
      write(s);
      if (onChange) onChange();
    } else {
      rootDoc.querySelectorAll("[data-coupon-section]").forEach(function (section) {
        var input = section.querySelector("[data-coupon-input]");
        if (input) input.classList.add("error");
        if (!section.querySelector(".coupon-error")) {
          var err = document.createElement("div");
          err.className = "coupon-error";
          err.innerHTML = '<i class="bi bi-exclamation-circle"></i> Revisá que esté bien escrito';
          section.appendChild(err);
        }
      });
    }
  }

  /* ------- Forms helpers ------- */
  function fillForm(form, data) {
    if (!form || !data) return;
    Object.keys(data).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      var val = data[name];
      if (input.type === "checkbox") input.checked = !!val;
      else if (input.type === "radio") {
        var radios = form.querySelectorAll('input[name="' + name + '"]');
        radios.forEach(function (r) { r.checked = (r.value === val); });
      } else {
        input.value = val == null ? "" : val;
      }
    });
  }

  function readForm(form) {
    var data = {};
    if (!form) return data;
    Array.prototype.slice.call(form.elements).forEach(function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") data[el.name] = !!el.checked;
      else if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    });
    return data;
  }

  /* ====================================================================
   *  Step 1 — Cart
   * ==================================================================== */
  function initCart() {
    var state = read();
    var tbody = document.querySelector("[data-cart-tbody]");
    var sidebar = document.querySelector("[data-cart-sidebar]");
    var mobileSummary = document.querySelector(".mobile-order-summary");
    if (!tbody) return;

    renderCartRows(tbody, state);
    renderSidebar(sidebar, { showShipping: false, renderItems: false });
    if (mobileSummary) renderSidebar(mobileSummary, { showShipping: false, renderItems: false });
    bindCartInteractions(tbody);
    bindCouponSections(document, function () {
      var s = read();
      renderSidebar(sidebar, { showShipping: false, renderItems: false });
      if (mobileSummary) renderSidebar(mobileSummary, { showShipping: false, renderItems: false });
    });
    bindSelectAll();
    setupApparelSizeSidebar();
    setupMobileOrderSummary();
  }

  function renderCartRows(tbody, state) {
    tbody.innerHTML = state.cart.map(function (line, idx) {
      var total = lineTotal(line);
      var setupRow = line.setupPrice && line.setupPrice > 0
        ? '<div class="cart-line-meta text-caption-1 text-secondary">+ Setup logo: ' + formatPrice(line.setupPrice) + '</div>'
        : (line.logoIncluded ? '<div class="cart-line-meta text-caption-1 text-success">Logo gratis</div>' : '');
      var apparelBtn = line.apparel
        ? '<button type="button" class="size-breakdown-toggle text-caption-1" data-cart-id="' + escapeHtml(line.id) + '">Mostrar desglose de talles</button>'
        : '';
      return '' +
        '<tr class="tf-cart-item file-delete' + (line.selected ? ' is-selected' : '') + '" data-cart-id="' + escapeHtml(line.id) + '">' +
          '<td class="tf-cart-item_product">' +
            '<label class="tf-cart-checkbox">' +
              '<input type="checkbox" class="tf-check" data-cart-select="' + escapeHtml(line.id) + '"' + (line.selected ? ' checked' : '') + '>' +
            '</label>' +
            '<a href="javascript:void(0);" class="img-box">' +
              '<img src="' + escapeHtml(line.image) + '" alt="' + escapeHtml(line.title) + '">' +
            '</a>' +
            '<div class="cart-info">' +
              '<a href="javascript:void(0);" class="cart-title link">' + escapeHtml(line.title) + '</a>' +
              setupRow +
              apparelBtn +
            '</div>' +
          '</td>' +
          '<td data-cart-title="Precio unitario" class="tf-cart-item_price text-center">' +
            '<div class="cart-line-price text-button">' + formatPrice(line.unitPrice) + '</div>' +
          '</td>' +
          '<td data-cart-title="Cantidad" class="tf-cart-item_quantity">' +
            '<div class="wg-quantity mx-md-auto">' +
              '<span class="btn-quantity btn-decrease">-</span>' +
              '<input type="text" class="quantity-product" data-cart-qty="' + escapeHtml(line.id) + '" name="number-' + escapeHtml(line.id) + '" value="' + line.qty + '">' +
              '<span class="btn-quantity btn-increase">+</span>' +
            '</div>' +
          '</td>' +
          '<td data-cart-title="Total" class="tf-cart-item_total text-center">' +
            '<div class="cart-line-total text-button">' + formatPrice(total) + '</div>' +
          '</td>' +
          '<td data-cart-title="Quitar" class="remove-cart"><span class="remove icon icon-close" role="button" aria-label="Quitar"></span></td>' +
        '</tr>';
    }).join("");
    syncSelectAllStates();
  }

  function bindCartInteractions(tbody) {
    tbody.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.matches("[data-cart-select]")) {
        var id = t.getAttribute("data-cart-select");
        var s = read();
        s.cart = s.cart.map(function (l) {
          if (l.id === id) l.selected = !!t.checked;
          return l;
        });
        write(s);
        var row = t.closest(".tf-cart-item");
        if (row) row.classList.toggle("is-selected", !!t.checked);
        rerenderTotalsAndSelectAll();
      }
      if (t && t.matches("[data-cart-qty]")) {
        commitQtyFromInput(t);
      }
    });

    tbody.addEventListener("click", function (e) {
      var inc = e.target.closest(".btn-increase");
      var dec = e.target.closest(".btn-decrease");
      if (!(inc || dec)) return;
      var input = (inc || dec).closest(".tf-cart-item").querySelector("[data-cart-qty]");
      if (!input) return;
      var qty = parseInt(input.value, 10) || 1;
      qty = inc ? qty + 1 : Math.max(1, qty - 1);
      input.value = qty;
      commitQtyFromInput(input);
    });

    document.addEventListener("click", function (e) {
      var removeBtn = e.target.closest("[data-cart-tbody] .tf-cart-item.file-delete .remove");
      if (!removeBtn) return;
      var row = removeBtn.closest(".tf-cart-item");
      if (!row) return;
      e.preventDefault();
      handleDeleteRow(row);
    }, true);
  }

  function commitQtyFromInput(input) {
    var id = input.getAttribute("data-cart-qty");
    var qty = parseInt(input.value, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    input.value = qty;
    var s = read();
    var line = s.cart.find(function (l) { return l.id === id; });
    if (!line) return;
    line.qty = qty;
    write(s);
    var row = input.closest(".tf-cart-item");
    if (row) {
      var totalCell = row.querySelector(".cart-line-total");
      if (totalCell) totalCell.textContent = formatPrice(lineTotal(line));
    }
    rerenderTotalsAndSelectAll();
  }

  var _undoTimer = null;
  function handleDeleteRow(row) {
    var id = row.getAttribute("data-cart-id");
    var s = read();
    var idx = s.cart.findIndex(function (l) { return l.id === id; });
    if (idx === -1) {
      row.remove();
      return;
    }
    var deletedLine = s.cart[idx];
    s.cart.splice(idx, 1);
    write(s);
    row.remove();
    rerenderTotalsAndSelectAll();
    showUndoToast(deletedLine, idx);
  }

  function showUndoToast(line, originalIndex) {
    var existing = document.querySelector(".carrito-undo-toast");
    if (existing) existing.remove();
    if (_undoTimer) clearTimeout(_undoTimer);

    var toast = document.createElement("div");
    toast.className = "carrito-undo-toast";
    toast.innerHTML = '<span>¡Listo! Eliminaste el producto.</span>' +
                      '<button type="button" class="undo-button">DESHACER</button>';
    document.body.appendChild(toast);

    toast.querySelector(".undo-button").addEventListener("click", function () {
      var s = read();
      s.cart.splice(Math.min(originalIndex, s.cart.length), 0, line);
      write(s);
      var tbody = document.querySelector("[data-cart-tbody]");
      if (tbody) renderCartRows(tbody, s);
      rerenderTotalsAndSelectAll();
      toast.remove();
      if (_undoTimer) clearTimeout(_undoTimer);
    });

    _undoTimer = setTimeout(function () {
      toast.classList.add("fade-out");
      setTimeout(function () { toast.remove(); }, 300);
    }, 5000);
  }

  function bindSelectAll() {
    document.querySelectorAll("[data-cart-select-all]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var checked = !!cb.checked;
        var s = read();
        s.cart.forEach(function (l) { l.selected = checked; });
        write(s);
        document.querySelectorAll("[data-cart-select]").forEach(function (rb) {
          rb.checked = checked;
          var row = rb.closest(".tf-cart-item");
          if (row) row.classList.toggle("is-selected", checked);
        });
        rerenderTotalsAndSelectAll();
      });
    });
  }

  function syncSelectAllStates() {
    var s = read();
    var total = s.cart.length;
    var checked = s.cart.filter(function (l) { return l.selected; }).length;
    document.querySelectorAll("[data-cart-select-all]").forEach(function (cb) {
      cb.checked = total > 0 && checked === total;
      cb.indeterminate = checked > 0 && checked < total;
    });
  }

  function rerenderTotalsAndSelectAll() {
    var sidebar = document.querySelector("[data-cart-sidebar]");
    var mobileSummary = document.querySelector(".mobile-order-summary");
    if (sidebar) renderSidebar(sidebar, { showShipping: false, renderItems: false });
    if (mobileSummary) renderSidebar(mobileSummary, { showShipping: false, renderItems: false });
    syncSelectAllStates();
  }

  /* ------- Apparel size breakdown sidebar ------- */
  function setupApparelSizeSidebar() {
    if (!document.querySelector(".size-breakdown-overlay")) {
      var ov = document.createElement("div");
      ov.className = "size-breakdown-overlay";
      ov.addEventListener("click", closeSizeSidebar);
      document.body.appendChild(ov);
    }
    if (!document.querySelector(".size-breakdown-sidebar")) {
      var sb = document.createElement("aside");
      sb.className = "size-breakdown-sidebar";
      sb.innerHTML = '<div class="sidebar-header">' +
                       '<h5 class="title">Desglose de talles</h5>' +
                       '<button type="button" class="close-sidebar" aria-label="Cerrar">&times;</button>' +
                     '</div>' +
                     '<div class="sidebar-content"></div>';
      sb.querySelector(".close-sidebar").addEventListener("click", closeSizeSidebar);
      document.body.appendChild(sb);
    }
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".size-breakdown-toggle");
      if (btn) {
        e.preventDefault();
        openSizeSidebar(btn.getAttribute("data-cart-id"));
      }
    });
  }

  function openSizeSidebar(cartId) {
    var sb = document.querySelector(".size-breakdown-sidebar");
    var overlay = document.querySelector(".size-breakdown-overlay");
    if (!sb || !overlay) return;
    var content = sb.querySelector(".sidebar-content");
    var s = read();
    var line = s.cart.find(function (l) { return l.id === cartId; });
    if (!line) return;
    var sizes = line.sizes || { S: 0, M: 0, L: 0, XL: 0 };

    var sizeRows = Object.keys(APPAREL_STOCK).map(function (size) {
      var stock = APPAREL_STOCK[size];
      var qty = sizes[size] || 0;
      return '' +
        '<div class="sidebar-size-row">' +
          '<div class="sidebar-size-label">' + size + ' <span class="stock-info text-caption-1 text-secondary">(' + stock + ' un.)</span></div>' +
          '<div class="sidebar-size-quantity-input">' +
            '<input type="number" class="sidebar-size-quantity" data-size="' + size + '" min="0" max="' + stock + '" value="' + qty + '">' +
          '</div>' +
        '</div>';
    }).join("");

    content.innerHTML = '' +
      '<div class="sidebar-product-info">' +
        '<img src="' + escapeHtml(line.image) + '" alt="' + escapeHtml(line.title) + '">' +
        '<div class="sidebar-product-details"><h6>' + escapeHtml(line.title) + '</h6></div>' +
      '</div>' +
      '<div class="sidebar-size-breakdown">' + sizeRows + '</div>' +
      '<button type="button" class="tf-btn sidebar-add-units-btn"><span class="text">Agregar unidades</span></button>';

    content.querySelectorAll(".sidebar-size-quantity").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var max = parseInt(inp.getAttribute("max"), 10);
        var v = parseInt(inp.value, 10) || 0;
        if (v > max) {
          inp.value = max;
          showStockNotice(inp, max);
        }
        if (v < 0) inp.value = 0;
      });
    });

    content.querySelector(".sidebar-add-units-btn").addEventListener("click", function () {
      var newSizes = {};
      var totalQty = 0;
      content.querySelectorAll(".sidebar-size-quantity").forEach(function (inp) {
        var size = inp.getAttribute("data-size");
        var v = parseInt(inp.value, 10) || 0;
        newSizes[size] = v;
        totalQty += v;
      });
      var s2 = read();
      var l2 = s2.cart.find(function (l) { return l.id === cartId; });
      if (l2) {
        l2.sizes = newSizes;
        l2.qty = totalQty;
        write(s2);
        var input = document.querySelector('[data-cart-qty="' + cartId + '"]');
        if (input) input.value = totalQty;
        var row = document.querySelector('.tf-cart-item[data-cart-id="' + cartId + '"]');
        if (row) {
          var totalCell = row.querySelector(".cart-line-total");
          if (totalCell) totalCell.textContent = formatPrice(lineTotal(l2));
        }
        rerenderTotalsAndSelectAll();
      }
      closeSizeSidebar();
    });

    sb.classList.add("open");
    overlay.classList.add("show");
    document.body.classList.add("sidebar-open");
  }

  function closeSizeSidebar() {
    document.querySelector(".size-breakdown-sidebar")?.classList.remove("open");
    document.querySelector(".size-breakdown-overlay")?.classList.remove("show");
    document.body.classList.remove("sidebar-open");
  }

  function showStockNotice(input, max) {
    var parent = input.closest(".sidebar-size-quantity-input");
    if (!parent) return;
    var existing = parent.querySelector(".stock-notification");
    if (existing) existing.remove();
    var n = document.createElement("div");
    n.className = "stock-notification";
    n.textContent = "Máximo disponible: " + max + " un.";
    parent.appendChild(n);
    setTimeout(function () { n.remove(); }, 3000);
  }

  /* ------- Mobile sticky summary ------- */
  function setupMobileOrderSummary() {
    var summary = document.querySelector(".mobile-order-summary");
    if (!summary) return;
    var header = summary.querySelector(".mobile-summary-header");
    if (!header) return;
    header.addEventListener("click", function () {
      summary.classList.toggle("collapsed");
    });
  }

  /* ====================================================================
   *  Step 2 — Buyer
   * ==================================================================== */
  function initBuyer() {
    var sidebar = document.querySelector("[data-checkout-sidebar]");
    if (sidebar) renderSidebar(sidebar, { showShipping: true });

    var form = document.getElementById("buyerForm");
    if (form) {
      var s = read();
      fillForm(form, s.buyer || {});
      Array.prototype.slice.call(form.elements).forEach(function (el) {
        if (!el.name) return;
        el.addEventListener("change", function () { persistBuyer(form); });
        el.addEventListener("blur", function () { persistBuyer(form); });
      });
    }

    setupLogoUpload();
    bindCouponSections(document, function () {
      if (sidebar) renderSidebar(sidebar, { showShipping: true });
    });
    setupCheckoutMobileSummary();

    var nextBtn = document.querySelector("[data-buyer-next]");
    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        if (!form) return;
        if (!form.checkValidity()) {
          e.preventDefault();
          form.reportValidity();
          return;
        }
        persistBuyer(form);
      });
    }
  }

  function persistBuyer(form) {
    var s = read();
    s.buyer = readForm(form);
    write(s);
  }

  function setupLogoUpload() {
    var input = document.querySelector("[data-logo-input]");
    var trigger = document.querySelector("[data-logo-trigger]");
    var list = document.querySelector("[data-logo-list]");
    if (!input || !trigger || !list) return;

    var s = read();
    renderLogoList(list, s.logos || []);

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      input.click();
    });
    input.addEventListener("change", function () {
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length) return;
      var s2 = read();
      s2.logos = (s2.logos || []).concat(files.map(function (f) {
        return { name: f.name, size: f.size, type: f.type };
      }));
      write(s2);
      renderLogoList(list, s2.logos);
      input.value = "";
    });
    list.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-logo-remove]");
      if (!btn) return;
      var idx = parseInt(btn.getAttribute("data-logo-remove"), 10);
      var s3 = read();
      s3.logos.splice(idx, 1);
      write(s3);
      renderLogoList(list, s3.logos);
    });
  }

  function renderLogoList(list, logos) {
    if (!logos.length) {
      list.innerHTML = '<p class="text-caption-1 text-secondary uploaded-empty">Ningún logo adjuntado</p>';
      return;
    }
    list.innerHTML = logos.map(function (l, i) {
      var icon = pickFileIcon(l.name);
      return '' +
        '<div class="uploaded-logo-row">' +
          '<span class="file-name"><i class="bi ' + icon + ' file-icon"></i> ' + escapeHtml(l.name) + '</span>' +
          '<button type="button" class="logo-remove-btn" data-logo-remove="' + i + '" aria-label="Quitar"><i class="bi bi-x-lg"></i></button>' +
        '</div>';
    }).join("");
  }

  function pickFileIcon(name) {
    var ext = (name || "").toLowerCase().split(".").pop();
    if (ext === "png" || ext === "jpg" || ext === "jpeg") return "bi-file-earmark-image";
    if (ext === "pdf") return "bi-file-earmark-pdf";
    if (ext === "ai" || ext === "eps") return "bi-file-earmark-richtext";
    return "bi-file-earmark";
  }

  /* ====================================================================
   *  Step 3 — Shipping
   * ==================================================================== */
  function initShipping() {
    var sidebar = document.querySelector("[data-checkout-sidebar]");
    if (sidebar) renderSidebar(sidebar, { showShipping: true });
    bindCouponSections(document, function () {
      if (sidebar) renderSidebar(sidebar, { showShipping: true });
    });
    setupCheckoutMobileSummary();

    var s = read();
    renderAddressList();
    setupAddAddress();
    setupOfficePickup();
    setupEventOrder();

    var pickupRadio = document.querySelector("[data-pickup-radio]");
    if (pickupRadio) pickupRadio.checked = !!(s.shipping && s.shipping.pickupSelected);

    var nextBtn = document.querySelector("[data-shipping-next]");
    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        var s2 = read();
        var sel = s2.shipping || {};
        if (!sel.pickupSelected && (sel.selectedAddressIndex == null || sel.selectedAddressIndex < 0)) {
          e.preventDefault();
          alert("Por favor seleccioná una dirección de envío o el retiro por oficinas.");
        }
      });
    }
  }

  function renderAddressList() {
    var list = document.querySelector("[data-address-list]");
    var addBtn = document.querySelector("[data-add-address-btn]");
    if (!list) return;
    var s = read();
    var addresses = (s.shipping && s.shipping.addresses) || [];

    if (!addresses.length) {
      list.innerHTML = "";
      list.style.display = "none";
      if (addBtn) addBtn.style.display = "";
      updateShippingCost(0);
      return;
    }

    list.style.display = "";
    if (addBtn) addBtn.style.display = "none";

    list.innerHTML = addresses.map(function (a, idx) {
      var checked = (s.shipping.selectedAddressIndex === idx);
      var line2 = [a.piso, a.departamento].filter(Boolean).join(" ");
      var ref = a.referencias ? '<p class="delivery-instructions text-caption-1 text-secondary">Nota: ' + escapeHtml(a.referencias) + '</p>' : '';
      return '' +
        '<div class="address-card' + (checked ? " selected" : "") + '" data-address-index="' + idx + '">' +
          '<label class="payment-header" data-bs-toggle="">' +
            '<input type="radio" name="delivery-address" class="tf-check-rounded" value="' + idx + '"' + (checked ? " checked" : "") + '>' +
            '<div class="address-details">' +
              '<p class="text-button">' + escapeHtml(a.calle) + ' ' + escapeHtml(a.numero) + (line2 ? ", " + escapeHtml(line2) : "") + '</p>' +
              '<p>' + escapeHtml(a.ciudad) + ', ' + escapeHtml(a.provincia) + ' (CP ' + escapeHtml(a.codigoPostal) + ')</p>' +
              '<p>Teléfono: ' + escapeHtml(a.telefono) + '</p>' +
              ref +
              '<div class="address-shipping-cost"><strong>Costo de envío estimado:</strong> $23.000</div>' +
            '</div>' +
          '</label>' +
          '<button type="button" class="edit-address-btn" data-edit-address="' + idx + '" aria-label="Editar"><i class="bi bi-pencil"></i></button>' +
        '</div>';
    }).join("") +
    '<button type="button" class="tf-btn btn-line add-address-btn-second" data-add-another><i class="bi bi-plus"></i> <span class="text">Agregar otra dirección</span></button>';

    list.querySelectorAll('input[name="delivery-address"]').forEach(function (rb) {
      rb.addEventListener("change", function () {
        var sx = read();
        sx.shipping.selectedAddressIndex = parseInt(rb.value, 10);
        sx.shipping.pickupSelected = false;
        sx.shipping.cost = 23000;
        sx.shipping.mode = "domicilio";
        write(sx);
        var pickup = document.querySelector("[data-pickup-radio]");
        if (pickup) pickup.checked = false;
        renderAddressList();
        var sidebar = document.querySelector("[data-checkout-sidebar]");
        if (sidebar) renderSidebar(sidebar, { showShipping: true });
      });
    });
    list.querySelectorAll("[data-edit-address]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var idx = parseInt(btn.getAttribute("data-edit-address"), 10);
        showAddressForm(idx);
      });
    });
    var another = list.querySelector("[data-add-another]");
    if (another) {
      another.addEventListener("click", function () { showAddressForm(-1); });
    }

    updateShippingCost(s.shipping.cost || 0);
  }

  function setupAddAddress() {
    var btn = document.querySelector("[data-add-address-btn]");
    if (!btn) return;
    btn.addEventListener("click", function () { showAddressForm(-1); });
  }

  function showAddressForm(editingIndex) {
    var formContainer = document.querySelector("[data-address-form]");
    if (!formContainer) return;
    var form = formContainer.querySelector("form");
    formContainer.style.display = "";

    var s = read();
    var initial = editingIndex >= 0 ? s.shipping.addresses[editingIndex] : null;
    fillForm(form, initial || {
      calle: "", numero: "", piso: "", departamento: "",
      codigoPostal: "", ciudad: "", provincia: "", telefono: "", referencias: ""
    });
    var costBox = formContainer.querySelector("[data-shipping-cost-box]");
    if (costBox) costBox.style.display = initial ? "" : "none";

    var addBtn = document.querySelector("[data-add-address-btn]");
    if (addBtn) addBtn.style.display = "none";

    form.onsubmit = function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = readForm(form);
      data.codigoPostal = data["codigo-postal"]; delete data["codigo-postal"];
      var s2 = read();
      if (editingIndex >= 0) {
        s2.shipping.addresses[editingIndex] = data;
        s2.shipping.selectedAddressIndex = editingIndex;
      } else {
        s2.shipping.addresses.push(data);
        s2.shipping.selectedAddressIndex = s2.shipping.addresses.length - 1;
      }
      s2.shipping.pickupSelected = false;
      s2.shipping.mode = "domicilio";
      s2.shipping.cost = 23000;
      write(s2);
      formContainer.style.display = "none";
      renderAddressList();
      var sidebar = document.querySelector("[data-checkout-sidebar]");
      if (sidebar) renderSidebar(sidebar, { showShipping: true });
    };

    var calc = formContainer.querySelector("[data-calc-shipping]");
    if (calc) {
      calc.onclick = function (e) {
        e.preventDefault();
        if (costBox) costBox.style.display = "";
      };
    }
    var cancel = formContainer.querySelector("[data-cancel-address]");
    if (cancel) {
      cancel.onclick = function (e) {
        e.preventDefault();
        formContainer.style.display = "none";
        var s3 = read();
        if (!(s3.shipping.addresses || []).length && addBtn) addBtn.style.display = "";
        renderAddressList();
      };
    }
  }

  function updateShippingCost(cost) {
    var s = read();
    if (s.shipping.cost !== cost) {
      s.shipping.cost = cost;
      write(s);
    }
  }

  function setupOfficePickup() {
    var radio = document.querySelector("[data-pickup-radio]");
    if (!radio) return;
    radio.addEventListener("change", function () {
      var s = read();
      s.shipping.pickupSelected = !!radio.checked;
      if (radio.checked) {
        s.shipping.selectedAddressIndex = -1;
        s.shipping.mode = "pickup";
        s.shipping.cost = 0;
      }
      write(s);
      document.querySelectorAll('input[name="delivery-address"]').forEach(function (r) { r.checked = false; });
      renderAddressList();
      var sidebar = document.querySelector("[data-checkout-sidebar]");
      if (sidebar) renderSidebar(sidebar, { showShipping: true });
    });
  }

  function setupEventOrder() {
    var cb = document.querySelector("[data-event-checkbox]");
    var dateBox = document.querySelector("[data-event-date-container]");
    var dateInput = document.querySelector("[data-event-date-input]");
    if (!cb) return;
    var s = read();
    cb.checked = !!(s.shipping && s.shipping.isEvent);
    if (dateBox) dateBox.style.display = cb.checked ? "" : "none";
    if (dateInput) dateInput.value = s.shipping.eventDate || "";

    cb.addEventListener("change", function () {
      var s2 = read();
      s2.shipping.isEvent = cb.checked;
      if (!cb.checked) s2.shipping.eventDate = "";
      write(s2);
      if (dateBox) dateBox.style.display = cb.checked ? "" : "none";
    });

    if (dateInput) {
      dateInput.addEventListener("click", function () { openDatePicker(dateInput); });
      var icon = document.querySelector("[data-event-date-icon]");
      if (icon) icon.addEventListener("click", function () { openDatePicker(dateInput); });
    }
  }

  function openDatePicker(input) {
    var existing = document.querySelector(".date-picker");
    if (existing) { existing.remove(); return; }
    var picker = document.createElement("div");
    picker.className = "date-picker";
    var rect = input.getBoundingClientRect();
    picker.style.position = "absolute";
    picker.style.top = (rect.bottom + window.scrollY + 4) + "px";
    picker.style.left = (rect.left + window.scrollX) + "px";
    picker.style.zIndex = "1000";
    document.body.appendChild(picker);
    var today = new Date();
    drawCalendar(picker, input, today.getMonth(), today.getFullYear());

    function close(e) {
      if (picker.contains(e.target) || e.target === input) return;
      picker.remove();
      document.removeEventListener("click", close);
    }
    setTimeout(function () { document.addEventListener("click", close); }, 0);
  }

  function drawCalendar(picker, input, month, year) {
    picker.innerHTML = "";
    var monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    var dayNames = ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];
    var header = document.createElement("div");
    header.className = "calendar-header";
    var prev = document.createElement("button"); prev.type = "button"; prev.className = "prev-month"; prev.innerHTML = '<i class="bi bi-chevron-left"></i>';
    var monthYear = document.createElement("div"); monthYear.className = "month-year"; monthYear.textContent = monthNames[month] + " " + year;
    var next = document.createElement("button"); next.type = "button"; next.className = "next-month"; next.innerHTML = '<i class="bi bi-chevron-right"></i>';
    header.appendChild(prev); header.appendChild(monthYear); header.appendChild(next);
    var days = document.createElement("div"); days.className = "calendar-days";
    dayNames.forEach(function (d) { var n = document.createElement("div"); n.className = "day-header"; n.textContent = d; days.appendChild(n); });
    var firstDow = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    for (var i = 0; i < firstDow; i++) {
      var e = document.createElement("div"); e.className = "day empty"; days.appendChild(e);
    }
    var today = new Date();
    for (var d = 1; d <= daysInMonth; d++) {
      (function (d) {
        var c = document.createElement("div"); c.className = "day"; c.textContent = d;
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) c.classList.add("today");
        c.addEventListener("click", function () {
          var dd = String(d).padStart(2, "0");
          var mm = String(month + 1).padStart(2, "0");
          input.value = dd + "/" + mm + "/" + year;
          var s = read();
          s.shipping.eventDate = input.value;
          write(s);
          picker.remove();
        });
        days.appendChild(c);
      })(d);
    }
    picker.appendChild(header);
    picker.appendChild(days);
    prev.addEventListener("click", function (e) { e.stopPropagation(); var m = month - 1, y = year; if (m < 0) { m = 11; y--; } drawCalendar(picker, input, m, y); });
    next.addEventListener("click", function (e) { e.stopPropagation(); var m = month + 1, y = year; if (m > 11) { m = 0; y++; } drawCalendar(picker, input, m, y); });
  }

  /* ====================================================================
   *  Step 4 — Payment
   * ==================================================================== */
  function initPayment() {
    var sidebar = document.querySelector("[data-checkout-sidebar]");
    if (sidebar) renderSidebar(sidebar, { showShipping: true });
    bindCouponSections(document, function () {
      if (sidebar) renderSidebar(sidebar, { showShipping: true });
    });
    setupCheckoutMobileSummary();
    renderShippingSummary();

    var s = read();
    var radios = document.querySelectorAll('input[name="payment-method"]');
    radios.forEach(function (r) {
      if (s.payment && r.value === s.payment) r.checked = true;
      r.addEventListener("change", function () {
        var s2 = read();
        s2.payment = r.value;
        write(s2);
      });
    });
    if (!s.payment && radios.length) {
      radios[0].checked = true;
      var s2 = read();
      s2.payment = radios[0].value;
      write(s2);
    }
  }

  function renderShippingSummary() {
    var box = document.querySelector("[data-shipping-summary]");
    if (!box) return;
    var s = read();
    var sh = s.shipping || {};
    if (sh.pickupSelected) {
      box.innerHTML = '<h6 class="title">Retiro por oficinas</h6>' +
                      '<p>Maipú 1365, Florida Oeste - CP 1604</p>' +
                      '<p>Lunes a viernes 9 a 18 hs</p>';
    } else if (sh.selectedAddressIndex >= 0 && sh.addresses && sh.addresses[sh.selectedAddressIndex]) {
      var a = sh.addresses[sh.selectedAddressIndex];
      box.innerHTML = '<h6 class="title">Envío a domicilio</h6>' +
                      '<p>' + escapeHtml(a.calle) + ' ' + escapeHtml(a.numero) + (a.piso ? ", " + escapeHtml(a.piso) : "") + (a.departamento ? " " + escapeHtml(a.departamento) : "") + '</p>' +
                      '<p>' + escapeHtml(a.ciudad) + ', ' + escapeHtml(a.provincia) + ' (CP ' + escapeHtml(a.codigoPostal) + ')</p>' +
                      '<p>Teléfono: ' + escapeHtml(a.telefono) + '</p>';
    } else {
      box.style.display = "none";
    }
  }

  /* ====================================================================
   *  Step 5 — Confirmation (pre-pay review)
   * ==================================================================== */
  function initConfirmation() {
    var sidebar = document.querySelector("[data-checkout-sidebar]");
    if (sidebar) renderSidebar(sidebar, { showShipping: true });
    bindCouponSections(document, function () {
      if (sidebar) renderSidebar(sidebar, { showShipping: true });
    });
    setupCheckoutMobileSummary();
    renderConfirmationSections();

    var confirmBtn = document.querySelector("[data-confirm-order]");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        var s = read();
        s.orderNumber = generateOrderNumber();
        write(s);
      });
    }
  }

  function renderConfirmationSections() {
    var s = read();
    var buyerBox = document.querySelector("[data-conf-buyer]");
    if (buyerBox) {
      var b = s.buyer || {};
      buyerBox.innerHTML = '<p class="text-button">' + escapeHtml((b.nombre || "") + " " + (b.apellido || "")).trim() + '</p>' +
                           '<p>Razón social: ' + escapeHtml(b.razonSocial || "—") + '</p>' +
                           '<p>CUIT/CUIL: ' + escapeHtml(b.cuit || "—") + '</p>' +
                           '<p>Teléfono: ' + escapeHtml(b.telefono || "—") + '</p>';
    }

    var logosBox = document.querySelector("[data-conf-logos]");
    if (logosBox) {
      var logos = s.logos || [];
      if (!logos.length) {
        logosBox.innerHTML = '<p class="text-secondary">No se adjuntaron logos.</p>';
      } else {
        logosBox.innerHTML = logos.map(function (l) {
          return '<div class="logo-file"><span class="file-name"><i class="bi ' + pickFileIcon(l.name) + ' file-icon"></i> ' + escapeHtml(l.name) + '</span></div>';
        }).join("");
      }
    }

    var shipBox = document.querySelector("[data-conf-shipping]");
    if (shipBox) {
      var sh = s.shipping || {};
      if (sh.pickupSelected) {
        shipBox.innerHTML = '<p class="text-button">Retiro por nuestras oficinas</p>' +
                            '<p>Maipú 1365, Florida Oeste - CP 1604</p>' +
                            '<p>Buenos Aires, Argentina</p>' +
                            (sh.isEvent && sh.eventDate ? '<p>Fecha de evento: ' + escapeHtml(sh.eventDate) + '</p>' : '');
      } else if (sh.selectedAddressIndex >= 0 && sh.addresses && sh.addresses[sh.selectedAddressIndex]) {
        var a = sh.addresses[sh.selectedAddressIndex];
        shipBox.innerHTML = '<p class="text-button">Envío a domicilio</p>' +
                            '<p>' + escapeHtml(a.calle) + ' ' + escapeHtml(a.numero) + (a.piso ? ", " + escapeHtml(a.piso) : "") + (a.departamento ? " " + escapeHtml(a.departamento) : "") + '</p>' +
                            '<p>' + escapeHtml(a.ciudad) + ', ' + escapeHtml(a.provincia) + ' (CP ' + escapeHtml(a.codigoPostal) + ')</p>' +
                            '<p>Teléfono: ' + escapeHtml(a.telefono) + '</p>' +
                            (sh.isEvent && sh.eventDate ? '<p>Fecha de evento: ' + escapeHtml(sh.eventDate) + '</p>' : '');
      } else {
        shipBox.innerHTML = '<p class="text-secondary">No se ha seleccionado un método de envío.</p>';
      }
    }

    var payBox = document.querySelector("[data-conf-payment]");
    if (payBox) {
      var labels = {
        transferencia: "Transferencia bancaria",
        mercadopago: "Mercado Pago",
        credito: "Tarjeta de crédito",
        debito: "Tarjeta de débito"
      };
      payBox.innerHTML = s.payment
        ? '<p class="text-button">' + escapeHtml(labels[s.payment] || s.payment) + '</p>'
        : '<p class="text-secondary">No se ha seleccionado un método de pago.</p>';
    }
  }

  /* ====================================================================
   *  Step 6 — Order success
   * ==================================================================== */
  function initSuccess() {
    var s = read();
    if (!s.orderNumber) {
      s.orderNumber = generateOrderNumber();
      write(s);
    }
    document.querySelectorAll("[data-order-number]").forEach(function (el) {
      el.textContent = s.orderNumber;
    });

    renderSuccessProducts();
    fillTrackingDates();
    runFlipperAnimation();

    var continueBtn = document.querySelector("[data-continue-shopping]");
    if (continueBtn) {
      continueBtn.addEventListener("click", function () {
        reset();
      });
    }
  }

  function renderSuccessProducts() {
    var listRoot = document.querySelector("[data-success-products]");
    if (!listRoot) return;
    var s = read();
    var items = s.cart.filter(function (l) { return l.selected; });
    if (!items.length) {
      listRoot.innerHTML = '<p class="text-secondary">No hay productos en este pedido.</p>';
      return;
    }
    listRoot.innerHTML = items.map(function (line) {
      return '' +
        '<li class="item-product">' +
          '<a href="javascript:void(0);" class="img-product"><img src="' + escapeHtml(line.image) + '" alt="' + escapeHtml(line.title) + '"></a>' +
          '<div class="content-box">' +
            '<div class="info">' +
              '<a href="javascript:void(0);" class="name-product link text-title">' + escapeHtml(line.title) + '</a>' +
              '<div class="variant text-caption-1 text-secondary">Cantidad: ' + line.qty + '</div>' +
            '</div>' +
            '<div class="total-price-line text-button">' + formatPrice(lineTotal(line)) + '</div>' +
          '</div>' +
        '</li>';
    }).join("");
  }

  function fillTrackingDates() {
    var today = new Date();
    var formatted = today.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
    document.querySelectorAll(".track-order-item.completed .track-order-date, .track-order-item.active .track-order-date").forEach(function (el) {
      el.textContent = formatted;
    });
  }

  function runFlipperAnimation() {
    var flipper = document.querySelector(".success-icon-flipper");
    if (!flipper) return;
    flipper.style.transform = "scale(0.1)";
    flipper.style.opacity = "0";
    flipper.style.transition = "transform 0.5s ease, opacity 0.5s ease";
    setTimeout(function () {
      flipper.style.transform = "scale(1)";
      flipper.style.opacity = "1";
      setTimeout(function () {
        flipper.style.transition = "transform 1s cubic-bezier(0.455, 0.03, 0.515, 0.955)";
        flipper.style.transform = "rotateY(180deg) rotateZ(360deg)";
      }, 1000);
    }, 300);
  }

  function generateOrderNumber() {
    var year = new Date().getFullYear();
    var rand = Math.floor(1000 + Math.random() * 9000);
    return "FP-" + year + "-" + rand;
  }

  /* ====================================================================
   *  Generic checkout-step mobile summary toggle
   * ==================================================================== */
  function setupCheckoutMobileSummary() {
    var toggle = document.querySelector(".order-summary-toggle .toggle-button");
    var summary = document.querySelector("[data-checkout-sidebar]");
    if (!toggle || !summary) return;
    var applyInitialState = function () {
      if (window.innerWidth < 992) {
        if (!summary.classList.contains("mobile-collapsed") && !summary.classList.contains("mobile-open")) {
          summary.classList.add("mobile-collapsed");
        }
      } else {
        summary.classList.remove("mobile-collapsed");
      }
    };
    applyInitialState();
    window.addEventListener("resize", applyInitialState);
    toggle.addEventListener("click", function () {
      toggle.classList.toggle("active");
      summary.classList.toggle("mobile-collapsed");
      var icon = toggle.querySelector(".toggle-icon i");
      var collapsed = summary.classList.contains("mobile-collapsed");
      if (icon) icon.className = collapsed ? "bi bi-chevron-down" : "bi bi-chevron-up";
    });
  }

  /* ====================================================================
   *  Public API + auto-init
   * ==================================================================== */
  var Carrito = {
    read: read,
    write: write,
    reset: reset,
    parsePrice: parsePrice,
    formatPrice: formatPrice,
    computeTotals: computeTotals,
    renderSidebar: renderSidebar,
    init: function (opts) {
      opts = opts || {};
      switch (opts.step) {
        case "cart": initCart(); break;
        case "buyer": initBuyer(); break;
        case "shipping": initShipping(); break;
        case "payment": initPayment(); break;
        case "confirmation": initConfirmation(); break;
        case "success": initSuccess(); break;
      }
    }
  };

  window.Carrito = Carrito;

  document.addEventListener("DOMContentLoaded", function () {
    var step = document.body.getAttribute("data-carrito-step");
    if (step) Carrito.init({ step: step });
    var totalPrice = document.querySelector("[data-mobile-total]");
    if (totalPrice) {
      var totals = computeTotals(read());
      totalPrice.textContent = formatPrice(totals.total);
    }
  });
})(window, document);
