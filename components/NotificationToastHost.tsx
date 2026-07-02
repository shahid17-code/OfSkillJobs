"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getNotificationMeta, getNotificationTargetUrl, type AppNotification } from "@/lib/notifications";

type ToastItem = AppNotification & { _toastId: string };

const AUTO_DISMISS_MS = 6000;

/**
 * NotificationToastHost — mount this ONCE near the root of your app
 * (e.g. in app/layout.tsx, as a sibling of {children}). It opens its own
 * Realtime subscription independent of the bell, so toasts work on every
 * page even if the navbar/bell hasn't mounted yet.
 */
export default function NotificationToastHost() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t._toastId !== toastId));
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase.channel(`toast-notifications:${user.id}`);

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as AppNotification;

          // Hydrate sender name for the toast (small, single-row query — fine for one toast)
          let from_user = null;
          if (row.from_user_id) {
            const { data } = await supabase
              .from("users")
              .select("full_name, username, avatar_url, company_name")
              .eq("id", row.from_user_id)
              .single();
            from_user = data || null;
          }

          const toastId = `${row.id}-${Date.now()}`;
          const item: ToastItem = { ...row, from_user, _toastId: toastId };
          setToasts(prev => [item, ...prev].slice(0, 4));

          setTimeout(() => dismiss(toastId), AUTO_DISMISS_MS);
        }
      );

      if (!cancelled) channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClick(t: ToastItem) {
    dismiss(t._toastId);
    if (t.capsule_id) router.push(getNotificationTargetUrl(t));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "calc(100vw - 36px)",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes toast-slideIn { from { opacity:0; transform: translateX(24px) scale(.96); } to { opacity:1; transform: translateX(0) scale(1); } }
        @keyframes toast-progress { from { width: 100%; } to { width: 0%; } }
        .toast-card { pointer-events: auto; animation: toast-slideIn .3s cubic-bezier(.16,1,.3,1) both; cursor: pointer; }
        .toast-card:hover { transform: translateY(-2px); }
        .toast-progress-bar { animation: toast-progress ${AUTO_DISMISS_MS}ms linear forwards; }
      `}</style>

      {toasts.map(t => {
        const meta = getNotificationMeta(t.type);
        const senderLabel = t.from_user?.company_name || t.from_user?.full_name || (t.from_user?.username ? `@${t.from_user.username}` : "Someone");
        return (
          <div
            key={t._toastId}
            className="toast-card"
            onClick={() => handleClick(t)}
            style={{
              width: 360,
              background: "white",
              borderRadius: 16,
              boxShadow: "0 20px 48px -8px rgba(15,23,42,.25), 0 0 0 1px rgba(15,23,42,.05)",
              overflow: "hidden",
              transition: "transform .15s ease",
            }}
          >
            <div style={{ display: "flex", gap: 12, padding: "14px 16px 12px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg,${meta.bg},white)`,
                  color: meta.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  flexShrink: 0,
                  border: `1.5px solid ${meta.bg}`,
                }}
              >
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: meta.color }}>{meta.label}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>· {senderLabel}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: "#1e293b", fontWeight: 600, lineHeight: 1.4 }}>
                  {t.message}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(t._toastId); }}
                aria-label="Dismiss notification"
                style={{
                  background: "none",
                  border: "none",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  fontSize: 13,
                  flexShrink: 0,
                  alignSelf: "flex-start",
                  padding: 2,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ height: 3, background: "#f1f5f9" }}>
              <div className="toast-progress-bar" style={{ height: "100%", background: meta.color, opacity: 0.5 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}