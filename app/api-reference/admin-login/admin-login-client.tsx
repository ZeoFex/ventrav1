"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

type LoginUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  contactEmail: string | null;
  status: string | null;
  subscriptionStatus: string | null;
  createdAt: string | null;
};

type BusinessesPayload = {
  total: number;
  items: BusinessRow[];
  limit: number;
  offset: number;
};

function adminDisplayName(user: LoginUser): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return user.email;
}

export function AdminLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<LoginUser | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRow[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyList, setBusyList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticated = !!token && !!user;

  const loadPlatforms = useCallback(
    async (accessToken: string) => {
      setBusyList(true);
      setError(null);
      try {
        const res = await fetch("/api/platform/businesses?limit=500", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = (await res.json()) as BusinessesPayload & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setTotal(data.total);
        setBusinesses(data.items ?? []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load platforms";
        setError(msg);
        setBusinesses(null);
        setTotal(null);
      } finally {
        setBusyList(false);
      }
    },
    []
  );

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setToken(null);
    setUser(null);
    setBusinesses(null);
    setTotal(null);
    try {
      const res = await fetch("/api/superadmin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `HTTP ${res.status}`
        );
      }
      const accessToken = data.accessToken as string | undefined;
      const u = data.user as LoginUser | undefined;
      if (!accessToken || !u) {
        throw new Error("Unexpected response from login");
      }
      setToken(accessToken);
      setUser(u);
      await loadPlatforms(accessToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setBusinesses(null);
    setTotal(null);
    setError(null);
  };

  const docLinks = useMemo(
    () => [
      {
        label: "POST /api/superadmin/auth/login",
        href: "/api-reference#/paths/~1api~1superadmin~1auth~1login/post",
      },
      {
        label: "GET /api/platform/businesses",
        href: "/api-reference#/paths/~1api~1platform~1businesses/get",
      },
    ],
    []
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        padding: "1.75rem clamp(1rem, 4vw, 3rem)",
        fontFamily:
          'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: "#0f1419",
        color: "#e7ecf3",
        lineHeight: 1.5,
      }}
    >
      <header style={{ marginBottom: "1.75rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", opacity: 0.7 }}>
          API smoke test (contracts from{" "}
          <a href="/openapi.json" style={{ color: "#7dd3fc" }}>
            openapi.json
          </a>
          {" · "}
          <a href="/api-reference" style={{ color: "#7dd3fc" }}>
            reference UI
          </a>
          )
        </p>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 600 }}>
          Superadmin login → list platforms (businesses)
        </h1>
      </header>

      {!authenticated ? (
        <form
          onSubmit={onLogin}
          style={{
            maxWidth: "22rem",
            display: "grid",
            gap: "0.75rem",
            padding: "1.25rem",
            borderRadius: "10px",
            border: "1px solid #2a3441",
            background: "#171e27",
          }}
        >
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.25rem",
              padding: "0.55rem 0.85rem",
              borderRadius: "8px",
              border: "none",
              background: loading ? "#3d4f63" : "#38bdf8",
              color: loading ? "#94a3b8" : "#0f172a",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <section style={{ maxWidth: "42rem" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "1.2rem" }}>
            Welcome, {adminDisplayName(user!)}
          </p>
          <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", opacity: 0.75 }}>
            {user!.email}
          </p>
          <button
            type="button"
            onClick={logout}
            style={{
              marginBottom: "1.25rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #3d4f63",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>

          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
            Platforms ({total ?? "—"} tenants)
          </h2>
          {busyList && <p style={{ opacity: 0.75 }}>Loading businesses…</p>}
          {!busyList && businesses && businesses.length === 0 && (
            <p style={{ opacity: 0.75 }}>No businesses returned.</p>
          )}
          {!busyList && businesses && businesses.length > 0 && (
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: "0.65rem",
              }}
            >
              {businesses.map((b) => (
                <li
                  key={b.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #2a3441",
                    background: "#171e27",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "0.2rem" }}>
                    <span style={{ opacity: 0.6 }}>slug</span> {b.slug}
                    {b.plan != null ? (
                      <>
                        {" · "}
                        <span style={{ opacity: 0.6 }}>plan</span> {b.plan}
                      </>
                    ) : null}
                    {b.status != null ? (
                      <>
                        {" · "}
                        <span style={{ opacity: 0.6 }}>status</span> {b.status}
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {error ? (
        <p
          role="alert"
          style={{
            marginTop: "1.25rem",
            maxWidth: "36rem",
            padding: "0.65rem 0.85rem",
            borderRadius: "8px",
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.35)",
            color: "#fecaca",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </p>
      ) : null}

      <footer style={{ marginTop: "2.5rem", fontSize: "0.78rem", opacity: 0.55 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {docLinks.map((l) => (
            <a key={l.href} href={l.href} style={{ color: "#7dd3fc" }}>
              {l.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.5rem 0.65rem",
  borderRadius: "8px",
  border: "1px solid #2a3441",
  background: "#0f1419",
  color: "#e7ecf3",
  fontSize: "1rem",
};
