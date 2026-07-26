import { useState } from "react";
import { ArrowRight, Sparkles, UserRound } from "lucide-react";

/**
 * Full-screen auth gate shown once after language selection.
 * Guests continue without email via anonymous trial session.
 */
export default function AuthGate({
  t,
  isBusy,
  status,
  error,
  onSignIn,
  onSignUp,
  onGoogle,
  onForgot,
  onGuest,
  googleEnabled,
}) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);

  const isSignIn = mode === "sign-in";
  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && (isSignIn || name.trim().length > 0);

  async function handleGuest() {
    if (guestBusy || isBusy) return;
    setGuestBusy(true);
    try {
      await onGuest?.();
    } finally {
      setGuestBusy(false);
    }
  }

  return (
    <main className="pl-firstrun pl-authgate" data-stage="auth">
      <section className="pl-firstrun-card" aria-labelledby="auth-title">
        <span className="pl-firstrun-mark" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <p className="pl-eyebrow">{t("app.name")}</p>
        <h1 id="auth-title">{t("auth.gate.title")}</h1>
        <p className="pl-firstrun-lede">{t("auth.gate.lede")}</p>

        <div className="pl-segment" role="group" aria-label={t("account.title")}>
          <button type="button" aria-pressed={isSignIn} onClick={() => setMode("sign-in")}>
            {t("account.signIn")}
          </button>
          <button type="button" aria-pressed={!isSignIn} onClick={() => setMode("sign-up")}>
            {t("account.signUp")}
          </button>
        </div>

        <div className="pl-field">
          <label className="pl-label" htmlFor="gate-email">
            {t("account.email")}
          </label>
          <input
            id="gate-email"
            className="pl-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {!isSignIn && (
          <div className="pl-field">
            <label className="pl-label" htmlFor="gate-name">
              {t("account.name")}
            </label>
            <input
              id="gate-name"
              className="pl-input"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        <div className="pl-field">
          <label className="pl-label" htmlFor="gate-password">
            {t("account.password")}
          </label>
          <input
            id="gate-password"
            className="pl-input"
            type="password"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="pl-hint">{t("account.passwordHint")}</p>
        </div>

        {error && (
          <div className="pl-notice pl-notice--danger" role="alert">
            {error}
          </div>
        )}
        {status && !error && <p className="pl-meta">{status}</p>}

        <button
          type="button"
          className="pl-btn pl-btn--primary pl-btn--block"
          disabled={isBusy || guestBusy || !canSubmit}
          onClick={() =>
            isSignIn
              ? onSignIn(email.trim(), password)
              : onSignUp(email.trim(), password, name.trim())
          }
        >
          {isSignIn ? t("account.signIn") : t("account.signUp")}
          <ArrowRight size={17} aria-hidden="true" />
        </button>

        {googleEnabled && (
          <>
            <p className="pl-meta" style={{ textAlign: "center" }}>
              {t("account.or")}
            </p>
            <button
              type="button"
              className="pl-btn pl-btn--block"
              disabled={isBusy || guestBusy}
              onClick={onGoogle}
            >
              {t("account.google")}
            </button>
          </>
        )}

        {isSignIn && (
          <button
            type="button"
            className="pl-btn pl-btn--quiet pl-btn--sm"
            disabled={isBusy || guestBusy || !email.trim()}
            onClick={() => onForgot(email.trim())}
          >
            {t("account.forgot")}
          </button>
        )}

        <div className="pl-authgate-guest">
          <button
            type="button"
            className="pl-btn pl-btn--block"
            disabled={isBusy || guestBusy}
            onClick={handleGuest}
          >
            <UserRound size={17} aria-hidden="true" />
            {guestBusy ? t("auth.gate.guestBusy") : t("auth.gate.guest")}
          </button>
          <p className="pl-hint">{t("auth.gate.guestHint")}</p>
        </div>
      </section>
    </main>
  );
}
