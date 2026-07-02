"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNotifications, getNotificationMeta, getNotificationTargetUrl, type AppNotification, type NotificationType } from "@/lib/notifications";

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function senderName(n: AppNotification): string {
  return n.from_user?.company_name || n.from_user?.full_name || (n.from_user?.username ? `@${n.from_user.username}` : "Someone");
}
function senderInitial(n: AppNotification): string {
  const name = senderName(n);
  return name.replace("@", "")[0]?.toUpperCase() || "?";
}

type FilterKey = "all" | NotificationType;
const PANEL_WIDTH = 392;
const MOBILE_BREAKPOINT = 480;

export default function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications(20);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [justArrivedId, setJustArrivedId] = useState<string | null>(null);
  const [coords, setCoords] = useState({ top: 64, right: 16, isMobile: false });
  const [mounted, setMounted] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevTopIdRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  // Needed because createPortal can only run client-side, after mount.
  useEffect(() => { setMounted(true); }, []);

  // Compute panel position in VIEWPORT coordinates. Because the panel is portaled
  // to document.body (not nested in the navbar), this is now reliable — no ancestor
  // with `transform`/`overflow`/`contain` can hijack `position: fixed`'s containing
  // block the way it could when the panel lived inside the navbar's DOM subtree.
  const updatePosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const margin = 12;
    if (isMobile) {
      setCoords({ top: rect.bottom + 8, right: margin, isMobile: true });
    } else {
      const right = Math.max(margin, window.innerWidth - rect.right);
      setCoords({ top: rect.bottom + 10, right, isMobile: false });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  // Close on outside click — checks both the trigger button and the portaled panel,
  // since with createPortal the panel is no longer a DOM descendant of the button's wrapper.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll on mobile while the panel is open, since it's full-width there
  // and competing scroll surfaces feel broken on touch devices.
  useEffect(() => {
    if (!open || !coords.isMobile) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open, coords.isMobile]);

  // Flash + bell-shake when a genuinely new item arrives via Realtime
  useEffect(() => {
    const topId = notifications[0]?.id;
    if (firstLoadRef.current) { prevTopIdRef.current = topId || null; firstLoadRef.current = false; return; }
    if (topId && topId !== prevTopIdRef.current) {
      setJustArrivedId(topId);
      const t = setTimeout(() => setJustArrivedId(null), 2400);
      prevTopIdRef.current = topId;
      return () => clearTimeout(t);
    }
  }, [notifications]);

  function handleItemClick(n: AppNotification) {
    if (!n.read) markAsRead(n.id);
    setOpen(false);
    if (n.capsule_id) router.push(getNotificationTargetUrl(n));
  }

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);
  const spotlightCount = notifications.filter(n => n.type === "spotlight").length;
  const callCount = notifications.filter(n => n.type === "call").length;

  const panel = open && (
    <div
      ref={panelRef}
      className="nbell-panel"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.isMobile ? 12 : "auto",
        right: coords.isMobile ? 12 : coords.right,
        width: coords.isMobile ? "auto" : PANEL_WIDTH,
        maxWidth: coords.isMobile ? "none" : "calc(100vw - 24px)",
        maxHeight: "calc(100vh - 100px)",
        background: "white",
        borderRadius: 20,
        boxShadow: "0 24px 64px -8px rgba(15,23,42,.22), 0 0 0 1px rgba(15,23,42,.04)",
        overflow: "hidden",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ padding: "18px 20px 14px", background: "linear-gradient(135deg,#fafaff,#f5f6fb)", borderBottom: "1px solid #eef0f5", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", letterSpacing: "-0.01em" }}>Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="nbell-markall" style={{ fontSize: 12.5, fontWeight: 700, color: "#6366f1", background: "none", border: "none", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {([
            { key: "all" as FilterKey, label: "All", count: notifications.length },
            { key: "spotlight" as FilterKey, label: "🔦 Spotlights", count: spotlightCount },
            { key: "call" as FilterKey, label: "📞 Calls", count: callCount },
          ]).map(t => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                className="nbell-tab"
                onClick={() => setFilter(t.key)}
                style={{
                  flex: 1, minWidth: 0, padding: "7px 6px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  border: "none", background: active ? "#0f172a" : "white", color: active ? "white" : "#64748b",
                  boxShadow: active ? "0 2px 8px rgba(15,23,42,.25)" : "0 1px 2px rgba(15,23,42,.06)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {t.label}{t.count > 0 ? ` · ${t.count}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="nbell-scroll" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <div style={{ width: 28, height: 28, margin: "0 auto", borderRadius: "50%", border: "3px solid #eef0f5", borderTopColor: "#6366f1", animation: "nbell-spin .7s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "44px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#eef2ff,#f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>
              🔔
            </div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
              {filter === "all" ? "You're all caught up" : `No ${filter} notifications`}
            </p>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 12.5 }}>New activity will show up here instantly.</p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const meta = getNotificationMeta(n.type);
            const isNew = n.id === justArrivedId;
            return (
              <div
                key={n.id}
                className={`nbell-row ${isNew ? "nbell-row-flash" : ""}`}
                onClick={() => handleItemClick(n)}
                style={{
                  display: "flex", gap: 12, padding: "13px 18px", position: "relative",
                  borderBottom: i < filtered.length - 1 ? "1px solid #f4f5f9" : "none",
                  background: n.read ? "white" : "#fafbff",
                  animationDelay: `${Math.min(i * 25, 200)}ms`,
                  boxSizing: "border-box",
                }}
              >
                {!n.read && (
                  <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "nbell-dotPulse 1.8s ease infinite" }} />
                )}

                <div style={{ position: "relative", flexShrink: 0 }}>
                  {n.from_user?.avatar_url ? (
                    <img src={n.from_user.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${meta.bg},white)`, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, border: `1.5px solid ${meta.bg}` }}>
                      {senderInitial(n)}
                    </div>
                  )}
                  <span style={{ position: "absolute", bottom: -3, right: -3, width: 18, height: 18, borderRadius: "50%", background: meta.bg, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5 }}>
                    {meta.icon}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: meta.color, flexShrink: 0 }}>{meta.label}</span>
                    <span style={{ fontSize: 11.5, color: "#aab0bd", marginLeft: "auto", flexShrink: 0, whiteSpace: "nowrap" }}>{timeAgo(n.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#1e293b", lineHeight: 1.5, fontWeight: n.read ? 500 : 700, wordBreak: "break-word", overflowWrap: "break-word" }}>
                    {n.message}
                  </p>
                </div>

                <button
                  className="nbell-del"
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  title="Dismiss"
                  style={{ background: "#f4f5f9", border: "none", color: "#9aa1b0", cursor: "pointer", fontSize: 12, width: 22, height: 22, borderRadius: "50%", flexShrink: 0, alignSelf: "flex-start", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <Link
        href="/notifications"
        onClick={() => setOpen(false)}
        style={{ display: "block", textAlign: "center", padding: "13px", fontSize: 13, fontWeight: 700, color: "#6366f1", textDecoration: "none", borderTop: "1px solid #eef0f5", background: "#fafbff", flexShrink: 0 }}
      >
        View all notifications →
      </Link>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes nbell-pop      { 0%{transform:scale(.4);opacity:0} 55%{transform:scale(1.25)} 100%{transform:scale(1);opacity:1} }
        @keyframes nbell-ring     { 0%{box-shadow:0 0 0 0 rgba(99,102,241,.35)} 70%{box-shadow:0 0 0 9px rgba(99,102,241,0)} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} }
        @keyframes nbell-shake    { 0%,100%{transform:rotate(0)} 15%{transform:rotate(-14deg)} 30%{transform:rotate(12deg)} 45%{transform:rotate(-9deg)} 60%{transform:rotate(7deg)} 75%{transform:rotate(-4deg)} }
        @keyframes nbell-flash    { 0%{background:linear-gradient(90deg,#eef2ff,#f5f3ff)} 100%{background:transparent} }
        @keyframes nbell-panelIn  { from{opacity:0;transform:translateY(-10px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes nbell-rowIn    { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes nbell-spin     { to{transform:rotate(360deg)} }
        @keyframes nbell-dotPulse { 0%,100%{opacity:1} 50%{opacity:.35} }

        .nbell-btn { position:relative; width:42px; height:42px; border-radius:50%; border:none; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s ease; flex-shrink:0; }
        .nbell-btn:hover { background:rgba(99,102,241,.08); }
        .nbell-badge { animation: nbell-pop .35s cubic-bezier(.34,1.56,.64,1) both; }
        .nbell-panel { animation: nbell-panelIn .22s cubic-bezier(.16,1,.3,1) both; transform-origin: top right; box-sizing: border-box; }
        .nbell-panel * { box-sizing: border-box; }
        .nbell-row { transition: background .15s ease; cursor: pointer; position: relative; animation: nbell-rowIn .25s ease both; }
        .nbell-row:hover { background:#f8f9fc; }
        .nbell-row-flash { animation: nbell-flash 2.4s ease; }
        .nbell-del { opacity:0; transition: opacity .15s ease, background .15s ease; }
        .nbell-row:hover .nbell-del { opacity:1; }
        .nbell-del:hover { background:#fee2e2 !important; color:#dc2626 !important; }
        .nbell-tab { transition: all .15s ease; cursor:pointer; }
        .nbell-markall { transition: opacity .15s ease; cursor:pointer; }
        .nbell-markall:hover { opacity:.65; }
        .nbell-scroll::-webkit-scrollbar { width:6px; }
        .nbell-scroll::-webkit-scrollbar-thumb { background:#e2e4ea; border-radius:99px; }
        .nbell-scroll::-webkit-scrollbar-track { background:transparent; }
      `}</style>

      <button
        ref={btnRef}
        className="nbell-btn"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <span
          style={{
            fontSize: 21,
            display: "inline-block",
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,.08))",
            animation: justArrivedId ? "nbell-shake .6s ease 1" : "none",
          }}
        >
          🔔
        </span>
        {unreadCount > 0 && (
          <span
            className="nbell-badge"
            style={{
              position: "absolute", top: 1, right: 1, minWidth: 18, height: 18, borderRadius: 999,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 10.5, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
              border: "2px solid white", boxShadow: "0 2px 6px rgba(99,102,241,.45)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop on mobile only — tapping outside closes the panel, and it visually
          separates the full-width sheet from the page content behind it. */}
      {open && coords.isMobile && mounted &&
        createPortal(
          <div
            className="nbell-backdrop"
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 99998 }}
          />,
          document.body
        )}

      {/* The panel itself is portaled to document.body so it can never be clipped
          by a navbar's overflow:hidden or squashed by an ancestor's transform
          creating a new fixed-position containing block. This was the root cause
          of the "thin rectangular box with nothing visible" bug. */}
      {open && mounted && createPortal(panel, document.body)}
    </>
  );
}