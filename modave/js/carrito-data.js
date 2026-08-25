(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FormasCartData = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Catalog pricing contract (mock API):
   *   - listUnitPriceCents = Precio de lista (authoritative catalog unit).
   *   - volumePrices[].rate = volume % off the post-promotion merchandise
   *     (or off list when no promo). Used only for "Descuento x cantidad".
   *   - Hierarchy: promotion on list → quantity on post-promo → coupon at
   *     cart on merchandise net + payable setup (never shipping).
   *   - Precio unitario is computed at quote time as list minus promotion
   *     and quantity discounts (coupon is cart-level only).
   */

  /** ARS major units → integer cents used by the pricing engine. */
  function pesos(amount) {
    return Math.round(amount * 100);
  }

  function freezeDeep(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freezeDeep(value[key]); });
    return Object.freeze(value);
  }

  /** Volume tiers at 10/20/30/40/50: −5% / −10% / −15% / −20% / −25%. */
  function volumeTiers() {
    return [
      { id: "qty-10", minQuantity: 10, rate: 0.05 },
      { id: "qty-20", minQuantity: 20, rate: 0.10 },
      { id: "qty-30", minQuantity: 30, rate: 0.15 },
      { id: "qty-40", minQuantity: 40, rate: 0.20 },
      { id: "qty-50", minQuantity: 50, rate: 0.25 }
    ];
  }

  return freezeDeep({
    policy: {
      currency: "ARS",
      ivaRate: 0.21,
      pricesAreNet: true,
      applyIvaToShipping: true,
      shippingPendingLabel: "A calcular",
      shippingPickupLabel: "$0,00",
      mockShippingNet: pesos(230)
    },
    coupons: {
      FP5: { code: "FP5", rate: 0.05, scope: "merchandise" },
      FP10: { code: "FP10", rate: 0.10, scope: "merchandise" },
      FP15: { code: "FP15", rate: 0.15, scope: "merchandise" },
      FP20: { code: "FP20", rate: 0.20, scope: "merchandise" },
      FRENZY30: { code: "FRENZY30", rate: 0.30, scope: "merchandise" }
    },
    products: {
      "herschel-classic": {
        id: "herschel-classic",
        title: "Herschel Classic Backpack",
        image: "images/products/mochila.jpg",
        apparel: false,
        kind: "standard",
        minQuantity: 2,
        stock: 1876,
        pricing: {
          listUnitPriceCents: pesos(90000),
          volumePrices: volumeTiers(),
          promotion: { id: "herschel-10", label: "Promo Herschel 10%", active: true, rate: 0.10 },
          personalization: { logoSetupPriceCents: pesos(100000), freeAtQuantity: 20 }
        }
      },
      "remera-fall": {
        id: "remera-fall",
        title: "Remera Fall",
        image: "images/products/remera.jpg",
        apparel: true,
        kind: "standard",
        minQuantity: 10,
        stock: 1930,
        pricing: {
          listUnitPriceCents: pesos(10000),
          volumePrices: volumeTiers(),
          promotion: { id: "remera-15", label: "Promo Remera 15%", active: true, rate: 0.15 },
          personalization: { logoSetupPriceCents: pesos(100000), freeAtQuantity: 20 }
        }
      },
      "botella-hydra-go": {
        id: "botella-hydra-go",
        title: "Botella Hydra Go 1000 ml",
        image: "images/products/botella-detail-1.jpg",
        apparel: false,
        kind: "standard",
        minQuantity: 33,
        stock: 24388,
        pricing: {
          listUnitPriceCents: pesos(20000),
          volumePrices: volumeTiers(),
          promotion: { id: "botella-8", label: "Promo Botella 8%", active: true, rate: 0.08 },
          personalization: { logoSetupPriceCents: pesos(100000), freeAtQuantity: 20 }
        }
      },
      "botella-hydra-go-1000-ml-nologo": {
        id: "botella-hydra-go-1000-ml-nologo",
        title: "Botella Hydra Go 1000 ml (sin logo)",
        image: "images/products/botella-detail-variant-1.jpg",
        apparel: false,
        kind: "standard",
        minQuantity: 33,
        stock: 24388,
        pricing: {
          listUnitPriceCents: pesos(20000),
          volumePrices: volumeTiers(),
          promotion: { id: "botella-nologo-5", label: "Promo Botella 5%", active: true, rate: 0.05 },
          personalization: { logoSetupPriceCents: pesos(100000), freeAtQuantity: 20 }
        }
      },
      "herschel-classic-sample": {
        id: "herschel-classic-sample",
        title: "Herschel Classic Backpack",
        image: "images/products/mochila.jpg",
        apparel: false,
        kind: "sample",
        minQuantity: 1,
        stock: 1876,
        pricing: {
          listUnitPriceCents: pesos(15765.54),
          volumePrices: []
        }
      },
      "botella-hydra-go-sample": {
        id: "botella-hydra-go-sample",
        title: "Botella Hydra Go 1000 ml",
        image: "images/products/botella-detail-1.jpg",
        apparel: false,
        kind: "sample",
        minQuantity: 1,
        stock: 24388,
        pricing: {
          listUnitPriceCents: pesos(15765.54),
          volumePrices: []
        }
      },
      "botella-hydra-go-sample-logo": {
        id: "botella-hydra-go-sample-logo",
        title: "Botella Hydra Go 1000 ml",
        image: "images/products/botella-detail-1.jpg",
        apparel: false,
        kind: "sample",
        minQuantity: 1,
        stock: 24388,
        pricing: {
          listUnitPriceCents: pesos(25765.54),
          volumePrices: []
        }
      }
    },
    defaultCart: [
      { id: "herschel-classic", productId: "herschel-classic", qty: 20, selected: true, logoSelected: true, kind: "standard" },
      { id: "remera-fall", productId: "remera-fall", qty: 10, selected: true, logoSelected: true, kind: "standard", sizes: { S: 2, M: 3, L: 1, XL: 4 } },
      { id: "botella-hydra-go", productId: "botella-hydra-go", qty: 4, selected: true, logoSelected: true, kind: "standard" },
      { id: "botella-hydra-go-1000-ml-nologo", productId: "botella-hydra-go-1000-ml-nologo", qty: 4, selected: true, logoSelected: false, kind: "standard" },
      { id: "herschel-classic-sample", productId: "herschel-classic-sample", qty: 1, selected: true, logoSelected: false, kind: "sample" },
      { id: "botella-hydra-go-sample-logo", productId: "botella-hydra-go-sample-logo", qty: 1, selected: true, logoSelected: true, kind: "sample" }
    ],
    apparelStock: { S: 262, M: 5, L: 1633, XL: 30 }
  });
});
