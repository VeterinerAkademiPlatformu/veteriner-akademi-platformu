/* Sidebar disclosure behavior. Page navigation remains owned by js/core/events.js. */
(() => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const groups = [...sidebar.querySelectorAll('[data-nav-group]')];
  const setGroupOpen = (group, open) => {
    const toggle = group?.querySelector('.nav-group-toggle');
    const panel = group?.querySelector('.nav-submenu');
    if (!toggle || !panel) return;
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };

  groups.forEach(group => {
    const toggle = group.querySelector('.nav-group-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
      groups.forEach(other => { if (other !== group) setGroupOpen(other, false); });
      setGroupOpen(group, willOpen);
    });
  });

  // The central event handler changes the active page first; this listener
  // then opens its containing section without duplicating navigation logic.
  document.addEventListener('click', event => {
    const courseShortcut = event.target.closest('.course-study-shortcut[data-page]');
    if (courseShortcut?.dataset.page === 'questions') {
      const courseInput = document.getElementById('quizCourse');
      if (courseInput) courseInput.value = courseShortcut.dataset.courseName || '';
    }
    const pageButton = event.target.closest('.nav-item[data-page]');
    if (!pageButton || !sidebar.contains(pageButton)) return;
    const parentGroup = pageButton.closest('[data-nav-group]');
    if (parentGroup) {
      groups.forEach(group => setGroupOpen(group, group === parentGroup));
    }
  });

  const revealActiveDestination = () => {
    const active = sidebar.querySelector('.nav-item.active[data-page]');
    const activeGroup = active?.closest('[data-nav-group]');
    if (activeGroup) groups.forEach(group => setGroupOpen(group, group === activeGroup));
  };

  // Keep grouped destinations visible even when another component navigates
  // programmatically through the existing go(page) function.
  const activeObserver = new MutationObserver(revealActiveDestination);
  sidebar.querySelectorAll('.nav-item[data-page]').forEach(item => {
    activeObserver.observe(item, { attributes: true, attributeFilter: ['class'] });
  });
  revealActiveDestination();
})();
