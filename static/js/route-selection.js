// ===== ピン選択機能 =====
const routePinDetail = document.getElementById('routePinDetail');

function selectPinForRoute(pin) {
  routePinDetail.classList.remove('hidden');
  routePinDetail.innerHTML = `
        <p class="font-semibold mb-2">${pin.title}</p>
        <p>この場所を追加しますか？</p>
        <div class="flex gap-2 mt-2">
            <button id="addPinYesBtn" class="px-2 py-1 bg-blue-600 text-white rounded">はい</button>
            <button id="addPinNoBtn" class="px-2 py-1 border rounded">いいえ</button>
        </div>
        <!-- マップ用の枠 -->
        <div id="detailMap" class="w-full h-64 mt-4 border rounded"></div>
    `;

  // ===== Leaflet 初期化 =====
  if (window.detailMapInstance) {
    window.detailMapInstance.remove();
  }
  window.detailMapInstance = L.map('detailMap').setView([pin.lat, pin.lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(window.detailMapInstance);

  L.marker([pin.lat, pin.lng]).addTo(window.detailMapInstance);

  setTimeout(() => {
    window.detailMapInstance.invalidateSize();
  }, 200);
  // ここまでマップ表示

  // ボタン表示
  document.getElementById('addPinYesBtn').onclick = () => {
    selectedPins.push(pin.id);
    currentRouteIndex++;
    updateRouteModalTitle();
    routePinDetail.classList.add('hidden');
    if (currentRouteIndex > 1) {
      continueRouteModal.classList.remove('hidden');
    }
  };

  document.getElementById('addPinNoBtn').onclick = () => {
    routePinDetail.classList.add('hidden');
  };
}
