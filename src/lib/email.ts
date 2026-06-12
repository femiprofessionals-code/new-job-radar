/**
 * Transactional email via Resend (free tier, REST API — no SDK).
 * Without RESEND_API_KEY, sends are no-ops that log in development.
 */

const FROM = () => process.env.EMAIL_FROM ?? "Job Radar <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${opts.to} subject="${opts.subject}"`);
    }
    return { ok: false, error: "Email is not configured (RESEND_API_KEY missing)." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM(), to: [opts.to], subject: opts.subject, html: opts.html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, error: `Email provider returned ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Email send failed." };
  }
}

/* ── Templates — simple, dark-friendly, inline-styled ── */

function shell(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0a0a0f;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="font-size:15px;font-weight:700;color:#ededf2;margin:0 0 24px">Job<span style="color:#34e29a">Radar</span></p>
    <div style="background:#111118;border:1px solid #23232f;border-radius:14px;padding:28px">
      <h1 style="font-size:18px;color:#ededf2;margin:0 0 12px">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#9b9ba8">${bodyHtml}</div>
      ${ctaLabel && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:20px;background:#34e29a;color:#000;font-weight:600;font-size:14px;padding:10px 20px;border-radius:9px;text-decoration:none">${ctaLabel}</a>` : ""}
    </div>
    <p style="font-size:11px;color:#62626f;margin-top:16px">Job Radar — the career acceleration platform. Every feature optimizes one outcome: getting you to interviews faster.</p>
  </div></body></html>`;
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return {
    subject: "Reset your Job Radar password",
    html: shell(
      `Reset your password`,
      `<p>Hi ${name.split(" ")[0]},</p><p>We received a request to reset your Job Radar password. This link is valid for <strong style="color:#ededf2">1 hour</strong> and can be used once.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      "Choose a new password",
      resetUrl
    ),
  };
}

export function welcomeEmail(name: string, appUrl: string) {
  return {
    subject: "Your radar is live — welcome to Job Radar",
    html: shell(
      `Welcome, ${name.split(" ")[0]} 🎯`,
      `<p>Your account is ready. Three things that move the needle fastest:</p>
       <p>1. <strong style="color:#ededf2">Complete your profile</strong> — every job gets scored with your personal interview probability.<br>
       2. <strong style="color:#ededf2">Add your master resume</strong> — unlocks per-job tailoring and ATS reports.<br>
       3. <strong style="color:#ededf2">Apply top-down</strong> — fresh, high-probability postings convert 3–4× better.</p>`,
      "Open your dashboard",
      `${appUrl}/dashboard`
    ),
  };
}

export function reviewDeliveredEmail(name: string, expertName: string, appUrl: string) {
  return {
    subject: `${expertName} delivered your review`,
    html: shell(
      `Your expert review is ready`,
      `<p>Hi ${name.split(" ")[0]},</p><p><strong style="color:#ededf2">${expertName}</strong> just delivered your review — a scorecard plus prioritized fixes. Apply the suggestions before your next applications, then accept the review to release payment.</p>`,
      "Read the feedback",
      `${appUrl}/experts?tab=reviews`
    ),
  };
}
