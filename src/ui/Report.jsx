import { useState } from "react";
import { Flag } from "lucide-react";
import Sheet from "./Sheet.jsx";

/**
 * In-app reporting for AI-generated output.
 *
 * Google Play's Generative AI policy requires apps that produce AI content to
 * give users a way to flag offensive output from inside the app, and to act on
 * what is reported. The report carries the offending text so a human can judge
 * it without asking the user to reproduce the problem.
 */

const REASONS = ["offensive", "harmful", "sexual", "violence", "privacy", "ip", "other"];

export default function Report({ t, open, onClose, content, apiBase, getAuthHeaders }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [state, setState] = useState("idle");

  const close = () => {
    setState("idle");
    setDetail("");
    setReason(REASONS[0]);
    onClose();
  };

  async function submit() {
    setState("sending");
    try {
      const headers = { "Content-Type": "application/json" };
      if (getAuthHeaders) Object.assign(headers, await getAuthHeaders());
      const response = await fetch(`${apiBase}/api/report-content`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          reason,
          detail: detail.slice(0, 2000),
          content: String(content || "").slice(0, 8000),
        }),
      });
      if (!response.ok) throw new Error("failed");
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <Sheet open={open} title={t("report.title")} closeLabel={t("nav.close")} onClose={close}>
      {state === "sent" ? (
        <>
          <div className="pl-notice pl-notice--ok" role="status">
            {t("report.thanks")}
          </div>
          <button type="button" className="pl-btn pl-btn--block" onClick={close}>
            {t("common.done")}
          </button>
        </>
      ) : (
        <>
          <p className="pl-hint">{t("report.intro")}</p>

          <div className="pl-field">
            <label className="pl-label" htmlFor="report-reason">
              {t("report.reason")}
            </label>
            <select
              id="report-reason"
              className="pl-select"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {t(`report.reason.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="pl-field">
            <label className="pl-label" htmlFor="report-detail">
              {t("report.detail")}
            </label>
            <textarea
              id="report-detail"
              className="pl-textarea"
              style={{ minHeight: 90 }}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder={t("report.detailPlaceholder")}
            />
          </div>

          {state === "failed" && (
            <div className="pl-notice pl-notice--danger" role="alert">
              {t("report.failed")}
            </div>
          )}

          <div className="pl-actions">
            <button
              type="button"
              className="pl-btn pl-btn--primary"
              onClick={submit}
              disabled={state === "sending"}
            >
              <Flag size={16} aria-hidden="true" />
              {state === "sending" ? t("report.sending") : t("report.submit")}
            </button>
            <button type="button" className="pl-btn" onClick={close}>
              {t("common.cancel")}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
