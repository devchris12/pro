/**
 * Persist JWT in an httpOnly cookie via the session API (never in localStorage).
 */
export async function establishSession(accessToken: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to establish session");
  }
}

export async function clearSession(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
}

export async function checkSession(): Promise<boolean> {
  const res = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return false;
  const body = (await res.json()) as { authenticated?: boolean };
  return body.authenticated === true;
}
