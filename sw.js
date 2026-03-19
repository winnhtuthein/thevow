const CACHE = 'thevow-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

// Notification click — open app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const action = e.action;
  const vowId = e.notification.data?.vowId;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const url = vowId ? `/?action=${action}&vowId=${vowId}` : '/';
      if (cls.length > 0) {
        cls[0].focus();
        cls[0].postMessage({ action, vowId });
      } else {
        clients.openWindow(url);
      }
    })
  );
});

// Background sync for scheduled notifications
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_CHECK') {
    checkAndNotify(e.data.vows);
  }
});

async function checkAndNotify(vows) {
  if (!vows || vows.length === 0) return;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hour = now.getHours();

  for (const v of vows) {
    const answered = (v.history || []).some(h => h.date === today);
    if (answered) continue;
    if (hour < v.notifyHour) continue;

    const streak = calcStreak(v.history || []);
    const stmt = v.statement.length > 55 ? v.statement.slice(0, 55) + '…' : v.statement;

    const title = streak >= 7
      ? `Day ${streak + 1} — keep the streak`
      : streak > 0 ? `${streak}-day streak at stake`
      : 'Your vow awaits';

    const body = `You said you would ${stmt}. Did you today?`;

    await self.registration.showNotification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [150, 75, 150],
      data: { vowId: v.id },
      actions: [
        { action: 'HONOR', title: '✓ Honored it' },
        { action: 'BROKEN', title: '✗ Broke it' }
      ],
      requireInteraction: true,
      tag: `vow-${v.id}`
    });
  }
}

function calcStreak(history) {
  const today = new Date();
  const dayMap = {};
  history.forEach(h => dayMap[h.date] = h.kept);
  let streak = 0;
  let d = new Date(today);
  const todayStr = today.toISOString().split('T')[0];
  if (!dayMap[todayStr]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 9999; i++) {
    const key = d.toISOString().split('T')[0];
    if (dayMap[key] === true) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}
