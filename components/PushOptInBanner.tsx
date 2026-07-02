"use client";

import { useState } from "react";
import { usePushSubscription } from "@/lib/notifications";

/**
 * PushOptInBanner — a dismissible card prompting the user to enable browser
 * push notifications. Drop this into a dashboard or settings page; it hides
 * itself once subscribed, denied, or dismissed for the session.
 */
export default function PushOptInBanner() {
  const { permission, isSubscribed, subscribing, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (permission === "unsupported" || permission === "denied" || isSubscribed || dismissed) {
    return null;
  }

  async function handleEnable() {
    setErrorMsg(null);
    const result = await subscribe();
    if (!result.ok) setErrorMsg(result.error || "Something went wrong.");
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "linear-gradient(135deg,#f5f3ff,#eef2ff)",
        border: "1px solid #ddd6fe",
        borderRadius: 16,
        padding: "14px 18px",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(99,102,241,.18)",
        }}
      >
        🔔
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13.5, color: "#1e1b4b" }}>
          Never miss a Spotlight or Call
        </p>
        <p style={{ margin: 0, fontSize: 12.5, color: "#5b21b6" }}>
          Turn on browser notifications to hear about recruiter activity instantly — even when this tab is closed.
        </p>
        {errorMsg && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#dc2626" }}>{errorMsg}</p>}
      </div>
      <button
        onClick={handleEnable}
        disabled={subscribing}
        style={{
          background: "#6366f1",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 12.5,
          cursor: subscribing ? "default" : "pointer",
          opacity: subscribing ? 0.7 : 1,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {subscribing ? "Enabling…" : "Enable"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: "#a5b4fc",
          cursor: "pointer",
          fontSize: 14,
          flexShrink: 0,
          padding: 4,
        }}
      >
        ✕
      </button>
    </div>
  );
}