export interface NewOrderChefData {
  orderId: string
  items: Array<{ name: string; quantity: number; price: number }>
  totalAmount: number
}

export function newOrderChefTemplate(data: NewOrderChefData) {
  const itemList = data.items
    .map((i) => `<li>${i.quantity}x ${i.name} — $${i.price.toFixed(2)}</li>`)
    .join('')

  return {
    subject: `New order #${data.orderId.slice(-8).toUpperCase()}`,
    html: `
      <h1>You have a new order!</h1>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <ul>${itemList}</ul>
      <p><strong>Total:</strong> $${data.totalAmount.toFixed(2)}</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/chef/orders/${data.orderId}"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        View Order
      </a>
    `,
    text: `New order #${data.orderId}. Total: $${data.totalAmount.toFixed(2)}`,
  }
}
