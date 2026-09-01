/**
 * The datastore ships as static JSON inside the site itself (public/data),
 * so there is no backend to talk to — just cached GETs.
 */

const BASE = import.meta.env.BASE_URL;

export function dataUrl(relativePath: string): string {
  return `${BASE.replace(/\/$/, '')}/data/${relativePath.replace(/^\//, '')}`;
}

export async function getJson<T>(relativePath: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(dataUrl(relativePath), { signal });
  if (!res.ok) {
    throw new Error(`Could not load ${relativePath} (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}
