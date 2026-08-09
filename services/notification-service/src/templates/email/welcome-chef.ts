export function welcomeChefTemplate() {
  return {
    subject: "You're now a chef on ChefMate!",
    html: `
      <h1>Congratulations, Chef!</h1>
      <p>Your account has been upgraded to Chef status on ChefMate.</p>
      <p>You can now create meal plans, set your schedule, and start receiving orders.</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/chef/dashboard"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Go to Chef Dashboard
      </a>
    `,
    text: "Congratulations! You're now a chef on ChefMate. Visit your dashboard to get started.",
  }
}
