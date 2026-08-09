export interface VerifyEmailData {
  email: string
  verifyUrl: string
}

export function verifyEmailTemplate(data: VerifyEmailData) {
  return {
    subject: 'Verify your ChefMate email',
    html: `
      <h1>Welcome to ChefMate!</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${data.verifyUrl}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Verify Email
      </a>
      <p>This link expires in 20 minutes.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
    text: `Welcome to ChefMate! Verify your email: ${data.verifyUrl}\n\nThis link expires in 20 minutes.`,
  }
}
