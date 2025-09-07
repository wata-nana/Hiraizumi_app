// チャット欄の初期化＆表示関数
window.openPinChat = async function(pinId, pinTitle) {
  const panel = document.getElementById('pinChatPanel');
  if (!panel) return;
  // タイトルセット
  document.getElementById('pinChatTitle').textContent = `「${pinTitle}」の掲示板`;

  let lastPinId = panel.dataset.pinId;
  panel.dataset.pinId = pinId;

  // チャット取得関数
  async function loadChat() {
    try {
      const res = await fetch(`/api/pins/${pinId}/chats`);
      const chats = await res.json();
      const list = document.getElementById('pinChatList');
      list.innerHTML = '';
      chats.forEach(chat => {
        const el = document.createElement('div');
        el.className = "mb-2 p-2 rounded bg-amber-50";
        el.innerHTML = `<b class="text-amber-700">${escapeHtml(chat.username)}</b>
          <span class="text-xs text-gray-400 ml-2">${new Date(chat.created_at).toLocaleString()}</span><br>
          <span>${escapeHtml(chat.message)}</span>`;
        list.appendChild(el);
      });
      list.scrollTop = list.scrollHeight;
    } catch (e) {
      document.getElementById('pinChatList').innerHTML = '<div class="text-red-500">読み込み失敗</div>';
    }
  }

  // 投稿
  const form = document.getElementById('pinChatForm');
  const input = document.getElementById('pinChatInput');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    form.querySelector('button').disabled = true;
    try {
      const res = await fetch(`/api/pins/${pinId}/chats`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const result = await res.json();
      if (result.success) {
        input.value = "";
        await loadChat();
      } else {
        alert(result.error || "投稿に失敗しました");
      }
    } catch (err) {
      alert("通信エラー");
    }
    form.querySelector('button').disabled = false;
  };

  // 閉じるボタン
  document.getElementById('pinChatCloseBtn').onclick = () => {
    panel.classList.add('hidden');
    if (window._pinChatTimer) clearInterval(window._pinChatTimer);
  };

  // 自動リロード（新しいピンを開いたらタイマー再設定）
  if (window._pinChatTimer) clearInterval(window._pinChatTimer);
  await loadChat();
  window._pinChatTimer = setInterval(loadChat, 6000);

  // パネル表示
  panel.classList.remove('hidden');
};

// HTMLエスケープ
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#039;');
}
