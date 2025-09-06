function minimizeAllRoutesModal() {
    const modal = document.getElementById('allRoutesModal');
    modal.classList.add('minimized');
}

function restoreAllRoutesModal() {
    const modal = document.getElementById('allRoutesModal');
    modal.classList.remove('minimized');
}

// 例: モーダルをクリックすると元に戻す
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById('allRoutesModal');
    modal.querySelector('h2').onclick = restoreAllRoutesModal;
});
