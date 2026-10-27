/* Phone-first navigation for the Study Workspace.
 * Page changes remain owned by js/core/events.js; this module only manages the mobile shell.
 */
(() => {
  const bottomNav = document.getElementById('mobileBottomNav');
  const panel = document.getElementById('moreMenuPanel');
  const backdrop = document.getElementById('moreMenuBackdrop');
  if (!bottomNav || !panel || !backdrop) return;

  const moreButton = bottomNav.querySelector('[data-more-open]');
  let lastFocused = null;

  const setOpen = (open) => {
    panel.hidden = !open;
    backdrop.hidden = !open;
    document.body.classList.toggle('more-menu-open', open);
    moreButton?.setAttribute('aria-expanded', String(open));
    if (open) {
      lastFocused = document.activeElement;
      panel.querySelector('[data-more-close]')?.focus({ preventScroll: true });
    } else if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
      lastFocused = null;
    }
  };

  const syncActive = () => {
    const activePage = document.querySelector('.page.active[id^="page-"]')?.id.replace('page-', '') || 'dashboard';
    bottomNav.querySelectorAll('[data-page]').forEach((item) => {
      const active = item.dataset.page === activePage;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    const hasDirectDestination = ['dashboard', 'courses'].includes(activePage);
    moreButton?.classList.toggle('active', !hasDirectDestination);
    panel.querySelectorAll('[data-page]').forEach((item) => {
      const active = item.dataset.page === activePage;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  };

  moreButton?.addEventListener('click', () => setOpen(panel.hidden));
  panel.querySelector('[data-more-close]')?.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));

  bottomNav.addEventListener('click', (event) => {
    const focusAction = event.target.closest('[data-mobile-focus]');
    if (focusAction) {
      document.getElementById('focusStart')?.click();
      return;
    }
  });

  document.addEventListener('click', (event) => {
    const destination = event.target.closest('[data-page]');
    if (destination && (bottomNav.contains(destination) || panel.contains(destination))) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      moreButton?.focus({ preventScroll: true });
    }
    if (event.key === 'Tab' && !panel.hidden) {
      const focusable = [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const observer = new MutationObserver(syncActive);
  document.querySelectorAll('.page[id^="page-"]').forEach((page) => {
    observer.observe(page, { attributes: true, attributeFilter: ['class'] });
  });
  syncActive();
})();
