'use strict';
(() => {
  const options = document.querySelector('[data-stage-options]');
  if (options) {
    const sections = [...document.querySelectorAll('[data-stage]')];
    const entries = [...document.querySelectorAll('[data-event-years]')];
    function updateStage() {
      const chosen = [...options.querySelectorAll('a')].find(link => link.hash === location.hash);
      const year = chosen?.hash.slice(6);
      for (const section of sections) section.hidden = !!year && !section.dataset.stage.split(' ').includes(year);
      for (const entry of entries) entry.hidden = !!year && !!entry.dataset.eventYears && !entry.dataset.eventYears.split(' ').includes(year);
      options.hidden = !chosen;
      const index = document.querySelector('#event-index');
      if (index) index.hidden = !!chosen;
      for (const link of document.querySelectorAll('.stage-switch a, [data-stage-options] a')) {
        const selected = link === chosen || link.hasAttribute(chosen ? 'data-by-year' : 'data-all');
        if (selected) link.setAttribute('aria-current','true');
        else link.removeAttribute('aria-current');
      }
      if (chosen || location.hash === '#all-events') window.scrollTo(0,0);
      else if (location.hash.startsWith('#event-')) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    }
    window.addEventListener('hashchange',updateStage);
    updateStage();
  }
})();
