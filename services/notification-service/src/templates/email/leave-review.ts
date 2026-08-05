export interface LeaveReviewData {
  orderId: string
}

export function leaveReviewTemplate(data: LeaveReviewData) {
  return {
    subject: 'How was your meal? Leave a review',
    html: `
      <h1>How was your meal?</h1>
      <p>We hope you enjoyed it! Share your experience to help other food lovers discover great home chefs.</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/orders/${data.orderId}/review"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Leave a Review
      </a>
    `,
    text: `How was your meal? Leave a review: ${process.env['APP_URL'] ?? 'http://localhost:3000'}/orders/${data.orderId}/review`,
  }
}
