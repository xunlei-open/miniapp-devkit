// Local development bootstrap: must work without the dev server.
(function () {
  var shown = false;
  var disconnected = false;
  var reloaded = false;
  var monitoring = false;
  var timer;
  var active;
  var probeUrl = document.currentScript.getAttribute('data-miniapp-dev-probe');
  function showDisconnected() {
    disconnected = true;
    // Keep an already-loaded application usable while reconnecting silently.
    if (monitoring) return;
    if (shown) return;
    shown = true;
    function showMessage() {
      var notice = document.createElement('div');
      notice.setAttribute('role', 'alert');
      notice.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:radial-gradient(ellipse at top,#eef2ff,#f8fafc 65%);color:#475569;font:14px/1.7 system-ui,sans-serif;text-align:center';
      var card = document.createElement('div');
      card.style.cssText = 'max-width:360px;padding:24px 28px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:0 8px 32px #0f172a08';
      card.textContent = '似乎与 dev server 断开了连接，正在尝试重新连接…';
      notice.appendChild(card);
      document.body.appendChild(notice);
    }
    if (document.body) showMessage();
    else document.addEventListener('DOMContentLoaded', showMessage, { once: true });
  }
  function probeConnection() {
    if (reloaded) return;
    // Bound each attempt to one second; ignore results from cancelled attempts.
    if (active) {
      active.abort();
      showDisconnected();
    }
    var controller = new AbortController();
    active = controller;
    fetch(probeUrl, {
      cache: 'no-store',
      headers: { Accept: 'text/x-vite-ping' },
      signal: controller.signal,
    }).then(function (response) {
      if (active !== controller || reloaded) return;
      active = null;
      if (response.status !== 204) {
        showDisconnected();
      } else if (disconnected) {
        reloaded = true;
        clearInterval(timer);
        window.location.reload();
      } else if (!monitoring) {
        // A reachable server means the module failed for another reason.
        clearInterval(timer);
        timer = undefined;
      }
    }).catch(function () {
      if (active !== controller || reloaded) return;
      active = null;
      showDisconnected();
    });
  }
  function startRecovery() {
    if (timer !== undefined || reloaded) return;
    timer = setInterval(probeConnection, 1000);
    probeConnection();
  }
  // Start network requests after the host can observe the local page's load event.
  window.addEventListener('load', function () {
    setTimeout(function () {
      var pending = Array.from(document.querySelectorAll('script[data-miniapp-dev-src]'));
      function loadNext() {
        var placeholder = pending.shift();
        if (shown) return;
        if (!placeholder) {
          monitoring = true;
          startRecovery();
          return;
        }
        var script = document.createElement('script');
        for (var attr of placeholder.attributes) {
          if (attr.name !== 'type' && attr.name !== 'data-miniapp-dev-src') script.setAttribute(attr.name, attr.value);
        }
        script.type = 'module';
        script.src = placeholder.getAttribute('data-miniapp-dev-src');
        script.addEventListener('load', loadNext, { once: true });
        script.addEventListener('error', startRecovery, { once: true });
        placeholder.replaceWith(script);
      }
      loadNext();
    }, 0);
  }, { once: true });
})();
