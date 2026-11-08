/**
 * Zero-SaaS, Privacy-First Analytics Tracker (track.js)
 * Completely eliminates Google Analytics, Cloudflare Web Analytics, and cookies.
 * Fires a lightweight POST request on page load to the self-hosted /api/analytics/track endpoint.
 * Client IP is immediately hashed with a daily salt by the server and never stored.
 */
(function() {
  'use strict';

  function sendBeacon() {
    try {
      var apiEndpoint = window.STREAMING_INTEL_API || '/api/analytics/track';
      var payload = JSON.stringify({
        page: window.location.pathname + window.location.search,
        ref: document.referrer || '',
        ua: navigator.userAgent || ''
      });

      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(apiEndpoint, blob);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', apiEndpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payload);
      }
    } catch (e) {
      // Fail silently to never degrade user experience
    }
  }

  if (document.readyState === 'complete') {
    sendBeacon();
  } else {
    window.addEventListener('load', sendBeacon);
  }
})();
