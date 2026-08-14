/* =====================================================================
 * Formas Carrito — Pure pricing engine (no DOM / no storage).
 *
 * Contract for a future backend:
 *   - All money math runs in integer cents to avoid float drift.
 *   - Catalog prices and shipping quotes are NET (sin IVA).
 *   - IVA is applied to discounted goods, payable setup, and quoted shipping.
 *   - Shipping has an explicit quote status: pending | quoted.
 *
 * Load after carrito-data.js in the browser, or require() in Node.
 * ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./carrito-data.js"));
  } else {
    root.FormasPricing = factory(root.FormasCartData);
  }
})(typeof self !== "undefined" ? self : this, function (Data) {
  "use strict";

  if (!Data) {
    throw new Error("FormasCartData is required before carrito-pricing.js.");
  }

  var PRICING_POLICY = Data.policy;

  var SHIPPING_STATUS = {
    PENDING: "pending",
    QUOTED: "quoted"
  };

  function toCents(value) {
    if (value == null || value === "") return 0;
    var n = typeof value === "number" ? value : parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
    if (!isFinite(n)) return 0;
    return Math.round(n * 100);
  }

  function fromCents(cents) {
    return (cents || 0) / 100;
  }

  function roundCents(value) {
    return Math.round(Number(value) || 0);
  }

  function ivaOn(netCents, rate) {
    return roundCents(netCents * rate);
  }

  function formatPrice(value) {
    // Plain numbers are major currency units (pesos), not cents.
    var amount = typeof value === "number" ? value : fromCents(toCents(value));
    if (!isFinite(amount)) amount = 0;
    if (amount === 0) return "$0,00";
    var negative = amount < 0;
    var abs = Math.abs(amount);
    var fixed = abs.toFixed(2);
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (negative ? "-$" : "$") + parts.join(",");
  }

  function formatCents(cents) {
    return formatPrice(fromCents(cents));
  }

  /**
   * Normalize shipping into a quote the totals engine understands.
   * Selection (pickup / address) always wins over a cached quote object.
   */
  function resolveShippingQuote(state) {
    var shipping = (state && state.shipping) || {};

    if (shipping.pickupSelected || shipping.mode === "pickup") {
      return { status: SHIPPING_STATUS.QUOTED, amountCents: 0, source: "pickup" };
    }

    var idx = shipping.selectedAddressIndex;
    var addresses = shipping.addresses || [];
    if (idx != null && idx >= 0 && addresses[idx]) {
      var address = addresses[idx];
      if (address.shippingQuoted === true || (address.shippingCost != null && Number(address.shippingCost) > 0)) {
        return {
          status: SHIPPING_STATUS.QUOTED,
          amountCents: toCents(address.shippingCost),
          source: "address"
        };
      }
      return { status: SHIPPING_STATUS.PENDING, amountCents: 0, source: "address" };
    }

    if (shipping.quote && shipping.quote.status === SHIPPING_STATUS.QUOTED) {
      return {
        status: SHIPPING_STATUS.QUOTED,
        amountCents: roundCents(shipping.quote.amountCents || 0),
        source: shipping.quote.source || "cached"
      };
    }

    return { status: SHIPPING_STATUS.PENDING, amountCents: 0, source: null };
  }

  function buildQuotedShipping(amountMajor, source) {
    return {
      status: SHIPPING_STATUS.QUOTED,
      amountCents: toCents(amountMajor),
      source: source || "address"
    };
  }

  function buildPendingShipping() {
    return { status: SHIPPING_STATUS.PENDING, amountCents: 0, source: null };
  }

  function shippingLabel(quote, policy) {
    policy = policy || PRICING_POLICY;
    if (!quote) return "";
    if (quote.status !== SHIPPING_STATUS.QUOTED) return policy.shippingPendingLabel;
    if (quote.source === "pickup" || quote.amountCents === 0) {
      return policy.shippingPickupLabel;
    }
    return formatCents(quote.amountCents);
  }

  function productFor(line) {
    return Data.products[line.productId || line.id] || null;
  }

  function lineKind(line, product) {
    if (line && line.kind === "sample") return "sample";
    if (product && product.kind === "sample") return "sample";
    return "standard";
  }

  function couponFor(state) {
    var code = state && state.couponCode;
    return code ? Data.coupons[String(code).trim().toUpperCase()] || null : null;
  }

  function normalizeQuantity(value) {
    var qty = Number(value);
    return Number.isInteger(qty) && qty >= 1 ? qty : null;
  }

  function selectVolumeTier(product, quantity) {
    var tiers = product.pricing.volumePrices || [];
    var selected = null;
    tiers.forEach(function (tier) {
      if (quantity >= tier.minQuantity) selected = tier;
    });
    return selected;
  }

  function pricingError(code, line, message) {
    return {
      code: code,
      lineId: line && line.id || null,
      productId: line && (line.productId || line.id) || null,
      message: message
    };
  }

  function validateProduct(line, product) {
    var errors = [];
    if (!product) {
      errors.push(pricingError("UNKNOWN_PRODUCT", line, "No existe el producto solicitado."));
      return errors;
    }
    var pricing = product.pricing;
    if (!pricing) {
      errors.push(pricingError("INVALID_PRICING", line, "El producto no tiene una definición de precios."));
      return errors;
    }
    if (!Number.isInteger(pricing.listUnitPriceCents) || pricing.listUnitPriceCents < 0) {
      errors.push(pricingError("INVALID_LIST_PRICE", line, "El precio de lista debe estar expresado en centavos."));
    }
    var previousMinimum = 0;
    (pricing.volumePrices || []).forEach(function (tier) {
      if (!Number.isInteger(tier.minQuantity) || tier.minQuantity <= previousMinimum) {
        errors.push(pricingError("INVALID_TIER_BOUNDARY", line, "Los mínimos por volumen deben ser enteros crecientes."));
      }
      previousMinimum = tier.minQuantity;
      if (typeof tier.rate !== "number" || tier.rate < 0 || tier.rate > 1) {
        errors.push(pricingError("INVALID_TIER_RATE", line, "El descuento por volumen debe usar una tasa entre cero y uno."));
      }
    });
    if (pricing.promotion && (
      typeof pricing.promotion.rate !== "number" ||
      pricing.promotion.rate < 0 ||
      pricing.promotion.rate > 1
    )) {
      errors.push(pricingError("INVALID_PROMOTION_RATE", line, "La promoción debe usar una tasa entre cero y uno."));
    }
    if (pricing.personalization && (
      !Number.isInteger(pricing.personalization.logoSetupPriceCents) ||
      pricing.personalization.logoSetupPriceCents < 0 ||
      !Number.isInteger(pricing.personalization.freeAtQuantity) ||
      pricing.personalization.freeAtQuantity < 1
    )) {
      errors.push(pricingError("INVALID_PERSONALIZATION", line, "La personalización debe usar centavos y un mínimo válido."));
    }
    return errors;
  }

  function priceLine(line, coupon) {
    var product = productFor(line);
    var qty = normalizeQuantity(line.qty);
    var errors = validateProduct(line, product);
    if (!qty) errors.push(pricingError("INVALID_QUANTITY", line, "La cantidad debe ser un entero mayor o igual a uno."));
    if (errors.length) return { errors: errors, pricedLine: null };

    var pricing = product.pricing;
    var tier = selectVolumeTier(product, qty);
    var volumeRate = tier ? tier.rate : 0;
    var listGoodsCents = pricing.listUnitPriceCents * qty;
    var personalization = pricing.personalization || null;
    var logoSelected = !!line.logoSelected;
    var setupListCents = logoSelected && personalization ? personalization.logoSetupPriceCents : 0;
    var personalizationDiscountCents = logoSelected && personalization &&
      qty >= personalization.freeAtQuantity ? setupListCents : 0;
    var promotion = pricing.promotion && pricing.promotion.active ? pricing.promotion : null;
    var promotionDiscountCents = promotion ? roundCents(listGoodsCents * promotion.rate) : 0;
    var afterPromotionCents = Math.max(0, listGoodsCents - promotionDiscountCents);
    var quantityDiscountCents = roundCents(afterPromotionCents * volumeRate);
    var merchandiseNetCents = Math.max(0, afterPromotionCents - quantityDiscountCents);
    var unitPriceCents = roundCents(merchandiseNetCents / qty);
    var payableSetupCents = setupListCents - personalizationDiscountCents;
    var netLineCents = merchandiseNetCents + payableSetupCents;

    return {
      errors: [],
      pricedLine: {
        id: line.id,
        productId: product.id,
        title: product.title,
        image: product.image,
        apparel: !!product.apparel,
        kind: lineKind(line, product),
        qty: qty,
        selected: !!line.selected,
        logoSelected: logoSelected,
        sizes: line.sizes || null,
        tierId: tier ? tier.id : null,
        volumeRate: volumeRate,
        listUnitPriceCents: pricing.listUnitPriceCents,
        unitPriceCents: unitPriceCents,
        listGoodsCents: listGoodsCents,
        merchandiseNetCents: merchandiseNetCents,
        quantityDiscountCents: quantityDiscountCents,
        setupListCents: setupListCents,
        personalizationDiscountCents: personalizationDiscountCents,
        payableSetupCents: payableSetupCents,
        promotionId: promotion ? promotion.id : null,
        promotionDiscountCents: promotionDiscountCents,
        couponDiscountCents: 0,
        netLineCents: netLineCents
      }
    };
  }

  function computeTotals(state, opts) {
    opts = opts || {};
    state = state || {};
    var policy = Object.assign({}, PRICING_POLICY, opts.policy || {});
    var coupon = couponFor(state);
    var errors = [];
    var lines = [];

    (state.cart || []).forEach(function (line) {
      var product = productFor(line);
      if (opts.kind && lineKind(line, product) !== opts.kind) return;
      var result = priceLine(line, coupon);
      if (line.selected) errors = errors.concat(result.errors);
      if (result.pricedLine) lines.push(result.pricedLine);
    });

    var selected = lines.filter(function (line) { return line.selected; });

    function sum(field) {
      return selected.reduce(function (total, line) { return total + line[field]; }, 0);
    }

    var quote = resolveShippingQuote(state);
    var shippingNetCents = quote.status === SHIPPING_STATUS.QUOTED ? quote.amountCents : 0;
    var couponBaseCents = sum("netLineCents");
    var couponDiscountCents = coupon ? roundCents(couponBaseCents * coupon.rate) : 0;
    var breakdown = {
      listPriceCents: sum("listGoodsCents") + sum("setupListCents"),
      quantityDiscountCents: sum("quantityDiscountCents"),
      personalizationDiscountCents: sum("personalizationDiscountCents"),
      promotionDiscountCents: sum("promotionDiscountCents"),
      couponDiscountCents: couponDiscountCents,
      shippingNetCents: shippingNetCents,
      subtotalNetCents: couponBaseCents - couponDiscountCents + shippingNetCents,
      taxCents: 0,
      totalCents: 0
    };
    breakdown.taxCents = policy.pricesAreNet ? ivaOn(breakdown.subtotalNetCents, policy.ivaRate) : 0;
    breakdown.totalCents = breakdown.subtotalNetCents + breakdown.taxCents;

    var isValid = errors.length === 0;
    var isFinal = isValid && quote.status === SHIPPING_STATUS.QUOTED;

    return {
      currency: policy.currency,
      ivaRate: policy.ivaRate,
      pricesAreNet: policy.pricesAreNet,
      applyIvaToShipping: policy.applyIvaToShipping,
      kind: opts.kind || null,
      itemCount: selected.length,
      coupon: coupon,
      couponCode: coupon ? coupon.code : null,
      errors: errors,
      isValid: isValid,
      isFinal: isFinal,
      lines: lines,
      selectedLines: selected,
      breakdown: breakdown,
      shipping: {
        status: quote.status,
        amountCents: shippingNetCents,
        source: quote.source,
        label: shippingLabel(quote, policy)
      },
      display: {
        listPrice: formatCents(breakdown.listPriceCents),
        quantityDiscount: formatCents(breakdown.quantityDiscountCents),
        personalizationDiscount: formatCents(breakdown.personalizationDiscountCents),
        promotionDiscount: formatCents(breakdown.promotionDiscountCents),
        couponDiscount: formatCents(breakdown.couponDiscountCents),
        shipping: shippingLabel(quote, policy),
        subtotal: formatCents(breakdown.subtotalNetCents),
        tax: formatCents(breakdown.taxCents),
        total: formatCents(breakdown.totalCents)
      },
      ivaCents: breakdown.taxCents,
      totalCents: breakdown.totalCents,
      shippingCost: fromCents(shippingNetCents),
      shippingStatus: quote.status,
      total: fromCents(breakdown.totalCents)
    };
  }

  /**
   * Snapshot suitable for a future POST /orders payload.
   * Does not include payment secrets — only priced lines + totals.
   */
  function buildOrderPricingPayload(state, opts) {
    var totals = computeTotals(state, opts);
    return {
      currency: totals.currency,
      ivaRate: totals.ivaRate,
      pricesAreNet: totals.pricesAreNet,
      applyIvaToShipping: totals.applyIvaToShipping,
      couponCode: totals.couponCode,
      isValid: totals.isValid,
      isFinal: totals.isFinal,
      errors: totals.errors,
      items: totals.selectedLines.map(function (line) {
        return {
          lineId: line.id,
          productId: line.productId,
          kind: line.kind || "standard",
          quantity: line.qty,
          sizes: line.sizes,
          logoSelected: line.logoSelected,
          tierId: line.tierId,
          volumeRate: line.volumeRate,
          listUnitPriceCents: line.listUnitPriceCents,
          appliedUnitPriceCents: line.unitPriceCents,
          quantityDiscountCents: line.quantityDiscountCents,
          setupListCents: line.setupListCents,
          personalizationDiscountCents: line.personalizationDiscountCents,
          promotionId: line.promotionId,
          promotionDiscountCents: line.promotionDiscountCents,
          couponDiscountCents: line.couponDiscountCents,
          netLineCents: line.netLineCents
        };
      }),
      shipping: {
        status: totals.shipping.status,
        source: totals.shipping.source,
        netCents: totals.breakdown.shippingNetCents
      },
      breakdown: Object.assign({}, totals.breakdown)
    };
  }

  return {
    PRICING_POLICY: PRICING_POLICY,
    SHIPPING_STATUS: SHIPPING_STATUS,
    toCents: toCents,
    fromCents: fromCents,
    formatPrice: formatPrice,
    formatCents: formatCents,
    resolveShippingQuote: resolveShippingQuote,
    buildQuotedShipping: buildQuotedShipping,
    buildPendingShipping: buildPendingShipping,
    shippingLabel: shippingLabel,
    validateProduct: validateProduct,
    selectVolumeTier: selectVolumeTier,
    priceLine: priceLine,
    computeTotals: computeTotals,
    buildOrderPricingPayload: buildOrderPricingPayload
  };
});
