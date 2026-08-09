export interface ResetPasswordData {
  email: string
  resetUrl: string
}

export function resetPasswordTemplate(data: ResetPasswordData) {
  return {
    subject: 'Reset your ChefMate password',
    html: `
      <h1>Reset your password</h1>
      <p>We received a request to reset the password for <strong>${data.email}</strong>.</p>
      <p>Click the button below to set a new password. This link expires in 10 minutes.</p>
      <a href="${data.resetUrl}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `,
    text: `Reset your ChefMate password: ${data.resetUrl}\n\nThis link expires in 10 minutes.`,
  }
}
