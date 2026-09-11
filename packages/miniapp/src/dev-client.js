// Local development bootstrap: must work without the dev server.
(function () {
  var shown = false;
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (!target || target.tagName !== 'SCRIPT' || !target.hasAttribute('data-miniapp-dev-module') || shown) return;
    shown = true;
    function showMessage() {
      var notice = document.createElement('div');
      notice.setAttribute('role', 'alert');
      notice.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:radial-gradient(ellipse at top,#eef2ff,#f8fafc 65%);color:#475569;font:14px/1.7 system-ui,sans-serif;text-align:center';
      var card = document.createElement('div');
      card.style.cssText = 'max-width:360px;padding:24px 28px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:0 8px 32px #0f172a08';
      card.textContent = '请启动 dev server 后重新打开微应用';
      notice.appendChild(card);
      document.body.appendChild(notice);
    }
    if (document.body) showMessage();
    else document.addEventListener('DOMContentLoaded', showMessage, { once: true });
  }, true);
  // Start network requests after the host can observe the local page's load event.
  window.addEventListener('load', function () {
    setTimeout(function () {
      var pending = Array.from(document.querySelectorAll('script[data-miniapp-dev-src]'));
      function loadNext() {
        var placeholder = pending.shift();
        if (!placeholder || shown) return;
        var script = document.createElement('script');
        for (var attr of placeholder.attributes) {
          if (attr.name !== 'type' && attr.name !== 'data-miniapp-dev-src') script.setAttribute(attr.name, attr.value);
        }
        script.type = 'module';
        script.src = placeholder.getAttribute('data-miniapp-dev-src');
        script.addEventListener('load', loadNext, { once: true });
        placeholder.replaceWith(script);
      }
      loadNext();
    }, 0);
  }, { once: true });
})();
