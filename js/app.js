(function () {
  'use strict';

  const products = window.FTProducts;

  // slug → display name mapping (kept in sync with nav hrefs)
  const categoryMap = {
    clothing: 'Clothing',
    jewelry: 'Jewelry',
    hats: 'Hats',
    decor: 'Statues & Decor',
  };

  const MIN_GRID_CARDS = 6;

  // ── DOM refs ──────────────────────────────────────────────
  const homeView    = document.getElementById('home-view');
  const dynView     = document.getElementById('dynamic-view');
  const cartBadge   = document.getElementById('cart-count');
  const toastEl     = document.getElementById('toast');

  // ── Cart (localStorage) ───────────────────────────────────
  let cart = loadCart();

  function loadCart() {
    try { return JSON.parse(localStorage.getItem('ft-cart') || '[]'); }
    catch { return []; }
  }

  function saveCart() {
    localStorage.setItem('ft-cart', JSON.stringify(cart));
    renderBadge();
  }

  function cartTotal() {
    return cart.reduce((n, item) => n + item.quantity, 0);
  }

  function renderBadge() {
    const n = cartTotal();
    cartBadge.textContent = n || '';
    cartBadge.style.display = n ? 'inline-flex' : 'none';
  }

  // ── Router ────────────────────────────────────────────────
  let prevHash = '#';
  let curHash  = location.hash || '#';

  window.addEventListener('hashchange', () => {
    prevHash = curHash;
    curHash  = location.hash || '#';
    route(curHash);
  });

  function route(hash) {
    if (!hash || hash === '#') {
      showHome();
      return;
    }
    if (hash.startsWith('#category/')) {
      const slug    = hash.slice(10).toLowerCase();
      const catName = categoryMap[slug];
      catName ? renderCategory(catName) : showHome();
      return;
    }
    if (hash.startsWith('#product/')) {
      const id = parseInt(hash.slice(9), 10);
      renderProduct(id);
      return;
    }
    if (hash === '#cart')         { renderCart();         return; }
    if (hash === '#checkout')     { renderCheckout();     return; }
    if (hash === '#confirmation') { renderConfirmation(); return; }

    // treat remaining hashes as page anchors — show home and let browser scroll
    showHome();
  }

  // ── View helpers ──────────────────────────────────────────
  function showHome() {
    homeView.hidden = false;
    dynView.hidden  = true;
    dynView.innerHTML = '';
    window.scrollTo(0, 0);
  }

  function mountView(html) {
    homeView.hidden = true;
    dynView.hidden  = false;
    dynView.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function backNav(label, href) {
    const dest = href || prevHash || '#';
    return `<nav class="dv-nav"><a class="dv-back-link" href="${dest}">${label}</a></nav>`;
  }

  function productCardHTML(p) {
    return `
      <a href="#product/${p.id}" class="dv-product-card">
        <div class="product-image product-image--white"
             style="background-image:url('${p.image}')"></div>
        <p class="product-name">${p.name}</p>
        <p class="product-price">$${p.price}</p>
      </a>`;
  }

  function comingSoonHTML() {
    return `<div class="coming-soon-card"><span>Coming Soon</span></div>`;
  }

  // ── Category view ─────────────────────────────────────────
  function renderCategory(catName) {
    const items = products.filter(p => p.category === catName);
    const pads  = Math.max(0, MIN_GRID_CARDS - items.length);

    let cards = items.map(productCardHTML).join('');
    for (let i = 0; i < pads; i++) cards += comingSoonHTML();

    mountView(`
      ${backNav('← Home', '#')}
      <div class="dv-page">
        <div class="dv-page-header">
          <h2>${catName}</h2>
          <span class="dv-item-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="dv-grid">${cards}</div>
      </div>
    `);
  }

  // ── Product detail view ───────────────────────────────────
  function renderProduct(id) {
    const p = products.find(p => p.id === id);
    if (!p) { showHome(); return; }

    const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;

    const sizesHTML = hasSizes ? `
      <p class="dv-field-label">Select Size</p>
      <div class="dv-sizes" id="size-selector">
        ${p.sizes.map((s, i) =>
          `<button class="size-btn${i === 0 ? ' active' : ''}" data-size="${s}">${s}</button>`
        ).join('')}
      </div>` : '';

    mountView(`
      ${backNav('← Back')}
      <div class="dv-product-detail">
        <div class="dv-product-image-wrap">
          <img src="${p.image}" alt="${p.name}" class="dv-product-img">
        </div>
        <div class="dv-product-info">
          <p class="dv-category-tag">${p.category}</p>
          <h2>${p.name}</h2>
          <p class="dv-price">$${p.price}</p>
          <p class="dv-desc">${p.description}</p>
          ${sizesHTML}
          <div class="dv-qty-row">
            <span class="dv-field-label">Qty</span>
            <div class="qty-controls">
              <button class="qty-btn" id="qty-dec">−</button>
              <span class="qty-val" id="qty-val">1</span>
              <button class="qty-btn" id="qty-inc">+</button>
            </div>
          </div>
          <button class="dv-add-btn" id="add-to-cart">Add to Cart</button>
        </div>
      </div>
    `);

    // size buttons
    if (hasSizes) {
      dynView.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          dynView.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }

    // quantity
    let qty = 1;
    const qtyEl = document.getElementById('qty-val');
    document.getElementById('qty-dec').addEventListener('click', () => {
      if (qty > 1) { qty--; qtyEl.textContent = qty; }
    });
    document.getElementById('qty-inc').addEventListener('click', () => {
      qty++;
      qtyEl.textContent = qty;
    });

    // add to cart
    document.getElementById('add-to-cart').addEventListener('click', () => {
      const size = hasSizes
        ? (dynView.querySelector('.size-btn.active')?.dataset.size || p.sizes[0])
        : null;

      const existing = cart.find(
        item => item.productId === p.id && item.size === size
      );
      if (existing) {
        existing.quantity += qty;
      } else {
        cart.push({
          productId: p.id,
          name:      p.name,
          image:     p.image,
          price:     p.price,
          size,
          quantity:  qty,
        });
      }
      saveCart();
      showToast('Added to cart!');
    });
  }

  // ── Cart view ─────────────────────────────────────────────
  function renderCart() {
    if (cart.length === 0) {
      mountView(`
        ${backNav('← Continue Shopping', '#')}
        <div class="dv-cart-page">
          <h2>Your Cart</h2>
          <div class="cart-empty">
            <p>Your cart is empty.</p>
            <p style="margin-top:12px"><a href="#">Keep browsing →</a></p>
          </div>
        </div>
      `);
      return;
    }

    const itemsHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <p class="cart-item-name">${item.name}</p>
          ${item.size ? `<p class="cart-item-meta">Size: ${item.size}</p>` : ''}
          <p class="cart-item-price">$${item.price}</p>
        </div>
        <div class="cart-item-right">
          <div class="qty-controls">
            <button class="qty-btn cart-qty-btn" data-action="dec" data-idx="${idx}">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn cart-qty-btn" data-action="inc" data-idx="${idx}">+</button>
          </div>
          <button class="cart-remove-btn" data-idx="${idx}">Remove</button>
        </div>
      </div>
    `).join('');

    const n = cartTotal();

    mountView(`
      ${backNav('← Continue Shopping', '#')}
      <div class="dv-cart-page">
        <h2>Your Cart</h2>
        <div class="cart-items">${itemsHTML}</div>
        <div class="cart-footer">
          <p class="cart-subtotal">
            ${n} item${n !== 1 ? 's' : ''} &mdash; <strong>$XX</strong>
          </p>
          <a href="#checkout" class="cart-checkout-btn">Checkout →</a>
        </div>
      </div>
    `);

    dynView.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (btn.dataset.action === 'dec') {
          if (cart[idx].quantity > 1) cart[idx].quantity--;
        } else {
          cart[idx].quantity++;
        }
        saveCart();
        renderCart();
      });
    });

    dynView.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(parseInt(btn.dataset.idx, 10), 1);
        saveCart();
        renderCart();
      });
    });
  }

  // ── Checkout view ─────────────────────────────────────────
  function renderCheckout() {
    if (cart.length === 0) { location.hash = '#cart'; return; }

    const summaryHTML = cart.map(item => `
      <div class="checkout-summary-item">
        <img src="${item.image}" alt="${item.name}" class="checkout-summary-img">
        <div class="checkout-summary-item-info">
          <div>${item.name}</div>
          ${item.size ? `<div class="checkout-summary-meta">Size: ${item.size}</div>` : ''}
          <div>Qty: ${item.quantity}</div>
        </div>
        <span class="checkout-summary-price">$${item.price}</span>
      </div>
    `).join('');

    mountView(`
      ${backNav('← Back to Cart', '#cart')}
      <div class="dv-checkout-page">
        <div class="checkout-form-col">
          <h2>Checkout</h2>
          <form id="checkout-form" novalidate>
            <div class="form-group">
              <label for="co-name">Full Name</label>
              <input type="text" id="co-name" placeholder="Jane Smith" required>
            </div>
            <div class="form-group">
              <label for="co-email">Email</label>
              <input type="email" id="co-email" placeholder="jane@example.com" required>
            </div>
            <div class="form-group">
              <label for="co-phone">Phone</label>
              <input type="tel" id="co-phone" placeholder="(303) 555-0100" required>
            </div>
            <div class="form-group">
              <label for="co-street">Street Address</label>
              <input type="text" id="co-street" placeholder="123 Main St, Apt 2" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="co-city">City</label>
                <input type="text" id="co-city" placeholder="Boulder" required>
              </div>
              <div class="form-group">
                <label for="co-state">State</label>
                <input type="text" id="co-state" placeholder="CO" maxlength="2" required>
              </div>
              <div class="form-group">
                <label for="co-zip">ZIP</label>
                <input type="text" id="co-zip" placeholder="80302" maxlength="5" required>
              </div>
            </div>
            <p class="checkout-note">
              Pricing is not yet live — we'll contact you to confirm your total before we ship anything.
            </p>
            <button type="submit" class="checkout-submit-btn">Place Order →</button>
          </form>
        </div>
        <div class="checkout-summary-col">
          <div class="checkout-summary-box">
            <h3>Order Summary</h3>
            ${summaryHTML}
            <div class="checkout-summary-total">
              <span>${cartTotal()} item${cartTotal() !== 1 ? 's' : ''}</span>
              <span>$XX</span>
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById('checkout-form').addEventListener('submit', e => {
      e.preventDefault();

      const val = id => document.getElementById(id).value.trim();
      const name   = val('co-name');
      const email  = val('co-email');
      const phone  = val('co-phone');
      const street = val('co-street');
      const city   = val('co-city');
      const state  = val('co-state');
      const zip    = val('co-zip');

      if (!name || !email || !phone || !street || !city || !state || !zip) {
        alert('Please fill in all fields.');
        return;
      }

      // TODO: connect a real payment processor here (Stripe/Square/etc.)
      // before this goes live — currently this just records the order info.

      const order = {
        items:    [...cart],
        customer: { name, email, phone },
        shipping: { street, city, state, zip },
        placedAt: new Date().toISOString(),
      };

      localStorage.setItem('ft-last-order', JSON.stringify(order));
      cart = [];
      saveCart();
      location.hash = '#confirmation';
    });
  }

  // ── Confirmation view ─────────────────────────────────────
  function renderConfirmation() {
    let order;
    try { order = JSON.parse(localStorage.getItem('ft-last-order') || 'null'); }
    catch { order = null; }

    if (!order) { location.hash = '#'; return; }

    const itemsHTML = order.items.map(item => `
      <div class="confirm-item">
        ${item.name}${item.size ? ` (${item.size})` : ''} &times; ${item.quantity}
        <span class="confirm-item-price">$${item.price}</span>
      </div>
    `).join('');

    mountView(`
      <div class="dv-confirmation">
        <div class="confirm-check">&#10003;</div>
        <h2>Order Received!</h2>
        <p class="confirm-sub">
          Thanks, <strong>${order.customer.name}</strong>! We'll reach out to
          <strong>${order.customer.email}</strong> to confirm your order and
          shipping total before anything is charged or shipped.
        </p>
        <div class="confirm-box">
          <h3>What you ordered</h3>
          ${itemsHTML}
        </div>
        <div class="confirm-box">
          <h3>Ships to</h3>
          <p class="confirm-address">
            ${order.shipping.street}<br>
            ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}
          </p>
        </div>
        <a href="#" class="dv-continue-btn">Continue Shopping →</a>
      </div>
    `);
  }

  // ── Toast ─────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('visible');
      setTimeout(() => { toastEl.hidden = true; }, 300);
    }, 2000);
  }

  // ── Init ──────────────────────────────────────────────────
  renderBadge();
  route(location.hash || '#');

})();
