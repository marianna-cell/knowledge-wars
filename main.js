/** main.js — роутер и каркас приложения. */
import { el, initials } from './ui.js';
import * as store from './store.js';
import { LoginView, MapView, QuizView, ProfileView, LeaderboardView } from './views.js';

const app = document.getElementById('app');
let route = { view: 'map' };

function go(next) {
  route = next;
  render();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function render() {
  if (!store.isLoggedIn()) {
    app.replaceChildren(LoginView({ onDone: () => go({ view: 'map' }) }));
    return;
  }

  store.touchStreak();
  const user = store.getState().user;
  const navItems = [
    ['map', 'Карта'],
    ['profile', 'Профиль'],
    ['leaderboard', 'Лидеры'],
  ];

  const nav = el('nav', { class: 'nav', 'aria-label': 'Основная навигация' },
    ...navItems.map(([view, label]) =>
      el('button', {
        class: route.view === view || (view === 'map' && route.view === 'quiz') ? 'active' : '',
        type: 'button',
        onclick: () => go({ view }),
      }, label),
    ),
  );

  const topbar = el('header', { class: 'topbar' },
    el('div', { class: 'brand' },
      el('i', { class: 'dot' }), 'Knowledge ', el('span', { class: 'accent' }, 'Wars'),
    ),
    nav,
    el('div', { class: 'userchip' },
      el('i', { class: 'avatar', style: `background:${user.color};color:#04070f` }, initials(user.name)),
      el('span', {}, user.name),
      el('span', { class: 'mono', style: 'color:var(--cyan);font-weight:700' }, `${user.points}`),
    ),
  );

  let content;
  switch (route.view) {
    case 'quiz': content = QuizView({ go, topicId: route.topicId }); break;
    case 'profile': content = ProfileView({ go }); break;
    case 'leaderboard': content = LeaderboardView({ go }); break;
    default: content = MapView({ go });
  }

  app.replaceChildren(el('div', { class: 'shell' }, topbar, content));
}

render();

// PWA. В sandbox-превью (без allow-same-origin) доступ к navigator.serviceWorker бросает
// SecurityError — поэтому всё обёрнуто в try/catch.
window.addEventListener('load', () => {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  } catch {
    /* PWA недоступна в этом окружении */
  }
});