document.addEventListener("DOMContentLoaded", () => {
    const allRoutesModal = document.getElementById('allRoutesModal');

    // 最小表示に切り替え
    window.minimizeAllRoutesModal = function() {
        allRoutesModal.classList.add('minimized');
    };

    // 元の中央表示に戻す
    window.restoreAllRoutesModal = function() {
        allRoutesModal.classList.remove('minimized');
    };

    // タイトルクリックで中央表示に戻す
    const modalTitle = allRoutesModal.querySelector('h2');
    if (modalTitle) {
        modalTitle.style.cursor = 'pointer'; // クリック可能に
        modalTitle.addEventListener('click', () => {
            restoreAllRoutesModal();
        });
    }
});
