import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div style={{ maxWidth: 380, margin: "12vh auto 0" }}>
      <div className="card" style={{ padding: "32px 36px" }}>
        <div className="brand" style={{ color: "var(--ink)", padding: 0, marginBottom: 14 }}>
          <span className="brand-mark">T</span> TFA Books
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Enter the app password to open the books.
        </p>
        {error && (
          <div className="banner error" data-testid="error-banner">
            {error}
          </div>
        )}
        <form action={login} data-testid="login-form">
          <p>
            <input
              type="password"
              name="password"
              placeholder="App password"
              aria-label="App password"
              required
              style={{ width: "100%" }}
            />
          </p>
          <button type="submit" style={{ width: "100%" }}>
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
