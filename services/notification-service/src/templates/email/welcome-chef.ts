export interface WelcomeChefData {
  email?: string
}

export function welcomeChefTemplate(_data?: WelcomeChefData) {
  const dashboardUrl = `${process.env['APP_URL'] ?? 'http://localhost:3000'}/chef/dashboard`

  return {
    subject: "You're now a chef on ChefMate! 🎉",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h1 style="color:#f97316;">Congratulations, Chef!</h1>
        <p>Your account has been upgraded to Chef status on ChefMate.</p>
        <p>You can now:</p>
        <ul>
          <li>Create dishes and meal plans</li>
          <li>Set your cooking schedule and availability</li>
          <li>Start receiving orders from customers</li>
        </ul>
        <a href="${dashboardUrl}"
           style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px;">
          Go to Chef Dashboard
        </a>
        <p style="color:#888;font-size:12px;margin-top:32px;">
          If you did not request this change, please contact support immediately.
        </p>
      </div>
    `,
    text: [
      "Congratulations! You're now a chef on ChefMate.",
      '',
      'You can now create dishes and meal plans, set your schedule, and start receiving orders.',
      '',
      `Visit your dashboard: ${dashboardUrl}`,
      '',
      'If you did not request this change, please contact support immediately.',
    ].join('\n'),
  }
}
