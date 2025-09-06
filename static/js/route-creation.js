// ===== 旅路作成機能 =====
const createRouteBtn = document.getElementById('createRouteBtn');
const routeModal = document.getElementById('routeModal');
const routePinList = document.getElementById('routePinList');
const cancelRouteBtn = document.getElementById('cancelRouteBtn');

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


