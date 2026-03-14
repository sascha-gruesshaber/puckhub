function wrapper(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0C1929;padding:24px 32px;text-align:center;">
      <span style="color:#F4D35E;font-weight:800;font-size:24px;">PuckHub</span>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
      <span style="color:#a1a1aa;font-size:12px;">PuckHub &mdash; Ice Hockey League Management</span>
    </div>
  </div>
</body>
</html>`
}

export function magicLinkEmail(url: string) {
  return wrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Sign in to PuckHub</h2>
    <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to sign in. This link is valid for 10 minutes.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#F4D35E;color:#0C1929;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Sign in
      </a>
    </div>
    <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `)
}

export function inviteEmail(url: string, orgName?: string) {
  const orgText = orgName ? ` to <strong>${orgName}</strong>` : ""
  return wrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">You've been invited${orgText}</h2>
    <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to set up your account and sign in. This link is valid for 10 minutes.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#F4D35E;color:#0C1929;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Accept invitation
      </a>
    </div>
    <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `)
}
