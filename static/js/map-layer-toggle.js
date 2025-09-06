// map-layer-toggle.js
// Adds "マップ表示を切り替える" button to the side drawer and toggles between Carto light and OSM standard tiles.

(function () {
  'use strict';

  // ensure this runs after DOM and after map-init has created window.map and window.baseTileLayer
  function whenReady(fn, attempts = 0) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => whenReady(fn, 0));
      return;
    }
    if (!window.map || typeof L === 'undefined') {
      if (attempts < 40) {
        setTimeout(() => whenReady(fn, attempts + 1), 100);
        return;
      }
      console.warn('[map-layer-toggle] map or Leaflet not ready; aborting initialization');
      return;
    }
    fn();
  }

  function createToggleButton() {
    const btn = document.createElement('button');
    btn.id = 'mapToggleBtn';
    btn.className = 'unified-btn'; // reuse your existing button style
    btn.textContent = 'マップ表示を切り替える';
    btn.style.display = 'block';
    btn.style.width = '100%';
    btn.style.marginTop = '8px';
    btn.style.boxSizing = 'border-box';
    return btn;
  }

  function init() {
    // Create tile layers (carto will attempt to reuse window.baseTileLayer if present)
    let cartoLayer = window.baseTileLayer || null;
    const BOUNDS = (window.map && window.map.options && window.map.options.maxBounds) ? window.map.options.maxBounds : null;

    if (!cartoLayer) {
      try {
        cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          minZoom: 12, maxZoom: 18, bounds: BOUNDS || undefined, noWrap: true,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        });
      } catch (e) {
        console.warn('[map-layer-toggle] failed to create cartoLayer', e);
      }
    }

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });

    // set initial state
    window.currentMapStyle = window.currentMapStyle || (cartoLayer && window.map && window.map.hasLayer && window.map.hasLayer(cartoLayer) ? 'carto' : 'carto');

    // ensure that if baseTileLayer exists but not added to map (rare), add it
    if (cartoLayer && window.map && !(window.map.hasLayer && window.map.hasLayer(cartoLayer))) {
      try { cartoLayer.addTo(window.map); } catch (e) { /* ignore */ }
    }

    function switchTo(style) {
      if (!window.map) return;
      if (style === 'osm') {
        try {
          if (cartoLayer && window.map.hasLayer && window.map.hasLayer(cartoLayer)) window.map.removeLayer(cartoLayer);
        } catch (e) { /* ignore */ }
        try { if (!window.map.hasLayer || !window.map.hasLayer(osmLayer)) osmLayer.addTo(window.map); } catch (e) { /* ignore */ }
        window.currentMapStyle = 'osm';
        console.log('[map-layer-toggle] switched to OSM');
      } else {
        // carto
        try { if (window.map.hasLayer && window.map.hasLayer(osmLayer)) window.map.removeLayer(osmLayer); } catch (e) {}
        try { if (cartoLayer && (!(window.map.hasLayer && window.map.hasLayer(cartoLayer)))) cartoLayer.addTo(window.map); } catch (e) {}
        window.currentMapStyle = 'carto';
        console.log('[map-layer-toggle] switched to Carto light');
      }
    }

    // Create UI and bind
    const drawer = document.getElementById('drawer');
    const btn = createToggleButton();

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // toggle
      const next = (window.currentMapStyle === 'osm') ? 'carto' : 'osm';
      switchTo(next);
      // optional: give immediate visual feedback (toggle an aria-pressed)
      try { btn.setAttribute('aria-pressed', (window.currentMapStyle === 'osm') ? 'true' : 'false'); } catch (e) {}
    }, { passive: true });

    if (drawer) {
      // append to drawer content area — try to place near existing controls
      drawer.appendChild(btn);
    } else {
      // fallback: add to top-right container if drawer not present
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '12px';
      container.style.right = '12px';
      container.style.zIndex = 1000;
      container.appendChild(btn);
      document.body.appendChild(container);
    }

    // set initial aria-pressed
    try { btn.setAttribute('aria-pressed', (window.currentMapStyle === 'osm') ? 'true' : 'false'); } catch (e) {}

    // expose switch function if other code needs it
    window.setMapStyle = function (style) {
      if (style !== 'osm' && style !== 'carto') return;
      switchTo(style);
    };

    console.log('[map-layer-toggle] initialized, current style:', window.currentMapStyle);
  }

  whenReady(init);
})();
