import type { MyShare } from "@/api/types";

const KEY = "arena-my-shares";

function accountId() {
  try {
    const account = JSON.parse(localStorage.getItem("arena-account") ?? "null") as {
      id?: string;
    } | null;
    return account?.id || "local";
  } catch {
    return "local";
  }
}

function bucket(): Record<string, MyShare[]> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw as Record<string, MyShare[]>;
  } catch {
    return {};
  }
}

function write(items: MyShare[]) {
  const all = bucket();
  all[accountId()] = items;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function loadRememberedShares(): MyShare[] {
  const items = bucket()[accountId()];
  return Array.isArray(items) ? items : [];
}

export function rememberShare(share: MyShare) {
  write([share, ...loadRememberedShares().filter((item) => item.id !== share.id)]);
}

export function rememberRevoked(id: string) {
  const revokedAt = new Date().toISOString();
  write(
    loadRememberedShares().map((item) =>
      item.id === id ? { ...item, revoked_at: item.revoked_at ?? revokedAt } : item,
    ),
  );
}
