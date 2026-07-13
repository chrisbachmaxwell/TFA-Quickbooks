import { requestLink } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <div style={{ maxWidth: 400, margin: "12vh auto 0" }}>
      <div className="card" style={{ padding: "32px 36px" }}>
        <div className="brand" style={{ color: "var(--ink)", padding: 0, marginBottom: 14 }}>
          <span className="brand-mark">T</span> TFA Books
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Enter your email and we&apos;ll send you a sign-in link. No password
          needed.
        </p>
        {error && (
          <div className="banner error" data-testid="error-banner">
            {error}
          </div>
        )}
        {sent && (
          <div className="banner success" data-testid="sent-banner">
            {sent}
          </div>
        )}
        <form action={requestLink} data-testid="login-form">
          <p>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              aria-label="Email address"
              required
              style={{ width: "100%" }}
            />
          </p>
          <button type="submit" style={{ width: "100%" }}>
            Email me a sign-in link
          </button>
        </form>
      </div>
    </div>
  );
}
