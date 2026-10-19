import { Resend } from "resend";

/** Sends the rendered issue HTML as an email via Resend. */
export async function sendIssueEmail({ html, date, to, from }) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: from ?? "PHP Weekly Redesign <onboarding@resend.dev>",
    to,
    subject: `PHP Weekly — ${date}`,
    html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }

  return data;
}
