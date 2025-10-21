// /js/index.js
// Two modes:
// 1) Default homepage: show 4 copies of a Chanel perfume
// 2) All products view: if URL has ?view=all, fetch & render every product

(() => {
  const API = "https://dummyjson.com/products";
  const grid = document.querySelector(".content .container");
  const tpl = document.getElementById("product-card-template");
  const titleEl = document.getElementById("sectionTitle");
  const filterAside = document.getElementById("brandFilter");
  const brandListEl = document.getElementById("brandFilterList");
  const applyBtn = document.getElementById("applyFilters");
  const clearBtn = document.getElementById("clearFilters");
  const formatPrice = (n) => {
    const num = Number(n);
    if (!isFinite(num)) return "";
    try {
      // Format using Danish locale and append ' kr' explicitly (no dot)
      return `${new Intl.NumberFormat("da-DK", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num)} kr`;
    } catch (e) {
      return `${num} kr`;
    }
  };
  if (!grid || !tpl) return;

  const params = new URLSearchParams(window.location.search);
  const showAll = params.get("view") === "all";

  grid.setAttribute("role", "list");
  grid.innerHTML = '<p style="margin:8px 0">Indlæser produkter…</p>';

  const render = (products) => {
    grid.innerHTML = "";
    if (!products.length) {
      grid.innerHTML = '<p style="margin:8px 0">Ingen produkter fundet.</p>';
      return;
    }
    for (const p of products) {
      const node = tpl.content.cloneNode(true);
      const link = node.querySelector(".product-card__link");
      const img = node.querySelector(".product-card__image");
      const brandEl = node.querySelector(".product-card__brand");
      const titleEl2 = node.querySelector(".product-card__title");

      link.href = `${API}/${p.id}`; // demo link to API detail
      img.src = p.thumbnail || (p.images && p.images[0]) || "";
      img.alt = `${p.brand ? p.brand + " — " : ""}${p.title || ""}`.trim();

      brandEl.textContent = p.brand || p.category || "";
      titleEl2.textContent = p.title || "";

      // Show price only in All Products view
      if (showAll) {
        const priceEl = document.createElement("p");
        priceEl.className = "product-card__price";
        priceEl.textContent = formatPrice(p.price);
        // insert after title
        titleEl2.insertAdjacentElement("afterend", priceEl);
      }

      grid.appendChild(node);
    }
  };

  let allItems = [];

  const buildBrandFilter = (products) => {
    if (!filterAside || !brandListEl) return;
    const brands = Array.from(
      new Set(products.map((p) => p.brand).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    brandListEl.innerHTML = "";
    brands.forEach((brand) => {
      const id = "brand-" + brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const label = document.createElement("label");
      label.className = "filters__item";
      label.innerHTML = `<input type="checkbox" value="${brand}"> <span>${brand}</span>`;
      brandListEl.appendChild(label);
    });

    filterAside.hidden = false;

    if (!filterAside.dataset.bound) {
      const getSelected = () =>
        Array.from(
          brandListEl.querySelectorAll('input[type="checkbox"]:checked')
        ).map((i) => i.value);

      applyBtn &&
        applyBtn.addEventListener("click", () => {
          const selected = getSelected();
          const next = selected.length
            ? allItems.filter((p) => selected.includes(p.brand))
            : allItems;
          render(next);
        });

      clearBtn &&
        clearBtn.addEventListener("click", () => {
          brandListEl
            .querySelectorAll('input[type="checkbox"]')
            .forEach((cb) => (cb.checked = false));
          render(allItems);
        });

      filterAside.dataset.bound = "1";
    }
  };

  if (showAll) {
    // All Products page — show only ids 0–9 explicitly
    grid.classList.add("all-products");
    if (titleEl) titleEl.textContent = "All products";

    const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    Promise.all(
      ids.map((id) =>
        fetch(`${API}/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    )
      .then((items) => {
        allItems = items.filter(Boolean);
        buildBrandFilter(allItems);
        render(allItems);
      })
      .catch((err) => {
        console.error(err);
        grid.innerHTML =
          '<p style="margin:8px 0">Kunne ikke hente produkter lige nu.</p>';
      });
  } else {
    // Homepage: 4 identical Chanel perfume cards
    grid.classList.remove("all-products");
    if (titleEl) titleEl.textContent = "News";

    fetch(`${API}/category/fragrances?limit=0`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(({ products = [] }) => {
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

        render([chanel, chanel, chanel, chanel]);
      })
      .catch((err) => {
        console.error(err);
        grid.innerHTML =
          '<p style="margin:8px 0">Kunne ikke hente produkter lige nu.</p>';
      });
  }
})();
/* CSS file changes requested are in separate file */
