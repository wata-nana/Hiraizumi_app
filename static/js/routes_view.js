// routes_view.js — safer: check map type before using layerGroup/addTo
(function () {
  console.log('[routes_view] script loaded');

  function initRoutesView() {
    const allRoutesBtn = document.getElementById('allRoutesBtn');
    const allRoutesModal = document.getElementById('allRoutesModal');
    const routesList = document.getElementById('routesList');
    const closeAllRoutesBtn = document.getElementById('closeAllRoutesBtn');

    if (!allRoutesBtn || !allRoutesModal || !routesList) {
      console.warn('[routes_view] required elements not found');
      return;
    }

    // Only create layer groups if there is a valid Leaflet map object
    let routeMarkersLayer = null;
    let routePolylineLayer = null;
    const mapIsValid = (window.map && typeof window.map.addLayer === 'function' && typeof L !== 'undefined');

    if (mapIsValid) {
      try {
        routeMarkersLayer = L.layerGroup().addTo(window.map);
        routePolylineLayer = L.layerGroup().addTo(window.map);
      } catch (e) {
        console.warn('[routes_view] could not create layer groups', e);
        routeMarkersLayer = null;
        routePolylineLayer = null;
      }
    } else {
      console.log('[routes_view] map not ready or invalid — will still show modal but skip drawing on map');
    }

    allRoutesBtn.onclick = async () => {
      if (allRoutesModal.classList.contains('hidden')) {
        routesList.innerHTML = '';
        try {
          const res = await fetch('/api/routes');
          const routes = await res.json();
          routes.forEach(route => {
            const div = document.createElement('div');
            div.className = 'border rounded p-2 cursor-pointer flex flex-col items-center';
            div.innerHTML = `
                      <img src="${route.image_url}" class="w-24 h-24 object-cover mb-1 rounded">
                      <span class="text-sm text-center">${route.name}</span>
                  `;
            div.onclick = () => showRouteOnMap(route.id);
            routesList.appendChild(div);
          });
        } catch (e) {
          console.error('[routes_view] routes fetch error', e);
          const errDiv = document.createElement('div');
          errDiv.className = 'p-3 text-red-500';
          errDiv.textContent = '旅路一覧の取得に失敗しました';
          routesList.appendChild(errDiv);
        }
        allRoutesModal.classList.remove('hidden');
      } else {
        allRoutesModal.classList.add('hidden');
        clearRouteMap();
      }
    };

    closeAllRoutesBtn && (closeAllRoutesBtn.onclick = () => {
      allRoutesModal.classList.add('hidden');
      clearRouteMap();
      if (window.restoreAllRoutesModal) window.restoreAllRoutesModal();
    });

    async function showRouteOnMap(routeId) {
      clearRouteMap();
      try {
        const res = await fetch(`/api/routes/${routeId}/pins`);
        const pins = await res.json();
        if (!pins.length) return;

        const latlngs = pins.map(p => [p.lat, p.lng]);

        if (routeMarkersLayer && routePolylineLayer) {
          pins.forEach(p => {
            const marker = L.marker([p.lat, p.lng])
              .bindPopup(`<strong>${p.title}</strong><br>${p.description}`);
            routeMarkersLayer.addLayer(marker);
          });
          const polyline = L.polyline(latlngs, { color: 'blue', weight: 4 });
          routePolylineLayer.addLayer(polyline);
          try {
            window.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          } catch (e) { /* ignore */ }
        } else {
          // No valid map — show textual route details in modal
          const detailDiv = document.createElement('div');
          detailDiv.className = 'p-3';
          detailDiv.innerHTML = '<h3 class="font-semibold mb-2">ルートの詳細</h3>';
          pins.forEach(p => {
            const dd = document.createElement('div');
            dd.className = 'mb-2';
            dd.innerHTML = `<strong>${p.title}</strong><br>${p.description}`;
            detailDiv.appendChild(dd);
          });
          // Hide grid items and append details
          routesList.querySelectorAll('div').forEach(div => div.style.display = 'none');
          routesList.appendChild(detailDiv);
        }

        if (window.minimizeAllRoutesModal) window.minimizeAllRoutesModal();
      } catch (err) {
        console.error('[routes_view] showRouteOnMap error', err);
      }
    }

    function clearRouteMap() {
      if (routeMarkersLayer) routeMarkersLayer.clearLayers();
      if (routePolylineLayer) routePolylineLayer.clearLayers();
      routesList.querySelectorAll('div').forEach(div => div.style.display = 'flex');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRoutesView);
  } else {
    initRoutesView();
  }
})();
