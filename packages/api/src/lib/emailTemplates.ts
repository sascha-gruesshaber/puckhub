// ─── Color palette ───────────────────────────────────────────────────────────

const C = {
  bg: "#f8f9fa",
  card: "#ffffff",
  dark: "#0C1929",
  accent: "#F4D35E",
  text: "#1a1a2e",
  muted: "#6b7280",
  light: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  success: "#059669",
  successBg: "#ecfdf5",
  info: "#2563eb",
  infoBg: "#eff6ff",
  warn: "#d97706",
  warnBg: "#fffbeb",
} as const

// ─── Shared layout ──────────────────────────────────────────────────────────

function layout(content: string, options?: { preheader?: string }) {
  const preheader = options?.preheader
    ? `<div style="display:none;font-size:1px;color:#f8f9fa;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.preheader}</div>`
    : ""

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-spacing:0; border-collapse:collapse; }
    td { padding:0; }
    img { border:0; display:block; }
    a { color:${C.info}; }
    @media only screen and (max-width:520px) {
      .container { width:100% !important; padding:16px !important; }
      .content { padding:24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:${C.bg};color:${C.text};line-height:1.5;">
  ${preheader}
  <table role="presentation" width="100%" style="background:${C.bg};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" class="container" width="480" style="max-width:480px;width:100%;">

        <!-- Header -->
        <tr><td style="background:${C.dark};padding:28px 32px;border-radius:16px 16px 0 0;text-align:center;">
          <table role="presentation" width="100%"><tr>
            <td align="center">
              <span style="font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${C.accent};">PUCKHUB</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td class="content" style="background:${C.card};padding:36px 32px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:${C.card};padding:20px 32px;border-top:1px solid ${C.borderLight};border-radius:0 0 16px 16px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};border-bottom:1px solid ${C.border};">
          <table role="presentation" width="100%"><tr>
            <td align="center">
              <p style="margin:0;font-size:11px;color:${C.light};">PuckHub &mdash; Ice Hockey League Management</p>
              <p style="margin:6px 0 0;font-size:11px;color:${C.light};">This is an automated message. Please do not reply.</p>
            </td>
          </tr></table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Reusable blocks ─────────────────────────────────────────────────────────

function heading(text: string) {
  return `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:${C.text};line-height:1.3;">${text}</h1>`
}

function paragraph(text: string) {
  return `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:${C.muted};">${text}</p>`
}

function button(label: string, url: string) {
  return `<table role="presentation" width="100%" style="margin:28px 0;"><tr><td align="center">
    <a href="${url}" target="_blank" style="display:inline-block;background:${C.accent};color:${C.dark};font-weight:700;font-size:14px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;mso-padding-alt:0;text-align:center;">
      <!--[if mso]><i style="letter-spacing:36px;mso-font-width:-100%;mso-text-raise:28pt;">&nbsp;</i><![endif]-->
      <span style="mso-text-raise:14pt;">${label}</span>
      <!--[if mso]><i style="letter-spacing:36px;mso-font-width:-100%;">&nbsp;</i><![endif]-->
    </a>
  </td></tr></table>`
}

function codeBlock(code: string) {
  return `<table role="presentation" width="100%" style="margin:28px 0;"><tr><td align="center">
    <div style="display:inline-block;background:${C.borderLight};border:2px dashed ${C.border};border-radius:12px;padding:20px 40px;text-align:center;">
      <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:${C.text};font-family:'Courier New',Courier,monospace;">${code}</span>
    </div>
  </td></tr></table>`
}

function infoBox(text: string, variant: "success" | "info" | "warn" = "info") {
  const colors = {
    success: { bg: C.successBg, border: C.success, text: C.success },
    info: { bg: C.infoBg, border: C.info, text: C.info },
    warn: { bg: C.warnBg, border: C.warn, text: C.warn },
  }
  const c = colors[variant]
  return `<div style="background:${c.bg};border-left:4px solid ${c.border};border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
    <p style="margin:0;font-size:13px;line-height:1.6;color:${c.text};">${text}</p>
  </div>`
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:${C.light};white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;font-weight:600;color:${C.text};vertical-align:top;">${value}</td>
  </tr>`
}

function detailsTable(rows: Array<{ label: string; value: string }>) {
  return `<table role="presentation" width="100%" style="margin:20px 0;background:${C.borderLight};border-radius:10px;overflow:hidden;">
    ${rows.map((r) => detailRow(r.label, r.value)).join("")}
  </table>`
}

function scoreBanner(homeTeam: string, homeScore: number, awayScore: number, awayTeam: string) {
  return `<table role="presentation" width="100%" style="margin:20px 0;"><tr><td align="center">
    <div style="display:inline-block;background:${C.dark};border-radius:12px;padding:20px 32px;text-align:center;">
      <table role="presentation"><tr>
        <td style="padding:0 16px;text-align:right;">
          <span style="font-size:13px;font-weight:700;color:${C.light};text-transform:uppercase;letter-spacing:1px;">${homeTeam}</span>
        </td>
        <td style="padding:0 8px;">
          <span style="font-size:32px;font-weight:900;color:${C.accent};letter-spacing:4px;font-family:'Courier New',Courier,monospace;">${homeScore}&thinsp;:&thinsp;${awayScore}</span>
        </td>
        <td style="padding:0 16px;text-align:left;">
          <span style="font-size:13px;font-weight:700;color:${C.light};text-transform:uppercase;letter-spacing:1px;">${awayTeam}</span>
        </td>
      </tr></table>
    </div>
  </td></tr></table>`
}

function muted(text: string) {
  return `<p style="margin:24px 0 0;font-size:12px;color:${C.light};line-height:1.5;">${text}</p>`
}

// ─── Email templates ─────────────────────────────────────────────────────────

/** Magic link sign-in email */
export function magicLinkEmail(url: string) {
  return layout(
    [
      heading("Sign in to PuckHub"),
      paragraph(
        "Click the button below to access your account. This link expires in 10 minutes and can only be used once.",
      ),
      button("Sign in", url),
      muted("If you didn't request this login link, you can safely ignore this email. Your account is secure."),
    ].join(""),
    { preheader: "Your PuckHub login link is ready" },
  )
}

/** Organization invitation email */
export function inviteEmail(url: string, orgName?: string) {
  const title = orgName ? `You've been invited to ${orgName}` : "Welcome to PuckHub"
  const desc = orgName
    ? `You've been added to <strong>${orgName}</strong> on PuckHub. Click below to set up your account and start managing your league.`
    : "Your PuckHub account has been created. Click below to sign in and get started."
  return layout(
    [
      heading(title),
      paragraph(desc),
      button("Accept invitation", url),
      muted("This invitation link expires in 10 minutes. If you didn't expect this, you can safely ignore it."),
    ].join(""),
    { preheader: orgName ? `Join ${orgName} on PuckHub` : "Your PuckHub account is ready" },
  )
}

/** OTP verification code for public game report */
export function otpEmail(code: string) {
  return layout(
    [
      heading("Your verification code"),
      paragraph("Enter this code to confirm your game report submission. It expires in 10 minutes."),
      codeBlock(code),
      muted(
        "If you didn't request this code, someone may have entered your email address by mistake. You can safely ignore this email.",
      ),
    ].join(""),
    { preheader: `Your code: ${code}` },
  )
}

/** OTP verification code for contact form */
export function contactOtpEmail(code: string) {
  return layout(
    [
      heading("Your verification code"),
      paragraph("Enter this code to verify your email address and submit your contact request. It expires in 10 minutes."),
      codeBlock(code),
      muted(
        "If you didn't request this code, someone may have entered your email address by mistake. You can safely ignore this email.",
      ),
    ].join(""),
    { preheader: `Your code: ${code}` },
  )
}

/** Admin notification: new contact form submission */
export function contactNotificationEmail(opts: {
  name: string
  email: string
  type: string
  message: string
}) {
  return layout(
    [
      heading("New Contact Request"),
      paragraph(
        "Someone has submitted a contact request through the PuckHub website.",
      ),
      detailsTable([
        { label: "Name", value: opts.name },
        { label: "Email", value: opts.email },
        { label: "Type", value: opts.type },
      ]),
      `<div style="background:${C.borderLight};border-radius:10px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${C.light};">Message</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:${C.text};white-space:pre-wrap;">${opts.message}</p>
      </div>`,
      infoBox("You can reply directly to the sender at the email address above.", "info"),
    ].join(""),
    {
      preheader: `${opts.type} from ${opts.name} (${opts.email})`,
    },
  )
}

/** Admin notification: new public game report submitted */
export function adminReportNotificationEmail(opts: {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  submitterEmailMasked: string
  comment?: string | null
}) {
  return layout(
    [
      heading("New Public Game Report"),
      paragraph(
        "A visitor has submitted a game result from the league website. The score has been applied automatically.",
      ),
      scoreBanner(opts.homeTeam, opts.homeScore, opts.awayScore, opts.awayTeam),
      detailsTable([
        { label: "Submitted by", value: opts.submitterEmailMasked },
        ...(opts.comment ? [{ label: "Comment", value: opts.comment }] : []),
      ]),
      infoBox("You can review and revert this report in the admin panel under Games → Public Reports.", "info"),
    ].join(""),
    {
      preheader: `${opts.homeTeam} ${opts.homeScore}:${opts.awayScore} ${opts.awayTeam} — submitted by ${opts.submitterEmailMasked}`,
    },
  )
}
