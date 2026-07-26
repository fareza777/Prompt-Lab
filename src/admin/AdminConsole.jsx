import { useState } from "react";
import {
  BarChart3,
  Database,
  Gauge,
  Rocket,
  Save,
  Search,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import "../styles.css";
import { supabase } from "../supabaseClient.js";
import { handleTabListKeyDown } from "../accessibilityInteractions.js";
import { MODELS as models } from "../ui/options.js";
import {
  defaultModelSettings,
  generationModes,
  modeProfiles,
  providerOptions,
} from "../modelSettings.js";

/**
 * Admin console — internal only.
 *
 * This is the sole remaining consumer of the legacy stylesheet, so it is
 * loaded lazily: the ~82 KiB of v2 CSS and this screen's code stay out of the
 * bundle every ordinary user downloads.
 */

function V2PageIntro({ eyebrow, title, copy, children, compact = false }) {
  return (
    <section className={`v2-hero${compact ? " is-compact" : ""}`}>
      <div className="v2-hero-copy">
        <span className="v2-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {copy ? <p>{copy}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * v2 engine telemetry badges:
 * - Engine version chip
 * - PII redaction notice
 * Tampil hanya kalau ada data.
 */
function V2MiniPipeline({ eyebrow = "Working", title, steps, activePhase = "drafting" }) {
  const phaseOrder = ["drafting", "validating", "critique", "refining", "dialect", "done"];
  const activeIndex = Math.max(0, phaseOrder.indexOf(activePhase));
  return (
    <section className="v2-mini-pipeline" aria-live="polite">
      <div className="v2-mini-orb"><Sparkles size={16} /></div>
      <div className="v2-mini-copy">
        <span className="v2-eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        <div className="v2-loader-bar"><i /></div>
      </div>
      <div className="v2-mini-steps">
        {steps.map((step, index) => (
          <div
            className={`v2-mini-step${index <= activeIndex ? " is-active" : ""}`}
            key={step}
            style={{ "--delay": `${index * 0.16}s` }}
          >
            {step}
          </div>
        ))}
      </div>
    </section>
  );
}

function V2AdminDashboard(props) {
  const [section, setSection] = useState("Overview");
  const sections = [
    ["Overview", BarChart3],
    ["Users", Users],
    ["Model & AI", Database],
  ];
  const fallbackModels = props.modelSettings.fallbackModels
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const providerReady = Boolean(props.settingsStatus?.ok && props.settingsStatus?.ai);

  return (
    <div className="v2-screen v2-settings-screen v2-admin-screen">
      <V2PageIntro
        eyebrow="Admin"
        title="Dashboard, analytics, and production controls."
        copy="Monitor usage, manage members, and publish global AI routing. API keys stay in Vercel env vars."
      >
        <div className="v2-hero-status">
          <span>Access</span>
          <strong>Super admin</strong>
          <small>{props.accountState.email}</small>
        </div>
      </V2PageIntro>

      <div className="v2-settings-tabs" role="tablist" aria-label="Admin sections">
        {sections.map(([name, Icon]) => (
          <button key={name} role="tab" tabIndex={section === name ? 0 : -1} aria-selected={section === name} aria-controls={`admin-panel-${name.toLowerCase().replace(/[ &]+/g, "-")}`} className={section === name ? "active" : ""} onKeyDown={(event) => onNamedTabKeyDown(event, sections.map(([item]) => item), section, setSection)} onClick={() => setSection(name)}>
            <Icon size={16} />
            <span>{name}</span>
          </button>
        ))}
      </div>

      {props.adminActionStatus && <p className="v2-note warn">{props.adminActionStatus}</p>}

      {section === "Overview" && (
        <div role="tabpanel" id={`admin-panel-overview`}><V2AdminOverview
          analytics={props.adminAnalytics}
          loading={props.adminAnalyticsLoading}
          onRefresh={props.loadAdminAnalytics}
        /></div>
      )}
      {section === "Users" && (
        <div role="tabpanel" id={`admin-panel-users`}><V2AdminUsers
          usersPayload={props.adminUsers}
          loading={props.adminUsersLoading}
          search={props.adminUsersSearch}
          onSearchChange={props.setAdminUsersSearch}
          onSearch={props.loadAdminUsers}
          onGrantSuper={props.grantSuperUser}
          onUpdateUser={props.updateAdminUser}
        /></div>
      )}
      {section === "Model & AI" && (
        <div role="tabpanel" id={`admin-panel-model-ai`}><V2AdminSettings {...props} fallbackModels={fallbackModels} providerReady={providerReady} /></div>
      )}
    </div>
  );
}

function V2AdminOverview({ analytics, loading, onRefresh }) {
  const maxDayTokens = Math.max(1, ...(analytics?.usageByDay || []).map((row) => row.tokens));
  return (
    <section className="v2-settings-grid public">
      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Platform Overview</h2>
            <p>Users, token usage, and billing signals from Supabase.</p>
          </div>
          <button className="v2-btn" onClick={onRefresh} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
        {analytics ? (
          <>
            <div className="v2-stats-strip">
              <V2Stat label="Total users" value={analytics.totalUsers} detail={`${analytics.signups30} signups / 30d`} compact />
              <V2Stat label="Active users" value={analytics.activeUsers30} detail="Used AI in 30d" compact />
              <V2Stat label="Tokens / 7d" value={`${(analytics.tokens7 / 1000).toFixed(1)}k`} detail={`${(analytics.tokens30 / 1000).toFixed(1)}k / 30d`} compact />
              <V2Stat label="Events / 30d" value={analytics.events30} detail="generate, optimize, compare" compact />
            </div>
            <div className="v2-info-grid">
              {Object.entries(analytics.planDistribution || {}).map(([plan, count]) => (
                <V2Info key={plan} label={`Plan · ${plan}`} value={count} />
              ))}
              {Object.entries(analytics.eventTypes || {}).map(([type, count]) => (
                <V2Info key={type} label={`Event · ${type}`} value={count} />
              ))}
            </div>
          </>
        ) : (
          <p className="v2-note">{loading ? "Loading analytics…" : "No analytics yet. Run phase-8 indexes SQL if queries are slow."}</p>
        )}
      </div>

      {analytics?.usageByDay?.length > 0 && (
        <div className="v2-card v2-settings-card">
          <div className="v2-card-head">
            <div>
              <h2>Token Usage (30 days)</h2>
              <p>Daily estimated tokens from usage_events.</p>
            </div>
          </div>
          <div className="v2-admin-chart">
            {analytics.usageByDay.map((row) => (
              <div key={row.date} className="v2-admin-chart-bar" title={`${row.date}: ${row.tokens} tokens`}>
                <i style={{ height: `${Math.max(8, Math.round((row.tokens / maxDayTokens) * 100))}%` }} />
                <span>{row.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics?.membershipRecent?.length > 0 && (
        <div className="v2-card v2-settings-card">
          <div className="v2-card-head">
            <div>
              <h2>Recent Billing Events</h2>
              <p>Play / Lemon Squeezy membership changes.</p>
            </div>
          </div>
          <div className="v2-admin-table-wrap">
            <table className="v2-admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Provider</th>
                  <th>Event</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                {analytics.membershipRecent.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString("en-US")}</td>
                    <td>{row.provider}</td>
                    <td>{row.event_type}</td>
                    <td>{row.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function V2AdminUsers({ usersPayload, loading, search, onSearchChange, onSearch, onGrantSuper, onUpdateUser }) {
  const users = usersPayload?.users || [];
  return (
    <section className="v2-settings-grid public">
      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Users</h2>
            <p>Search members, change plan, or grant super admin + unlimited quota.</p>
          </div>
          <span className="v2-score-badge">{usersPayload?.total ?? 0}</span>
        </div>
        <div className="v2-admin-user-search">
          <input
            className="v2-input"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search email or name"
            onKeyDown={(event) => event.key === "Enter" && onSearch(search)}
          />
          <button className="v2-btn" onClick={() => onSearch(search)} disabled={loading}>Search</button>
        </div>
        <div className="v2-admin-table-wrap">
          <table className="v2-admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Plan</th>
                <th>Role</th>
                <th>Quota</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr><td colSpan={5}>Loading users…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5}>No users found.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.email}</strong>
                      <small>{user.fullName || "—"}</small>
                    </td>
                    <td>
                      <select
                        className="v2-input compact"
                        value={user.plan}
                        onChange={(event) => onUpdateUser(user.id, { plan: event.target.value })}
                      >
                        <option>Free</option>
                        <option>Pro</option>
                        <option>Business</option>
                      </select>
                    </td>
                    <td>{user.role}</td>
                    <td>{`${(user.quotaUsed / 1000).toFixed(1)}k / ${user.quotaLimit >= 1_000_000_000 ? "∞" : `${(user.quotaLimit / 1000).toFixed(0)}k`}`}</td>
                    <td className="v2-admin-actions">
                      {user.role !== "admin" && (
                        <button className="v2-btn" type="button" onClick={() => onGrantSuper(user.id)}>Make super</button>
                      )}
                      <button
                        className="v2-btn"
                        type="button"
                        onClick={() => onUpdateUser(user.id, { quotaUsed: 0 })}
                      >
                        Reset usage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function V2AdminSettings(props) {
  const {
    settingsStatus,
    refreshHealth,
    apiBase,
    generationMode,
    setGenerationMode,
    modelSettings,
    setModelSettings,
    saveModelSettings,
    publishGlobalModelSettings,
    loadAdminRuntimeConfig,
    globalPublishBusy,
    globalPublishAt,
    globalConfigSource,
    settingsSavedAt,
    providerTestStatus,
    isTestingProvider,
    testProvider,
    fallbackModels,
    providerReady,
  } = props;
  const activeProfile = modeProfiles[generationMode] || modeProfiles.Balanced;
  const updateModelSetting = (key, value) => setModelSettings((settings) => ({ ...settings, [key]: value }));

  return (
    <section className="v2-settings-grid">
      <div className="v2-card v2-settings-card v2-account-card">
        <div className="v2-card-head">
          <div>
            <h2>Model &amp; AI Settings</h2>
            <p>Publish model routing for every user on production (Vercel). API keys stay in Vercel env vars.</p>
          </div>
          <span className={`v2-health ${providerReady ? "ready" : ""}`}>{providerReady ? "Ready" : "Offline"}</span>
        </div>
        <div className="v2-info-grid">
          <V2Info label="API Base" value={apiBase || "Same-origin Vercel API"} />
          <V2Info label="Live source" value={globalConfigSource === "published" ? "Published (Supabase)" : "Vercel env defaults"} />
          <V2Info label="Last Active Model" value={settingsStatus?.model || modelSettings.primaryModel || "-"} />
          <V2Info label="OCR Model" value={modelSettings.ocrModel || settingsStatus?.ocrModel || "-"} />
        </div>
        {globalPublishAt && <p className="v2-note">Last published: {globalPublishAt}</p>}
      </div>

      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Generation Mode</h2>
            <p>Choose how aggressively AI Work Studio waits before using fallback models.</p>
          </div>
          <Gauge size={20} />
        </div>
        <div className="v2-mode-grid">
          {generationModes.map((mode) => (
            <button key={mode} className={generationMode === mode ? "active" : ""} onClick={() => setGenerationMode(mode)}>
              <span>{mode}</span>
              <strong>{modeProfiles[mode].label}</strong>
              <small>{modeProfiles[mode].detail}</small>
            </button>
          ))}
        </div>
        <div className="v2-settings-summary">
          <span>Active Mode</span>
          <strong>{generationMode}</strong>
          <p>{activeProfile.bestFor}</p>
        </div>
      </div>

      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Provider & Endpoint</h2>
            <p>Changes apply to all users after you publish. Keys are not stored in the database.</p>
          </div>
          <button className="v2-btn" onClick={() => setModelSettings(defaultModelSettings)}>Reset form</button>
        </div>
        <V2ChipGroup label="Provider" options={providerOptions} value={modelSettings.provider} onChange={(item) => updateModelSetting("provider", item)} />
        <label className="v2-label">Base URL / Endpoint</label>
        <input className="v2-input" value={modelSettings.baseUrl} onChange={(event) => updateModelSetting("baseUrl", event.target.value)} placeholder="https://openrouter.ai/api/v1" />
        <label className="v2-label">API Key Override, Optional</label>
        <input className="v2-input" type="password" value={modelSettings.apiKey} onChange={(event) => updateModelSetting("apiKey", event.target.value)} placeholder="Leave empty to use Vercel Environment Variables" />
        <p className="v2-small">Production keys should live in Vercel Environment Variables. Browser overrides are for admin testing only.</p>
      </div>

      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Model Routing</h2>
            <p>Primary model, OCR model, timeout, and fallback chain.</p>
          </div>
          <span className="v2-score-badge">{modelSettings.timeoutMs || "auto"} ms</span>
        </div>
        <label className="v2-label">Primary Model</label>
        <input className="v2-input" value={modelSettings.primaryModel} onChange={(event) => updateModelSetting("primaryModel", event.target.value)} />
        <label className="v2-label">OCR / Vision Model</label>
        <input className="v2-input" value={modelSettings.ocrModel} onChange={(event) => updateModelSetting("ocrModel", event.target.value)} />
        <label className="v2-label">Primary Timeout, ms</label>
        <input className="v2-input" value={modelSettings.timeoutMs} onChange={(event) => updateModelSetting("timeoutMs", event.target.value.replace(/[^\d]/g, ""))} />
        <label className="v2-label">Fallback Models, One Model Per Line</label>
        <textarea className="v2-textarea small" value={modelSettings.fallbackModels} onChange={(event) => updateModelSetting("fallbackModels", event.target.value)} />
      </div>

      <div className="v2-card v2-settings-card">
        <div className="v2-card-head">
          <div>
            <h2>Fallback Chain</h2>
            <p>AI Work Studio tries these models when the primary route fails or times out.</p>
          </div>
          <span className="v2-score-badge hot">{fallbackModels.length}</span>
        </div>
        <div className="v2-fallback-list">
          {(fallbackModels.length ? fallbackModels : ["No fallback models configured"]).map((modelName, index) => (
            <div key={`${modelName}-${index}`}>
              <span>{index + 1}</span>
              <strong>{modelName}</strong>
            </div>
          ))}
        </div>
        <div className="v2-actions wrap">
          <button className="v2-btn primary" onClick={publishGlobalModelSettings} disabled={globalPublishBusy}>
            <Rocket size={16} />
            {globalPublishBusy ? "Publishing…" : "Publish globally"}
          </button>
          <button className="v2-btn" onClick={saveModelSettings} disabled={globalPublishBusy}><Save size={16} />Save draft</button>
          <button className="v2-btn primary" onClick={testProvider} disabled={isTestingProvider || globalPublishBusy}><Zap size={16} />{isTestingProvider ? "Testing..." : "Test Provider"}</button>
          <button className="v2-btn" onClick={refreshHealth} disabled={globalPublishBusy}><Gauge size={16} />Health</button>
          <button className="v2-btn" onClick={loadAdminRuntimeConfig} disabled={globalPublishBusy}><Database size={16} />Reload published</button>
        </div>
        <p className="v2-small">Run <code>supabase/phase-5-runtime-config.sql</code> once if publish returns a database error.</p>
        {isTestingProvider && (
          <V2MiniPipeline eyebrow="Provider test" title="Checking model route..." steps={["Endpoint", "Auth", "Model", "Response"]} />
        )}
        {settingsSavedAt && <p className="v2-note">Draft saved at {settingsSavedAt}</p>}
        {providerTestStatus && <p className="v2-note warn">{providerTestStatus}</p>}
      </div>
    </section>
  );
}

function V2Info({ label, value }) {
  return (
    <div className="v2-info">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

function V2Stat({ label, value, detail, compact }) {
  return (
    <div className={`v2-stat ${compact ? "compact" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function onNamedTabKeyDown(event, names, activeName, setActiveName, vertical = false) {
  const tabs = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
  handleTabListKeyDown(event, {
    tabs,
    currentIndex: names.indexOf(activeName),
    onActivate: (index) => setActiveName(names[index]),
    vertical,
  });
}

function V2ChipGroup({ label, options, value, onChange }) {
  return (
    <div className="v2-chip-group">
      <span>{label}</span>
      <div className="v2-chip-row">
        {options.map((option) => (
          <button key={option} aria-pressed={value === option} className={`v2-chip ${value === option ? "active" : ""}`} onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </div>
  );
}

export default V2AdminDashboard;
