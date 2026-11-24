(() => {
  const nav = document.querySelector('.pathway-sequences');
  if (!nav) return;
  const select = nav.querySelector('select');
  select.addEventListener('change', () => { location.hash = select.value; });
  const links = [...nav.querySelectorAll('a')];
  const update = id => {
    select.value = id;
    links.forEach(a => {
      if (a.hash === '#' + id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };
  const sections = [...document.querySelectorAll('.pathway-sequence')];
  let pending = false;
  const track = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      let current = sections[0];
      for (const section of sections) if (section.getBoundingClientRect().top <= 170) current = section;
      update(current.id);
      pending = false;
    });
  };
  addEventListener('scroll', track, { passive: true });
  addEventListener('hashchange', track);
  track();
})();
