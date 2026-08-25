export interface AccountSuspendedData {
  reason?: string
}

export function accountSuspendedTemplate(data: AccountSuspendedData) {
  return {
    subject: 'Your ChefMate account has been suspended',
    html: `<h1>Account suspended</h1><p>Your ChefMate account has been suspended.</p>${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}`,
    text: `Your ChefMate account has been suspended.${data.reason ? ` Reason: ${data.reason}` : ''}`,
  }
}
