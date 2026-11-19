/**
 * data.js — загрузка карточек.
 * Единственный источник контента: /data/topics.json (25 тем × 5 вопросов).
 * TODO(llm): сюда позже добавится генерация карточек через LLM API.
 */

let cache = null;

export async function loadTopics() {
  if (cache) return cache;
  const res = await fetch('/data/topics.json');
  if (!res.ok) throw new Error('Не удалось загрузить данные карточек');
  cache = await res.json();
  return cache;
}

export function cellKey(row, col) {
  return `${row}-${col}`;
}