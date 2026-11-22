/* Shared, optional enhancements for the English and Spanish CV pages. */
(() => {
  'use strict';

  const root = document.documentElement;
  const spanish = root.lang.startsWith('es');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const mobile = window.matchMedia('(max-width: 760px)');
  const hero = document.querySelector('.hero');
  const labels = spanish ? {
    openMenu: 'Abrir menú', closeMenu: 'Cerrar menú',
    filters: 'Filtrar premios', all: 'Todos', international: 'Internacional', national: 'Nacional',
    results: (count, total) => `${count} de ${total} premios visibles`
  } : {
    openMenu: 'Open menu', closeMenu: 'Close menu',
    filters: 'Filter awards', all: 'All', international: 'International', national: 'National',
    results: (count, total) => `${count} of ${total} awards shown`
  };

  root.classList.add('js');

  function listenToMedia(query, callback) {
    if (query.addEventListener) query.addEventListener('change', callback);
    else query.addListener(callback);
  }

  function initTheme() {
    const button = document.querySelector('.theme-toggle');
    const isDark = () => root.dataset.theme === 'dark' ||
      (!root.dataset.theme && systemTheme.matches);

    function updateTheme() {
      button.classList.toggle('is-dark', isDark());
      window.dispatchEvent(new Event('themechange'));
    }

    button.addEventListener('click', () => {
      const theme = isDark() ? 'light' : 'dark';
      root.dataset.theme = theme;
      try { localStorage.setItem('theme', theme); }
      catch (error) { /* The chosen theme still works for this page. */ }
      updateTheme();
    });
    listenToMedia(systemTheme, updateTheme);
    window.addEventListener('storage', (event) => {
      if (event.key !== 'theme' && event.key !== null) return;
      if (event.newValue === 'dark' || event.newValue === 'light') {
        root.dataset.theme = event.newValue;
      } else {
        delete root.dataset.theme;
      }
      updateTheme();
    });
    updateTheme();
    button.hidden = false;
  }

  function initMenu() {
    const nav = document.querySelector('.nav');
    const button = nav.querySelector('.menu-toggle');
    const panel = nav.querySelector('.nav-sections');

    function setOpen(open, restoreFocus = false) {
      nav.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? labels.closeMenu : labels.openMenu);
      if (open) panel.querySelector('a').focus();
      if (restoreFocus) button.focus();
    }

    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      if (mobile.matches && panel.contains(link)) {
        const section = document.getElementById(link.hash.slice(1));
        if (section) {
          section.setAttribute('tabindex', '-1');
          section.focus({ preventScroll: true });
        }
      }
      setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false, true);
      }
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && nav.classList.contains('is-open')) {
        setOpen(false, panel.contains(document.activeElement));
      }
    });
    document.addEventListener('focusin', (event) => {
      if (!nav.contains(event.target)) setOpen(false);
    });
    listenToMedia(mobile, () => {
      // Avoid leaving keyboard focus inside a panel that has just collapsed.
      const restoreFocus = mobile.matches && panel.contains(document.activeElement);
      setOpen(false, restoreFocus);
    });
    button.hidden = false;
    nav.classList.add('menu-ready');
  }

  function initReveals() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return () => {};
    const elements = [...document.querySelectorAll('.item, .hl, .fact, .about p')];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });

    elements.forEach((element) => {
      const siblings = [...element.parentElement.children];
      const stagger = (siblings.indexOf(element) % 4) * 55;
      element.style.setProperty('--reveal-delay', `${stagger}ms`);
      observer.observe(element);
      element.classList.add('reveal', 'reveal-pending');
      // Once revealed, return hover feedback to its short, unstaggered timing.
      element.addEventListener('transitionend', (event) => {
        if (event.target === element && event.propertyName === 'opacity' &&
            !element.classList.contains('reveal-pending')) {
          element.classList.remove('reveal');
          element.style.removeProperty('--reveal-delay');
        }
      });
    });

    function finish() {
      observer.disconnect();
      elements.forEach((element) => {
        element.classList.remove('reveal', 'reveal-pending');
        element.style.removeProperty('--reveal-delay');
      });
    }
    listenToMedia(reducedMotion, () => { if (reducedMotion.matches) finish(); });
    return finish;
  }

  function initCounters() {
    const counters = [...document.querySelectorAll('.highlights .num')].map((element) => {
      const original = element.textContent;
      const parts = original.match(/^(\s*)(\d+)([\s\S]*)$/);
      return parts ? { element, original, prefix: parts[1], value: Number(parts[2]), suffix: parts[3], frame: 0 } : null;
    }).filter(Boolean);
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return () => {};

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const counter = counters.find((item) => item.element === entry.target);
        const start = performance.now();
        counter.element.textContent = `${counter.prefix}0${counter.suffix}`;
        function tick(now) {
          const progress = Math.min((now - start) / 1100, 1);
          const value = Math.round(counter.value * (1 - Math.pow(1 - progress, 3)));
          counter.element.textContent = progress < 1 ?
            `${counter.prefix}${value}${counter.suffix}` : counter.original;
          counter.frame = progress < 1 ? requestAnimationFrame(tick) : 0;
        }
        counter.frame = requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach((counter) => observer.observe(counter.element));

    function finishCounter(counter) {
      cancelAnimationFrame(counter.frame);
      counter.frame = 0;
      counter.element.textContent = counter.original;
    }
    function finish() {
      observer.disconnect();
      counters.forEach(finishCounter);
    }
    listenToMedia(reducedMotion, () => { if (reducedMotion.matches) finish(); });
    document.addEventListener('visibilitychange', () => {
      // Finish only running counters; unseen counters still animate on their first visit.
      if (document.hidden) counters.filter((counter) => counter.frame).forEach(finishCounter);
    });
    return finish;
  }

  function initAwards() {
    const section = document.getElementById(spanish ? 'premios' : 'awards');
    const list = section.querySelector('.items');
    const items = [...list.querySelectorAll('.item')];
    const content = document.createElement('div');
    const filters = document.createElement('div');
    const status = document.createElement('p');
    content.className = 'awards-content';
    filters.className = 'award-filters';
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', labels.filters);
    status.className = 'sr-only filter-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-atomic', 'true');
    list.id = 'awards-list';

    [labels.all, labels.international, labels.national].forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-chip';
      button.textContent = label;
      button.setAttribute('aria-pressed', String(index === 0));
      button.setAttribute('aria-controls', list.id);
      button.addEventListener('click', () => {
        filters.querySelectorAll('button').forEach((chip) => {
          chip.setAttribute('aria-pressed', String(chip === button));
        });
        items.forEach((item) => {
          const tags = [...item.querySelectorAll('.tag')].map((tag) => tag.textContent.trim());
          item.hidden = index !== 0 && !tags.includes(label);
        });
        status.textContent = labels.results(items.filter((item) => !item.hidden).length, items.length);
        window.dispatchEvent(new Event('contentchange'));
      });
      filters.append(button);
    });
    list.before(content);
    content.append(filters, status, list);
  }

  function initScroll() {
    const progress = document.querySelector('.scroll-progress');
    const back = document.querySelector('.back-to-top');
    const header = document.querySelector('.topbar');
    const links = [...document.querySelectorAll('.nav .sec')];
    const sections = [...document.querySelectorAll('section.block[id]')];
    let frame = 0;

    function update() {
      frame = 0;
      const height = root.scrollHeight - window.innerHeight;
      const fraction = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
      progress.style.transform = `scaleX(${fraction})`;
      const headerBottom = header.getBoundingClientRect().bottom;
      const pastHero = hero.getBoundingClientRect().bottom <= headerBottom;
      // Keep a focused button available until keyboard focus moves away.
      back.hidden = !pastHero && document.activeElement !== back;
      const marker = headerBottom + (window.innerHeight - headerBottom) * 0.25;
      let current = '';
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= marker && rect.bottom > headerBottom) current = section.id;
      });
      links.forEach((link) => {
        const active = link.hash === `#${current}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('contentchange', schedule);
    window.addEventListener('pageshow', schedule);
    back.addEventListener('blur', schedule);
    back.addEventListener('click', () => {
      document.querySelector('.brand').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
    update();
  }

  function initFlow() {
    const canvas = hero.querySelector('.hero-flow');
    // Without an observer, leave the decorative canvas blank rather than run off-screen.
    if (!('IntersectionObserver' in window)) return;
    let context;
    let width = 0;
    let height = 0;
    let particles = [];
    let colors = [];
    let frame = 0;
    let previousTime = 0;
    let flowTime = 0;
    let visible = false;
    let printing = false;

    function readColors() {
      const style = getComputedStyle(root);
      colors = [style.getPropertyValue('--accent').trim(), style.getPropertyValue('--navy').trim()];
      if (context) context.clearRect(0, 0, width, height);
    }

    function resetParticle(particle, randomAge = false) {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
      particle.age = randomAge ? Math.random() * 240 : 0;
      particle.life = 240 + Math.random() * 240;
      return particle;
    }

    function resize() {
      if (!context) return;
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(350, Math.max(36, Math.round(width * height / 2400)));
      particles = Array.from({ length: count }, (_, index) => resetParticle({ color: index % 2 }, true));
    }

    function draw(now) {
      frame = 0;
      // Thirty frames per second are enough for this slow, decorative motion.
      if (previousTime && now - previousTime < 1000 / 30) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const step = previousTime ? Math.min((now - previousTime) / (1000 / 30), 2) : 1;
      previousTime = now;
      flowTime += step * 0.003;
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = `rgba(0, 0, 0, ${1 - Math.pow(0.992, step)})`;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
      context.lineWidth = 1.2;

      colors.forEach((color, colorIndex) => {
        context.beginPath();
        context.strokeStyle = color;
        particles.forEach((particle) => {
          if (particle.color !== colorIndex) return;
          const x = particle.x;
          const y = particle.y;
          // A smooth, slowly varying vector field suggests fluid streamlines.
          const angle = Math.sin(x / 230 + flowTime) * 0.8 +
            Math.cos(y / 160 - flowTime * 0.7) * 0.7 +
            Math.sin((x + y) / 290 + flowTime * 0.5) * 0.35;
          particle.x += Math.cos(angle) * 0.7 * step;
          particle.y += Math.sin(angle) * 0.7 * step;
          particle.age += step;
          context.moveTo(x, y);
          context.lineTo(particle.x, particle.y);
          if (particle.x < 0 || particle.x > width || particle.y < 0 ||
              particle.y > height || particle.age > particle.life) resetParticle(particle);
        });
        context.stroke();
      });
      frame = requestAnimationFrame(draw);
    }

    function sync() {
      const shouldRun = visible && !document.hidden && !reducedMotion.matches && !printing;
      if (!shouldRun) {
        cancelAnimationFrame(frame);
        frame = 0;
        previousTime = 0;
        return;
      }
      if (!context) {
        try { context = canvas.getContext('2d'); }
        catch (error) { return; }
        if (!context) return;
        readColors();
        resize();
      }
      if (!frame) frame = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    });
    observer.observe(hero);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('themechange', readColors);
    document.addEventListener('visibilitychange', sync);
    listenToMedia(reducedMotion, sync);
    window.addEventListener('beforeprint', () => { printing = true; sync(); });
    window.addEventListener('afterprint', () => { printing = false; sync(); });
    window.addEventListener('pagehide', () => { visible = false; sync(); });
    window.addEventListener('pageshow', () => {
      const rect = hero.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < window.innerHeight;
      sync();
    });
  }

  initTheme();
  initMenu();
  const finishReveals = initReveals();
  const finishCounters = initCounters();
  initAwards();
  initScroll();
  initFlow();

  function preparePrint() {
    // Print the original numbers, including if the dialog opens mid-animation.
    finishCounters();
    finishReveals();
  }
  window.addEventListener('beforeprint', preparePrint);
  const printButton = document.querySelector('.print-button');
  printButton.addEventListener('click', () => {
    preparePrint();
    window.print();
  });
  printButton.hidden = false;
})();
