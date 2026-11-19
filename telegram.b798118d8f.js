const telegramWorks = (() => {
  "use strict";

  const query = new URLSearchParams(location.search);
  const fromTelegram = query.get("via") === "telegram";
  let app = null;
  let navigateBack = null;
  let canGoBack = false;
  let modalOpen = false;

  function syncBack() {
    if (canGoBack || modalOpen) app?.BackButton?.show();
    else app?.BackButton?.hide();
  }

  function hasLaunchFragment(hash) {
    return /(?:^|[&#])tgWebApp(?:Data|Platform|Version)=/.test(hash);
  }

  function init() {
    const sdk = window.Telegram?.WebApp;
    if (!sdk?.platform || sdk.platform === "unknown") return;
    app = sdk;
    document.documentElement.classList.add("telegram-app");

    function updateInsets() {
      for (const side of ["top", "right", "bottom", "left"]) {
        const system = Number(sdk.safeAreaInset?.[side]) || 0;
        const content = Number(sdk.contentSafeAreaInset?.[side]) || 0;
        const pixels = Math.max(0, system, content);
        document.documentElement.style.setProperty(`--telegram-${side}`, `${pixels}px`);
      }
    }

    if (hasLaunchFragment(location.hash)) {
      const address = new URL(location.href);
      address.hash = "";
      history.replaceState(history.state, "", address);
    }
    sdk.ready();
    sdk.expand();
    if (sdk.isVersionAtLeast("6.9")) {
      sdk.setHeaderColor?.("#15181b");
      sdk.setBackgroundColor?.("#101214");
    }
    if (sdk.isVersionAtLeast("7.7")) sdk.disableVerticalSwipes?.();
    if (sdk.isVersionAtLeast("8.0")) {
      sdk.onEvent("safeAreaChanged", updateInsets);
      sdk.onEvent("contentSafeAreaChanged", updateInsets);
    }
    updateInsets();
    sdk.BackButton?.onClick(() => navigateBack?.());
    syncBack();
  }

  if (fromTelegram || hasLaunchFragment(location.hash)) {
    if (window.Telegram?.WebApp) init();
    else {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-web-app.js";
      script.addEventListener("load", init, { once: true });
      document.head.append(script);
    }
  }

  if (fromTelegram) {
    for (const link of document.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href");
      if (href !== "index.html" && !href.startsWith("?")) continue;
      const address = new URL(href, location.href);
      address.searchParams.set("via", "telegram");
      link.href = address.href;
    }
  }

  document.addEventListener("click", (event) => {
    if (!app || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[target='_blank']");
    if (!link || link.protocol !== "https:") return;
    event.preventDefault();
    if (link.hostname === "t.me") app.openTelegramLink(link.href);
    else app.openLink(link.href);
  });

  return {
    get via() { return fromTelegram || app ? "telegram" : null; },
    hasLaunchFragment,
    onBack(callback) { navigateBack = callback; },
    setDialog(open) {
      modalOpen = open;
      syncBack();
    },
    setBack(available) {
      canGoBack = available;
      syncBack();
    },
  };
})();
