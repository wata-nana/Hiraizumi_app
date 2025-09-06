// journey-style.js
// - road-like polyline + arrow markers + number badges for journey pins
// Usage:
//   const latlngs = window.journeyMarkers.map(m => m.getLatLng());
//   window.drawJourneyRoute && window.drawJourneyRoute(latlngs);

(function () {
  'use strict';

  // utility: degrees from dy/dx
  function radToDeg(rad) { return rad * 180 / Math.PI; }
  function calcAngle(a, b) {
    const dy = b.lat - a.lat;
    const dx = b.lng - a.lng;
    // note: Leaflet lat/lng: lat is y, lng is x. atan2 uses (y, x)
    return radToDeg(Math.atan2(dy, dx));
  }
  function midpoint(a, b) {
    return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  }

  // create an SVG arrow as a DivIcon, rotated via inline style
  function createArrowIcon(angleDeg, color = '#2b76c6') {
    // simple filled arrow SVG pointing to the right (0deg). We'll rotate it.
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="12" viewBox="0 0 28 12" style="display:block; transform: rotate(' + angleDeg + 'deg);">',
      '<defs>',
      '<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.25"/></filter>',
      '</defs>',
      '<g filter="url(#shadow)">',
      '<path d="M2 6 L18 6 L14 2 L16 0 L26 6 L16 12 L14 10 L18 6 L2 6 Z" fill="' + color + '"/>',
      '</g>',
      '</svg>'
    ].join('');
    return L.divIcon({
      className: 'journey-arrow-icon',
      html: svg,
      iconSize: [28, 12],
      iconAnchor: [14, 6] // center
    });
  }

  // number badge icon (small circle with number)
  function createNumberIcon(n) {
    const html = '<div class="journey-number-badge">' + (Number.isFinite(n) ? n : '') + '</div>';
    return L.divIcon({
      className: 'journey-number-icon',
      html: html,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  // remove old route layers (if any)
  function clearExistingRouteGroup() {
    try {
      if (window.journeyRouteLayerGroup && window.map) {
        if (window.map.hasLayer && window.map.hasLayer(window.journeyRouteLayerGroup)) {
          window.map.removeLayer(window.journeyRouteLayerGroup);
        }
        window.journeyRouteLayerGroup.clearLayers && window.journeyRouteLayerGroup.clearLayers();
      }
    } catch (e) { console.warn('[journey-style] clearExistingRouteGroup failed', e); }
    window.journeyRouteLayerGroup = L.layerGroup();
  }

  // main draw function: latlngs = [{lat, lng}, ...] or array of L.LatLng
  function drawJourneyRoute(latlngs, options = {}) {
    if (!window.map) {
      console.warn('[journey-style] map not ready');
      return;
    }
    if (!Array.isArray(latlngs) || latlngs.length < 2) {
      // nothing to draw
      console.warn('[journey-style] need at least 2 points to draw route');
      return;
    }

    // defaults
    const opts = Object.assign({
      baseColor: '#1e3a8a',       // dark outer line
      centerColor: '#5bb0ff',     // center stripe
      baseWeight: 10,
      centerWeight: 4,
      arrowColor: '#2b76c6',
      showNumbers: true
    }, options);

    // clear previous
    clearExistingRouteGroup();

    const map = window.map;
    const latlngObjs = latlngs.map(p => (p && p.lat !== undefined ? p : L.latLng(p))); // ensure objects

    // draw base "road" (thicker dark line)
    const baseLine = L.polyline(latlngObjs, {
      color: opts.baseColor,
      weight: opts.baseWeight,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.95
    });

    // draw center stripe (narrow lighter line)
    const centerLine = L.polyline(latlngObjs, {
      color: opts.centerColor,
      weight: opts.centerWeight,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 1
    });

    window.journeyRouteLayerGroup.addLayer(baseLine);
    window.journeyRouteLayerGroup.addLayer(centerLine);

    // arrows for each segment
    for (let i = 0; i < latlngObjs.length - 1; i++) {
      const a = latlngObjs[i];
      const b = latlngObjs[i + 1];
      const mid = midpoint(a, b);
      const angle = calcAngle(a, b); // degrees
      const arrowIcon = createArrowIcon(angle, opts.arrowColor);
      const arrowMarker = L.marker([mid.lat, mid.lng], { icon: arrowIcon, interactive: false });
      window.journeyRouteLayerGroup.addLayer(arrowMarker);
    }

    // numbered badges at each point (optionally)
    if (opts.showNumbers) {
      for (let i = 0; i < latlngObjs.length; i++) {
        const p = latlngObjs[i];
        const numIcon = createNumberIcon(i + 1);
        // place a badge marker slightly offset upwards so it doesn't completely overlap pin
        const badge = L.marker([p.lat, p.lng], {
          icon: numIcon,
          interactive: false,
          keyboard: false
        });
        window.journeyRouteLayerGroup.addLayer(badge);
      }
    }

    // add group to map
    window.journeyRouteLayerGroup.addTo(map);

    // expose helper to clear
    window.clearJourneyRoute = function () {
      try {
        if (window.journeyRouteLayerGroup && window.map && window.map.hasLayer && window.map.hasLayer(window.journeyRouteLayerGroup)) {
          window.map.removeLayer(window.journeyRouteLayerGroup);
        }
        window.journeyRouteLayerGroup = L.layerGroup();
      } catch (e) { /* ignore */ }
    };

    console.log('[journey-style] route drawn with', latlngObjs.length, 'points');
    return window.journeyRouteLayerGroup;
  }

  // expose in window
  window.drawJourneyRoute = drawJourneyRoute;

  // automatic convenience: if window.journeyMarkers exists, draw route once DOM + map ready
  function tryAutoDraw() {
    try {
      if (!window.map) return;
      if (Array.isArray(window.journeyMarkers) && window.journeyMarkers.length >= 2) {
        const pts = window.journeyMarkers.map(m => (m && typeof m.getLatLng === 'function') ? m.getLatLng() : null).filter(Boolean);
        if (pts.length >= 2) {
          drawJourneyRoute(pts);
        }
      }
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(tryAutoDraw, 200); // slight delay to let map-init finish
    });
  } else {
    setTimeout(tryAutoDraw, 200);
  }

})();
