// 完全終了ユーティリティ for "みんなの旅路をみる"（allRoutesModal）
// 改良版：close ボタンの blur → 非同期 endViewingJourneys 呼び出し、safeHideModal を強化
(function () {
  'use strict';

  function safeClearInterval(name) {
    try {
      if (window[name]) {
        clearInterval(window[name]);
        window[name] = null;
        console.log('[routes-view.fix] cleared interval', name);
      }
    } catch (e) { console.warn('[routes-view.fix] clearInterval failed for', name, e); }
  }
  function safeClearTimeout(name) {
    try {
      if (window[name]) {
        clearTimeout(window[name]);
        window[name] = null;
        console.log('[routes-view.fix] cleared timeout', name);
      }
    } catch (e) { console.warn('[routes-view.fix] clearTimeout failed for', name, e); }
  }
  function safeRemoveLayer(layer) {
    if (!layer) return;
    try {
      if (typeof layer.clearLayers === 'function') {
        layer.clearLayers();
      }
    } catch (e) { /* ignore */ }
    try {
      if (window.map && typeof window.map.removeLayer === 'function' && window.map.hasLayer && window.map.hasLayer(layer)) {
        window.map.removeLayer(layer);
      }
    } catch (e) { /* ignore */ }
  }
  function safeOff(mapObj, eventName, handler) {
    try {
      if (mapObj && typeof mapObj.off === 'function') {
        if (handler) mapObj.off(eventName, handler);
        else mapObj.off(eventName);
      }
    } catch (e) { /* ignore */ }
  }

  // safeHideModal: モーダルを非表示にする前に、モーダル内にフォーカスが残っていれば外に移す
  // aria-hidden を付与する直前に再チェックして、もし残っていれば強制 blur() → 最終的に aria-hidden を付与する
  function safeHideModal(modalEl, returnFocusTo) {
    if (!modalEl) return;
    try {
      // 1) 優先: map にフォーカスを当てる（tabindex="-1" を想定）
      const tryFocusMap = () => {
        const mapEl = document.getElementById('map');
        if (mapEl) {
          if (!mapEl.hasAttribute('tabindex')) mapEl.setAttribute('tabindex', '-1');
          try { mapEl.focus(); } catch (e) { /* ignore */ }
        } else {
          try { document.body.focus && document.body.focus(); } catch (e) { /* ignore */ }
        }
      };

      // first attempt to remove focus from inside modal
      const active = document.activeElement;
      if (active && modalEl.contains(active)) {
        try {
          // blur the focused element first
          try { active.blur(); } catch (e) {}
          tryFocusMap();
        } catch (e) { /* ignore */ }
      }

      // If project's hideModal is available (the one from map-init.js), prefer it because it handles focus properly
      if (typeof hideModal === 'function') {
        try {
          hideModal(modalEl, returnFocusTo);
          return;
        } catch (e) {
          console.warn('[routes-view.fix] hideModal call failed, falling back to manual hide', e);
        }
      }

      // fallback: ensure focus is not inside modal before setting aria-hidden
      const finalizeHide = () => {
        try {
          const nowActive = document.activeElement;
          if (nowActive && modalEl.contains(nowActive)) {
            try { nowActive.blur(); } catch (e) {}
          }
          try { modalEl.setAttribute('aria-hidden', 'true'); } catch (e) {}
          try { modalEl.classList.add('hidden'); } catch (e) {}
          try { delete modalEl.dataset.returnFocusTo; } catch (e) {}
        } catch (err) {
          console.error('[routes-view.fix] finalizeHide error', err);
        }
      };

      // do a quick microtask delay to let blur/focus settle; if after that focus still inside, blur and finalize
      setTimeout(() => {
        try {
          const nowActive = document.activeElement;
          if (nowActive && modalEl.contains(nowActive)) {
            try { nowActive.blur(); } catch (e) {}
          }
          finalizeHide();
        } catch (err) { console.error('[routes-view.fix] safeHideModal setTimeout error', err); finalizeHide(); }
      }, 0);
    } catch (err) {
      console.error('[routes-view.fix] safeHideModal error', err);
    }
  }

  function endViewingJourneys() {
    console.log('[routes-view.fix] endViewingJourneys called');

    try {
      // 1) clear intervals / timeouts (候補名)
      ['__journeyRefreshInterval', '__journeyRefreshTimeout', '__journeyPollInterval', '__routesRefreshInterval', '__allRoutesInterval', 'allRoutesInterval'].forEach(safeClearInterval);
      ['__journeyRefreshTimeout', '__journeyTimeout', '__routesTimeout', 'allRoutesTimeout'].forEach(safeClearTimeout);

      // 2) remove known journey-related layers (候補名)
      const layerCandidates = [
        'allRoutesLayer', 'journeyLayer', 'routesLayer', 'routesGroup', 'viewingLayer', 'journeyMarkerLayer', 'allJourneysLayer', 'allRoutesGroup'
      ];
      layerCandidates.forEach(name => {
        try {
          if (window[name]) {
            safeRemoveLayer(window[name]);
            window[name] = null;
            console.log('[routes-view.fix] removed layer', name);
          }
        } catch (e) { console.warn('[routes-view.fix] remove layer failed', name, e); }
      });

      // 3) clear arrays of markers if present
      try {
        if (Array.isArray(window.journeyMarkers) && window.journeyMarkers.length) {
          window.journeyMarkers.forEach(m => { try { if (m && typeof m.remove === 'function') m.remove(); } catch (e) {} });
          window.journeyMarkers = [];
          console.log('[routes-view.fix] cleared journeyMarkers array');
        }
      } catch (e) { /* ignore */ }

      // 4) remove event handlers from map used by this feature (候補)
      try {
        if (window._journeyClickHandler) { safeOff(window.map, 'click', window._journeyClickHandler); window._journeyClickHandler = null; console.log('[routes-view.fix] off _journeyClickHandler'); }
        if (window._journeyMoveHandler) { safeOff(window.map, 'move', window._journeyMoveHandler); window._journeyMoveHandler = null; console.log('[routes-view.fix] off _journeyMoveHandler'); }
        if (window._allRoutesHandlers && Array.isArray(window._allRoutesHandlers)) {
          window._allRoutesHandlers.forEach(h => { try { safeOff(window.map, h.event, h.handler); } catch (e) {} });
          window._allRoutesHandlers = null;
        }
      } catch (e) { console.warn('[routes-view.fix] removing map handlers failed', e); }

      // 5) reset feature flags
      try {
        window.isViewingJourneys = false;
        window.viewingAllRoutes = false;
        window._isViewingJourneys = false;
      } catch (e) { /* ignore */ }

      // 6) hide / close the allRoutesModal using safeHideModal
      try {
        const allRoutesEl = document.getElementById('allRoutesModal');
        if (allRoutesEl) {
          safeHideModal(allRoutesEl, document.getElementById('allRoutesBtn') || document.getElementById('searchBtn') || document.body);
          console.log('[routes-view.fix] hid allRoutesModal');
        }
      } catch (e) { /* ignore */ }

      // 7) restore UI buttons state (enable triggers)
      try {
        const btns = ['allRoutesBtn', 'viewAllJourneysBtn', 'openRoutesViewBtn', 'routesViewOpenBtn', 'closeAllRoutesBtn'];
        btns.forEach(id => {
          const b = document.getElementById(id);
          if (b) { b.disabled = false; b.classList && b.classList.remove('disabled'); }
        });
      } catch (e) { /* ignore */ }

      // 8) remove any overlay elements created by the feature
      try {
        const extras = document.querySelectorAll('.routes-view-minimized, #allRoutesModal, .all-routes-modal');
        extras.forEach(el => safeHideModal(el, document.getElementById('allRoutesBtn') || document.body));
      } catch (e) {}

      console.log('[routes-view.fix] viewing journeys fully ended');
      return true;
    } catch (err) {
      console.error('[routes-view.fix] endViewingJourneys error', err);
      return false;
    }
  }

  // Bind only to the concrete button you provided
  function bindCloseAllRoutesBtn() {
    try {
      const btn = document.getElementById('closeAllRoutesBtn');
      if (!btn) {
        console.log('[routes-view.fix] closeAllRoutesBtn not found at bind time');
        return;
      }
      // avoid double-binding
      if (btn.__routesViewFixBound) return;
      btn.__routesViewFixBound = true;

      btn.addEventListener('click', function (e) {
        try { e.preventDefault(); } catch (ex) {}

        // 1) まずボタン自身のフォーカスを外す（これが最も重要）
        try { btn.blur(); } catch (e) {}

        // 2) 少しだけ非同期にして既存のハンドラやブラウザのフォーカス処理が落ち着くのを待つ
        setTimeout(() => {
          // 3) 2重保険として map にフォーカス（tabindex="-1" が必要）
          try {
            const mapEl = document.getElementById('map');
            if (mapEl) { if (!mapEl.hasAttribute('tabindex')) mapEl.setAttribute('tabindex', '-1'); try { mapEl.focus(); } catch (err) {} }
            else { try { document.activeElement && document.activeElement.blur(); } catch (e) {} }
          } catch (e) {}
          // 4) 実際の終了処理を呼ぶ
          endViewingJourneys();
        }, 0);
      }, { passive: true });
      console.log('[routes-view.fix] bound handler to #closeAllRoutesBtn');
    } catch (e) {
      console.error('[routes-view.fix] bindCloseAllRoutesBtn error', e);
    }
  }

  // MutationObserver to bind if button is added later
  function startObserver() {
    try {
      if (window._routesViewFixObserver) return;
      const observer = new MutationObserver((mutations) => {
        bindCloseAllRoutesBtn();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window._routesViewFixObserver = observer;
    } catch (e) { /* ignore */ }
  }

  // Expose for manual calling
  window.endViewingJourneys = endViewingJourneys;

  // init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindCloseAllRoutesBtn();
      startObserver();
    });
  } else {
    bindCloseAllRoutesBtn();
    startObserver();
  }
})();
