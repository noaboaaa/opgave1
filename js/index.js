(() => {
  // API-base
  const API = "https://dummyjson.com/products";

  // Elementer i DOM'en
  const grid = document.querySelector(".content .container");
  const tpl = document.getElementById("product-card-template");
  const filterAside = document.getElementById("brandFilter");
  const brandListEl = document.getElementById("brandFilterList");
  const applyBtn = document.getElementById("applyFilters");
  const clearBtn = document.getElementById("clearFilters");
  const sortSelect = document.getElementById("sortSelect");
  const toolbar = document.getElementById("productsToolbar");

  if (!grid || !tpl) return; // stop hvis siden ikke har de nødvendige elementer

  const formatPrice = (n) => {
    const num = Number(n);
    if (!isFinite(num)) return "";
    try {
      return `${new Intl.NumberFormat("da-DK", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num)} kr`;
    } catch {
      return `${num} kr`;
    }
  };

  // Lille hjælper til at hente JSON med fejl-håndtering
  const fetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.json();
  };

  // Læs URL-params og afgør hvilken "view" vi er på
  const params = new URLSearchParams(location.search);
  const view = params.get("view"); // "all", "perfume", "makeup" eller null (forside)
  const productId = params.get("product"); // hvis sat, vis detaljevisning

  // Vis pris på lister (all/perfume/makeup) og på produktdetalje
  const showPrice = ["all", "perfume", "makeup"].includes(view) || !!productId;

  // Markér aktiv fane i undermenuen
  const setActiveTab = () => {
    document.querySelectorAll(".subnav__link").forEach((a) => {
      a.classList.toggle("is-active", a.dataset.view === view);
    });
  };
  setActiveTab();

  grid.setAttribute("role", "list");
  grid.innerHTML = '<p style="margin:8px 0">Indlæser produkter…</p>';

  // ————————————————————————————————————————————————
  // RENDER-FUNKTIONER
  // ————————————————————————————————————————————————
  const renderList = (products) => {
    grid.innerHTML = "";
    if (!products || !products.length) {
      grid.innerHTML = '<p style="margin:8px 0">Ingen produkter fundet.</p>';
      return;
    }

    for (const p of products) {
      const node = tpl.content.cloneNode(true);
      const link = node.querySelector(".product-card__link");
      const img = node.querySelector(".product-card__image");
      const brandEl = node.querySelector(".product-card__brand");
      const titleEl = node.querySelector(".product-card__title");

      link.href = `?product=${p.id}`;
      img.src = p.thumbnail || (p.images && p.images[0]) || "";
      img.alt = `${p.brand ? p.brand + " — " : ""}${p.title || ""}`.trim();

      brandEl.textContent = p.brand || p.category || "";
      titleEl.textContent = p.title || "";

      if (showPrice) {
        const priceEl = document.createElement("p");
        priceEl.className = "product-card__price";
        priceEl.textContent = formatPrice(p.price);
        titleEl.insertAdjacentElement("afterend", priceEl);
      }

      grid.appendChild(node);
    }
  };

  const renderDetail = (p) => {
    grid.innerHTML = `
      <section class="product-detail" role="region" aria-labelledby="productTitle">
        <div class="product-detail__media">
          <img class="product-detail__image" src="${(
            p.thumbnail ||
            (p.images && p.images[0]) ||
            ""
          ).replace(/"/g, "&quot;")}" alt="${`${
      p.brand ? p.brand + " — " : ""
    }${p.title || ""}`
      .trim()
      .replace(/"/g, "&quot;")}" loading="lazy" />
        </div>
        <div class="product-detail__info">
          <a class="product-detail__back" href="?view=all">← tilbage til produkter</a>
          <h3 class="product-detail__brand" id="productBrand">${
            p.brand || p.category || ""
          }</h3>
          <h2 class="product-detail__title" id="productTitle">${
            p.title || ""
          }</h2>
          <p class="product-detail__price" aria-live="polite">${formatPrice(
            p.price
          )}</p>
          <button class="btn btn--primary product-detail__add" type="button">Læg i kurv</button>
          <p class="product-detail__description">${p.description || ""}</p>
        </div>
      </section>
    `;
  };

  // ————————————————————————————————————————————————
  // DATA, FILTRE & SORTERING
  // ————————————————————————————————————————————————
  let allItems = []; // fuld liste til filtrering
  let currentItems = []; // det der vises lige nu

  const sortProducts = (arr) => {
    const v = sortSelect ? sortSelect.value : "";
    const out = [...arr];
    if (v === "price-asc") out.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (v === "price-desc")
      out.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return out;
  };

  const rerender = () => renderList(sortProducts(currentItems));

  const buildBrandFilter = (products) => {
    if (!filterAside || !brandListEl) return;

    const brands = Array.from(
      new Set(products.map((p) => p.brand).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    brandListEl.innerHTML = brands
      .map(
        (brand) =>
          `<label class="filters__item"><input type="checkbox" value="${brand}"> <span>${brand}</span></label>`
      )
      .join("");

    filterAside.hidden = false;

    if (!filterAside.dataset.bound) {
      const getSelected = () =>
        Array.from(
          brandListEl.querySelectorAll('input[type="checkbox"]:checked')
        ).map((i) => i.value);

      applyBtn &&
        applyBtn.addEventListener("click", () => {
          const selected = getSelected();
          currentItems = selected.length
            ? allItems.filter((p) => selected.includes(p.brand))
            : allItems;
          rerender();
        });

      clearBtn &&
        clearBtn.addEventListener("click", () => {
          brandListEl
            .querySelectorAll('input[type="checkbox"]')
            .forEach((cb) => (cb.checked = false));
          currentItems = allItems;
          rerender();
        });

      filterAside.dataset.bound = "1";
    }

    if (sortSelect && !sortSelect.dataset.bound) {
      sortSelect.addEventListener("change", rerender);
      sortSelect.dataset.bound = "1";
    }
  };

  // ————————————————————————————————————————————————
  // INITIALISERING FOR DE FORSKELLIGE VISNINGER
  // ————————————————————————————————————————————————
  const initListView = async (endpoint) => {
    grid.classList.add("all-products");
    if (toolbar) toolbar.hidden = false; // sorter vises på lister
    try {
      const data = await fetchJSON(endpoint);
      const products = data.products || [];
      allItems = products;
      currentItems = products;
      buildBrandFilter(allItems);
      rerender();
    } catch (err) {
      console.error(err);
      grid.innerHTML =
        '<p style="margin:8px 0">Kunne ikke hente produkter lige nu.</p>';
    }
  };

  const initAll = () => initListView(`${API}?limit=12`); //
  const initPerfume = () => initListView(`${API}/category/fragrances?limit=0`);
  const initMakeup = () => initListView(`${API}/category/beauty?limit=0`);

  const initHome = async () => {
    grid.classList.remove("all-products");
    if (toolbar) toolbar.hidden = true; // ingen sorter på forsiden
    try {
      const { products = [] } = await fetchJSON(
        `${API}/category/fragrances?limit=0`
      );
      const chanel =
        products.find(
          (p) =>
            /coco\s*noir/i.test(p.title) && /chanel/i.test(p.brand || p.title)
        ) ||
        products.find((p) => (p.brand || "").toLowerCase() === "chanel") ||
        products.find((p) => /chanel/i.test(p.title));

      if (!chanel) {
        grid.innerHTML =
          '<p style="margin:8px 0">Kunne ikke finde Chanel-parfume.</p>';
        return;
      }

      renderList([chanel, chanel, chanel, chanel]);
    } catch (err) {
      console.error(err);
      grid.innerHTML =
        '<p style="margin:8px 0">Kunne ikke hente produkter lige nu.</p>';
    }
  };

  // ————————————————————————————————————————————————
  // ROUTING
  // ————————————————————————————————————————————————
  (async () => {
    if (productId) {
      grid.classList.remove("all-products");
      if (toolbar) toolbar.hidden = true;
      try {
        const product = await fetchJSON(`${API}/${productId}`);
        renderDetail(product);
      } catch (err) {
        console.error(err);
        grid.innerHTML =
          '<p style="margin:8px 0">Kunne ikke hente produktet.</p>';
      }
      return;
    }

    switch (view) {
      case "all":
        return initAll();
      case "perfume":
        return initPerfume();
      case "makeup":
        return initMakeup();
      default:
        return initHome();
    }
  })();
})();
