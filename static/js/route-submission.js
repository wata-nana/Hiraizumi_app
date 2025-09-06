// ===== 旅路登録機能 =====
const continueRouteModal = document.getElementById('continueRouteModal');
const continueYesBtn = document.getElementById('continueYesBtn');
const continueNoBtn = document.getElementById('continueNoBtn');

const journeyModal = document.getElementById('journeyRegistration');
const journeyForm = document.getElementById('journeyForm');
const cancelJourneyBtn = document.getElementById('cancelJourneyBtn');

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
