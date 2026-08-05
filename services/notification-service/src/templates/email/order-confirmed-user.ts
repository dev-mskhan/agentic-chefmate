export interface OrderConfirmedData {
  orderId: string
  items: Array<{ name: string; quantity: number; price: number }>
  totalAmount: number
}

export function orderConfirmedUserTemplate(data: OrderConfirmedData) {
  const itemList = data.items
    .map((i) => `<li>${i.quantity}x ${i.name} — $${i.price.toFixed(2)}</li>`)
    .join('')

  return {
    subject: `Order confirmed — #${data.orderId.slice(-8).toUpperCase()}`,
    html: `
      <h1>Your order is confirmed!</h1>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <ul>${itemList}</ul>
      <p><strong>Total:</strong> $${data.totalAmount.toFixed(2)}</p>
      <p>Your chef has been notified and will start preparing your meal.</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/orders/${data.orderId}"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Track Order
      </a>
    `,
    text: `Order confirmed! #${data.orderId}. Total: $${data.totalAmount.toFixed(2)}`,
  }
}
