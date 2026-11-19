const workMotion = (() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Map();

  function play(element, kind = "update") {
    if (!element || reduced.matches || !element.getClientRects().length) return;
    active.get(element)?.cancel();
    const frames = kind === "screen"
      ? [{ opacity: 0.58, transform: "translateY(7px)" }, { opacity: 1, transform: "none" }]
      : [{ opacity: 0.7 }, { opacity: 1 }];
    const animation = element.animate(frames, {
      duration: kind === "screen" ? 200 : 170,
      easing: "cubic-bezier(0.18, 0.72, 0.28, 1)",
    });
    active.set(element, animation);
    const clear = () => {
      if (active.get(element) === animation) active.delete(element);
    };
    animation.onfinish = clear;
    animation.oncancel = clear;
  }

  reduced.addEventListener("change", ({ matches }) => {
    if (matches) for (const animation of active.values()) animation.cancel();
  });
  return { play };
})();
