/** Dados da cliente guardados só no aparelho dela, para agendar mais rápido. */
const KEY = "sb_client";

export type SavedClient = { name?: string; phone?: string; cardName?: string };

export function loadClient(): SavedClient {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedClient) : {};
  } catch {
    return {};
  }
}

export function saveClient(patch: SavedClient) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadClient(), ...patch }));
  } catch {
    /* navegador sem armazenamento: segue sem lembrar */
  }
}
