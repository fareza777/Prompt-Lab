import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, User, HelpCircle } from "lucide-react";
import { makeTranslator, detectLanguage, persistLanguage, hasStoredLanguage } from "./i18n.js";
import FirstRun from "./FirstRun.jsx";
import AuthGate from "./AuthGate.jsx";
import Guide from "./Guide.jsx";
import { humanizeApiError } from "./errors.js";
import { readThemeMode, applyThemeMode, watchSystemScheme, resolveScheme } from "./theme.js";
import {
  PALETTE_PRESETS,
  applyPalette,
  readPaletteChoice,
  resolvePalette,
  writePaletteChoice,
} from "./themePalette.js";
import Result from "./Result.jsx";
import TemplateGallery from "./TemplateGallery.jsx";
import TemplateWorkbench from "./TemplateWorkbench.jsx";
import TemplateProgress from "./TemplateProgress.jsx";
import Calendar from "./Calendar.jsx";
import TemplateEditor from "./TemplateEditor.jsx";
import {
  defaultFieldValues,
  getTemplate,
  localized,
  normalizeCustomTemplate,
  templateSubjectField,
} from "../workTemplates.js";
import History from "./History.jsx";
import Account from "./Account.jsx";
import Report from "./Report.jsx";
import DiagramSaveSheet from "./DiagramSaveSheet.jsx";
import { getRecordRestoreState } from "./contentRecord.js";

/**
 * The application shell — one canvas, with everything secondary arriving as a
 * sheet. Boot order: language → login/guest → skippable tour → canvas.
 */

const FIRST_RUN_KEY = "promptlab-onboarded";
const AUTH_GATE_KEY = "promptlab-auth-gate";
const GUEST_KEY = "promptlab-guest";

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

function readAuthGateDone() {
  try {
    return localStorage.getItem(AUTH_GATE_KEY) === "1";
  } catch {
    return true;
  }
}

function writeAuthGateDone(done) {
  try {
    if (done) localStorage.setItem(AUTH_GATE_KEY, "1");
    else localStorage.removeItem(AUTH_GATE_KEY);
  } catch {
    /* ignore */
  }
}

function writeGuestFlag(isGuest) {
  try {
    if (isGuest) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}

function readGuestFlag() {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
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
    diagramExportOffer,
    closeDiagramExportOffer,
    confirmDiagramExportShare,
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
    authSessionReady,
    continueAsGuest,
    clearComposer,
    runTemplate,
    templatePhase,
    setResultDate,
    saveCustomTemplate,
  } = props;

  const [lang, setLangState] = useState(detectLanguage);
  const [themeMode, setThemeModeState] = useState(readThemeMode);
  const [paletteChoice, setPaletteChoice] = useState(readPaletteChoice);
  const [sheet, setSheet] = useState(null);
  const [firstRunDone, setFirstRunDone] = useState(readFirstRunDone);
  const [authGateDone, setAuthGateDone] = useState(readAuthGateDone);
  const [isGuest, setIsGuest] = useState(readGuestFlag);
  // The language screen only appears when nothing has been chosen or detected
  // before; a returning user is never asked again.
  const [languageChosen, setLanguageChosen] = useState(hasStoredLanguage);
  const [previousPrompt, setPreviousPrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [reportContent, setReportContent] = useState("");
  // Template mode: null means the gallery is showing. The workbench, the wait,
  // and the result all belong to whichever template is selected.
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [templateValues, setTemplateValues] = useState({});
  const [templateEditedFields, setTemplateEditedFields] = useState([]);

  const t = useMemo(() => makeTranslator(lang), [lang]);

  /**
   * The user's own templates, in the same shape as the built-in ones.
   *
   * The stored library also holds legacy prompt starters, which have no
   * instruction and would appear as cards that cannot run.
   */
  const userTemplates = useMemo(
    () =>
      (templates || [])
        .filter((item) => item.custom && String(item.instruction || "").trim())
        .map((item) => normalizeCustomTemplate(item)),
    [templates]
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    applyThemeMode(themeMode);
    if (themeMode !== "system") return undefined;
    return watchSystemScheme(() => applyThemeMode("system"));
  }, [themeMode]);

  /**
   * Colour overrides, painted after the light/dark mode above.
   *
   * Order matters: applyThemeMode writes data-ui-theme, which selects the
   * stylesheet's own token block, and this paints over it. Running them the
   * other way round lets the stylesheet win and the choice vanishes.
   *
   * What this must NOT do is set data-ui-theme itself. It did, and that broke
   * the Light/Dark control completely: every render forced the attribute back
   * to the active palette's own scheme, so pressing Dark did nothing at all.
   * The control owns the scheme; a palette only supplies colours.
   */
  useEffect(() => {
    applyPalette(paletteChoice);
  }, [paletteChoice, themeMode]);

  /** Presets are tagged light or dark, so picking one also moves the switch. */
  const pickPreset = useCallback(
    (id) => {
      const choice = { preset: id };
      writePaletteChoice(choice);
      setPaletteChoice(choice);
      const scheme = resolvePalette(choice)?.scheme;
      if (scheme) setThemeModeState(applyThemeMode(scheme));
    },
    []
  );

  /**
   * Editing one colour moves the user off a preset onto their own palette,
   * seeded from whatever they were looking at — so a small change to a preset
   * does not start them from a blank slate.
   */
  const editColour = useCallback(
    (key, value) => {
      setPaletteChoice((current) => {
        const base = resolvePalette(current)?.palette || PALETTE_PRESETS[0].palette;
        const scheme = resolvePalette(current)?.scheme || "light";
        const choice = { palette: { ...base, [key]: value }, scheme };
        writePaletteChoice(choice);
        return choice;
      });
    },
    []
  );

  const resetPalette = useCallback(() => {
    writePaletteChoice(null);
    setPaletteChoice(null);
  }, []);

  // A real signed-in session (or a previous guest choice) clears the auth gate.
  useEffect(() => {
    if (hasAuthSession) {
      writeAuthGateDone(true);
      setAuthGateDone(true);
      writeGuestFlag(false);
      setIsGuest(false);
    } else if (isGuest) {
      writeAuthGateDone(true);
      setAuthGateDone(true);
    }
  }, [hasAuthSession, isGuest]);

  const setLang = useCallback((next) => {
    persistLanguage(next);
    setLangState(next);
  }, []);

  /**
   * Switching scheme drops a palette that belongs to the other one.
   *
   * Otherwise pressing Dark while a light palette is active repaints nothing:
   * the stylesheet's dark tokens are immediately overwritten by the light
   * colours, and the switch looks broken. Falling back to the built-in tokens
   * for the requested scheme means the control always does something visible.
   */
  const setThemeMode = useCallback(
    (next) => {
      setThemeModeState(applyThemeMode(next));
      setPaletteChoice((current) => {
        if (resolvePalette(current)?.scheme === next) return current;
        writePaletteChoice(null);
        return null;
      });
    },
    []
  );

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

  /** A message about a previous generation must not outlive that generation. */
  const clearMessages = useCallback(() => {
    setErrorMessage?.("");
    setWarningMessage?.("");
  }, [setErrorMessage, setWarningMessage]);

  // Declared after clearMessages so the dependency array is not read while
  // that binding is still in its temporal dead zone.
  const pickTemplate = useCallback(
    (template) => {
      setActiveTemplate(template);
      // Date and time arrive already filled in for the day the user is on.
      setTemplateValues(defaultFieldValues(template));
      setTemplateEditedFields([]);
      setRunOutput?.("");
      clearComposer?.();
      clearMessages();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setRunOutput, clearComposer, clearMessages]
  );

  const leaveTemplate = useCallback(() => {
    setActiveTemplate(null);
    setTemplateValues({});
    setTemplateEditedFields([]);
    setRunOutput?.("");
    clearComposer?.();
    clearMessages();
  }, [setRunOutput, clearComposer, clearMessages]);

  const setTemplateValue = useCallback((id, value) => {
    setTemplateValues((current) => ({ ...current, [id]: value }));
    setTemplateEditedFields((current) =>
      current.includes(id) ? current : [...current, id]
    );
  }, []);

  /**
   * What this document is about, used to name the downloaded file.
   *
   * The template's own name would put "Laporan Kegiatan.docx" in the downloads
   * folder for every activity report the user ever makes.
   */
  const documentTopic = useMemo(() => {
    if (!activeTemplate) return "";
    const subject = String(templateValues[templateSubjectField(activeTemplate)] || "").trim();
    return subject || localized(activeTemplate.name, lang);
  }, [activeTemplate, templateValues, lang]);

  /**
   * Reopens a filed document inside the flow that produced it.
   *
   * Restoring the template as well as the text is what brings back the right
   * export buttons — a recap must still offer Excel three weeks later.
   */
  const openCalendarItem = useCallback(
    (item) => {
      // Custom templates are not in the built-in registry, so a document made
      // from one would otherwise reopen with no template and the wrong exports.
      const template =
        getTemplate(item.templateId) ||
        userTemplates.find((candidate) => candidate.id === item.templateId);
      if (template) {
        setActiveTemplate(template);
        // Seed the subject from the filed title so a re-export keeps the same
        // filename rather than reverting to the template's generic name.
        const subjectField = templateSubjectField(template);
        setTemplateValues(subjectField ? { [subjectField]: item.title || "" } : {});
        setTemplateEditedFields(subjectField ? [subjectField] : []);
      }
      setSelectedLibraryId?.(item.id);
      setRunOutput?.(item.output || item.content || "");
      clearMessages();
      setSheet(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSelectedLibraryId, setRunOutput, clearMessages, userTemplates]
  );

  const handleTemplateGenerate = useCallback(async () => {
    if (!activeTemplate) return;
    clearMessages();
    await runTemplate?.(activeTemplate, templateValues, lang, templateEditedFields);
  }, [activeTemplate, templateValues, runTemplate, lang, templateEditedFields, clearMessages]);

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

  const finishAuthGate = useCallback(() => {
    writeAuthGateDone(true);
    setAuthGateDone(true);
  }, []);

  const handleGuest = useCallback(async () => {
    const ok = await continueAsGuest?.();
    writeGuestFlag(true);
    setIsGuest(true);
    finishAuthGate();
    return ok;
  }, [continueAsGuest, finishAuthGate]);

  const replayFirstRun = useCallback(() => {
    setSheet(null);
    writeFirstRunDone(false);
    setFirstRunDone(false);
  }, []);

  const goHome = useCallback(() => {
    clearComposer?.();
    setPreviousPrompt("");
    clearMessages();
    setSheet(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearComposer, clearMessages]);

  const languageReady = languageChosen || hasStoredLanguage();
  const sessionReady = authSessionReady !== false;
  const needsAuthGate = languageReady && sessionReady && !authGateDone && !hasAuthSession && !isGuest;
  const needsTour = languageReady && !needsAuthGate && !firstRunDone;

  if (!languageReady) {
    return (
      <FirstRun
        stage="language"
        onPickLanguage={(code) => {
          setLang(code);
          setLanguageChosen(true);
        }}
      />
    );
  }

  if (!sessionReady) {
    return (
      <main className="pl-firstrun" data-stage="session">
        <section className="pl-firstrun-card">
          <p className="pl-eyebrow">{t("app.name")}</p>
          <h1>{t("auth.gate.title")}</h1>
          <p className="pl-firstrun-lede">{t("result.workingHint")}</p>
        </section>
      </main>
    );
  }

  if (needsAuthGate) {
    return (
      <AuthGate
        t={t}
        isBusy={isAuthBusy}
        status={authStatus}
        error={authError}
        onSignIn={async (...args) => {
          await signInWithPassword?.(...args);
        }}
        onSignUp={async (...args) => {
          await signUpWithPassword?.(...args);
        }}
        onGoogle={async () => {
          await signInWithGoogle?.();
        }}
        onForgot={resetPasswordForEmail}
        onGuest={handleGuest}
        googleEnabled={googleEnabled}
      />
    );
  }

  if (needsTour) {
    return (
      <FirstRun
        stage="tour"
        t={t}
        lang={lang}
        onFinish={finishFirstRun}
        onSkipTour={finishFirstRun}
      />
    );
  }

  return (
    <div className="pl-shell">
      <a className="pl-skip" href="#pl-main">
        {t("nav.skip")}
      </a>

      <header className="pl-top">
        <button type="button" className="pl-brand" onClick={goHome} aria-label={t("brand.homeAria")}>
          {t("app.name")} <span>{t("app.tagline")}</span>
        </button>
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
            onClick={() => setSheet("calendar")}
            aria-label={t("cal.title")}
          >
            <CalendarDays size={20} aria-hidden="true" />
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
        {!activeTemplate ? (
          <TemplateGallery
            t={t}
            lang={lang}
            onPick={pickTemplate}
            customTemplates={userTemplates}
            onNewTemplate={() => setSheet("editor")}
          />
        ) : (
          <div className="pl-template-flow">
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

            {isRunning ? (
              <TemplateProgress
                t={t}
                templateName={localized(activeTemplate.name, lang)}
                phase={templatePhase}
              />
            ) : hasResult || runError ? (
              <div className="pl-result-tray">
                <div className="pl-tray-core">
                  <Result
                    t={t}
                    prompt={runOutput}
                    metrics={metrics}
                    isGenerating={false}
                    copied={copied}
                    onCopy={(text) => copyText(text ?? runOutput)}
                    onSave={handleSave}
                    saved={saved}
                    runOutput={runOutput}
                    isRunning={false}
                    runError={humanizeApiError(runError, t)}
                    onExport={(format, text) =>
                      exportFile(format, text ?? runOutput, documentTopic)
                    }
                    /* Gated by the template as well as the plan: offering a
                       spreadsheet download for a formal letter, or slides for a
                       handover record, only invites a disappointing file. */
                    canExportWord={
                      Boolean(entitlements?.docxExport) && activeTemplate.outputs.includes("docx")
                    }
                    canExportPdf={
                      Boolean(entitlements?.pdfExport) && activeTemplate.outputs.includes("pdf")
                    }
                    canExportPpt={
                      Boolean(entitlements?.pptxExport) && activeTemplate.outputs.includes("pptx")
                    }
                    canExportSheet={
                      Boolean(entitlements?.xlsxExport) && activeTemplate.outputs.includes("xlsx")
                    }
                    exportStatus={exportStatus}
                    onReport={(payload) => {
                      setReportContent(payload?.content || "");
                      setSheet("report");
                    }}
                    onStartOver={leaveTemplate}
                  />
                </div>
              </div>
            ) : (
              <TemplateWorkbench
                t={t}
                lang={lang}
                template={activeTemplate}
                attachments={attachments}
                addAttachments={addAttachments}
                removeAttachment={removeAttachment}
                values={templateValues}
                setValue={setTemplateValue}
                onGenerate={handleTemplateGenerate}
                onBack={leaveTemplate}
                isBusy={isRunning}
                planMaxAttachments={maxAttachments}
                errorMessage={humanizeApiError(errorMessage, t)}
                disabled={trialExhausted}
                disabledReason={trialExhausted ? t("trial.overHint") : ""}
              />
            )}
          </div>
        )}

      </main>

      <TemplateEditor
        t={t}
        lang={lang}
        open={sheet === "editor"}
        onClose={closeSheet}
        onSave={saveCustomTemplate}
      />

      <Calendar
        t={t}
        lang={lang}
        open={sheet === "calendar"}
        onClose={closeSheet}
        items={(filteredLibrary || []).filter((item) => item.contentType === "output")}
        onOpenItem={openCalendarItem}
        onDelete={deleteLibraryItem}
        onChangeDate={setResultDate}
      />

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
        isGuest={isGuest}
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
        paletteChoice={paletteChoice}
        palette={resolvePalette(paletteChoice)?.palette || PALETTE_PRESETS[0].palette}
        onPickPreset={pickPreset}
        onEditColour={editColour}
        onResetPalette={resetPalette}
      />

      {/* Improve and Compare were removed here, not merely hidden: nothing has
          opened them since the prompt-first flow was replaced, so they were
          unreachable UI still being shipped and parsed on every launch. Their
          components remain on disk. */}

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

      <DiagramSaveSheet
        t={t}
        offer={diagramExportOffer}
        onClose={closeDiagramExportOffer}
        onShared={confirmDiagramExportShare}
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
