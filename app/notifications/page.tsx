"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useNotifications,
  getNotificationMeta,
  getNotificationTargetUrl,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

/* ════════════════════════════════════════════════════════════════
   "THE STACK" — a swipeable, digest-grouped notification system.

   Concept: instead of a flat inbox list, related notifications about
   the same SkillCapsule within a short window are grouped into one
   "digest" card ("3 recruiters engaged with this capsule"). Each card
   sits in a swipeable deck — swipe right to clear, swipe left to
   dismiss, tap to jump straight to the capsule on The Showfloor.
   Cleared cards drop into a compact history strip below the deck,
   so nothing is ever silently lost.
   ════════════════════════════════════════════════════════════════ */

type DigestGroup = {
  key: string;
  capsuleId: string | null;
  capsuleTitle: string | null;
  items: AppNotification[];
  latestAt: string;
  hasUnread: boolean;
  types: NotificationType[];
};

const DIGEST_WINDOW_MS = 1000 * 60 * 60 * 3; // notifications on the same capsule within 3h merge

function buildDigests(notifications: AppNotification[]): DigestGroup[] {
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const groups: DigestGroup[] = [];

  for (const n of sorted) {
    const groupKeyBase = n.capsule_id || `solo-${n.id}`;
    const existing = groups.find(g => {
      if (g.capsuleId !== n.capsule_id) return false;
      if (!n.capsule_id) return false; // notifications without a capsule never merge
      const timeDiff = Math.abs(new Date(g.latestAt).getTime() - new Date(n.created_at).getTime());
      return timeDiff <= DIGEST_WINDOW_MS;
    });

    if (existing) {
      existing.items.push(n);
      if (new Date(n.created_at) > new Date(existing.latestAt)) existing.latestAt = n.created_at;
      if (!n.read) existing.hasUnread = true;
      if (!existing.types.includes(n.type)) existing.types.push(n.type);
    } else {
      groups.push({
        key: `${groupKeyBase}-${n.id}`,
        capsuleId: n.capsule_id,
        capsuleTitle: n.capsule?.title || null,
        items: [n],
        latestAt: n.created_at,
        hasUnread: !n.read,
        types: [n.type],
      });
    }
  }

  return groups.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function senderLabel(n: AppNotification): string {
  return n.from_user?.company_name || n.from_user?.full_name || (n.from_user?.username ? `@${n.from_user.username}` : "Someone");
}

function digestHeadline(group: DigestGroup): string {
  const count = group.items.length;
  const spotlights = group.items.filter(i => i.type === "spotlight").length;
  const calls = group.items.filter(i => i.type === "call").length;

  if (count === 1) return group.items[0].message;

  const parts: string[] = [];
  if (spotlights > 0) parts.push(`${spotlights} Spotlight${spotlights > 1 ? "s" : ""}`);
  if (calls > 0) parts.push(`${calls} Call${calls > 1 ? "s" : ""}`);
  const uniqueSenders = new Set(group.items.map(i => senderLabel(i))).size;

  return `${parts.join(" + ")} from ${uniqueSenders} recruiter${uniqueSenders > 1 ? "s" : ""}`;
}

type SwipeDir = "left" | "right" | null;

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead } = useNotifications(150);
  const [userId, setUserId] = useState<string | null>(null);

  const [clearedKeys, setClearedKeys] = useState<Set<string>>(new Set());
  const [clearedKeysLoaded, setClearedKeysLoaded] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{ key: string; dx: number } | null>(null);
  const dragStartRef = useRef<{ x: number; key: string } | null>(null);
  const [flyOut, setFlyOut] = useState<{ key: string; dir: SwipeDir } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // ── Load user ID and cleared keys from DB ──────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from("users")
        .select("cleared_notification_keys")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Failed to load cleared keys:", error);
        setClearedKeys(new Set());
        setClearedKeysLoaded(true);
        return;
      }

      const keys = data?.cleared_notification_keys || [];
      setClearedKeys(new Set(keys));
      setClearedKeysLoaded(true);
    })();
  }, []);

  // ── Save cleared keys to DB whenever they change ────────────────────
  const saveClearedKeys = async (keys: Set<string>) => {
    if (!userId) return;
    const keysArray = Array.from(keys);
    const { error } = await supabase
      .from("users")
      .update({ cleared_notification_keys: keysArray })
      .eq("id", userId);

    if (error) console.error("Failed to save cleared keys:", error);
  };

  // ── When clearedKeys changes, persist to DB ────────────────────────
  useEffect(() => {
    if (!clearedKeysLoaded || !userId) return;
    saveClearedKeys(clearedKeys);
  }, [clearedKeys, clearedKeysLoaded, userId]);

  const digests = useMemo(() => buildDigests(notifications), [notifications]);
  const stack = digests.filter(g => !clearedKeys.has(g.key));
  const history = digests.filter(g => clearedKeys.has(g.key));

  const topCard = stack[0];
  const nextCards = stack.slice(1, 4);

  function clearGroup(group: DigestGroup, dir: SwipeDir) {
    setFlyOut({ key: group.key, dir });
    setTimeout(() => {
      setClearedKeys(prev => new Set(prev).add(group.key));
      setFlyOut(null);
      setActiveDrag(null);
      group.items.filter(i => !i.read).forEach(i => markAsRead(i.id));
    }, 260);
  }

  function handleOpenCapsule(group: DigestGroup) {
    group.items.filter(i => !i.read).forEach(i => markAsRead(i.id));
    router.push(getNotificationTargetUrl({ capsule_id: group.capsuleId }));
  }

  function onPointerDown(e: React.PointerEvent, key: string) {
    dragStartRef.current = { x: e.clientX, key };
    setActiveDrag({ key, dx: 0 });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    setActiveDrag({ key: dragStartRef.current.key, dx });
  }
  function onPointerUp(group: DigestGroup) {
    const drag = activeDrag;
    if (!drag || drag.key !== group.key) { dragStartRef.current = null; return; }
    const threshold = 90;
    if (drag.dx > threshold) clearGroup(group, "right");
    else if (drag.dx < -threshold) clearGroup(group, "left");
    else setActiveDrag(null);
    dragStartRef.current = null;
  }

  function restoreFromHistory(key: string) {
    setClearedKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  const drag = activeDrag;
  const dx = drag && topCard && drag.key === topCard.key ? drag.dx : 0;
  const rotation = dx / 18;
  const rightOpacity = Math.min(Math.max(dx / 90, 0), 1);
  const leftOpacity = Math.min(Math.max(-dx / 90, 0), 1);

  const isLoading = loading || !clearedKeysLoaded;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes ns-fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ns-flyRight { to { transform: translateX(140%) rotate(18deg); opacity:0; } }
        @keyframes ns-flyLeft { to { transform: translateX(-140%) rotate(-18deg); opacity:0; } }
        @keyframes ns-cardIn { from{opacity:0;transform:translateY(18px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ns-shimmer { 0%{background-position:-300% 0} 100%{background-position:300% 0} }

        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .ns-page { font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
        .ns-fly-right { animation: ns-flyRight .26s ease forwards; }
        .ns-fly-left { animation: ns-flyLeft .26s ease forwards; }
        .ns-card-anim { animation: ns-cardIn .4s cubic-bezier(.2,.8,.2,1) both; }
        .ns-btn { cursor:pointer; transition: transform .15s ease, box-shadow .15s ease; border:none; }
        .ns-btn:hover { transform: translateY(-2px); }
        .ns-btn:active { transform: scale(.96); }
        .ns-history-row { transition: background .15s ease; cursor:pointer; }
        .ns-history-row:hover { background:#f8f9fc; }
        .ns-history-toggle { cursor:pointer; transition: opacity .15s; }
        .ns-history-toggle:hover { opacity:.7; }
        .ns-shimmer-bg { background: linear-gradient(90deg,#f1f2f6 25%,#e7e9f0 50%,#f1f2f6 75%); background-size:300% 100%; animation: ns-shimmer 1.4s infinite; }

        .ns-deck { position: relative; height: 420px; }
        .ns-deck-card {
          position: absolute; inset: 0; border-radius: 24px; background: white;
          box-shadow: 0 20px 48px -12px rgba(15,23,42,.18), 0 0 0 1px rgba(15,23,42,.04);
          display: flex; flex-direction: column; touch-action: none; user-select: none;
          overflow: hidden;
        }
        .ns-swipe-hint { position:absolute; top:24px; font-size:13px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:6px 14px; border-radius:999px; pointer-events:none; }

        @media (max-width: 600px) {
          .ns-deck { height: 380px; }
          .ns-header-row { flex-direction:column !important; align-items:flex-start !important; gap:8px !important; }
          .ns-stats-row { width:100%; }
        }
        @media (max-width: 380px) {
          .ns-deck { height: 360px; }
        }
      `}</style>

      <div className="ns-page" style={{ maxWidth: 580, margin: "0 auto", padding: "28px 16px 80px" }}>

        {/* Header */}
        <div className="ns-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 25, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
              The Stack
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {unreadCount > 0 ? `${unreadCount} unread · swipe to clear` : "You're all caught up"}
            </p>
          </div>
          <div className="ns-stats-row" style={{ display: "flex", gap: 8 }}>
            <div style={{ background: "#fef3c7", color: "#92400e", padding: "6px 12px", borderRadius: 12, fontSize: 12.5, fontWeight: 800, flex: 1, textAlign: "center" }}>
              🔦 {notifications.filter(n => n.type === "spotlight").length}
            </div>
            <div style={{ background: "#dcfce7", color: "#166534", padding: "6px 12px", borderRadius: 12, fontSize: 12.5, fontWeight: 800, flex: 1, textAlign: "center" }}>
              📞 {notifications.filter(n => n.type === "call").length}
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: "grid", gap: 12 }}>
            {[0, 1].map(i => (
              <div key={i} className="ns-shimmer-bg" style={{ height: 140, borderRadius: 24 }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && stack.length === 0 && history.length === 0 && (
          <div style={{ textAlign: "center", padding: "70px 20px", background: "white", borderRadius: 24, border: "1px dashed #dbe3ee" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🪄</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>The Stack is empty</h3>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13.5 }}>
              When recruiters Spotlight or Call you, cards will appear here to swipe through.
            </p>
            <Link href="/the-stage" style={{ textDecoration: "none" }}>
              <button className="ns-btn" style={{ background: "#0f172a", color: "white", padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
                Browse The Showfloor →
              </button>
            </Link>
          </div>
        )}

        {/* All cleared, but history exists */}
        {!isLoading && stack.length === 0 && history.length > 0 && (
          <div style={{ textAlign: "center", padding: "56px 20px", background: "linear-gradient(135deg,#f0fdf4,#eff6ff)", borderRadius: 24, border: "1px solid #bbf7d0", marginBottom: 22 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>✨</div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Stack cleared!</h3>
            <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>Nice work staying on top of things.</p>
          </div>
        )}

        {/* The swipeable deck */}
        {!isLoading && stack.length > 0 && (
          <>
            <div className="ns-deck" style={{ marginBottom: 18 }}>
              {nextCards.slice().reverse().map((g, revIdx) => {
                const depth = nextCards.length - revIdx;
                return (
                  <div
                    key={g.key}
                    className="ns-deck-card"
                    style={{
                      transform: `translateY(${depth * 8}px) scale(${1 - depth * 0.035})`,
                      zIndex: 10 - depth,
                      opacity: 1 - depth * 0.12,
                    }}
                  />
                );
              })}

              {topCard && (
                <TopCard
                  key={topCard.key}
                  group={topCard}
                  dx={dx}
                  rotation={rotation}
                  flyOut={flyOut?.key === topCard.key ? flyOut.dir : null}
                  rightOpacity={rightOpacity}
                  leftOpacity={leftOpacity}
                  onPointerDown={(e) => onPointerDown(e, topCard.key)}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => onPointerUp(topCard)}
                  onOpen={() => handleOpenCapsule(topCard)}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 28 }}>
              <button
                className="ns-btn"
                onClick={() => topCard && clearGroup(topCard, "left")}
                aria-label="Dismiss"
                style={{ width: 54, height: 54, borderRadius: "50%", background: "white", boxShadow: "0 6px 18px rgba(220,38,38,.18)", fontSize: 22, color: "#dc2626" }}
              >
                ✕
              </button>
              <button
                className="ns-btn"
                onClick={() => topCard && handleOpenCapsule(topCard)}
                aria-label="View capsule"
                style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 22px rgba(99,102,241,.4)", fontSize: 24, color: "white" }}
              >
                👁
              </button>
              <button
                className="ns-btn"
                onClick={() => topCard && clearGroup(topCard, "right")}
                aria-label="Clear"
                style={{ width: 54, height: 54, borderRadius: "50%", background: "white", boxShadow: "0 6px 18px rgba(22,163,74,.18)", fontSize: 22, color: "#16a34a" }}
              >
                ✓
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: -10, marginBottom: 26 }}>
              {stack.length} card{stack.length !== 1 ? "s" : ""} left · swipe or tap a button
            </p>
          </>
        )}

        {/* History strip */}
        {history.length > 0 && (
          <div>
            <div
              className="ns-history-toggle"
              onClick={() => setShowHistory(s => !s)}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: showHistory ? 12 : 0 }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Cleared ({history.length})
              </span>
              <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span style={{ fontSize: 12, color: "#94a3b8", transform: showHistory ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
            </div>
            {showHistory && (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden" }}>
                {history.map((g, i) => (
                  <div
                    key={g.key}
                    className="ns-history-row"
                    onClick={() => restoreFromHistory(g.key)}
                    title="Click to bring back to the stack"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: i > 0 ? "1px solid #f8fafc" : "none" }}
                  >
                    <span style={{ fontSize: 14, opacity: 0.6 }}>{getNotificationMeta(g.items[0].type).icon}</span>
                    <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 12.5, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {digestHeadline(g)}
                    </p>
                    <span style={{ fontSize: 11, color: "#cbd5e1", flexShrink: 0 }}>{timeAgo(g.latestAt)}</span>
                    <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, flexShrink: 0 }}>↺</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}

function TopCard({
  group, dx, rotation, flyOut, rightOpacity, leftOpacity,
  onPointerDown, onPointerMove, onPointerUp, onOpen,
}: {
  group: DigestGroup;
  dx: number;
  rotation: number;
  flyOut: SwipeDir;
  rightOpacity: number;
  leftOpacity: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onOpen: () => void;
}) {
  const isDigest = group.items.length > 1;
  const primaryType = group.types[0];
  const meta = getNotificationMeta(primaryType);
  const uniqueSenders = Array.from(new Set(group.items.map(i => senderLabel(i)))).slice(0, 3);

  return (
    <div
      className={`ns-deck-card ns-card-anim ${flyOut === "right" ? "ns-fly-right" : flyOut === "left" ? "ns-fly-left" : ""}`}
      style={{
        zIndex: 20,
        transform: flyOut ? undefined : `translateX(${dx}px) rotate(${rotation}deg)`,
        transition: dx === 0 ? "transform .25s ease" : "none",
        cursor: "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div className="ns-swipe-hint" style={{ left: 20, background: "#dcfce7", color: "#166534", opacity: rightOpacity }}>
        ✓ CLEAR
      </div>
      <div className="ns-swipe-hint" style={{ right: 20, background: "#fee2e2", color: "#991b1b", opacity: leftOpacity }}>
        ✕ DISMISS
      </div>

      <div style={{ padding: "28px 26px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <span style={{ background: meta.bg, color: meta.color, fontSize: 12, fontWeight: 800, padding: "5px 12px", borderRadius: 999, display: "flex", alignItems: "center", gap: 5 }}>
            {meta.icon} {isDigest ? "Digest" : meta.label}
          </span>
          {isDigest && (
            <span style={{ background: "#eef2ff", color: "#6366f1", fontSize: 11.5, fontWeight: 800, padding: "5px 10px", borderRadius: 999 }}>
              {group.items.length} updates
            </span>
          )}
        </div>

        <div style={{ display: "flex", marginBottom: 16 }}>
          {(isDigest ? uniqueSenders : [senderLabel(group.items[0])]).map((label, i) => {
            const item = group.items.find(it => senderLabel(it) === label) || group.items[0];
            return item.from_user?.avatar_url ? (
              <img
                key={i}
                src={item.from_user.avatar_url}
                alt=""
                style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", marginLeft: i > 0 ? -14 : 0, border: "3px solid white", boxShadow: "0 2px 6px rgba(0,0,0,.08)" }}
              />
            ) : (
              <div
                key={i}
                style={{
                  width: 52, height: 52, borderRadius: "50%", marginLeft: i > 0 ? -14 : 0,
                  background: `linear-gradient(135deg,${meta.bg},white)`, color: meta.color,
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18,
                  border: "3px solid white", boxShadow: "0 2px 6px rgba(0,0,0,.08)",
                }}
              >
                {label.replace("@", "")[0]?.toUpperCase() || "?"}
              </div>
            );
          })}
        </div>

        <p style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>
          {digestHeadline(group)}
        </p>

        {group.capsuleTitle && (
          <p style={{ margin: "0 0 4px", fontSize: 13.5, color: "#6366f1", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            📎 {group.capsuleTitle}
          </p>
        )}

        <p style={{ margin: "auto 0 12px", fontSize: 12, color: "#94a3b8" }}>{timeAgo(group.latestAt)}</p>

        <button
          onClick={onOpen}
          className="ns-btn"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 14,
            background: "linear-gradient(135deg,#0f172a,#1e293b)",
            color: "white",
            fontWeight: 500,
            fontSize: 13.5,
            marginTop: "auto",
          }}
        >
          View on The Showfloor →
        </button>
      </div>
    </div>
  );
}