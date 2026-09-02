(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;
  if (/^(localhost|127\.0\.0\.1|::1)$/.test(window.location.hostname)) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(function () {
      // The game remains fully playable online if installation is unavailable.
    });
  });
})();
