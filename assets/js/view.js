(function () {
  const root = document.documentElement;
  const themeSelect = document.querySelector('#theme');
  const plainToggle = document.querySelector('#plainToggle');
  const plainState = document.querySelector('#plainState');
  const currentThemeLabel = document.querySelector('#currentThemeLabel');
  const fontSizeValue = document.querySelector('#fontSizeValue');
  const viewMenu = document.querySelector('#viewMenu');

  const savedSize = Number(localStorage.getItem('roadtrip-size')) || 17;
  let baseSize = Math.min(22, Math.max(15, savedSize));

  function setBaseSize(nextSize) {
    baseSize = Math.min(22, Math.max(15, nextSize));
    root.style.setProperty('--base', baseSize + 'px');
    if (fontSizeValue) fontSizeValue.textContent = baseSize + 'px';
    localStorage.setItem('roadtrip-size', String(baseSize));
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    if (themeSelect) {
      themeSelect.value = theme;
      if (currentThemeLabel) {
        const selected = themeSelect.options[themeSelect.selectedIndex];
        currentThemeLabel.textContent = selected ? selected.text : theme;
      }
    }
    localStorage.setItem('roadtrip-theme', theme);
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  }

  function setPlain(on) {
    root.dataset.plain = on ? 'on' : 'off';
    if (plainToggle) plainToggle.setAttribute('aria-pressed', String(on));
    if (plainState) plainState.textContent = on ? 'On' : 'Off';
    localStorage.setItem('roadtrip-plain', on ? 'on' : 'off');
  }

  setBaseSize(baseSize);
  if (themeSelect) setTheme(root.dataset.theme || 'light');
  if (plainToggle) setPlain(root.dataset.plain !== 'off');

  themeSelect?.addEventListener('change', (event) => setTheme(event.target.value));
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    button.addEventListener('click', () => setTheme(button.dataset.themeChoice));
  });
  plainToggle?.addEventListener('click', () => setPlain(root.dataset.plain !== 'on'));
  document.querySelector('#fontUp')?.addEventListener('click', () => setBaseSize(baseSize + 1));
  document.querySelector('#fontDown')?.addEventListener('click', () => setBaseSize(baseSize - 1));

  if (viewMenu) {
    document.addEventListener('click', (event) => {
      if (viewMenu.open && !viewMenu.contains(event.target)) viewMenu.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && viewMenu.open) {
        viewMenu.open = false;
        viewMenu.querySelector('summary')?.focus();
      }
    });
  }

  const tocLinks = [...document.querySelectorAll('.field-guide .toc a[href^="#"]')];
  const tocSections = tocLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function setActiveSection(id) {
    tocLinks.forEach((link) => {
      const active = link.getAttribute('href') === '#' + id;
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    if (window.matchMedia('(max-width: 1024px)').matches) {
      const activeLink = tocLinks.find((link) => link.getAttribute('href') === '#' + id);
      activeLink?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  if ('IntersectionObserver' in window && tocSections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .15, .4] });

    tocSections.forEach((section) => sectionObserver.observe(section));
    setActiveSection(tocSections[0].id);
  }

  document.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;
    let button = pre.querySelector('.copy');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy';
      button.textContent = 'Copy';
      pre.appendChild(button);
    }
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        const old = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = old; }, 1200);
      } catch {
        button.textContent = 'Select text';
      }
    });
  });
})();
