// Email delivery boundary. With RESEND_API_KEY set, sends through Resend;
// without it, prints the message to the server log — which doubles as the
// lockout recovery path (read the link from Railway's service logs).

export interface SignInEmail {
  to: string;
  link: string;
}

export async function sendSignInLink({ to, link }: SignInEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:log-mode] sign-in link for ${to}: ${link}`);
    return;
  }
  const from = process.env.EMAIL_FROM ?? "TFA Books <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your TFA Books sign-in link",
      text: `Click to sign in to TFA Books (expires in 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`email send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}
