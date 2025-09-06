// route.js — 安全な初期化ラッパー付き
(function () {
  function initRouteModule() {
    // 既存の route.js の中身をここに入れる（DOM 要素が存在することを前提に実行）
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

    // 分類一覧（アイコンは任意で表示可能）
    const categories = [
      { id: 1, name: "食べる", icon: "🍽️" },
      { id: 2, name: "見る", icon: "👁️" },
      { id: 3, name: "遊ぶ", icon: "🎮" },
      { id: 4, name: "学ぶ", icon: "📚" },
      { id: 5, name: "体験する", icon: "🎯" },
      { id: 6, name: "探索する", icon: "🔍" },
      { id: 7, name: "休憩する", icon: "🛋️" },
      { id: 8, name: "泊まる", icon: "🏨" },
      { id: 9, name: "フォトスポット", icon: "📸" },
      { id: 10, name: "イベント", icon: "🎪" },
      { id: 11, name: "注意！", icon: "⚠️" },
      { id: 12, name: "その他", icon: "📦" }
    ];

    function updateRouteModalTitle() {
      if (routeModal) routeModal.querySelector('#routeModalTitle').textContent = `${currentRouteIndex}つ目のルートを選択してください`;
    }

    // showCategorySelection / showPinsByCategory / selectPinForRoute etc.
    async function showCategorySelection() {
      if (!routePinList) return;
      routePinDetail && routePinDetail.classList.add('hidden');
      routePinList.innerHTML = '';
      categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded-lg text-black text-center cursor-pointer border hover:shadow-md flex items-center gap-3';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.innerHTML = `
          <div class="text-2xl mb-1">${cat.icon}</div>
          <div class="text-sm font-medium">${cat.name}</div>
        `;
        div.onclick = () => showPinsByCategory(cat.id, cat.name);
        routePinList.appendChild(div);
      });
    }

    function escapeHtml(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function getCategoryIcon(categoryId) {
      const category = categories.find(c => c.id === categoryId);
      return category ? category.icon : '📦';
    }

    async function showPinsByCategory(categoryId, categoryName) {
      if (!routePinList) return;
      routePinDetail && routePinDetail.classList.add('hidden');
      routePinList.innerHTML = '';

      const backDiv = document.createElement('div');
      backDiv.className = 'col-span-3 mb-2';
      backDiv.innerHTML = `<button id="backToCategoriesBtn" class="px-3 py-1 border rounded">← 分類一覧に戻る</button>
                           <span class="ml-3 text-sm text-gray-600">${categoryName} のピン一覧</span>`;
      routePinList.appendChild(backDiv);
      document.getElementById('backToCategoriesBtn').onclick = () => showCategorySelection();

      try {
        const res = await fetch("/api/pins");
        const pins = await res.json();
        const filtered = pins.filter(p => p.category === categoryId);

        filtered.sort((a, b) => {
          const titleA = a.title ? String(a.title) : "";
          const titleB = b.title ? String(b.title) : "";
          return titleA.localeCompare(titleB, 'ja');
        });

        if (filtered.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'p-3 text-sm text-gray-500';
          empty.textContent = '該当するピンがありません';
          routePinList.appendChild(empty);
          return;
        }

        const listContainer = document.createElement('div');
        listContainer.className = 'grid grid-cols-1 gap-2 w-full';
        filtered.forEach(p => {
          const item = document.createElement('div');
          item.className = 'p-2 rounded border cursor-pointer flex items-center gap-3 hover:bg-gray-50';
          item.style.display = 'flex';
          item.innerHTML = `
            <div style="width:56px;height:56px;flex:0 0 56px;display:flex;align-items:center;justify-content:center;border-radius:6px;overflow:hidden;background:#f0f0f0;">
              ${p.image_url ? `<img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="font-size:20px;">${getCategoryIcon(categoryId)}</div>`}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title || '')}</div>
              <div style="font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.description || '')}</div>
            </div>
          `;
          item.onclick = () => selectPinForRoute(p);
          listContainer.appendChild(item);
        });
        routePinList.appendChild(listContainer);
      } catch (err) {
        console.error('ピン取得失敗', err);
        const errDiv = document.createElement('div');
        errDiv.className = 'p-3 text-red-500';
        errDiv.textContent = 'ピンの取得に失敗しました';
        routePinList.appendChild(errDiv);
      }
    }

    function selectPinForRoute(pin) {
      if (!routePinDetail) return;
      routePinDetail.classList.remove('hidden');
      routePinDetail.innerHTML = `
            <p class="font-semibold mb-2">${escapeHtml(pin.title)}</p>
            <p>この場所を追加しますか？</p>
            <div class="flex gap-2 mt-2">
                <button id="addPinYesBtn" class="px-2 py-1 bg-blue-600 text-white rounded">はい</button>
                <button id="addPinNoBtn" class="px-2 py-1 border rounded">いいえ</button>
            </div>
            <div id="detailMap" class="w-full h-64 mt-4 border rounded"></div>
        `;

      // Leaflet 詳細マップ（map が確実に存在することを前提）
      try {
        if (window.detailMapInstance) {
          window.detailMapInstance.remove();
        }
        if (window.L) {
          window.detailMapInstance = L.map('detailMap', { attributionControl: false }).setView([pin.lat, pin.lng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(window.detailMapInstance);
          L.marker([pin.lat, pin.lng]).addTo(window.detailMapInstance);
          setTimeout(() => window.detailMapInstance.invalidateSize(), 200);
        }
      } catch (e) {
        console.error('detail map error', e);
      }

      document.getElementById('addPinYesBtn').onclick = () => {
        selectedPins.push(pin.id);
        currentRouteIndex++;
        updateRouteModalTitle();
        routePinDetail.classList.add('hidden');
        showCategorySelection();
        if (currentRouteIndex > 1) {
          continueRouteModal && continueRouteModal.classList.remove('hidden');
        }
      };

      document.getElementById('addPinNoBtn').onclick = () => {
        routePinDetail.classList.add('hidden');
      };
    }

    // UI ボタンのイベント登録（存在チェック）
    if (createRouteBtn) {
      createRouteBtn.onclick = async () => {
        currentRouteIndex = 1;
        routePinDetail && routePinDetail.classList.add('hidden');
        selectedPins = [];
        updateRouteModalTitle();
        await showCategorySelection();
        routeModal && routeModal.classList.remove('hidden');
      };
    }

    if (cancelRouteBtn) {
      cancelRouteBtn.onclick = () => {
        routeModal && routeModal.classList.add('hidden');
        routePinDetail && routePinDetail.classList.add('hidden');
        selectedPins = [];
        currentRouteIndex = 1;
      };
    }

    if (continueYesBtn) continueYesBtn.onclick = () => continueRouteModal && continueRouteModal.classList.add('hidden');
    if (continueNoBtn) continueNoBtn.onclick = () => {
      continueRouteModal && continueRouteModal.classList.add('hidden');
      routeModal && routeModal.classList.add('hidden');
      journeyModal && journeyModal.classList.remove('hidden');
    };

    if (journeyForm) {
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
            journeyModal && journeyModal.classList.add('hidden');
            location.reload();
          } else {
            alert(result.error || '旅路登録に失敗しました');
          }
        } catch (err) {
          console.error(err);
          alert('通信に失敗しました');
        }
      };
    }

    if (cancelJourneyBtn) cancelJourneyBtn.onclick = () => journeyModal && journeyModal.classList.add('hidden');
  }

  // DOM の準備と map の存在を考慮して初期化する
  function startWhenReady() {
    // DOM がまだ読み込み中なら待つ
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // map ができているか確認して、もしなければ短いリトライ
        waitForMapAndInit();
      });
    } else {
      waitForMapAndInit();
    }
  }

  function waitForMapAndInit(attempts = 0) {
    // map 初期化は map.html 側で行われる想定
    if (window.map || typeof L !== 'undefined') {
      initRouteModule();
    } else if (attempts < 20) {
      setTimeout(() => waitForMapAndInit(attempts + 1), 50);
    } else {
      // 最後に一度だけ初期化（map がなくとも DOM 操作に着手する）
      initRouteModule();
    }
  }

  startWhenReady();
})();
