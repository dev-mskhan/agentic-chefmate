export interface VerifyEmailData {
  email: string
  verifyUrl: string
}

export function verifyEmailTemplate(data: VerifyEmailData) {
  return {
    subject: 'Verify your Foodlancer email',
    html: `
      <h1>Welcome to Foodlancer!</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${data.verifyUrl}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
    text: `Welcome to Foodlancer! Verify your email: ${data.verifyUrl}`,
  }
}
