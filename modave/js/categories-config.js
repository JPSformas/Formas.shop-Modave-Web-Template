/**
 * Categories config: display labels and slugify for mega menu / reference.
 * The shop filter builds categories from product data (data-category, data-contextual-categories, data-subcategory).
 */
(function (global) {
  "use strict";

  var slugify = function (label) {
    return (label || "")
      .toLowerCase()
      .trim()
      .replace(/\s*\/\s*/g, "-")
      .replace(/[\s&]+/g, "-")
      .replace(/[áàäâ]/g, "a")
      .replace(/[éèëê]/g, "e")
      .replace(/[íìïî]/g, "i")
      .replace(/[óòöô]/g, "o")
      .replace(/[úùüû]/g, "u")
      .replace(/ñ/g, "n")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  /** Main categories: slug -> display label (mega menu / reference) */
  var MAIN_CATEGORIES = {
    textil: "Textil",
    marroquineria: "Marroquinería",
    "escritura-oficina": "Escritura & Oficina",
    tecnologia: "Tecnología",
    drinkware: "Drinkware",
    "gráfico-institucional": "Gráfico & Institucional",
    "hogar-tiempo-libre": "Hogar & Tiempo Libre",
    llaveros: "Llaveros",
   "health-beauty": "Health & Beauty",
    antiestres: "Antiestres"
  };

  /** Contextual categories: slug -> display label */
  var CONTEXTUAL_CATEGORIES = {
    "tu-logo-24hs": "Tu Logo 24hs",
    ecologicos: "Ecologicos",
    escolar: "Escolar",
    viajes: "Viajes",
    verano: "Verano",
    cybermonday: "CyberMonday",
    "kits-fin-ano": "Kits Fin de Año",
    "ferias-agro-rural": "Ferias del Agro y Rural",
    premium: "Premium",
    economicos: "Económicos"
  };

  /** Subcategory slug -> display label (used in filter expandable lists) */
  var SUBCATEGORY_LABELS = {
    buzos: "Buzos",
    camperas: "Camperas",
    camisas: "Camisas",
    chalecos: "Chalecos",
    chombas: "Chombas",
    "delantales-pecheras": "Delantales / pecheras",
    gorros: "Gorros",
    lonas: "Lonas",
    mantas: "Mantas",
    pantalones: "Pantalones",
    remeras: "Remeras",
    toallas: "Toallas",
    "billeteras-tarjeteros": "Billeteras/ tarjeteros",
    bolsas: "Bolsas",
    bolsos: "Bolsos",
    botineros: "Botineros",
    cartucheras: "Cartucheras",
    coolers: "Coolers",
    "materas-set-matero": "Materas / Set matero",
    maletines: "Maletines",
    mochilas: "Mochilas",
    "neceser-organizadores": "Neceser /organizadores",
    paraguas: "Paraguas",
    rinoneras: "Riñoneras",
    valijas: "Valijas",
    anotador: "Anotador",
    boligrafos: "Boligrafos",
    cartapacio: "Cartapacio",
    cuadernos: "Cuadernos",
    goma: "Goma",
    "lapices-crayones": "Lápices/crayones",
    "resaltadores-marcadores": "Resaltadores/marcadores",
    "set-escritorio": "Set escritorio",
    "accesorios-celular": "Accesorios Celular",
    "accesorios-pc": "Accesorios PC",
    auriculares: "Auriculares",
    calculadoras: "Calculadoras",
    cables: "Cables",
    "cargadores-powerbanks": "Cargadores/powerbanks",
    computacion: "Computación",
    electrodomesticos: "Electrodomésticos",
    "mouse-mouse-pad": "Mouse/Mouse Pad",
    parlantes: "Parlantes",
    pendrives: "Pendrives",
    relojes: "Relojes",
    teclado: "Teclado",
    botellas: "Botellas",
    "tazas-mugs": "Tazas & Mugs",
    termos: "Termos",
    "vasos-jarros": "Vasos & Jarros",
    "mates": "Mates",
    banners: "Banners",
    "bolsas-friselina": "Bolsas de Friselina",
    "bolsas-papel": "Bolsas de papel",
    cajas: "Cajas",
    "premios-trofeos": "Premios & Trofeos",
    "stickers-imanes": "Stickers/imanes",
    "conservadoras-contenedores-frio": "Conservadoras/Contenedores de Frio",
    deportes: "Deportes",
    fraperas: "Fraperas",
    freezbies: "Freezbies",
    herramientas: "Herramientas",
    juegos: "Juegos",
    linternas: "Linternas",
    "mate-set-matero": "Mate / set matero",
    "set-asado": "Set de asado",
    "set-vinos": "Set de vinos",
    "sillas-reposeras": "Sillas/Reposeras",
    tablas: "Tablas",
    "vasos-chopps": "Vasos/ chopps",
    cinta: "Cinta",
    metalicos: "Metálicos",
    "plastico-goma": "Plástico - Goma",
    alajeros: "Alajeros",
    "cuidado-personal": "Cuidado personal",
    espejos: "Espejos",
    maquillaje: "Maquillaje",
    corazones: "Corazones",
    pelotas: "Pelotas"
  };

  global.CategoriesConfig = {
    MAIN_CATEGORIES: MAIN_CATEGORIES,
    CONTEXTUAL_CATEGORIES: CONTEXTUAL_CATEGORIES,
    SUBCATEGORY_LABELS: SUBCATEGORY_LABELS,
    slugify: slugify
  };
})(typeof window !== "undefined" ? window : this);
