import { useState } from "react";
import { LogOut, Trash2, Shield, Sun, Moon, Monitor, Star, Mail } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { LANGUAGES } from "./i18n.js";
import { PLAY_STORE_LISTING_URL, SUPPORT_EMAIL } from "../aboutApp.js";

/**
 * Account, membership, and preferences in one sheet.
 *
 * Signed out, this is the sign-in form — reachable on demand rather than
 * blocking the app on launch. Signed in, it is a short list of facts plus the
 * controls Play requires to be reachable in-app (subscription management and
 * permanent account deletion).
 */

function AuthForm({ t, isBusy, status, error, onSignIn, onSignUp, onGoogle, onForgot, googleEnabled }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const isSignIn = mode === "sign-in";
  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && (isSignIn || name.trim().length > 0);

  return (
    <>
      <div className="pl-segment" role="group" aria-label={t("account.title")}>
        <button type="button" aria-pressed={isSignIn} onClick={() => setMode("sign-in")}>
          {t("account.signIn")}
        </button>
        <button type="button" aria-pressed={!isSignIn} onClick={() => setMode("sign-up")}>
          {t("account.signUp")}
        </button>
      </div>

      <div className="pl-field">
        <label className="pl-label" htmlFor="account-email">
          {t("account.email")}
        </label>
        <input
          id="account-email"
          className="pl-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {!isSignIn && (
        <div className="pl-field">
          <label className="pl-label" htmlFor="account-name">
            {t("account.name")}
          </label>
          <input
            id="account-name"
            className="pl-input"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      )}

      <div className="pl-field">
        <label className="pl-label" htmlFor="account-password">
          {t("account.password")}
        </label>
        <input
          id="account-password"
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
        disabled={isBusy || !canSubmit}
        onClick={() =>
          isSignIn ? onSignIn(email.trim(), password) : onSignUp(email.trim(), password, name.trim())
        }
      >
        {isSignIn ? t("account.signIn") : t("account.signUp")}
      </button>

      {googleEnabled && (
        <>
          <p className="pl-meta" style={{ textAlign: "center" }}>
            {t("account.or")}
          </p>
          <button
            type="button"
            className="pl-btn pl-btn--block"
            disabled={isBusy}
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
          disabled={isBusy || !email.trim()}
          onClick={() => onForgot(email.trim())}
        >
          {t("account.forgot")}
        </button>
      )}
    </>
  );
}

function Preferences({ t, lang, setLang, themeMode, setThemeMode }) {
  const themes = [
    ["system", Monitor, t("account.theme.system")],
    ["light", Sun, t("account.theme.light")],
    ["dark", Moon, t("account.theme.dark")],
  ];

  return (
    <>
      <div className="pl-field">
        <span className="pl-label" id="pref-lang">
          {t("account.language")}
        </span>
        <div className="pl-segment" role="group" aria-labelledby="pref-lang">
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              aria-pressed={lang === item.code}
              onClick={() => setLang(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pl-field">
        <span className="pl-label" id="pref-theme">
          {t("account.theme")}
        </span>
        <div className="pl-segment" role="group" aria-labelledby="pref-theme">
          {themes.map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={themeMode === value}
              onClick={() => setThemeMode(value)}
            >
              <Icon size={15} aria-hidden="true" style={{ marginRight: 6 }} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Account({
  t,
  lang,
  setLang,
  themeMode,
  setThemeMode,
  open,
  onClose,
  accountState,
  hasAuthSession,
  isAuthBusy,
  authStatus,
  authError,
  googleEnabled,
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  resetPasswordForEmail,
  signOut,
  deleteAccountPermanently,
  onUpgrade,
  onRestore,
  billingMessage,
  billingBusy,
  quotaSummary,
}) {
  return (
    <Sheet open={open} title={t("account.title")} closeLabel={t("nav.close")} onClose={onClose}>
      {hasAuthSession ? (
        <>
          <dl className="pl-facts">
            <div className="pl-fact">
              <dt>{t("account.email")}</dt>
              <dd>{accountState.email || "—"}</dd>
            </div>
            <div className="pl-fact">
              <dt>{t("account.plan")}</dt>
              <dd>{accountState.plan || "Free"}</dd>
            </div>
            <div className="pl-fact">
              <dt>{t("account.quota")}</dt>
              <dd>{quotaSummary}</dd>
            </div>
          </dl>

          {billingMessage && (
            <div className="pl-notice" role="status">
              {billingMessage}
            </div>
          )}

          <div className="pl-actions">
            <button
              type="button"
              className="pl-btn pl-btn--primary"
              onClick={() => onUpgrade("Pro")}
              disabled={billingBusy}
            >
              {t("account.upgradePro")}
            </button>
            <button
              type="button"
              className="pl-btn"
              onClick={() => onUpgrade("Business")}
              disabled={billingBusy}
            >
              {t("account.upgradeBusiness")}
            </button>
            <button type="button" className="pl-btn" onClick={onRestore} disabled={billingBusy}>
              {t("account.restore")}
            </button>
          </div>
        </>
      ) : (
        <AuthForm
          t={t}
          isBusy={isAuthBusy}
          status={authStatus}
          error={authError}
          googleEnabled={googleEnabled}
          onSignIn={signInWithPassword}
          onSignUp={signUpWithPassword}
          onGoogle={signInWithGoogle}
          onForgot={resetPasswordForEmail}
        />
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)" }} />

      <Preferences
        t={t}
        lang={lang}
        setLang={setLang}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)" }} />

      <section aria-labelledby="about-promptlab-title">
        <h3 className="pl-eyebrow" id="about-promptlab-title">
          {t("about.title")}
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            padding: "var(--s-3) 0",
          }}
        >
          <img
            src="/icons/icon-512.png"
            alt="PromptLab app icon"
            width="40"
            height="40"
            style={{ borderRadius: "var(--r-sm)" }}
          />
          <p className="pl-hint" style={{ margin: 0 }}>
            {t("about.blurb")}
          </p>
        </div>

        <div className="pl-actions">
          <a
            className="pl-btn pl-btn--sm"
            href={PLAY_STORE_LISTING_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Star size={15} aria-hidden="true" />
            {t("about.rate")}
          </a>
          <a
            className="pl-btn pl-btn--quiet pl-btn--sm"
            href={`mailto:${SUPPORT_EMAIL}`}
            aria-label={`Contact support by email at ${SUPPORT_EMAIL}`}
          >
            <Mail size={15} aria-hidden="true" />
            {t("account.help")}
          </a>
        </div>
      </section>

      <div className="pl-actions">
        <a className="pl-btn pl-btn--quiet pl-btn--sm" href="/privacy">
          <Shield size={15} aria-hidden="true" />
          {t("account.privacy")}
        </a>
        <a className="pl-btn pl-btn--quiet pl-btn--sm" href="/terms">
          {t("account.terms")}
        </a>
        <a className="pl-btn pl-btn--quiet pl-btn--sm" href="/privacy/delete-account">
          {t("about.deleteHelp")}
        </a>
      </div>

      {hasAuthSession && (
        <>
          <button type="button" className="pl-btn pl-btn--block" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" />
            {t("account.signOut")}
          </button>

          <div>
            <button
              type="button"
              className="pl-btn pl-btn--danger pl-btn--block"
              onClick={deleteAccountPermanently}
              disabled={billingBusy}
            >
              <Trash2 size={16} aria-hidden="true" />
              {t("account.delete")}
            </button>
            <p className="pl-hint" style={{ paddingTop: "var(--s-2)" }}>
              {t("account.deleteHint")}
            </p>
          </div>
        </>
      )}
    </Sheet>
  );
}
