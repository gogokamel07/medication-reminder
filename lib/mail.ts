// Sends one email. Uses Brevo (free tier, any recipient) when BREVO_API_KEY is set, else Resend (test sender, owner only).
export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  if (process.env.BREVO_API_KEY) {
    const email = process.env.MAIL_FROM_EMAIL || "gogokamel07@gmail.com";
    const name = process.env.MAIL_FROM_NAME || "Dawaa Reminder";
    return fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name, email }, to: [{ email: opts.to }], subject: opts.subject, htmlContent: opts.html }),
    });
  }
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM || "Dawaa Reminder <onboarding@resend.dev>", to: [opts.to], subject: opts.subject, html: opts.html }),
  });
}
