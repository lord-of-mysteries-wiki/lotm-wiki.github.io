(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let directoryAnimation;

  // Directory scripts update the content before this delegated click runs.
  document.addEventListener('click', event => {
    const button = event.target.closest('.directory-tools button');
    if (!button || preference.matches) return;
    const list = document.querySelector('#character-list, #artifact-list');
    if (!list || typeof list.animate !== 'function') return;
    if (directoryAnimation) directoryAnimation.cancel();
    directoryAnimation = list.animate(
      [{ opacity: 0.84 }, { opacity: 1 }],
      { duration: 180, easing: 'ease-out' }
    );
  });
})();
