// ============================================================================
//  MAILER (stub)
//  Real email means a provider (Resend, AWS SES). Until that's wired, this logs
//  the message to the server console so the flows are fully testable. Swap the
//  body of sendEmail() for a provider call later — nothing else changes.
// ============================================================================

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // TODO: replace with Resend/SES. e.g. await resend.emails.send({ to, subject, html: body })
  console.log(`\n[email:stub] → ${to}\n  subject: ${subject}\n  ${body}\n`);
}

export function verifyEmailLink(token: string): string {
  return `${appUrl()}/verify-email?token=${token}`;
}

export function resetPasswordLink(token: string): string {
  return `${appUrl()}/reset-password?token=${token}`;
}

/** In non-production, we also hand the link back in the API response so you can
 *  test without a real mailbox. Never do this in production. */
export function devReveal(link: string): { devLink?: string } {
  return process.env.NODE_ENV === "production" ? {} : { devLink: link };
}
