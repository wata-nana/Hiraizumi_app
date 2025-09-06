// ===== 旅路作成機能 =====
const createRouteBtn = document.getElementById('createRouteBtn');
const routeModal = document.getElementById('routeModal');
const routePinList = document.getElementById('routePinList');
const routePinDetail = document.getElementById('routePinDetail');
const cancelRouteBtn = document.getElementById('cancelRouteBtn');
const continueRouteModal = document.getElementById('continueRouteModal');
const continueYesBtn = document.getElementById('continueYesBtn');
const continueNoBtn = document.getElementById('continueNoBtn');

const journeyModal = document.getElementById('journeyRegistration');
const journeyForm = document.getElementById('journeyForm');
const cancelJourneyBtn = document.getElementById('cancelJourneyBtn');

let selectedPins = []; // 選択済みピンID
let currentRouteIndex = 1;

createRouteBtn.onclick = async () => {
  await loadPinsForRoute();
  currentRouteIndex = 1;
  routeModal.classList.remove('hidden');
  updateRouteModalTitle();
};

cancelRouteBtn.onclick = () => {
  routeModal.classList.add('hidden');
  routePinDetail.classList.add('hidden');
  selectedPins = [];
  currentRouteIndex = 1;
};

async function loadPinsForRoute() {
  const res = await fetch("/api/pins");
  const pins = await res.json();
  routePinList.innerHTML = '';
  pins.forEach(pin => {
    const div = document.createElement('div');
    div.className = 'p-2 rounded text-center border cursor-pointer';
    div.textContent = pin.title;
    div.onclick = () => selectPinForRoute(pin);
    routePinList.appendChild(div);
  });
}

function updateRouteModalTitle() {
  routeModal.querySelector('#routeModalTitle').textContent = `${currentRouteIndex}つ目のルートを選択してください`;
}

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

continueYesBtn.onclick = () => {
  continueRouteModal.classList.add('hidden');
};

continueNoBtn.onclick = () => {
  continueRouteModal.classList.add('hidden');
  routeModal.classList.add('hidden');
  journeyModal.classList.remove('hidden');
};

journeyForm.onsubmit = async (e) => {
  e.preventDefault();

  if (selectedPins.length === 0) {
    alert('少なくとも1つのピンを選択してください');
    return;
  }

  const formData = new FormData(journeyForm);
  formData.append('route_pins', JSON.stringify(selectedPins.map((id, index) => ({ pin_id: id, order: index }))));

  try {
    const res = await fetch('/api/routes', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const result = await res.json();
    if (result.success) {
      alert('旅路を登録しました');
      journeyModal.classList.add('hidden');
      location.reload();
    } else {
      alert(result.error || '旅路登録に失敗しました');
    }
  } catch (err) {
    console.error(err);
    alert('通信に失敗しました');
  }
};

cancelJourneyBtn.onclick = () => {
  journeyModal.classList.add('hidden');
};
