/**
 * store.js — слой данных и состояния.
 *
 * Сейчас всё хранится в localStorage (fallback-режим, работает без бэкенда).
 * TODO(supabase): когда появится Supabase — заменить функции login()/saveState()/loadState()
 *   на вызовы supabase.auth (анонимный вход по имени) и таблицы:
 *     profiles (id, name, color, points, streak, last_active_day)
 *     progress (user_id, topic_id, best_score, captured, attempts)
 *   Интерфейс наружу (getState, login, submitAttempt) менять не придётся.
 */

const STORAGE_KEY = 'knowledge-wars:v1';

export const COLORS = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#c084fc'];

/** Захардкоженные соперники для лидерборда. TODO(supabase): заменить реальными профилями. */
const RIVALS = [
  { id: 'r1', name: 'NeoMatrix', points: 4820, color: '#22d3ee', captured: 14 },
  { id: 'r2', name: 'Ksenia_Pro', points: 4310, color: '#f472b6', captured: 12 },
  { id: 'r3', name: 'IntegralBoss', points: 3990, color: '#a3e635', captured: 11 },
  { id: 'r4', name: 'ZeroDivide', points: 3120, color: '#fbbf24', captured: 9 },
  { id: 'r5', name: 'Logarifmich', points: 2480, color: '#c084fc', captured: 7 },
];

/** Клетки, изначально занятые соперниками. TODO(duels): отбивать их в реальном PvP-матче. */
const RIVAL_CELLS = {
  '0-0': 'r1', '0-4': 'r2', '4-0': 'r3', '4-4': 'r4', '2-4': 'r5',
};

const START_CELL = '2-2';

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function emptyState() {
  return { user: null, progress: {} };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return { user: parsed.user ?? null, progress: parsed.progress ?? {} };
  } catch {
    return emptyState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Не удалось сохранить состояние', e);
  }
}

export function getState() {
  return state;
}

export function isLoggedIn() {
  return Boolean(state.user);
}

export function login(name) {
  const clean = String(name || '').trim().slice(0, 24);
  if (!clean) throw new Error('Введите имя');
  const existing = state.user;
  state.user = {
    id: existing?.id ?? 'me',
    name: clean,
    color: existing?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    points: existing?.points ?? 0,
    streak: existing?.streak ?? 1,
    lastActiveDay: existing?.lastActiveDay ?? todayKey(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  touchStreak();
  saveState();
  return state.user;
}

export function logout() {
  state = emptyState();
  saveState();
}

/** Обновляет streak: +1 если заходил вчера, сброс если пропустил день. */
export function touchStreak() {
  const user = state.user;
  if (!user) return;
  const today = todayKey();
  if (user.lastActiveDay === today) return;
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  user.streak = user.lastActiveDay === yesterday ? user.streak + 1 : 1;
  user.lastActiveDay = today;
  saveState();
}

export function getProgress(topicId) {
  return state.progress[topicId] ?? { best: 0, captured: false, attempts: 0 };
}

export function isCaptured(topicId) {
  return getProgress(topicId).captured;
}

export function rivalOwner(cellKey) {
  return RIVAL_CELLS[cellKey] ?? null;
}

export function isStartCell(cellKey) {
  return cellKey === START_CELL;
}

export function rivalById(id) {
  return RIVALS.find((r) => r.id === id) ?? null;
}

/**
 * Сохраняет результат прохождения темы.
 * 4/5 (80%) и выше → клетка захвачена, прогресс 100%.
 * TODO(supabase): upsert в таблицу progress + RPC инкремента очков.
 */
export function submitAttempt(topicId, correct, total) {
  const pct = Math.round((correct / total) * 100);
  const prev = getProgress(topicId);
  const captured = pct >= 80 ? true : prev.captured;
  const next = {
    best: Math.max(prev.best, pct),
    captured,
    attempts: prev.attempts + 1,
  };
  state.progress[topicId] = next;

  if (state.user) {
    // Очки: 20 за правильный ответ + 150 бонус за захват клетки.
    let gained = correct * 20;
    if (captured && !prev.captured) gained += 150;
    state.user.points += gained;
    touchStreak();
    saveState();
    return { pct, captured, gained, justCaptured: captured && !prev.captured };
  }
  saveState();
  return { pct, captured, gained: 0, justCaptured: false };
}

export function capturedCount() {
  return Object.values(state.progress).filter((p) => p.captured).length;
}

/** Топ-10: соперники + текущий пользователь. */
export function leaderboard() {
  const rows = RIVALS.map((r) => ({ ...r, isMe: false }));
  if (state.user) {
    rows.push({
      id: state.user.id,
      name: state.user.name,
      points: state.user.points,
      color: state.user.color,
      captured: capturedCount(),
      isMe: true,
    });
  }
  return rows.sort((a, b) => b.points - a.points).slice(0, 10);
}

export function resetAll() {
  state = emptyState();
  saveState();
}