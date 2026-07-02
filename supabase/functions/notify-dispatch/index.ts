// supabase/functions/notify-dispatch/index.ts
//
// Triggered by a Database Webhook on INSERT into public.notifications.
// Sends, in parallel, fire-and-forget:
//   1. An email via Resend
//   2. A Web Push notification to every subscribed device for that user
//
// Deploy with:  supabase functions deploy notify-dispatch
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL          e.g. "OfSkillJob <notifications@yourdomain.com>"
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT              e.g. "mailto:you@yourdomain.com"
//   NOTIFY_DISPATCH_SECRET     shared secret, must match the webhook header
//   SUPABASE_URL               (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY  (set manually — needed to read users/push_subscriptions
//                               bypassing RLS, since this runs with no user session)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "OfSkillJob <notifications@ofskilljob.com>";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@ofskilljob.com";
const NOTIFY_DISPATCH_SECRET = Deno.env.get("NOTIFY_DISPATCH_SECRET");
const SITE_URL = Deno.env.get("SITE_URL") || "https://ofskilljob.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type NotificationRow = {
  id: string;
  user_id: string;
  from_user_id: string | null;
  type: "spotlight" | "call";
  capsule_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
};

const TYPE_LABEL: Record<string, { label: string; emoji: string }> = {
  spotlight: { label: "Spotlight", emoji: "🔦" },
  call: { label: "Call", emoji: "📞" },
};

Deno.serve(async (req: Request) => {
  // ── Verify the shared secret so random internet traffic can't trigger sends ──
  if (NOTIFY_DISPATCH_SECRET) {
    const auth = req.headers.get("authorization") || "";
    const provided = auth.replace(/^Bearer\s+/i, "");
    if (provided !== NOTIFY_DISPATCH_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  let payload: { record?: NotificationRow };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const notification = payload.record;
  if (!notification) {
    return new Response(JSON.stringify({ error: "Missing record" }), { status: 400 });
  }

  const results = await Promise.allSettled([
    sendEmail(notification),
    sendWebPush(notification),
  ]);

  const [emailResult, pushResult] = results;
  return new Response(
    JSON.stringify({
      ok: true,
      email: emailResult.status === "fulfilled" ? emailResult.value : { error: String(emailResult.reason) },
      push: pushResult.status === "fulfilled" ? pushResult.value : { error: String(pushResult.reason) },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

// ── Email via Resend ────────────────────────────────────────────────
async function sendEmail(notification: NotificationRow) {
  const { data: recipient, error } = await supabase
    .from("users")
    .select("email, full_name, username")
    .eq("id", notification.user_id)
    .single();

  if (error || !recipient?.email) {
    return { skipped: true, reason: "No recipient email on file" };
  }

  const meta = TYPE_LABEL[notification.type] || { label: "Update", emoji: "🔔" };
  const greetingName = recipient.full_name?.split(" ")[0] || recipient.username || "there";
  const capsuleUrl = notification.capsule_id ? `${SITE_URL}/capsule/${notification.capsule_id}` : `${SITE_URL}/notifications`;

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a;">
      <p style="font-size:13px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 18px;">${meta.emoji} ${meta.label}</p>
      <h2 style="font-size:20px;font-weight:800;margin:0 0 14px;">Hi ${greetingName},</h2>
      <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 26px;">${escapeHtml(notification.message)}</p>
      <a href="${capsuleUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View on OfSkillJob →</a>
      <p style="font-size:12px;color:#94a3b8;margin-top:32px;">You're receiving this because you have an OfSkillJob account. Manage notification preferences in your account settings.</p>
    </div>
  `.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: recipient.email,
      subject: `${meta.emoji} ${meta.label} on OfSkillJob`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error (${res.status}): ${text}`);
  }
  return { sent: true, to: recipient.email };
}

// ── Web Push to every registered device for this user ───────────────
async function sendWebPush(notification: NotificationRow) {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id);

  if (error) throw error;
  if (!subs || subs.length === 0) return { skipped: true, reason: "No push subscriptions" };

  const meta = TYPE_LABEL[notification.type] || { label: "Update", emoji: "🔔" };
  const pushPayload = JSON.stringify({
    title: `${meta.emoji} ${meta.label} on OfSkillJob`,
    body: notification.message,
    url: notification.capsule_id ? `/capsule/${notification.capsule_id}` : "/notifications",
    tag: notification.id,
  });

  const outcomes = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        );
        return { id: sub.id, sent: true };
      } catch (err: any) {
        // 410/404 means the subscription is dead (browser unsubscribed, uninstalled, etc.)
        // — clean it up so future sends don't keep failing against it.
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          return { id: sub.id, removed: true };
        }
        throw err;
      }
    })
  );

  return {
    attempted: subs.length,
    sent: outcomes.filter(o => o.status === "fulfilled" && (o.value as any).sent).length,
    removed: outcomes.filter(o => o.status === "fulfilled" && (o.value as any).removed).length,
    failed: outcomes.filter(o => o.status === "rejected").length,
  };
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}