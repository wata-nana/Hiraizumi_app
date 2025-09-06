document.addEventListener("DOMContentLoaded", () => {
  const allRoutesBtn = document.getElementById('allRoutesBtn');
  const allRoutesModal = document.getElementById('allRoutesModal');
  const routesList = document.getElementById('routesList');
  const closeAllRoutesBtn = document.getElementById('closeAllRoutesBtn');

  let routeMarkersLayer = L.layerGroup().addTo(window.map);
  let routePolylineLayer = L.layerGroup().addTo(window.map);

  allRoutesBtn.onclick = async () => {
    if (allRoutesModal.classList.contains('hidden')) {
      // モーダルを表示して旅路一覧取得
      routesList.innerHTML = '';
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

      allRoutesModal.classList.remove('hidden');
    } else {
      allRoutesModal.classList.add('hidden');
      clearRouteMap();
    }
  };

  closeAllRoutesBtn.onclick = () => {
    allRoutesModal.classList.add('hidden');
    clearRouteMap();
  };

  async function showRouteOnMap(routeId) {
    clearRouteMap();

    const res = await fetch(`/api/routes/${routeId}/pins`);
    const pins = await res.json();

    if (!pins.length) return;

    const latlngs = pins.map(p => [p.lat, p.lng]);

    // マーカーを作成
    pins.forEach(p => {
      const marker = L.marker([p.lat, p.lng])
        .bindPopup(`<strong>${p.title}</strong><br>${p.description}`);
      routeMarkersLayer.addLayer(marker);
    });

    // Polylineで順序通りに繋ぐ
    const polyline = L.polyline(latlngs, { color: 'blue', weight: 4 });
    routePolylineLayer.addLayer(polyline);

    // 矢印装飾
    const decorator = L.polylineDecorator(polyline, {
      patterns: [
        { offset: '5%', repeat: '10%', symbol: L.Symbol.arrowHead({ pixelSize: 10, pathOptions: { color: 'red', fillOpacity: 1, weight: 0 } }) }
      ]
    }).addTo(routePolylineLayer);

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    // 一覧モードを最小化
    routesList.querySelectorAll('div').forEach(div => div.style.display = 'none');
  }
  function clearRouteMap() {
    routeMarkersLayer.clearLayers();
    routePolylineLayer.clearLayers();
    // 一覧モードを復活
    routesList.querySelectorAll('div').forEach(div => div.style.display = 'flex');
  }

});
