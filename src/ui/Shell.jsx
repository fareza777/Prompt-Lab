import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, User, HelpCircle } from "lucide-react";
import { makeTranslator, detectLanguage, persistLanguage, hasStoredLanguage } from "./i18n.js";
import FirstRun from "./FirstRun.jsx";
import Guide from "./Guide.jsx";
import { humanizeApiError } from "./errors.js";
import { readThemeMode, applyThemeMode, watchSystemScheme, resolveScheme } from "./theme.js";
import Composer from "./Composer.jsx";
import Result from "./Result.jsx";
import Starters from "./Starters.jsx";
import History from "./History.jsx";
import Account from "./Account.jsx";
import Improve from "./Improve.jsx";
import Compare from "./Compare.jsx";
import Report from "./Report.jsx";
import { getRecordRestoreState } from "./contentRecord.js";

/**
 * The application shell — one canvas, with everything secondary arriving as a
 * sheet. This replaces the previous five-destination layout (Builder,
 * Optimizer, Templates, Library, Compare), which split a single job across
 * five screens and made the user carry text between them by hand.
 */

const FIRST_RUN_KEY = "promptlab-onboarded";

function readFirstRunDone() {
  try {
    return localStorage.getItem(FIRST_RUN_KEY) === "1";
  } catch {
    return true; // No storage: never trap the user on a screen we cannot dismiss.
  }
}

function writeFirstRunDone(done) {
  try {
    if (done) localStorage.setItem(FIRST_RUN_KEY, "1");
    else localStorage.removeItem(FIRST_RUN_KEY);
  } catch {
    /* ignore */
  }
}

export default function Shell(props) {
  const {
    narrative,
    setNarrative,
    prompt,
    setPrompt,
    metrics,
    attachments,
    addAttachments,
    removeAttachment,
    maxAttachments,
    createFinishedResult,
    isGenerating,
    errorMessage,
    warningMessage,
    setErrorMessage,
    setWarningMessage,
    category,
    setCategory,
    tone,
    setTone,
    model,
    setModel,
    outputType,
    setOutputType,
    templates,
    setBuilderFromTemplate,
    filteredLibrary,
    search,
    setSearch,
    deleteLibraryItem,
    duplicateLibraryItem,
    setSelectedLibraryId,
    librarySyncStatus,
    copyText,
    copied,
    savePrompt,
    exportFile,
    exportStatus,
    entitlements,
    accountState,
    hasAuthSession,
    isAuthBusy,
    authStatus,
    authError,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    signOut,
    deleteAccountPermanently,
    requestMembershipUpgrade,
    restorePlayPurchases,
    billingMessage,
    billingBusy,
    googleEnabled,
    quotaSummary,
    runOutput,
    setRunOutput,
    isRunning,
    runError,
    optimizePrompt,
    isOptimizing,
    optimizerResult,
    optimizerError,
    optimizerWarning,
    clearOptimizerResult,
    comparePrompts,
    compareResult,
    isComparing,
    compareError,
    compareWarning,
    setCompareA,
    setCompareB,
    actionToast,
    apiBase,
    getAuthHeaders,
    trialRemaining,
    weeklyAllowance,
    isAdmin,
    onOpenAdmin,
  } = props;

  const [lang, setLangState] = useState(detectLanguage);
  const [themeMode, setThemeModeState] = useState(readThemeMode);
  const [sheet, setSheet] = useState(null);
  const [firstRunDone, setFirstRunDone] = useState(readFirstRunDone);
  // The language screen only appears when nothing has been chosen or detected
  // before; a returning user is never asked again.
  const [languageChosen, setLanguageChosen] = useState(hasStoredLanguage);
  const [previousPrompt, setPreviousPrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [reportContent, setReportContent] = useState("");

  const t = useMemo(() => makeTranslator(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    applyThemeMode(themeMode);
    if (themeMode !== "system") return undefined;
    return watchSystemScheme(() => applyThemeMode("system"));
  }, [themeMode]);

  const setLang = useCallback((next) => {
    persistLanguage(next);
    setLangState(next);
  }, []);

  const setThemeMode = useCallback((next) => {
    setThemeModeState(applyThemeMode(next));
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  // A fresh result invalidates the "saved" affordance.
  useEffect(() => {
    setSaved(false);
  }, [runOutput]);

  const hasResult = Boolean(String(runOutput || "").trim());
  const isLocalOnly = !hasAuthSession || !accountState?.userId;

  const handleGenerate = useCallback(async () => {
    setPreviousPrompt("");
    setRunOutput?.("");
    await createFinishedResult?.();
  }, [createFinishedResult, setRunOutput]);

  const handleSave = useCallback(
    (payload) => {
      if (savePrompt(payload, narrative)) setSaved(true);
    },
    [savePrompt, narrative]
  );

  const openImprove = useCallback(() => {
    clearOptimizerResult?.();
    setSheet("improve");
  }, [clearOptimizerResult]);

  const runImprove = useCallback((mode) => optimizePrompt(prompt, mode), [optimizePrompt, prompt]);

  const applyImprove = useCallback(() => {
    if (!optimizerResult) return;
    setPreviousPrompt(prompt);
    setPrompt(optimizerResult);
    clearOptimizerResult?.();
    setSheet(null);
  }, [optimizerResult, prompt, setPrompt, clearOptimizerResult]);

  const openCompare = useCallback(() => {
    setCompareA?.(previousPrompt);
    setCompareB?.(prompt);
    setSheet("compare");
  }, [setCompareA, setCompareB, previousPrompt, prompt]);

  /** A message about a previous generation must not outlive that generation. */
  const clearMessages = useCallback(() => {
    setErrorMessage?.("");
    setWarningMessage?.("");
  }, [setErrorMessage, setWarningMessage]);

  const openHistoryItem = useCallback(
    (item) => {
      const restored = getRecordRestoreState(item);
      setSelectedLibraryId?.(item.id);
      setPrompt(restored.prompt);
      setRunOutput?.(restored.output);
      setPreviousPrompt("");
      clearMessages();
      setSheet(null);
    },
    [setSelectedLibraryId, setPrompt, setRunOutput, clearMessages]
  );

  const pickStarter = useCallback(
    (template) => {
      setBuilderFromTemplate(template);
      setPreviousPrompt("");
      clearMessages();
    },
    [setBuilderFromTemplate, clearMessages]
  );

  const trialNotice = useMemo(() => {
    const remaining = hasAuthSession ? weeklyAllowance?.remaining : trialRemaining;
    if (remaining == null) return null;
    if (remaining <= 0) return { tone: "warn", text: t("trial.over"), hint: t("trial.overHint") };
    if (remaining === 1) return { tone: "warn", text: t("trial.lastOne") };
    return { tone: "plain", text: t("trial.left", { n: remaining }) };
  }, [hasAuthSession, trialRemaining, weeklyAllowance, t]);

  const allowanceRemaining = hasAuthSession ? weeklyAllowance?.remaining : trialRemaining;
  const trialExhausted = allowanceRemaining != null && allowanceRemaining <= 0;

  const finishFirstRun = useCallback(() => {
    writeFirstRunDone(true);
    setFirstRunDone(true);
    setLanguageChosen(true);
  }, []);

  const replayFirstRun = useCallback(() => {
    setSheet(null);
    writeFirstRunDone(false);
    setFirstRunDone(false);
  }, []);

  if (!firstRunDone) {
    return (
      <FirstRun
        t={t}
        lang={languageChosen ? lang : null}
        onPickLanguage={(code) => {
          setLang(code);
          setLanguageChosen(true);
        }}
        onFinish={finishFirstRun}
      />
    );
  }

  return (
    <div className="pl-shell">
      <a className="pl-skip" href="#pl-main">
        {t("nav.skip")}
      </a>

      <header className="pl-top">
        <p className="pl-brand">
          {t("app.name")} <span>{t("app.tagline")}</span>
        </p>
        <div className="pl-top-actions">
          {isAdmin && (
            <button type="button" className="pl-btn pl-btn--quiet pl-btn--sm" onClick={onOpenAdmin}>
              Admin
            </button>
          )}
          <button
            type="button"
            className="pl-icon-btn"
            onClick={() => setSheet("guide")}
            aria-label={t("guide.title")}
          >
            <HelpCircle size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pl-icon-btn"
            onClick={() => setSheet("history")}
            aria-label={t("nav.history")}
          >
            <Clock size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pl-icon-btn"
            onClick={() => setSheet("account")}
            aria-label={t("nav.account")}
          >
            <User size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="pl-main" id="pl-main">
        <div
          className={`pl-workbench${hasResult || isGenerating || isRunning ? " is-result-mode" : ""}`}
        >
          <aside className="pl-intro">
            <p className="pl-eyebrow">{t("canvas.eyebrow")}</p>
            <div className="pl-lede">
              <h1>{t("canvas.hero")}</h1>
              <p>{t("canvas.subtitle")}</p>
            </div>
            {!hasResult && !isGenerating && (
              <Starters t={t} templates={templates} onPick={pickStarter} />
            )}
          </aside>

          <section className="pl-work-column" aria-label={t("canvas.title")}>
            {trialNotice && (
              <div
                className={trialNotice.tone === "warn" ? "pl-notice pl-notice--warn" : "pl-notice"}
                role="status"
              >
                <span>
                  {trialNotice.text}
                  {trialNotice.hint ? ` ${trialNotice.hint}` : ""}
                </span>
              </div>
            )}

            <div className="pl-composer-tray">
              <div className="pl-tray-core">
                <Composer
                  t={t}
                  narrative={narrative}
                  setNarrative={setNarrative}
                  attachments={attachments}
                  addAttachments={addAttachments}
                  removeAttachment={removeAttachment}
                  maxAttachments={maxAttachments}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating || isRunning}
                  category={category}
                  setCategory={setCategory}
                  tone={tone}
                  setTone={setTone}
                  model={model}
                  setModel={setModel}
                  outputType={outputType}
                  setOutputType={setOutputType}
                  errorMessage={humanizeApiError(errorMessage, t)}
                  warningMessage={humanizeApiError(warningMessage, t)}
                  disabled={trialExhausted}
                  disabledReason={trialExhausted ? t("trial.overHint") : ""}
                />
              </div>
            </div>

            {trialExhausted && (
              <button
                type="button"
                className="pl-btn pl-btn--primary pl-btn--block"
                onClick={() => setSheet("account")}
              >
                {t("trial.cta")}
              </button>
            )}

            {(isGenerating || isRunning || hasResult || runError) && (
              <div className="pl-result-tray">
                <div className="pl-tray-core">
                  <Result
                    t={t}
                    prompt={prompt}
                    metrics={metrics}
                    isGenerating={isGenerating}
                    copied={copied}
                    onCopy={(text) => copyText(text ?? prompt)}
                    onSave={handleSave}
                    saved={saved}
                    onImprove={openImprove}
                    onCompare={openCompare}
                    canCompare={Boolean(previousPrompt)}
                    runOutput={runOutput}
                    isRunning={isRunning}
                    runError={humanizeApiError(runError, t)}
                    onExport={(format, text) => exportFile(format, text ?? prompt, narrative)}
                    canExportWord={Boolean(entitlements?.docxExport)}
                    canExportPpt={Boolean(entitlements?.pptxExport)}
                    exportStatus={exportStatus}
                    onReport={(payload) => {
                      setReportContent(payload?.content || "");
                      setSheet("report");
                    }}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <History
        t={t}
        lang={lang}
        open={sheet === "history"}
        onClose={closeSheet}
        items={filteredLibrary || []}
        search={search}
        setSearch={setSearch}
        onOpenItem={openHistoryItem}
        onDelete={deleteLibraryItem}
        onDuplicate={duplicateLibraryItem}
        syncStatus={librarySyncStatus}
        isLocalOnly={isLocalOnly}
      />

      <Account
        t={t}
        lang={lang}
        setLang={setLang}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        open={sheet === "account"}
        onClose={closeSheet}
        accountState={accountState}
        hasAuthSession={hasAuthSession}
        isAuthBusy={isAuthBusy}
        authStatus={authStatus}
        authError={authError}
        googleEnabled={googleEnabled}
        signInWithPassword={signInWithPassword}
        signUpWithPassword={signUpWithPassword}
        signInWithGoogle={signInWithGoogle}
        resetPasswordForEmail={resetPasswordForEmail}
        signOut={signOut}
        deleteAccountPermanently={deleteAccountPermanently}
        onUpgrade={requestMembershipUpgrade}
        onRestore={restorePlayPurchases}
        billingMessage={billingMessage}
        billingBusy={billingBusy}
        quotaSummary={quotaSummary}
      />

      <Improve
        t={t}
        open={sheet === "improve"}
        onClose={closeSheet}
        isOptimizing={isOptimizing}
        original={prompt}
        result={optimizerResult}
        error={humanizeApiError(optimizerError, t)}
        warning={humanizeApiError(optimizerWarning, t)}
        onRun={runImprove}
        onApply={applyImprove}
      />

      <Compare
        t={t}
        open={sheet === "compare"}
        onClose={closeSheet}
        before={previousPrompt}
        after={prompt}
        result={compareResult}
        isComparing={isComparing}
        error={humanizeApiError(compareError, t)}
        warning={humanizeApiError(compareWarning, t)}
        onRun={comparePrompts}
      />

      <Guide
        t={t}
        open={sheet === "guide"}
        onClose={closeSheet}
        onReplay={replayFirstRun}
      />

      <Report
        t={t}
        open={sheet === "report"}
        onClose={closeSheet}
          content={reportContent}
        apiBase={apiBase}
        getAuthHeaders={getAuthHeaders}
      />

      {actionToast && (
        <div className="pl-toast" role="status">
          {actionToast}
        </div>
      )}
    </div>
  );
}

export { resolveScheme };
