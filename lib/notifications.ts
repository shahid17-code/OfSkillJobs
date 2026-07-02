// lib/notifications.ts
// ── Shared notification system: types, write helper, and a live React hook. ──

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type NotificationType = "spotlight" | "call";

export type AppNotification = {
  id: string;
  user_id: string;
  from_user_id: string | null;
  type: NotificationType;
  capsule_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  // joined fields, populated client-side after fetch
  from_user?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    company_name: string | null;
  } | null;
  capsule?: {
    title: string | null;
  } | null;
};

const TYPE_META: Record<NotificationType, { icon: string; label: string; color: string; bg: string }> = {
  spotlight: { icon: "🔦", label: "Spotlight", color: "#92400e", bg: "#fef3c7" },
  call: { icon: "📞", label: "Call", color: "#166534", bg: "#dcfce7" },
};
export function getNotificationMeta(type: NotificationType) {
  return TYPE_META[type] || { icon: "🔔", label: "Update", color: "#475569", bg: "#f1f5f9" };
}

/**
 * getNotificationTargetUrl — the single source of truth for "where does clicking
 * this notification go." Previously hardcoded to a nonexistent /capsule/[id] route
 * (404) in multiple places; now centralized here so it only needs fixing once.
 * Routes into The Showfloor with a ?highlight= param that scrolls to and glows
 * the matching capsule card (see TheStage.tsx's highlight effect).
 */
export function getNotificationTargetUrl(n: Pick<AppNotification, "capsule_id">): string {
  return n.capsule_id ? `/the-stage?highlight=${n.capsule_id}` : "/the-stage";
}

/**
 * Writes a notification row. Safe to call fire-and-forget from action handlers
 * (handleSpotlight / handleCall) — never throws, logs on failure so the parent
 * action (which already succeeded) isn't rolled back by a notification hiccup.
 */
export async function notifyUser(params: {
  userId: string;
  fromUserId: string;
  type: NotificationType;
  capsuleId?: string | null;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { userId, fromUserId, type, capsuleId = null, message } = params;
  if (!userId || !fromUserId) return { ok: false, error: "Missing user id(s)" };

  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      from_user_id: fromUserId,
      type,
      capsule_id: capsuleId,
      message,
      read: false,
    });
    if (error) {
      console.error("[notifyUser] insert failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[notifyUser] unexpected error:", err);
    return { ok: false, error: err?.message || "Unknown error" };
  }
}

/** Convenience builders so call sites stay one-liners and copy stays consistent. */
export const NotificationMessages = {
  spotlight: (recruiterName: string, capsuleTitle: string) =>
    `${recruiterName} spotlighted your SkillCapsule "${capsuleTitle}"`,
  call: (recruiterName: string, capsuleTitle: string) =>
    `${recruiterName} is interested in hiring you — check your SkillCapsule "${capsuleTitle}"`,
};

/**
 * useNotifications — fetches the current user's notifications, hydrates
 * sender + capsule info, keeps an unread count, and subscribes to Supabase
 * Realtime so new notifications (and read-state changes from other tabs)
 * appear instantly without a refresh.
 */
export function useNotifications(limit = 30) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const hydrate = useCallback(async (rows: any[]): Promise<AppNotification[]> => {
    if (!rows.length) return [];
    const fromIds = Array.from(new Set(rows.map(r => r.from_user_id).filter(Boolean)));
    const capsuleIds = Array.from(new Set(rows.map(r => r.capsule_id).filter(Boolean)));

    const [{ data: users }, { data: capsules }] = await Promise.all([
      fromIds.length
        ? supabase.from("users").select("id, full_name, username, avatar_url, company_name").in("id", fromIds)
        : Promise.resolve({ data: [] as any[] }),
      capsuleIds.length
        ? supabase.from("skill_capsules").select("id, title").in("id", capsuleIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));
    const capsuleMap = new Map((capsules || []).map((c: any) => [c.id, c]));

    return rows.map((r: any) => ({
      ...r,
      from_user: r.from_user_id ? userMap.get(r.from_user_id) || null : null,
      capsule: r.capsule_id ? capsuleMap.get(r.capsule_id) || null : null,
    }));
  }, []);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    userIdRef.current = user.id;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) { console.error("[useNotifications] fetch failed:", error); setLoading(false); return; }

    const hydrated = await hydrate(data || []);
    setNotifications(hydrated);
    setUnreadCount(hydrated.filter(n => !n.read).length);
    setLoading(false);
  }, [hydrate, limit]);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscription — INSERT (new notification) and UPDATE (read-state sync across tabs).
  // Guarded with `subscribedRef` so this only ever calls .subscribe() ONCE per mount,
  // even if React Strict Mode double-invokes the effect or `hydrate`'s identity changes.
  // Calling .on() after .subscribe() has already fired throws at runtime, which was the
  // root cause of the "cannot add postgres_changes callbacks ... after subscribe()" crash.
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase.channel(`notifications:${user.id}`);

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const [hydrated] = await hydrateRef.current([payload.new]);
          setNotifications(prev => {
            if (prev.some(n => n.id === hydrated.id)) return prev; // de-dupe
            return [hydrated, ...prev].slice(0, limit);
          });
        }
      );

      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => prev.map(n => (n.id === payload.new.id ? { ...n, ...payload.new } : n)));
        }
      );

      channel.on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== (payload.old as any).id));
        }
      );

      if (!cancelled) channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // Intentionally NOT depending on `hydrate` — we read it via hydrateRef instead,
    // so this effect's identity is stable across re-renders and only (re)subscribes
    // when `limit` itself changes (which it practically never does at runtime).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Keep unreadCount perfectly in sync with the notifications array (covers realtime UPDATEs)
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) console.error("[useNotifications] markAsRead failed:", error);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    if (error) console.error("[useNotifications] markAllAsRead failed:", error);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) console.error("[useNotifications] delete failed:", error);
  }, []);

  return { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead, deleteNotification };
}

/**
 * usePushSubscription — manages the browser's Web Push permission + subscription
 * lifecycle. Call `subscribe()` from a user gesture (a settings toggle, a banner
 * button — never on page load unprompted, browsers will ignore/penalize that).
 *
 * Requires:
 *  - public/sw.js registered (this hook registers it automatically)
 *  - NEXT_PUBLIC_VAPID_PUBLIC_KEY set in your env (safe to expose client-side)
 *  - a `push_subscriptions` table (see notifications-offline-setup.sql)
 */
export type PushPermissionState = "unsupported" | "default" | "granted" | "denied";

export function usePushSubscription() {
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermissionState);

    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const existing = await reg?.pushManager.getSubscription();
        setIsSubscribed(!!existing);
      } catch {
        // no-op — getRegistration can throw in some embedded/preview contexts
      }
    })();
  }, []);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (permission === "unsupported") return { ok: false, error: "Push notifications aren't supported in this browser." };
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);
      if (perm !== "granted") return { ok: false, error: "Permission not granted." };

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return { ok: false, error: "Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY." };

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // ✅ FIX: cast to `any` to satisfy TypeScript's strict type checking
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: "Not logged in." };

      const json = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );
      if (error) return { ok: false, error: error.message };

      setIsSubscribed(true);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Subscription failed." };
    } finally {
      setSubscribing(false);
    }
  }, [permission]);

  const unsubscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Unsubscribe failed." };
    }
  }, []);

  return { permission, isSubscribed, subscribing, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}