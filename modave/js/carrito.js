/* =====================================================================
 * Formas Carrito — Shared state, sidebar renderer, and per-step
 * initializers for the multi-page checkout flow.
 *
 * Pricing math lives in js/carrito-pricing.js (FormasPricing) so it can
 * be unit-tested and later swapped for API-backed quotes without
 * rewriting the UI layer.
 *
 * Single sessionStorage key carries data across:
 *   shopping-cart.html -> checkout-buyer.html -> checkout-shipping.html
 *   -> checkout-payment.html -> checkout-confirmation.html -> order-success.html
 * ===================================================================== */
(function (window, document) {
  "use strict";

  var Data = window.FormasCartData;
  var Pricing = window.FormasPricing;
  if (!Data) {
    throw new Error("FormasCartData is required. Load js/carrito-data.js before carrito.js.");
  }
  if (!Pricing) {
    throw new Error("FormasPricing is required. Load js/carrito-pricing.js before carrito.js.");
  }

  var STORAGE_KEY = "formas:carrito:v3";
  var SHIPPING_STATUS = Pricing.SHIPPING_STATUS;
  var APPAREL_STOCK = Data.apparelStock;
  var CART_KIND = { STANDARD: "standard", SAMPLE: "sample" };

  var DEFAULT_STATE = {
    cart: null,
    activeCartKind: CART_KIND.STANDARD,
    checkoutKind: null,
    couponCode: null,
    buyer: { nombre: "", apellido: "", razonSocial: "", cuit: "", telefono: "" },
    logos: [],
    shipping: {
      mode: null,
      addresses: [],
      selectedAddressIndex: -1,
      pickupSelected: false,
      isEvent: false,
      eventDate: "",
      quote: { status: "pending", amountCents: 0, source: null }
    },
    payment: null,
    orderNumber: null
  };

  /* ------- Storage ------- */
  function defaultStateWithCart() {
    var state = clone(DEFAULT_STATE);
    state.cart = clone(Data.defaultCart);
    return state;
  }

  function read() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeState(Object.assign(defaultStateWithCart(), JSON.parse(raw)));
      return defaultStateWithCart();
    } catch (err) {
      return defaultStateWithCart();
    }
  }

  function write(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
    } catch (err) { /* ignore quota */ }
  }

  function reset() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeLineKind(line) {
    var product = Data.products[line.productId || line.id];
    line.kind = (line.kind === CART_KIND.SAMPLE || (product && product.kind === CART_KIND.SAMPLE))
      ? CART_KIND.SAMPLE
      : CART_KIND.STANDARD;
    return line;
  }

  function normalizeState(state) {
    if (!state.shipping) state.shipping = clone(DEFAULT_STATE.shipping);
    if (!Array.isArray(state.shipping.addresses)) state.shipping.addresses = [];
    state.shipping.addresses = state.shipping.addresses.map(normalizeAddress);
    state.activeCartKind = state.activeCartKind === CART_KIND.SAMPLE ? CART_KIND.SAMPLE : CART_KIND.STANDARD;
    if (state.checkoutKind !== CART_KIND.SAMPLE && state.checkoutKind !== CART_KIND.STANDARD) {
      state.checkoutKind = null;
    }
    if (Array.isArray(state.cart)) state.cart = state.cart.map(normalizeLineKind);
    syncShippingQuote(state);
    return state;
  }

  function linesOfKind(state, kind) {
    return (state.cart || []).filter(function (line) {
      return (line.kind || CART_KIND.STANDARD) === kind;
    });
  }

  function otherCartKind(kind) {
    return kind === CART_KIND.SAMPLE ? CART_KIND.STANDARD : CART_KIND.SAMPLE;
  }

  function currentQuoteKind(state, opts) {
    if (opts && opts.kind) return opts.kind;
    var step = document.body.getAttribute("data-carrito-step");
    if (step && step !== "cart") {
      return state.checkoutKind || state.activeCartKind || CART_KIND.STANDARD;
    }
    return state.activeCartKind || CART_KIND.STANDARD;
  }

  function cartKindCopy(kind) {
    if (kind === CART_KIND.SAMPLE) {
      return {
        tab: "Muestras",
        selectAll: "Seleccionar todas las muestras",
        ctaAll: "Comprar todas las muestras",
        ctaSome: "Comprar muestras seleccionadas",
        ctaMini: "Comprar muestras",
        ctaDrawer: "Comprar muestras",
        totalLabel: "Total (Muestras)",
        notice: "Las muestras no tienen mínimo de cantidad y se compran aparte del merch personalizado.",
        emptyTitle: "Todavía no pediste muestras",
        emptyBody: "Pedí una muestra desde la ficha del producto para probar calidad y talle, sin mínimo de cantidad.",
        emptyOtherTitle: "No hay muestras en este carrito",
        emptyOtherBody: "Tus productos están en la otra pestaña. El checkout es por un carrito a la vez.",
        emptySwitch: "Ver productos",
        undo: "¡Listo! Eliminaste la muestra.",
        secure: "Compra protegida · las muestras se envían sin producción personalizada",
        trust: [
          "Sin mínimo de cantidad",
          "Sirven para evaluar calidad y talle",
          "Se facturan y envían aparte del merch"
        ]
      };
    }
    return {
      tab: "Productos",
      selectAll: "Seleccionar todos los productos",
      ctaAll: "Comprar todos los productos",
      ctaSome: "Comprar productos seleccionados",
      ctaMini: "Comprar productos",
      ctaDrawer: "Comprar productos",
      totalLabel: "Total (Productos)",
      notice: "Realizado el pedido te enviaremos un boceto para tu aprobación final. Solo continuaremos si estás 100% conforme.",
      emptyTitle: "Tu carrito está vacío",
      emptyBody: "Todavía no agregaste productos. Explorá el catálogo y encontrá el merch ideal para tu marca.",
      emptyOtherTitle: "No hay productos en este carrito",
      emptyOtherBody: "Tus muestras están en la otra pestaña. El checkout es por un carrito a la vez.",
      emptySwitch: "Ver muestras",
      undo: "¡Listo! Eliminaste el producto.",
      secure: "Compra protegida · te enviamos un boceto antes de producir",
      trust: [
        "Aprobás el diseño antes de que produzcamos",
        "Producción estimada: 7–10 días hábiles",
        "Asesor de marca asignado a tu pedido"
      ]
    };
  }

  function normalizeAddress(address) {
    var a = address || {};
    var quoted = a.shippingQuoted === true ||
      (a.shippingQuoted == null && a.shippingCost != null && Number(a.shippingCost) > 0);
    return Object.assign({}, a, {
      shippingCost: quoted ? (parseFloat(a.shippingCost) || 0) : (a.shippingCost == null ? null : parseFloat(a.shippingCost) || 0),
      shippingQuoted: !!quoted
    });
  }

  /** Keep shipping.quote aligned with the current selection. */
  function syncShippingQuote(state) {
    var quote = Pricing.resolveShippingQuote(state);
    state.shipping.quote = {
      status: quote.status,
      amountCents: quote.amountCents,
      source: quote.source
    };
    return quote;
  }

  function applyShippingQuote(state, quote) {
    state.shipping.quote = {
      status: quote.status,
      amountCents: quote.amountCents || 0,
      source: quote.source || null
    };
  }

  /* ------- Money / totals (delegated to FormasPricing) ------- */
  function formatPrice(value) {
    return Pricing.formatPrice(value);
  }

  function findCoupon(code) {
    if (!code) return null;
    return Data.coupons[String(code).trim().toUpperCase()] || null;
  }

  function computeTotals(state, opts) {
    state = state || read();
    opts = opts || {};
    if (!opts.kind) opts.kind = currentQuoteKind(state, opts);
    return Pricing.computeTotals(state, opts);
  }

  function buildOrderPricingPayload(state, opts) {
    state = state || read();
    opts = opts || {};
    if (!opts.kind) opts.kind = currentQuoteKind(state, opts);
    return Pricing.buildOrderPricingPayload(state, opts);
  }

  function quoteFor(state, opts) {
    return computeTotals(state || read(), opts);
  }

  function quotedLineById(quote, lineId) {
    return quote.lines.find(function (line) { return line.id === lineId; }) || null;
  }

  function productForStateLine(line) {
    return Data.products[line.productId || line.id] || null;
  }

  function viewLine(stateLine, quote) {
    var product = productForStateLine(stateLine);
    var priced = quotedLineById(quote, stateLine.id);
    if (!product || !priced) return null;
    return Object.assign({}, product, stateLine, priced);
  }

  /* ------- Sidebar renderer ------- */
  var SUMMARY_GROUPS = [
    [
      { key: "listPrice", label: "Precio de lista" },
      { key: "promotionDiscount", label: "Descuento x promoción", discount: true },
      { key: "quantityDiscount", label: "Descuento x cantidad", discount: true },
      { key: "personalizationDiscount", label: "Descuento x personalización (Logo)", discount: true },
      { key: "couponDiscount", label: "Descuento x cupón", discount: true },
      { key: "shipping", label: "Envío" }
    ],
    [
      { key: "subtotal", label: "Subtotal" },
      { key: "tax", label: "Impuestos aproximados" }
    ],
    [
      { key: "total", label: "Total", total: true }
    ]
  ];

  function discountDisplay(value, cents) {
    return cents > 0 ? "-" + value : value;
  }

  function pricingValue(quote, field) {
    if (field.key === "shipping") return quote.display.shipping;
    if (!field.discount) return quote.display[field.key];
    var centsKey = field.key + "Cents";
    return discountDisplay(quote.display[field.key], quote.breakdown[centsKey]);
  }

  /** Envío row from shipping step onward, and only while a delivery address is selected. */
  function shouldShowShippingSummaryRow(state) {
    var step = document.body.getAttribute("data-carrito-step");
    if (step !== "shipping" && step !== "payment" && step !== "confirmation") return false;
    if (!state || !state.shipping) return false;
    if (state.shipping.pickupSelected) return false;
    return state.shipping.selectedAddressIndex != null && state.shipping.selectedAddressIndex >= 0;
  }

  function summaryGroupsFor(state, quote) {
    return SUMMARY_GROUPS.map(function (group) {
      return group.filter(function (field) {
        if (field.discount) {
          var cents = quote && quote.breakdown ? quote.breakdown[field.key + "Cents"] : 0;
          return cents > 0;
        }
        if (field.key === "shipping") return shouldShowShippingSummaryRow(state);
        return true;
      });
    }).filter(function (group) {
      return group.length > 0;
    });
  }

  function renderPricingBreakdown(root, quote, state) {
    var container = root.querySelector("[data-pricing-breakdown]");
    if (!container) return;
    container.innerHTML = summaryGroupsFor(state || read(), quote).map(function (group, groupIndex) {
      return '<div class="pricing-summary-group" data-pricing-group="' + (groupIndex + 1) + '">' +
        group.map(function (field) {
          var classes = "summary-row";
          if (field.discount) classes += " discount";
          if (field.total) classes += " total";
          if (field.key === "shipping" && quote.shipping.status === SHIPPING_STATUS.PENDING) classes += " is-pending";
          if (field.key === "total" && !quote.isFinal) classes += " is-pending";
          return '<div class="' + classes + '" data-pricing-row="' + field.key + '">' +
            '<span>' + field.label + '</span>' +
            '<span data-pricing-value="' + field.key + '">' + pricingValue(quote, field) + '</span>' +
          '</div>';
        }).join("") +
      '</div>';
    }).join("");
  }

  function updatePricingCtaValidity(totals) {
    var selector = [
      "[data-cart-cta]",
      "[data-buyer-next]",
      "[data-shipping-next]",
      ".checkout-actions .btn-primary"
    ].join(",");
    document.querySelectorAll(selector).forEach(function (cta) {
      var disabled = !totals.isValid ||
        (cta.matches("[data-cart-cta]") && totals.itemCount === 0);
      cta.classList.toggle("disabled", disabled);
      cta.setAttribute("aria-disabled", disabled ? "true" : "false");
      if ("disabled" in cta) cta.disabled = disabled;
    });
    if (!totals.isValid) {
      console.error("Formas pricing data is invalid:", totals.errors);
    }
  }

  function bindPricingCtaGuard() {
    if (document.documentElement.dataset.pricingCtaGuardBound) return;
    document.documentElement.dataset.pricingCtaGuardBound = "1";
    document.addEventListener("click", function (event) {
      var cta = event.target.closest(
        "[data-cart-cta], [data-buyer-next], [data-shipping-next], .checkout-actions .btn-primary"
      );
      if (cta && cta.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  function renderSidebar(root, opts) {
    if (!root) return;
    opts = opts || {};
    var state = read();
    var totals = quoteFor(state, opts);
    var kind = totals.kind || currentQuoteKind(state, opts);
    var copy = cartKindCopy(kind);
    var kindTotal = linesOfKind(state, kind).length;

    root.querySelectorAll("[data-totals='itemCount']").forEach(function (el) {
      el.textContent = totals.itemCount;
    });
    root.querySelectorAll("[data-totals='total']").forEach(function (el) {
      el.textContent = totals.display.total;
    });
    renderPricingBreakdown(root, totals, state);

    renderCouponSection(root, state);

    if (opts.renderItems !== false) {
      renderSidebarItems(root, state);
    }

    var label;
    if (totals.itemCount === 0) {
      label = copy.ctaMini;
    } else if (totals.itemCount === kindTotal) {
      label = copy.ctaAll;
    } else {
      label = copy.ctaSome;
    }
    root.querySelectorAll("[data-cart-cta]").forEach(function (cta) {
      var labelNode = cta.querySelector("[data-cta-label]") || cta.querySelector(".text") || cta;
      labelNode.textContent = label;
    });

    updatePricingCtaValidity(totals);
  }

  function renderCouponSection(root, state) {
    var coupon = findCoupon(state.couponCode);
    root.querySelectorAll("[data-coupon-section]").forEach(function (section) {
      var input = section.querySelector("[data-coupon-input]");
      var inputBox = section.querySelector("[data-coupon-input-box]");
      var applied = section.querySelector("[data-coupon-applied]");
      if (!applied) return;
      if (coupon) {
        section.style.display = "";
        if (inputBox) inputBox.style.display = "none";
        applied.style.display = "";
        var codeEl = applied.querySelector("[data-coupon-code]");
        var pctEl = applied.querySelector("[data-coupon-pct]");
        if (codeEl) codeEl.textContent = coupon.code;
        if (pctEl) pctEl.textContent = Math.round(coupon.rate * 100) + "% OFF";
        return;
      }
      if (inputBox) {
        section.style.display = "";
        inputBox.style.display = "";
      } else {
        section.style.display = "none";
      }
      applied.style.display = "none";
      if (input) {
        input.classList.remove("error", "success");
        var err = section.querySelector(".coupon-error");
        if (err) err.remove();
      }
    });
  }

  // Apparel qty opens the size-breakdown sidebar (same as cart "Ver desglose de talles").
  function variantQtyHtml(line) {
    if (line.apparel) {
      return 'Cantidad: ' +
        '<button type="button" class="variant-qty-link size-breakdown-toggle" data-cart-id="' +
          escapeHtml(line.id) + '" aria-haspopup="dialog" aria-label="Ver desglose de talles">' +
          line.qty +
        '</button>';
    }
    return 'Cantidad: ' + line.qty;
  }

  function renderSidebarItems(root, state) {
    var listRoot = root.querySelector("[data-sidebar-items]");
    if (!listRoot) return;
    var quote = quoteFor(state);
    var items = quote.selectedLines;
    if (!items.length) {
      listRoot.innerHTML = '<div class="sidebar-empty text-caption-1 text-secondary">No hay productos seleccionados.</div>';
      return;
    }
    listRoot.innerHTML = items.map(function (line) {
      return '' +
        '<div class="item-product' + (line.apparel ? ' is-apparel' : '') + '">' +
          '<a href="javascript:void(0);" class="img-product">' +
            '<img src="' + escapeHtml(line.image) + '" alt="' + escapeHtml(line.title) + '">' +
          '</a>' +
          '<div class="content-box">' +
            '<div class="info">' +
              '<a href="javascript:void(0);" class="name-product link text-title">' + escapeHtml(line.title) + '</a>' +
              '<div class="variant text-caption-1 text-secondary">' + variantQtyHtml(line) + '</div>' +
            '</div>' +
            '<div class="total-price-line text-button">' + Pricing.formatCents(line.netLineCents) + '</div>' +
          '</div>' +
        '</div>';
    }).join("");
  }

  function unitPriceTipHtml(line) {
    var tipId = "cart-unit-tip-" + escapeHtml(line.id);
    var promoUnitDiscountCents = line.qty
      ? Math.round(line.promotionDiscountCents / line.qty)
      : 0;
    var qtyUnitDiscountCents = line.qty
      ? Math.round(line.quantityDiscountCents / line.qty)
      : 0;

    function tipRow(label, valueHtml, extraClass) {
      return '<span class="cart-unit-price-tip__row' + (extraClass ? " " + extraClass : "") + '">' +
        '<span class="cart-unit-price-tip__label">' + label + '</span>' +
        '<span class="cart-unit-price-tip__value">' + valueHtml + '</span>' +
      '</span>';
    }

    function discountTipRow(label, cents) {
      if (!(cents > 0)) return "";
      return tipRow(label, discountDisplay(Pricing.formatCents(cents), cents), "is-discount");
    }

    return '' +
      '<span class="cart-unit-price-tip">' +
        '<button type="button" class="cart-unit-price-tip__btn" aria-expanded="false" aria-controls="' + tipId + '" aria-label="Cómo se calcula el precio unitario de ' + escapeHtml(line.title) + '">' +
          '<i class="icon-question" aria-hidden="true"></i>' +
        '</button>' +
        '<span class="cart-unit-price-tip__panel" id="' + tipId + '" role="tooltip">' +
          tipRow("Precio de lista", Pricing.formatCents(line.listUnitPriceCents)) +
          discountTipRow("Descuento x promoción", promoUnitDiscountCents) +
          discountTipRow("Descuento x cantidad", qtyUnitDiscountCents) +
          tipRow("Precio unitario", Pricing.formatCents(line.unitPriceCents), "is-result") +
        '</span>' +
      '</span>';
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
          s.couponCode = null;
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
      s.couponCode = coupon.code;
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
    var params = new URLSearchParams(window.location.search);
    var cartParam = String(params.get("cart") || "").toLowerCase();
    if (cartParam === "muestras" || cartParam === "sample") {
      state.activeCartKind = CART_KIND.SAMPLE;
      write(state);
    }
    var tbody = document.querySelector("[data-cart-tbody]");
    var sidebar = document.querySelector("[data-cart-sidebar]");
    var mobileSummary = document.querySelector(".mobile-order-summary");
    if (!tbody) return;

    bindCartKindControls();
    renderCartRows(tbody, state);
    renderSidebar(sidebar, { renderItems: false });
    if (mobileSummary) renderSidebar(mobileSummary, { renderItems: false });
    bindCartInteractions(tbody);
    bindCouponSections(document, function () {
      var s = read();
      renderCartRows(tbody, s);
      renderSidebar(sidebar, { renderItems: false });
      if (mobileSummary) renderSidebar(mobileSummary, { renderItems: false });
    });
    bindSelectAll();
    bindPricingCtaGuard();
    setupApparelSizeSidebar();
    setupMobileOrderSummary();
    syncCartKindUI(state);
    renderMinicart();
  }

  function renderCartRows(list, state) {
    var kind = currentQuoteKind(state);
    var quote = quoteFor(state, { kind: kind });
    var kindLines = linesOfKind(state, kind);
    list.innerHTML = kindLines.map(function (stateLine) {
      var line = viewLine(stateLine, quote);
      if (!line) {
        var matchingError = quote.errors.find(function (error) {
          return error.lineId === stateLine.id;
        });
        console.error("Unable to render cart line:", matchingError || stateLine);
        return "";
      }
      var unitPrice = Pricing.formatCents(line.unitPriceCents);
      var setupValue = !line.logoSelected
        ? { value: "Sin logo", cls: "is-none" }
        : line.personalizationDiscountCents > 0
          ? { value: "Gratis", cls: "is-free" }
          : { value: Pricing.formatCents(line.payableSetupCents), cls: "" };
      var totalValue = Pricing.formatCents(line.netLineCents);
      var apparel = !!line.apparel;
      var isSample = (line.kind || CART_KIND.STANDARD) === CART_KIND.SAMPLE;
      var id = escapeHtml(line.id);
      var title = escapeHtml(line.title);
      var sampleBadge = isSample ? '<span class="cart-kind-badge">Muestra</span>' : "";
      var setupRow = isSample
        ? '<div class="cart-price-row cart-price-row--meta" data-cart-title="Tipo">' +
            '<span class="cart-price-label">Personalización</span>' +
            '<span class="cart-line-setup">' + (line.logoSelected ? "Con logo" : "Sin logo") + '</span>' +
          '</div>'
        : '<div class="cart-price-row cart-price-row--setup ' + setupValue.cls + '" data-cart-title="Setup logo">' +
            '<span class="cart-price-label">Setup logo</span>' +
            '<span class="cart-line-setup">' + setupValue.value + '</span>' +
          '</div>';

      var sizesBtn =
        '<button type="button" class="cart-sizes-link size-breakdown-toggle" data-cart-id="' + id + '" aria-haspopup="dialog">' +
          'Ver desglose de talles <i class="icon-arrRight"></i>' +
        '</button>';

      var qtyBlock = apparel
        ? '<div class="cart-qty-block is-apparel" data-cart-title="Cantidad">' +
            '<span class="cart-qty-text">' +
              '<span class="cart-qty-label">Cantidad</span>' +
              '<strong class="cart-qty-value" data-cart-qty-display="' + id + '">' + line.qty + '</strong>' +
            '</span>' +
            sizesBtn +
          '</div>'
        : '<div class="cart-qty-block" data-cart-title="Cantidad">' +
            '<span class="cart-qty-label">Cantidad</span>' +
            '<div class="wg-quantity">' +
              '<span class="btn-quantity btn-decrease" aria-hidden="true">-</span>' +
              '<input type="text" class="quantity-product" data-cart-qty="' + id + '" name="number-' + id + '" value="' + line.qty + '" inputmode="numeric" pattern="[0-9]*" aria-label="Cantidad">' +
              '<span class="btn-quantity btn-increase" aria-hidden="true">+</span>' +
            '</div>' +
          '</div>';

      return '' +
        '<article class="tf-cart-item file-delete' + (line.selected ? ' is-selected' : '') + (apparel ? ' is-apparel' : '') + (isSample ? ' is-sample' : '') + '" data-cart-id="' + id + '">' +
          '<div class="cart-card__main">' +
            '<div class="cart-card__product">' +
              '<label class="tf-cart-checkbox">' +
                '<input type="checkbox" class="tf-check" data-cart-select="' + id + '"' + (line.selected ? ' checked' : '') + ' aria-label="Seleccionar ' + title + '">' +
              '</label>' +
              '<a href="javascript:void(0);" class="img-box">' +
                '<img src="' + escapeHtml(line.image) + '" alt="' + title + '">' +
              '</a>' +
              '<div class="cart-info">' +
                '<div class="cart-title-row">' +
                  '<a href="javascript:void(0);" class="cart-title">' + title + '</a>' +
                  sampleBadge +
                '</div>' +
                qtyBlock +
              '</div>' +
            '</div>' +
            '<div class="cart-card__pricing">' +
              '<div class="cart-price-row" data-cart-title="Precio unitario">' +
                '<span class="cart-price-label-group">' +
                  '<span class="cart-price-label">Precio unitario</span>' +
                  unitPriceTipHtml(line) +
                '</span>' +
                '<span class="cart-line-price">' + unitPrice + '</span>' +
              '</div>' +
              setupRow +
              '<div class="cart-price-row cart-price-row--total" data-cart-title="Total">' +
                '<span class="cart-price-label">Total</span>' +
                '<span class="cart-line-total">' + totalValue + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cart-card__actions">' +
            '<button type="button" class="cart-action-link" data-cart-edit>Editar</button>' +
            '<span class="cart-action-sep" aria-hidden="true">|</span>' +
            '<button type="button" class="cart-action-link remove" aria-label="Quitar ' + title + '">Quitar</button>' +
          '</div>' +
          '<button type="button" class="remove cart-card__remove-icon icon icon-close" aria-label="Quitar ' + title + '"></button>' +
        '</article>';
    }).join("");
    syncSelectAllStates();
    refreshEmptyState();
  }

  function closeUnitPriceTips(exceptTip) {
    document.querySelectorAll(".cart-unit-price-tip.is-open").forEach(function (tip) {
      if (exceptTip && tip === exceptTip) return;
      tip.classList.remove("is-open");
      var btn = tip.querySelector(".cart-unit-price-tip__btn");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function bindCartInteractions(list) {
    list.addEventListener("click", function (e) {
      var tipBtn = e.target.closest(".cart-unit-price-tip__btn");
      if (tipBtn) {
        e.preventDefault();
        e.stopPropagation();
        var tip = tipBtn.closest(".cart-unit-price-tip");
        if (!tip) return;
        var willOpen = !tip.classList.contains("is-open");
        closeUnitPriceTips(tip);
        tip.classList.toggle("is-open", willOpen);
        tipBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
        return;
      }
      if (!e.target.closest(".cart-unit-price-tip")) closeUnitPriceTips();
    });

    if (!document.documentElement.dataset.unitPriceTipDocBound) {
      document.documentElement.dataset.unitPriceTipDocBound = "1";
      document.addEventListener("click", function (e) {
        if (!e.target.closest(".cart-unit-price-tip")) closeUnitPriceTips();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeUnitPriceTips();
      });
    }

    list.addEventListener("change", function (e) {
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

    list.addEventListener("click", function (e) {
      var editBtn = e.target.closest("[data-cart-edit]");
      if (editBtn) {
        e.preventDefault();
        var editRow = editBtn.closest(".tf-cart-item");
        if (!editRow) return;
        if (editRow.classList.contains("is-apparel")) {
          openSizeSidebar(editRow.getAttribute("data-cart-id"));
        } else {
          var qtyInput = editRow.querySelector("[data-cart-qty]");
          if (qtyInput) {
            qtyInput.focus();
            if (typeof qtyInput.select === "function") qtyInput.select();
          }
        }
        return;
      }

      var inc = e.target.closest(".btn-increase");
      var dec = e.target.closest(".btn-decrease");
      if (!(inc || dec)) return;
      var row = (inc || dec).closest(".tf-cart-item");
      if (!row) return;
      if (row.classList.contains("is-apparel")) {
        e.preventDefault();
        openSizeSidebar(row.getAttribute("data-cart-id"));
        return;
      }
      var input = row.querySelector("[data-cart-qty]");
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
    var list = document.querySelector("[data-cart-tbody]");
    if (list) renderCartRows(list, s);
    rerenderTotalsAndSelectAll();
  }

  var _undoTimer = null;
  function removeLineById(id) {
    var s = read();
    var idx = s.cart.findIndex(function (l) { return l.id === id; });
    if (idx === -1) return null;
    var deletedLine = s.cart[idx];
    s.cart.splice(idx, 1);
    write(s);
    var tbody = document.querySelector("[data-cart-tbody]");
    if (tbody) renderCartRows(tbody, s);
    rerenderTotalsAndSelectAll();
    refreshEmptyState();
    return { line: deletedLine, index: idx };
  }

  function handleDeleteRow(row) {
    var id = row.getAttribute("data-cart-id");
    var result = removeLineById(id);
    if (result) showUndoToast(result.line, result.index);
  }

  function showUndoToast(line, originalIndex) {
    var existing = document.querySelector(".carrito-undo-toast");
    if (existing) existing.remove();
    if (_undoTimer) clearTimeout(_undoTimer);

    var toast = document.createElement("div");
    toast.className = "carrito-undo-toast";
    var undoCopy = cartKindCopy(line.kind || CART_KIND.STANDARD);
    toast.innerHTML = '<span>' + undoCopy.undo + '</span>' +
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
        var kind = currentQuoteKind(s);
        s.cart.forEach(function (l) {
          if ((l.kind || CART_KIND.STANDARD) === kind) l.selected = checked;
        });
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
    var kind = currentQuoteKind(s);
    var kindLines = linesOfKind(s, kind);
    var total = kindLines.length;
    var checked = kindLines.filter(function (l) { return l.selected; }).length;
    document.querySelectorAll("[data-cart-select-all]").forEach(function (cb) {
      cb.checked = total > 0 && checked === total;
      cb.indeterminate = checked > 0 && checked < total;
    });
  }

  function rerenderTotalsAndSelectAll() {
    var sidebar = document.querySelector("[data-cart-sidebar]");
    var mobileSummary = document.querySelector(".mobile-order-summary");
    if (sidebar) renderSidebar(sidebar, { renderItems: false });
    if (mobileSummary) renderSidebar(mobileSummary, { renderItems: false });
    syncSelectAllStates();
    renderMinicart();
    syncCartKindUI(read());
  }

  // Toggle the empty-cart layout when the cart has no lines.
  function refreshEmptyState() {
    var s = read();
    var kind = currentQuoteKind(s);
    var bothEmpty = !s.cart.length;
    var kindEmpty = linesOfKind(s, kind).length === 0;
    document.body.classList.toggle("cart-is-empty", bothEmpty);
    document.body.classList.toggle("cart-kind-is-empty", !bothEmpty && kindEmpty);
    document.body.setAttribute("data-active-cart-kind", kind);
    syncEmptyCopy(s, kind, bothEmpty, kindEmpty);
  }

  /* ------- Apparel size breakdown sidebar ------- */
  var _apparelSidebarReady = false;
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
    if (_apparelSidebarReady) return;
    _apparelSidebarReady = true;
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".size-breakdown-toggle");
      if (btn) {
        e.preventDefault();
        openSizeSidebar(btn.getAttribute("data-cart-id"));
      }
    });
  }

  function isCartStep() {
    return document.body.getAttribute("data-carrito-step") === "cart";
  }

  function openSizeSidebar(cartId) {
    var sb = document.querySelector(".size-breakdown-sidebar");
    var overlay = document.querySelector(".size-breakdown-overlay");
    if (!sb || !overlay) return;
    var content = sb.querySelector(".sidebar-content");
    var s = read();
    var line = s.cart.find(function (candidate) { return candidate.id === cartId; });
    if (!line) return;
    var product = productForStateLine(line);
    if (!product) {
      console.error("Missing catalog product for cart line:", line);
      return;
    }
    var sizes = line.sizes || { S: 0, M: 0, L: 0, XL: 0 };
    var editable = isCartStep();

    sb.classList.toggle("is-readonly", !editable);

    var sizeRows = Object.keys(APPAREL_STOCK).map(function (size) {
      var stock = APPAREL_STOCK[size];
      var qty = sizes[size] || 0;
      var disabledAttrs = editable ? "" : " disabled readonly tabindex=\"-1\"";
      var stockHtml = editable
        ? ' <span class="stock-info text-caption-1 text-secondary">(' + stock + ' un.)</span>'
        : "";
      return '' +
        '<div class="sidebar-size-row">' +
          '<div class="sidebar-size-label">' + size + stockHtml + '</div>' +
          '<div class="sidebar-size-quantity-input">' +
            '<input type="number" class="sidebar-size-quantity" data-size="' + size +
              '" min="0" max="' + stock + '" value="' + qty + '"' + disabledAttrs + '>' +
          '</div>' +
        '</div>';
    }).join("");

    content.innerHTML = '' +
      '<div class="sidebar-product-info">' +
        '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.title) + '">' +
        '<div class="sidebar-product-details"><h6>' + escapeHtml(product.title) + '</h6></div>' +
      '</div>' +
      '<div class="sidebar-size-breakdown">' + sizeRows + '</div>' +
      (editable
        ? '<button type="button" class="tf-btn sidebar-add-units-btn"><span class="text">Agregar unidades</span></button>'
        : '');

    if (!editable) {
      sb.classList.add("open");
      overlay.classList.add("show");
      document.body.classList.add("sidebar-open");
      return;
    }

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
      if (totalQty < 1) {
        var btn = content.querySelector(".sidebar-add-units-btn");
        var existing = content.querySelector(".size-min-notice");
        if (existing) existing.remove();
        var notice = document.createElement("div");
        notice.className = "stock-notification size-min-notice";
        notice.textContent = "Ingresá al menos 1 unidad.";
        if (btn && btn.parentNode) btn.parentNode.insertBefore(notice, btn);
        else content.appendChild(notice);
        setTimeout(function () { notice.remove(); }, 3000);
        return;
      }
      var s2 = read();
      var l2 = s2.cart.find(function (l) { return l.id === cartId; });
      if (l2) {
        l2.sizes = newSizes;
        l2.qty = totalQty;
        write(s2);
        var list = document.querySelector("[data-cart-tbody]");
        if (list) renderCartRows(list, s2);
        rerenderTotalsAndSelectAll();
        if (document.querySelector("[data-checkout-sidebar]")) refreshCheckoutSidebar();
        if (document.querySelector("[data-success-products]")) renderSuccessProducts();
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
    var content = summary.querySelector(".mobile-summary-content");
    if (!header) return;

    function measureContentHeight() {
      if (!content) return;
      var probe = content.cloneNode(true);
      probe.removeAttribute("aria-hidden");
      probe.style.cssText =
        "position:absolute;left:0;right:0;bottom:100%;visibility:hidden;pointer-events:none;" +
        "max-height:none;height:auto;opacity:1;transform:none;overflow:visible;" +
        "padding:0 16px 16px;";
      summary.appendChild(probe);
      var h = probe.scrollHeight;
      probe.remove();
      var cap = Math.round(Math.min(window.innerHeight * 0.55, 520));
      content.style.setProperty("--mobile-summary-open-height", Math.min(h, cap) + "px");
    }

    function syncExpandedState() {
      var expanded = !summary.classList.contains("collapsed");
      header.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (content) {
        content.setAttribute("aria-hidden", expanded ? "false" : "true");
        if (expanded) measureContentHeight();
      }
    }

    measureContentHeight();
    syncExpandedState();
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");

    header.addEventListener("click", function () {
      if (summary.classList.contains("collapsed")) measureContentHeight();
      summary.classList.toggle("collapsed");
      syncExpandedState();
    });
    header.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (summary.classList.contains("collapsed")) measureContentHeight();
      summary.classList.toggle("collapsed");
      syncExpandedState();
    });

    if (content && typeof ResizeObserver !== "undefined") {
      var ro = new ResizeObserver(function () {
        if (!summary.classList.contains("collapsed")) measureContentHeight();
      });
      ro.observe(content);
    }
  }

  /* ------- Shared checkout summary (desktop sidebar + sticky mobile) ------- */
  function refreshCheckoutSidebar() {
    var sidebar = document.querySelector("[data-checkout-sidebar]");
    var mobileSummary = document.querySelector(".mobile-order-summary");
    if (sidebar) renderSidebar(sidebar);
    if (mobileSummary) renderSidebar(mobileSummary);
  }

  function setupSummaryItemsToggle() {
    document.querySelectorAll("[data-summary-items]").forEach(function (wrap) {
      var toggle = wrap.querySelector("[data-items-toggle]");
      if (!toggle || toggle.dataset.itemsToggleBound) return;
      toggle.dataset.itemsToggleBound = "1";
      toggle.addEventListener("click", function () {
        var collapsed = wrap.classList.toggle("is-collapsed");
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    });
  }

  function initCheckoutSummary() {
    setupApparelSizeSidebar();
    refreshCheckoutSidebar();
    bindCouponSections(document, refreshCheckoutSidebar);
    bindPricingCtaGuard();
    setupMobileOrderSummary();
    setupSummaryItemsToggle();
    syncCartKindUI(read());
  }

  /* ====================================================================
   *  Step 2 — Buyer
   * ==================================================================== */
  function initBuyer() {
    initCheckoutSummary();

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
          '<button type="button" class="btn-remove-file" data-logo-remove="' + i + '" title="Eliminar logo" aria-label="Quitar"><i class="fa-regular fa-trash-can"></i></button>' +
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
  function ensureDefaultOfficePickup(state) {
    var ship = state.shipping || (state.shipping = clone(DEFAULT_STATE.shipping));
    var hasAddress = ship.selectedAddressIndex != null && ship.selectedAddressIndex >= 0;
    if (!ship.pickupSelected && !hasAddress) {
      ship.pickupSelected = true;
      ship.mode = "pickup";
      ship.selectedAddressIndex = -1;
      applyShippingQuote(state, Pricing.buildQuotedShipping(0, "pickup"));
    }
    return state;
  }

  function initShipping() {
    initCheckoutSummary();

    var s = ensureDefaultOfficePickup(read());
    write(s);
    renderAddressList();
    setupAddAddress();
    setupOfficePickup();
    setupEventOrder();

    var pickupRadio = document.querySelector("[data-pickup-radio]");
    if (pickupRadio) {
      pickupRadio.checked = !!(s.shipping && s.shipping.pickupSelected);
      syncOfficePickupSelection();
    }
    refreshCheckoutSidebar();

    var nextBtn = document.querySelector("[data-shipping-next]");
    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        var s2 = read();
        var sel = s2.shipping || {};
        var quote = Pricing.resolveShippingQuote(s2);
        if (!sel.pickupSelected && (sel.selectedAddressIndex == null || sel.selectedAddressIndex < 0)) {
          e.preventDefault();
          alert("Por favor seleccioná una dirección de envío o el retiro por oficinas.");
          return;
        }
        if (quote.status !== SHIPPING_STATUS.QUOTED) {
          e.preventDefault();
          alert("Calculá el costo de envío de la dirección seleccionada antes de continuar.");
        }
      });
    }
  }

  function restoreAddressFormPlacement(formContainer, hideForm) {
    var home = document.querySelector("[data-address-form-home]");
    if (formContainer && home && formContainer.parentElement !== home) {
      home.appendChild(formContainer);
    }
    document.querySelectorAll(".address-card.is-editing").forEach(function (card) {
      card.classList.remove("is-editing");
    });
    if (formContainer && hideForm) formContainer.style.display = "none";
  }

  function placeAddressForm(formContainer, editingIndex) {
    restoreAddressFormPlacement(formContainer, false);
    if (editingIndex >= 0) {
      var card = document.querySelector('[data-address-index="' + editingIndex + '"]');
      if (card) {
        card.classList.add("is-editing");
        card.insertAdjacentElement("afterend", formContainer);
      }
    }
    formContainer.style.display = "";
  }

  function renderAddressList() {
    var list = document.querySelector("[data-address-list]");
    var addBtn = document.querySelector("[data-add-address-btn]");
    if (!list) return;
    restoreAddressFormPlacement(document.querySelector("[data-address-form]"), true);
    var s = read();
    var addresses = (s.shipping && s.shipping.addresses) || [];

    if (!addresses.length) {
      list.innerHTML = "";
      list.style.display = "none";
      if (addBtn) addBtn.style.display = "";
      ensureDefaultOfficePickup(s);
      write(s);
      var pickupRadio = document.querySelector("[data-pickup-radio]");
      if (pickupRadio) {
        pickupRadio.checked = true;
        syncOfficePickupSelection();
      }
      refreshCheckoutSidebar();
      return;
    }

    list.style.display = "";
    if (addBtn) addBtn.style.display = "none";

    list.innerHTML = addresses.map(function (a, idx) {
      var checked = (s.shipping.selectedAddressIndex === idx);
      var line2 = [a.piso, a.departamento].filter(Boolean).join(" ");
      var ref = a.referencias ? '<p class="delivery-instructions text-caption-1 text-secondary">Nota: ' + escapeHtml(a.referencias) + '</p>' : '';
      var addressQuote = a.shippingQuoted
        ? Pricing.buildQuotedShipping(a.shippingCost || 0, "address")
        : Pricing.buildPendingShipping();
      var shippingCostLabel = Pricing.shippingLabel(addressQuote);
      return '' +
        '<div class="address-card' + (checked ? " selected" : "") + '" data-address-index="' + idx + '">' +
          '<label class="payment-header" data-bs-toggle="">' +
            '<input type="radio" name="delivery-address" class="tf-check-rounded" value="' + idx + '"' + (checked ? " checked" : "") + '>' +
            '<div class="address-details">' +
              '<p class="text-button">' + escapeHtml(a.calle) + ' ' + escapeHtml(a.numero) + (line2 ? ", " + escapeHtml(line2) : "") + '</p>' +
              '<p>' + escapeHtml(a.ciudad) + ', ' + escapeHtml(a.provincia) + ' (CP ' + escapeHtml(a.codigoPostal) + ')</p>' +
              '<p>Teléfono: ' + escapeHtml(a.telefono) + '</p>' +
              ref +
              '<div class="address-shipping-cost"><strong>Costo de envío estimado (sin IVA):</strong> ' + shippingCostLabel + '</div>' +
            '</div>' +
          '</label>' +
          '<button type="button" class="edit-address-btn" data-edit-address="' + idx + '" aria-label="Editar"><i class="fa-solid fa-edit"></i></button>' +
          '<button type="button" class="btn-remove-file" data-delete-address="' + idx + '" title="Eliminar dirección" aria-label="Eliminar"><i class="fa-regular fa-trash-can"></i></button>' +
        '</div>';
    }).join("") +
    '<button type="button" class="tf-btn btn-reset w-100 btn-white btn-square btn-dashed btn-md" data-add-another><i class="bi bi-plus-lg"></i> <span class="text">Agregar otra dirección</span></button>';

    list.querySelectorAll('input[name="delivery-address"]').forEach(function (rb) {
      rb.addEventListener("change", function () {
        var sx = read();
        var selectedIndex = parseInt(rb.value, 10);
        var selectedAddress = sx.shipping.addresses[selectedIndex] || {};
        sx.shipping.selectedAddressIndex = selectedIndex;
        sx.shipping.pickupSelected = false;
        sx.shipping.mode = "domicilio";
        if (selectedAddress.shippingQuoted) {
          applyShippingQuote(sx, Pricing.buildQuotedShipping(selectedAddress.shippingCost || 0, "address"));
        } else {
          applyShippingQuote(sx, Pricing.buildPendingShipping());
        }
        write(sx);
        var pickup = document.querySelector("[data-pickup-radio]");
        if (pickup) pickup.checked = false;
        syncOfficePickupSelection();
        renderAddressList();
        refreshCheckoutSidebar();
      });
    });
    list.querySelectorAll("[data-edit-address]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var idx = parseInt(btn.getAttribute("data-edit-address"), 10);
        showAddressForm(idx);
      });
    });
    list.querySelectorAll("[data-delete-address]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute("data-delete-address"), 10);
        deleteAddress(idx);
      });
    });
    var another = list.querySelector("[data-add-another]");
    if (another) {
      another.addEventListener("click", function () { showAddressForm(-1); });
    }

    syncShippingQuote(s);
    write(s);
    refreshCheckoutSidebar();
  }

  function deleteAddress(index) {
    var s = read();
    var addresses = (s.shipping && s.shipping.addresses) || [];
    if (index < 0 || index >= addresses.length) return;

    addresses.splice(index, 1);
    s.shipping.addresses = addresses;

    if (!addresses.length) {
      s.shipping.selectedAddressIndex = -1;
      ensureDefaultOfficePickup(s);
      var pickupRadio = document.querySelector("[data-pickup-radio]");
      if (pickupRadio) {
        pickupRadio.checked = true;
        syncOfficePickupSelection();
      }
    } else if (s.shipping.selectedAddressIndex === index) {
      s.shipping.selectedAddressIndex = 0;
      s.shipping.mode = "domicilio";
      s.shipping.pickupSelected = false;
      if (addresses[0].shippingQuoted) {
        applyShippingQuote(s, Pricing.buildQuotedShipping(addresses[0].shippingCost || 0, "address"));
      } else {
        applyShippingQuote(s, Pricing.buildPendingShipping());
      }
    } else if (s.shipping.selectedAddressIndex > index) {
      s.shipping.selectedAddressIndex -= 1;
    }

    write(s);
    restoreAddressFormPlacement(document.querySelector("[data-address-form]"), true);
    renderAddressList();
    refreshCheckoutSidebar();
  }

  function setupAddAddress() {
    var btn = document.querySelector("[data-add-address-btn]");
    if (!btn) return;
    btn.addEventListener("click", function () { showAddressForm(-1); });
  }

  function postalCodeValue(form) {
    var input = form && form.querySelector('[name="codigoPostal"]');
    return input ? String(input.value || "").trim() : "";
  }

  function requirePostalCode(form) {
    var input = form && form.querySelector('[name="codigoPostal"]');
    if (!input) return false;
    if (postalCodeValue(form)) {
      input.setCustomValidity("");
      return true;
    }
    input.setCustomValidity("Ingresá el código postal para calcular el envío.");
    input.reportValidity();
    input.setCustomValidity("");
    return false;
  }

  function mockShippingCostMajor() {
    return Data.policy.mockShippingNet;
  }

  function showAddressForm(editingIndex) {
    var formContainer = document.querySelector("[data-address-form]");
    if (!formContainer) return;
    var form = formContainer.querySelector("form");
    var s = read();
    var initial = editingIndex >= 0 ? s.shipping.addresses[editingIndex] : null;
    fillForm(form, initial || {
      calle: "", numero: "", piso: "", departamento: "",
      codigoPostal: "", ciudad: "", provincia: "", telefono: "", referencias: ""
    });
    placeAddressForm(formContainer, editingIndex);

    var costBox = formContainer.querySelector("[data-shipping-cost-box]");
    var costLabel = formContainer.querySelector("[data-mock-shipping-cost]");
    var calculatedShippingCost = (initial && initial.shippingQuoted) ? (parseFloat(initial.shippingCost) || 0) : null;

    function showQuotedShippingCost(amount) {
      calculatedShippingCost = amount;
      if (costLabel) costLabel.textContent = formatPrice(amount);
      if (costBox) costBox.style.display = "";
    }

    if (calculatedShippingCost != null) showQuotedShippingCost(calculatedShippingCost);
    else if (costBox) costBox.style.display = "none";

    var addBtn = document.querySelector("[data-add-address-btn]");
    if (addBtn) addBtn.style.display = "none";

    form.oninput = function () {
      calculatedShippingCost = null;
      if (costBox) costBox.style.display = "none";
    };

    form.onsubmit = function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = readForm(form);
      if (calculatedShippingCost == null) {
        // Auto-quote on save so domicilio always has a shipping cost.
        calculatedShippingCost = mockShippingCostMajor();
      }
      data.shippingQuoted = true;
      data.shippingCost = calculatedShippingCost;
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
      applyShippingQuote(s2, Pricing.buildQuotedShipping(calculatedShippingCost, "address"));
      write(s2);
      var pickup = document.querySelector("[data-pickup-radio]");
      if (pickup) pickup.checked = false;
      syncOfficePickupSelection();
      restoreAddressFormPlacement(formContainer, true);
      renderAddressList();
      refreshCheckoutSidebar();
    };

    var calc = formContainer.querySelector("[data-calc-shipping]");
    if (calc) {
      calc.onclick = function (e) {
        e.preventDefault();
        if (!requirePostalCode(form)) return;
        // Mock carrier quote from pricing policy. Replace with API response later.
        calculatedShippingCost = mockShippingCostMajor();
        showQuotedShippingCost(calculatedShippingCost);
      };
    }
    var cancel = formContainer.querySelector("[data-cancel-address]");
    if (cancel) {
      cancel.onclick = function (e) {
        e.preventDefault();
        restoreAddressFormPlacement(formContainer, true);
        var s3 = read();
        if (!(s3.shipping.addresses || []).length && addBtn) addBtn.style.display = "";
        renderAddressList();
      };
    }
  }

  function syncOfficePickupSelection() {
    var radio = document.querySelector("[data-pickup-radio]");
    if (!radio) return;
    var card = radio.closest(".office-pickup-card");
    if (card) card.classList.toggle("selected", radio.checked);
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
        applyShippingQuote(s, Pricing.buildQuotedShipping(0, "pickup"));
      }
      write(s);
      document.querySelectorAll('input[name="delivery-address"]').forEach(function (r) { r.checked = false; });
      syncOfficePickupSelection();
      renderAddressList();
      refreshCheckoutSidebar();
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
    initCheckoutSummary();

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

  /* ====================================================================
   *  Step 5 — Confirmation (pre-pay review)
   * ==================================================================== */
  function initConfirmation() {
    initCheckoutSummary();
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

    setupApparelSizeSidebar();
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
    var items = quoteFor(read()).selectedLines;
    if (!items.length) {
      listRoot.innerHTML = '<p class="text-secondary">No hay productos en este pedido.</p>';
      return;
    }
    listRoot.innerHTML = items.map(function (line) {
      return '' +
        '<li class="item-product' + (line.apparel ? ' is-apparel' : '') + '">' +
          '<a href="javascript:void(0);" class="img-product"><img src="' + escapeHtml(line.image) + '" alt="' + escapeHtml(line.title) + '"></a>' +
          '<div class="content-box">' +
            '<div class="info">' +
              '<a href="javascript:void(0);" class="name-product link text-title">' + escapeHtml(line.title) + '</a>' +
              '<div class="variant text-caption-1 text-secondary">' + variantQtyHtml(line) + '</div>' +
            '</div>' +
            '<div class="total-price-line text-button">' + Pricing.formatCents(line.netLineCents) + '</div>' +
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

  /* ------- Dual cart (standard vs sample) ------- */
  function cartKindTabsHtml(prefix) {
    prefix = prefix || "cart";
    var lineClass = prefix === "minicart" ? " cart-kind-tabs--line" : "";
    return '' +
      '<div class="cart-kind-tabs' + lineClass + '" role="tablist" aria-label="Tipo de carrito" data-cart-kind-tabs>' +
        '<button type="button" class="cart-kind-tab" role="tab" id="' + prefix + '-tab-standard" data-cart-kind-tab="standard" aria-controls="' + prefix + '-panel-standard" aria-selected="true">' +
          '<span class="cart-kind-tab__label">Productos</span>' +
          '<span class="cart-kind-tab__count" data-cart-kind-count="standard">0</span>' +
        '</button>' +
        '<button type="button" class="cart-kind-tab" role="tab" id="' + prefix + '-tab-sample" data-cart-kind-tab="sample" aria-controls="' + prefix + '-panel-sample" aria-selected="false">' +
          '<span class="cart-kind-tab__label">Muestras</span>' +
          '<span class="cart-kind-tab__count" data-cart-kind-count="sample">0</span>' +
        '</button>' +
      '</div>';
  }

  function setActiveCartKind(kind) {
    kind = kind === CART_KIND.SAMPLE ? CART_KIND.SAMPLE : CART_KIND.STANDARD;
    var s = read();
    s.activeCartKind = kind;
    write(s);
    var tbody = document.querySelector("[data-cart-tbody]");
    if (tbody) {
      renderCartRows(tbody, s);
      rerenderTotalsAndSelectAll();
    } else {
      renderMinicart();
      syncCartKindUI(s);
    }
    if (document.body.getAttribute("data-carrito-step") === "cart" && window.history && history.replaceState) {
      var url = new URL(window.location.href);
      if (kind === CART_KIND.SAMPLE) url.searchParams.set("cart", "muestras");
      else url.searchParams.delete("cart");
      history.replaceState({}, "", url);
    }
  }

  function persistCheckoutKind() {
    var s = read();
    s.checkoutKind = s.activeCartKind || CART_KIND.STANDARD;
    write(s);
  }

  function addSampleLine(productId, logoSelected) {
    var product = Data.products[productId];
    if (!product) return;
    var s = read();
    var existing = s.cart.find(function (line) {
      return line.productId === productId && line.kind === CART_KIND.SAMPLE;
    });
    if (existing) {
      existing.qty += 1;
      existing.selected = true;
      existing.logoSelected = !!logoSelected;
    } else {
      s.cart.push({
        id: productId,
        productId: productId,
        qty: 1,
        selected: true,
        logoSelected: !!logoSelected,
        kind: CART_KIND.SAMPLE
      });
    }
    s.activeCartKind = CART_KIND.SAMPLE;
    write(s);
    var tbody = document.querySelector("[data-cart-tbody]");
    if (tbody) {
      renderCartRows(tbody, read());
      rerenderTotalsAndSelectAll();
    } else {
      renderMinicart();
      syncCartKindUI(read());
    }
  }

  function addSampleFromButton(btn) {
    var productId = btn.getAttribute("data-sample-id");
    if (!productId) return;
    addSampleLine(productId, btn.getAttribute("data-sample-logo") === "true");
    var offcanvas = btn.closest(".offcanvas");
    if (offcanvas && window.bootstrap && bootstrap.Offcanvas) {
      var instance = bootstrap.Offcanvas.getInstance(offcanvas);
      if (instance) instance.hide();
    }
  }

  function bindCartKindControls() {
    if (document.documentElement.dataset.cartKindBound) return;
    document.documentElement.dataset.cartKindBound = "1";
    document.addEventListener("click", function (e) {
      var tab = e.target.closest("[data-cart-kind-tab]");
      if (tab) {
        e.preventDefault();
        setActiveCartKind(tab.getAttribute("data-cart-kind-tab"));
        return;
      }
      var switchBtn = e.target.closest("[data-cart-kind-switch]");
      if (switchBtn) {
        e.preventDefault();
        setActiveCartKind(switchBtn.getAttribute("data-cart-kind-switch"));
        return;
      }
      var sampleBtn = e.target.closest("[data-add-sample]");
      if (sampleBtn) addSampleFromButton(sampleBtn);
      var cta = e.target.closest("[data-cart-cta]");
      if (cta && cta.getAttribute("aria-disabled") !== "true") persistCheckoutKind();
    });
    document.addEventListener("keydown", function (e) {
      var tab = e.target.closest("[data-cart-kind-tab]");
      if (!tab) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
      var list = tab.closest("[role='tablist']");
      if (!list) return;
      var tabs = Array.prototype.slice.call(list.querySelectorAll("[data-cart-kind-tab]"));
      var index = tabs.indexOf(tab);
      if (e.key === "ArrowRight") index = (index + 1) % tabs.length;
      if (e.key === "ArrowLeft") index = (index - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") index = 0;
      if (e.key === "End") index = tabs.length - 1;
      e.preventDefault();
      tabs[index].focus();
      setActiveCartKind(tabs[index].getAttribute("data-cart-kind-tab"));
    });
  }

  function ensureMinicartChrome(root) {
    if (!root.querySelector("[data-cart-kind-tabs]")) {
      var header = root.querySelector(".header");
      if (header) {
        var chrome = document.createElement("div");
        chrome.className = "cart-kind-chrome";
        chrome.setAttribute("data-cart-kind-chrome", "");
        chrome.innerHTML = cartKindTabsHtml("minicart");
        header.insertAdjacentElement("afterend", chrome);
      }
    }
    var view = root.querySelector(".tf-mini-cart-view-checkout a[href='shopping-cart.html'], [data-minicart-view]");
    if (view) view.setAttribute("data-minicart-view", "");
    var empty = root.querySelector("[data-minicart-empty], .minicart-empty");
    if (empty) empty.setAttribute("data-cart-empty", "");
  }

  function syncEmptyCopy(state, kind, bothEmpty, kindEmpty) {
    var copy = cartKindCopy(kind);
    var otherKind = otherCartKind(kind);
    var otherCount = linesOfKind(state, otherKind).length;
    document.querySelectorAll("[data-cart-empty]").forEach(function (box) {
      var title = box.querySelector("[data-cart-empty-title], h3, h6");
      var body = box.querySelector("[data-cart-empty-body], p");
      var cta = box.querySelector("[data-cart-empty-cta], a.tf-btn");
      var icon = box.querySelector("[data-cart-empty-icon], .cart-empty__icon i, .minicart-empty__icon i");
      if (icon) icon.className = kind === CART_KIND.SAMPLE ? "bi bi-box-seam" : "bi bi-cart";
      if (bothEmpty || !otherCount) {
        if (title) title.textContent = copy.emptyTitle;
        if (body) body.textContent = copy.emptyBody;
        if (cta) {
          cta.removeAttribute("data-cart-kind-switch");
          cta.setAttribute("href", "shop-default-grid.html");
          var ctaText = cta.querySelector(".text") || cta;
          ctaText.textContent = "Ir a la tienda";
        }
        return;
      }
      if (kindEmpty) {
        if (title) title.textContent = copy.emptyOtherTitle;
        if (body) body.textContent = copy.emptyOtherBody;
        if (cta) {
          cta.setAttribute("data-cart-kind-switch", otherKind);
          cta.setAttribute("href", "#");
          var switchText = cta.querySelector(".text") || cta;
          switchText.textContent = copy.emptySwitch;
        }
      }
    });
  }

  function syncCartKindUI(state) {
    state = state || read();
    var kind = currentQuoteKind(state);
    var copy = cartKindCopy(kind);
    var standardCount = linesOfKind(state, CART_KIND.STANDARD).length;
    var sampleCount = linesOfKind(state, CART_KIND.SAMPLE).length;
    var bothEmpty = !state.cart.length;
    var kindEmpty = linesOfKind(state, kind).length === 0;

    document.body.setAttribute("data-active-cart-kind", kind);
    document.body.classList.toggle("cart-is-empty", bothEmpty);
    document.body.classList.toggle("cart-kind-is-empty", !bothEmpty && kindEmpty);

    document.querySelectorAll("[data-cart-kind-tab]").forEach(function (tab) {
      var tabKind = tab.getAttribute("data-cart-kind-tab");
      var selected = tabKind === kind;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll("[data-cart-kind-count='standard']").forEach(function (el) {
      el.textContent = String(standardCount);
    });
    document.querySelectorAll("[data-cart-kind-count='sample']").forEach(function (el) {
      el.textContent = String(sampleCount);
    });
    document.querySelectorAll("[data-cart-notice]").forEach(function (el) {
      el.textContent = copy.notice;
    });
    document.querySelectorAll("[data-cart-select-all]").forEach(function (cb) {
      var label = cb.closest("label");
      var text = label && label.querySelector("span:not(.tf-check)");
      if (text) text.textContent = copy.selectAll;
    });
    document.querySelectorAll("[data-minicart-view]").forEach(function (link) {
      link.href = kind === CART_KIND.SAMPLE ? "shopping-cart.html?cart=muestras" : "shopping-cart.html";
    });
    document.querySelectorAll("[data-summary-secure]").forEach(function (el) {
      el.innerHTML = '<i class="bi bi-shield-lock"></i> ' + copy.secure;
    });
    document.querySelectorAll("[data-summary-trust]").forEach(function (list) {
      list.innerHTML = copy.trust.map(function (item) {
        return '<li><i class="bi bi-check-circle-fill"></i> ' + item + '</li>';
      }).join("");
    });
    document.querySelectorAll("[data-cart-tbody], [data-minicart-items]").forEach(function (panel) {
      var prefix = panel.hasAttribute("data-minicart-items") ? "minicart" : "cart";
      panel.id = prefix + "-panel-" + kind;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", prefix + "-tab-" + kind);
    });
    syncEmptyCopy(state, kind, bothEmpty, kindEmpty);
  }

  /* ------- Header minicart preview ------- */
  function lineMetaText(line) {
    var parts = [line.qty + (line.qty === 1 ? " unidad" : " unidades")];
    parts.push(line.logoSelected ? "con logo" : "sin logo");
    if (line.apparel && line.sizes) {
      var sizes = Object.keys(line.sizes).filter(function (size) {
        return line.sizes[size] > 0;
      }).map(function (size) {
        return size + " " + line.sizes[size];
      });
      if (sizes.length) parts.push(sizes.join(", "));
    }
    return parts.join(", ");
  }

  function renderMinicartItem(line) {
    var isSample = (line.kind || CART_KIND.STANDARD) === CART_KIND.SAMPLE;
    var title = escapeHtml(line.title);
    return '' +
      '<article class="tf-mini-cart-item file-delete' + (isSample ? ' is-sample' : '') + '" data-cart-id="' + escapeHtml(line.id) + '">' +
        '<a href="product-detail.html" class="tf-mini-cart-image">' +
          '<img src="' + escapeHtml(line.image) + '" alt="' + title + '">' +
        '</a>' +
        '<div class="tf-mini-cart-info">' +
          '<a href="product-detail.html" class="minicart-line-title" title="' + title + '">' + title + '</a>' +
          '<p class="minicart-line-meta">' + escapeHtml(lineMetaText(line)) + '</p>' +
          '<p class="minicart-line-price">' + Pricing.formatCents(line.netLineCents) + '</p>' +
        '</div>' +
        '<button type="button" class="minicart-item-remove" data-minicart-remove aria-label="Quitar ' + title + '">' +
          '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>' +
        '</button>' +
      '</article>';
  }

  function updateCartCountBadges(count) {
    document.querySelectorAll(".nav-cart .count-box, .btn-fixed-cart .count-box, [data-cart-count]").forEach(function (el) {
      el.textContent = count;
      el.hidden = count < 1;
    });
  }

  function renderMinicart() {
    var state = read();
    updateCartCountBadges((state.cart || []).length);
    var root = document.getElementById("shoppingCart");
    if (!root || !root.classList.contains("minicart-formas")) return;
    ensureMinicartChrome(root);
    var kind = currentQuoteKind(state);
    var copy = cartKindCopy(kind);
    var quote = quoteFor(state, { kind: kind });
    var items = quote.lines || [];
    var list = root.querySelector("[data-minicart-items]");
    var countEl = root.querySelector("[data-minicart-count]");
    var isEmpty = items.length === 0;

    var step = document.body.getAttribute("data-carrito-step");
    var isCheckout = step && step !== "cart";
    root.classList.toggle("is-empty", isEmpty);
    root.classList.toggle("is-checkout-step", !!isCheckout);
    root.setAttribute("data-active-cart-kind", kind);
    if (countEl) countEl.textContent = isEmpty ? "" : "(" + items.length + ")";
    if (list) {
      list.innerHTML = items.map(renderMinicartItem).join("");
    }

    root.querySelectorAll("[data-totals='subtotal']").forEach(function (el) {
      el.textContent = quote.display.subtotal;
    });
    root.querySelectorAll("[data-totals='tax']").forEach(function (el) {
      el.textContent = quote.display.tax;
    });
    root.querySelectorAll("[data-totals='total']").forEach(function (el) {
      el.textContent = quote.display.total;
    });
    root.querySelectorAll("[data-minicart-total-label]").forEach(function (el) {
      el.textContent = copy.totalLabel;
    });

    var cta = root.querySelector("[data-cart-cta]");
    if (cta) {
      var disabled = isEmpty || !quote.isValid;
      cta.classList.toggle("disabled", disabled);
      cta.setAttribute("aria-disabled", disabled ? "true" : "false");
      var ctaLabel = cta.querySelector("[data-cta-label]") || cta.querySelector(".text") || cta;
      ctaLabel.textContent = copy.ctaDrawer || copy.ctaMini;
    }

    updateCartCountBadges(state.cart.length);
    syncCartKindUI(state);
  }

  function initMinicart() {
    var root = document.getElementById("shoppingCart");
    if (!root || !root.classList.contains("minicart-formas")) return;
    bindCartKindControls();
    ensureMinicartChrome(root);
    if (root.dataset.minicartBound) {
      renderMinicart();
      return;
    }
    root.dataset.minicartBound = "1";
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-minicart-remove]");
      if (!btn) return;
      var row = btn.closest("[data-cart-id]");
      if (!row) return;
      e.preventDefault();
      var result = removeLineById(row.getAttribute("data-cart-id"));
      if (result) showUndoToast(result.line, result.index);
    });
    renderMinicart();
  }

  /* ====================================================================
   *  Public API + auto-init
   * ==================================================================== */
  var Carrito = {
    read: read,
    write: write,
    reset: reset,
    formatPrice: formatPrice,
    computeTotals: computeTotals,
    buildOrderPricingPayload: buildOrderPricingPayload,
    addSample: addSampleLine,
    setActiveCartKind: setActiveCartKind,
    CART_KIND: CART_KIND,
    resolveShippingQuote: function (state) {
      return Pricing.resolveShippingQuote(state || read());
    },
    renderSidebar: renderSidebar,
    renderMinicart: renderMinicart,
    pricing: Pricing,
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

  function isCartOrCheckoutPage() {
    return !!document.body.getAttribute("data-carrito-step");
  }

  function bindHeaderCartToPage() {
    document.querySelectorAll('a[href="#shoppingCart"]').forEach(function (link) {
      link.setAttribute("href", "shopping-cart.html");
      link.removeAttribute("data-bs-toggle");
      link.removeAttribute("data-bs-target");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var step = document.body.getAttribute("data-carrito-step");
    if (step) Carrito.init({ step: step });
    if (isCartOrCheckoutPage()) bindHeaderCartToPage();
    else initMinicart();
    updateCartCountBadges((read().cart || []).length);
  });
})(window, document);
