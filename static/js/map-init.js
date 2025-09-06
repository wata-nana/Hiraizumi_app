// map-init.js (safe startup, with queuing for early calls)
// Updated: add handler for closing the pin list modal (closePinListModal)
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

  // Placeholder queueing for fetchPins / showPinsByCategory
  window.__mapInitQueue = window.__mapInitQueue || { fetchPinsCalls: 0, showPinsCalls: [] };

  // If any other script calls fetchPins before ready, queue it by incrementing a counter.
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
            pinListModal.classList.add('hidden');
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

        pinListModal.classList.remove('hidden');
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
        if (pinModal) pinModal.classList.remove('hidden');
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
            categoryModal.classList.add('hidden');
            if (showPinsByCategoryFn) showPinsByCategoryFn(cat.id, cat.name);
          };
          categoryList.appendChild(div);
        });
        categoryModal.classList.remove('hidden');
      };
      const closeCategoryModal = document.getElementById('closeCategoryModal');
      if (closeCategoryModal) closeCategoryModal.onclick = () => categoryModal.classList.add('hidden');
    }

    // Add close handler for the pin list modal (this fixes "閉じる" not working when viewing the place list)
    const closePinListModal = document.getElementById('closePinListModal');
    if (closePinListModal) {
      closePinListModal.onclick = () => {
        const pinListModal = document.getElementById('pinListModal');
        if (pinListModal) pinListModal.classList.add('hidden');
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
          if (pinModal) pinModal.classList.remove('hidden');
        }
      });
    }

    const cancelPin = document.getElementById('cancelPin');
    if (cancelPin) cancelPin.onclick = () => {
      const pinModal = document.getElementById('pinModal');
      if (pinModal) pinModal.classList.add('hidden');
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
            if (modal) modal.classList.add('hidden');
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
  }

  // Wait for DOM and Leaflet then initialize map & functions
  function waitForLeafletAndStart(attempt = 0) {
    if (typeof L === 'undefined') {
      if (attempt < 40) {
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
