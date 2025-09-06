// map-init.js (safe startup, with queuing for early calls)
// Updated: modal show/hide helpers to manage focus and aria-hidden to avoid "Blocked aria-hidden" warning.
(function () {
  console.log('[map-init] script loaded');

  // Simple category icons
  const categories = [
    { id: 1, name: "食べる", icon: "🍽️" }, { id: 2, name: "見る", icon: "👁️" },
    { id: 3, name: "遊ぶ", icon: "🎮" }, { id: 4, name: "学ぶ", icon: "📚" },
    { id: 5, name: "体験する", icon: "🎯" }, { id: 6, name: "探索する", icon: "🔍" },
    { id: 7, name: "休憩する", icon: "🛋️" }, { id: 8, name: "泊まる", icon: "🏨" },
    { id: 9, name: "フォトスポット", icon: "📸" }, { id: 10, name: "イベント", icon: "🎪" },
    { id: 11, name: "注意！", icon: "⚠️" }, { id: 12, name: "その他", icon: "📦" }
  ];

  function getCategoryIcon(categoryId) {
    const c = categories.find(x => x.id === categoryId);
    return c ? c.icon : '📦';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Helper: find first focusable element inside container
  function findFirstFocusable(container) {
    if (!container) return null;
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ];
    return container.querySelector(focusableSelectors.join(','));
  }

  // showModal / hideModal helpers that manage focus and aria-hidden safely
  function showModal(modalEl, returnFocusTo) {
    if (!modalEl) return;
    try {
      // mark visible first
      modalEl.classList.remove('hidden');
      modalEl.setAttribute('aria-hidden', 'false');

      // focus an appropriate element inside modal (prefer a cancel or close or first focusable)
      const preferred = modalEl.querySelector('[data-autofocus], .unified-btn, button, a, input, select, textarea');
      const focusTarget = preferred || findFirstFocusable(modalEl);
      if (focusTarget && typeof focusTarget.focus === 'function') {
        setTimeout(() => focusTarget.focus(), 10); // slight delay for accessibility
      }

      // store returnFocusTo (element id) for hide
      if (returnFocusTo) {
        try {
          if (typeof returnFocusTo === 'string') {
            modalEl.dataset.returnFocusTo = returnFocusTo;
          } else if (returnFocusTo.id) {
            modalEl.dataset.returnFocusTo = `#${returnFocusTo.id}`;
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('[map-init] showModal error', e);
      modalEl.classList.remove('hidden'); // best-effort
    }
  }

  function hideModal(modalEl, returnFocusTo) {
    if (!modalEl) return;
    try {
      // Determine where to move focus first
      let target = null;
      if (returnFocusTo) {
        target = (typeof returnFocusTo === 'string') ? document.querySelector(returnFocusTo) : returnFocusTo;
      }
      // Fallback to stored returnFocusTo in dataset
      if (!target && modalEl.dataset && modalEl.dataset.returnFocusTo) {
        target = document.querySelector(modalEl.dataset.returnFocusTo) || null;
      }
      // If focus currently inside modal, move it out BEFORE marking aria-hidden
      const active = document.activeElement;
      if (active && modalEl.contains(active)) {
        if (target && typeof target.focus === 'function') {
          try { target.focus(); } catch (e) { document.body.focus && document.body.focus(); }
        } else {
          // blur active element to avoid aria-hidden on focused element
          try { active.blur(); } catch (e) { /* ignore */ }
          try { document.body.focus && document.body.focus(); } catch (e) { /* ignore */ }
        }
      }

      // now hide and set aria-hidden to true
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.classList.add('hidden');

      // cleanup stored returnFocusTo
      try { delete modalEl.dataset.returnFocusTo; } catch (e) { modalEl.removeAttribute && modalEl.removeAttribute('data-return-focus-to'); }
    } catch (e) {
      console.error('[map-init] hideModal error', e);
      modalEl.classList.add('hidden'); // best-effort
    }
  }

  // Placeholder queueing for fetchPins / showPinsByCategory
  window.__mapInitQueue = window.__mapInitQueue || { fetchPinsCalls: 0, showPinsCalls: [] };

  if (!window.fetchPins) {
    window.fetchPins = function () {
      console.warn('[map-init] fetchPins called before map ready — queued');
      window.__mapInitQueue.fetchPinsCalls = (window.__mapInitQueue.fetchPinsCalls || 0) + 1;
    };
  }

  if (!window.showPinsByCategory) {
    window.showPinsByCategory = function (categoryId, categoryName) {
      console.warn('[map-init] showPinsByCategory called before map ready — queued', categoryId, categoryName);
      window.__mapInitQueue.showPinsCalls = window.__mapInitQueue.showPinsCalls || [];
      window.__mapInitQueue.showPinsCalls.push([categoryId, categoryName]);
    };
  }

  // Create actual fetchPins bound to map/pinLayer
  function createFetchPins(mapObj, pinLayer) {
    return async function fetchPins() {
      if (!mapObj || !pinLayer) {
        console.warn('[map-init] fetchPins: map or pinLayer not ready');
        return;
      }
      try {
        const res = await fetch('/api/pins');
        const pins = await res.json();

        pinLayer.clearLayers();
        const now = new Date();

        pins.forEach(pin => {
          const lat = parseFloat(pin.lat);
          const lng = parseFloat(pin.lng);
          if (!lat || !lng) return;

          if (pin.expires_at) {
            const expires = new Date(pin.expires_at);
            if (!isNaN(expires) && expires < now) return;
          }

          let marker;
          if (pin.image_url) {
            const iconHtml = `
              <div style="width:40px;height:50px;position:relative;">
                <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:20px solid #d32f2f;"></div>
                <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);width:32px;height:32px;border-radius:50%;border:3px solid white;background-image:url(${pin.image_url});background-size:cover;background-position:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
              </div>
            `;
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [40, 50], iconAnchor: [20, 50], popupAnchor: [0, -50] });
            marker = L.marker([lat, lng], { icon: icon });
          } else {
            const categoryIcon = getCategoryIcon(pin.category);
            const iconHtml = `
              <div style="width:40px;height:50px;position:relative;">
                <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:20px solid #d32f2f;"></div>
                <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);width:32px;height:32px;border-radius:50%;border:3px solid white;background-color:white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${categoryIcon}</div>
              </div>
            `;
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [40, 50], iconAnchor: [20, 50], popupAnchor: [0, -50] });
            marker = L.marker([lat, lng], { icon: icon });
          }

          marker.addTo(pinLayer);

          let popup = `<strong>${escapeHtml(pin.title)}</strong><br>${escapeHtml(pin.description)}<br>`;
          if (pin.caution) popup += `<em style="color:red">注意: ${escapeHtml(pin.caution)}</em><br>`;
          if (pin.image_url && !pin.image_url.includes('icon')) popup += `<img src="${pin.image_url}" width="100"><br>`;
          if (pin.expires_at) popup += `表示期限: ${new Date(pin.expires_at).toLocaleString()}<br>`;

          marker.bindPopup(popup);
        });
      } catch (err) {
        console.error('[map-init] ピン取得に失敗しました', err);
      }
    };
  }

  function createShowPinsByCategory(pinLayer) {
    return async function showPinsByCategory(categoryId, categoryName) {
      const pinListModal = document.getElementById('pinListModal');
      const pinList = document.getElementById('pinList');
      const pinListTitle = document.getElementById('pinListTitle');
      if (!pinListModal || !pinList || !pinListTitle) {
        console.warn('[map-init] pin list modal elements not found');
        return;
      }

      pinListTitle.textContent = categoryName;
      pinList.innerHTML = '';

      try {
        const res = await fetch('/api/pins');
        const pins = await res.json();
        const filtered = pins.filter(p => p.category === categoryId);
        filtered.sort((a, b) => {
          const ta = a.title ? String(a.title) : '';
          const tb = b.title ? String(b.title) : '';
          return ta.localeCompare(tb, 'ja');
        });

        filtered.forEach(p => {
          const li = document.createElement('li');
          li.className = 'flex items-center gap-3 cursor-pointer py-2 border-b';
          li.innerHTML = `
            <div style="width:56px;height:56px;flex:0 0 56px;border-radius:6px;overflow:hidden;background:#f0f0f0;">
              ${p.image_url ? `<img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="font-size:20px;display:flex;align-items:center;justify-content:center;height:100%">${getCategoryIcon(categoryId)}</div>`}
            </div>
            <div style="min-width:0;">
              <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title || '')}</div>
              <div style="font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.description || '')}</div>
            </div>
          `;
          li.onclick = () => {
            // hide modal, moving focus back to search button
            const pinListModalLocal = document.getElementById('pinListModal');
            hideModal(pinListModalLocal, document.getElementById('searchBtn'));
            if (pinLayer) {
              const marker = pinLayer.getLayers().find(m => m.getLatLng && m.getLatLng().lat === parseFloat(p.lat) && m.getLatLng().lng === parseFloat(p.lng));
              if (marker && window.map && typeof window.map.setView === 'function') {
                try {
                  window.map.setView([p.lat, p.lng], 16);
                  marker.openPopup();
                } catch (e) { /* ignore */ }
              }
            }
          };
          pinList.appendChild(li);
        });

        // show with focus management; return focus to searchBtn when closed
        showModal(pinListModal, document.getElementById('searchBtn'));
      } catch (err) {
        console.error('[map-init] カテゴリ別ピン取得失敗', err);
      }
    };
  }

  function registerUIHandlers(mapObj, pinLayer, fetchPinsFn, showPinsByCategoryFn) {
    console.log('[map-init] registering UI handlers');

    const addLocationBtn = document.getElementById('addLocationBtn');
    if (addLocationBtn) {
      addLocationBtn.onclick = () => {
        const pinModal = document.getElementById('pinModal');
        // show modal and set return focus to addLocationBtn
        showModal(pinModal, addLocationBtn);
        window.selectedLatLng = null;
      };
    }

    const searchBtn = document.getElementById('searchBtn');
    const categoryModal = document.getElementById('categoryModal');
    const categoryList = document.getElementById('categoryList');
    if (searchBtn && categoryModal && categoryList) {
      searchBtn.onclick = () => {
        categoryList.innerHTML = '';
        categories.forEach(cat => {
          const div = document.createElement('div');
          div.className = `p-3 rounded-lg text-black text-center cursor-pointer bg-gradient-to-r from-amber-100/80 to-amber-200/80 border border-amber-300/60 shadow-md hover:shadow-lg transition-all duration-300`;
          div.innerHTML = `
            <div class="text-2xl mb-1">${cat.icon}</div>
            <div class="text-sm font-medium">${cat.name}</div>
          `;
          div.onclick = () => {
            // hide category modal safely, then open pin list
            hideModal(categoryModal, searchBtn);
            if (showPinsByCategoryFn) showPinsByCategoryFn(cat.id, cat.name);
          };
          categoryList.appendChild(div);
        });
        // show category modal, focus cancel button inside, returnFocus -> searchBtn
        showModal(categoryModal, searchBtn);

        // ensure footer cancel button exists and is bound (re-bind each time modal opens)
        const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
        if (cancelCategoryBtn) {
          cancelCategoryBtn.onclick = () => {
            hideModal(categoryModal, searchBtn);
          };
        }
      };
    }

    // bind footer Close button for pin list modal
    const closePinListModalFooter = document.getElementById('closePinListModalFooter');
    if (closePinListModalFooter) {
      closePinListModalFooter.onclick = () => {
        const pinListModal = document.getElementById('pinListModal');
        hideModal(pinListModal, document.getElementById('searchBtn'));
      };
    }

    if (mapObj && typeof mapObj.on === 'function') {
      mapObj.on('click', async (e) => {
        window.selectedLatLng = e.latlng;
        let address = "この地点";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
          const data = await res.json();
          if (data.display_name) address = data.display_name;
        } catch (err) {}
        if (confirm(`${address} にピンを追加しますか？`)) {
          const pinModal = document.getElementById('pinModal');
          showModal(pinModal, document.getElementById('addLocationBtn'));
        }
      });
    }

    const cancelPin = document.getElementById('cancelPin');
    if (cancelPin) cancelPin.onclick = () => {
      const pinModal = document.getElementById('pinModal');
      hideModal(pinModal, document.getElementById('addLocationBtn'));
    };

    const pinForm = document.getElementById('pinForm');
    if (pinForm) {
      pinForm.onsubmit = async (evt) => {
        evt.preventDefault();
        const form = evt.target;
        const formData = new FormData(form);

        let lat = window.selectedLatLng?.lat;
        let lng = window.selectedLatLng?.lng;
        const address = document.getElementById('pinAddress') ? document.getElementById('pinAddress').value.trim() : '';

        if (!lat && address) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            const data = await res.json();
            if (data.length === 0) {
              alert('住所が見つかりませんでした');
              return;
            }
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          } catch (err) {
            console.error(err);
            alert('住所から位置を取得できませんでした');
            return;
          }
        }

        if (!lat || !lng) {
          alert('地図上をクリックするか、住所を入力してください');
          return;
        }

        formData.append('lat', lat);
        formData.append('lng', lng);

        const title = formData.get('title') ? formData.get('title').toString().trim() : '';
        const category = formData.get('category');
        const description = formData.get('description') ? formData.get('description').toString().trim() : '';

        if (!title || title.length > 30) {
          alert('名称は1文字以上30文字以内で入力してください。');
          return;
        }
        if (!category) {
          alert('分類を選択してください。');
          return;
        }
        if (!description) {
          alert('場所の説明は必須です。');
          return;
        }

        try {
          const res = await fetch('/api/pins', { method: 'POST', body: formData, credentials: 'same-origin' });
          const result = await res.json();
          if (result.success) {
            const modal = document.getElementById('pinModal');
            hideModal(modal, document.getElementById('addLocationBtn'));
            form.reset();
            if (fetchPinsFn) fetchPinsFn();
          } else {
            alert(result.error || 'ピン追加に失敗しました');
          }
        } catch (err) {
          alert('通信に失敗しました');
          console.error(err);
        }
      };
    }

    // Delegated document-level click handler for modal footer buttons (additional safety)
    if (!document.__modalDelegationBound) {
      document.__modalDelegationBound = true;
      document.addEventListener('click', function (e) {
        try {
          const el = e.target.closest && e.target.closest('#cancelCategoryBtn, #closePinListModalFooter, #closeAllRoutesBtn, #cancelJourneyBtn');
          if (!el) return;

          const id = el.id;
          if (id === 'cancelCategoryBtn') {
            const catModal = document.getElementById('categoryModal');
            hideModal(catModal, document.getElementById('searchBtn'));
            e.stopPropagation();
            return;
          }
          if (id === 'closePinListModalFooter') {
            const pinListModal = document.getElementById('pinListModal');
            hideModal(pinListModal, document.getElementById('searchBtn'));
            e.stopPropagation();
            return;
          }
          if (id === 'closeAllRoutesBtn') {
            const allRoutesModal = document.getElementById('allRoutesModal');
            hideModal(allRoutesModal, document.getElementById('allRoutesBtn'));
            e.stopPropagation();
            return;
          }
          if (id === 'cancelJourneyBtn') {
            const journey = document.getElementById('journeyRegistration');
            hideModal(journey, document.getElementById('createRouteBtn'));
            e.stopPropagation();
            return;
          }
        } catch (err) {
          console.error('[map-init] delegated click handler error', err);
        }
      }, { capture: true });
    }

    // ESC key closes any open unified-modal (UX convenience)
    if (!document.__modalEscBound) {
      document.__modalEscBound = true;
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
          try {
            const openModals = document.querySelectorAll('.unified-modal:not(.hidden)');
            openModals.forEach(m => {
              // restore focus to stored returnFocusTo or to body
              const returnTo = m.dataset && m.dataset.returnFocusTo ? document.querySelector(m.dataset.returnFocusTo) : document.getElementById('searchBtn') || document.body;
              hideModal(m, returnTo);
            });
          } catch (err) { /* ignore */ }
        }
      });
    }
  }

  // Wait for DOM and Leaflet then initialize map & functions
  function waitForLeafletAndStart(attempt = 0) {
    if (typeof L === 'undefined') {
      if (attempt < 40) {
        if (attempt % 5 === 0) console.log('[map-init] waiting for Leaflet...', attempt);
        setTimeout(() => waitForLeafletAndStart(attempt + 1), 100);
        return;
      } else {
        console.warn('[map-init] Leaflet not available after retries; aborting map init');
        return;
      }
    }

    // safe to use L
    const BOUNDS = L.latLngBounds([38.75, 140.95], [39.05, 141.30]);
    console.log('[map-init] Leaflet ready, initializing map');

    if (!window.map || typeof window.map.addLayer !== 'function') {
      window.map = L.map('map', {
        zoomControl: true,
        maxBounds: BOUNDS,
        maxBoundsViscosity: 1.0
      }).fitBounds(BOUNDS, { padding: [0, 0] });

      setTimeout(() => {
        try { window.map.invalidateSize(); } catch (e) {}
        try { window.map.fitBounds(BOUNDS, { padding: [0, 0] }); } catch (e) {}
      }, 100);
    } else {
      console.log('[map-init] window.map already exists and looks like a map instance');
    }

    // tile layer & pinLayer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      minZoom: 12, maxZoom: 18, bounds: BOUNDS, noWrap: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(window.map);

    if (!window.pinLayer || typeof window.pinLayer.clearLayers !== 'function') {
      window.pinLayer = L.layerGroup().addTo(window.map);
    }

    // real functions
    const realFetchPins = createFetchPins(window.map, window.pinLayer);
    const realShowPinsByCategory = createShowPinsByCategory(window.pinLayer);

    // replace placeholders and flush queued calls
    window.fetchPins = realFetchPins;
    window.showPinsByCategory = realShowPinsByCategory;

    // flush queued fetchPins calls
    if (window.__mapInitQueue && window.__mapInitQueue.fetchPinsCalls) {
      const times = window.__mapInitQueue.fetchPinsCalls;
      console.log('[map-init] flushing queued fetchPins calls:', times);
      for (let i = 0; i < times; i++) {
        try { realFetchPins(); } catch (e) {}
      }
    }
    // flush queued showPinsByCategory calls
    if (window.__mapInitQueue && window.__mapInitQueue.showPinsCalls && window.__mapInitQueue.showPinsCalls.length) {
      console.log('[map-init] flushing queued showPinsByCategory calls:', window.__mapInitQueue.showPinsCalls.length);
      window.__mapInitQueue.showPinsCalls.forEach(args => {
        try { realShowPinsByCategory.apply(null, args); } catch (e) {}
      });
    }

    // register UI handlers and initial fetch
    registerUIHandlers(window.map, window.pinLayer, realFetchPins, realShowPinsByCategory);
    realFetchPins();
  }

  function start() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => waitForLeafletAndStart(0));
    } else {
      waitForLeafletAndStart(0);
    }
  }

  start();
})();
