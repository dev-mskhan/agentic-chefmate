import { useEffect, useState } from 'react'
import {
  Send,
  Star,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Button } from '../../components/atoms/Button'
import { Skeleton } from '../../components/atoms/Skeleton'
import { getChefReviews } from '../../services/api/chefService'
import type { ReviewRecord } from '../../services/api/publicCatalog'

export function ChefReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({})
  const [replies, setReplies] = useState<{ [id: string]: string }>({
    'rev-1': 'Thank you so much, Tariq! We put a lot of heart into the slow dum simmering process.',
  })

  useEffect(() => {
    getChefReviews()
      .then((data) => setReviews(data))
      .finally(() => setLoading(false))
  }, [])

  const handleSendReply = (reviewId: string) => {
    const text = replyText[reviewId]
    if (!text) return

    setReplies({ ...replies, [reviewId]: text })
    setReplyText({ ...replyText, [reviewId]: '' })
  }

  if (loading) {
    return (
      <ChefShell title="Customer Reviews & Feedback">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </ChefShell>
    )
  }

  return (
    <ChefShell
      title="Customer Reviews & Feedback"
      subtitle="Read authentic customer feedback and build long-term relationships through chef replies."
    >
      <div className="space-y-6 max-w-4xl">
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-saffron/15 text-saffron-dark text-center">
              <span className="font-display text-3xl font-bold block">4.9</span>
              <div className="flex items-center gap-0.5 justify-center mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={12} className="fill-saffron text-saffron" />
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal">Overall Kitchen Rating</h2>
              <p className="text-xs text-charcoal-70">
                Based on 128 verified customer ratings after delivery.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {reviews.map((rev) => {
            const hasReply = Boolean(replies[rev.id])
            const author = rev.customerId ? rev.customerId.replace('user-', '').replace('-', ' ') : 'Verified Customer'

            return (
              <div
                key={rev.id}
                className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-cream-dim border border-charcoal/10 flex items-center justify-center font-bold text-xs text-charcoal capitalize">
                      {author.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-charcoal block capitalize">
                        {author}
                      </strong>
                      <span className="text-[11px] text-charcoal-70">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={13} className="fill-saffron text-saffron" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-charcoal leading-relaxed">{rev.text}</p>

                {/* Existing Reply */}
                {hasReply && (
                  <div className="rounded-2xl bg-cream-dim p-4 border border-charcoal/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-terracotta tracking-wider block">
                      Your Kitchen Reply
                    </span>
                    <p className="text-xs text-charcoal leading-relaxed italic">
                      "{replies[rev.id]}"
                    </p>
                  </div>
                )}

                {/* Reply Composer */}
                {!hasReply && (
                  <div className="pt-2 border-t border-charcoal/10 flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a personalized reply to this customer..."
                      value={replyText[rev.id] || ''}
                      onChange={(e) =>
                        setReplyText({ ...replyText, [rev.id]: e.target.value })
                      }
                      className="flex-1 rounded-pill border border-charcoal/15 bg-cream-dim px-4 py-2 text-xs text-charcoal outline-none focus:border-terracotta"
                    />
                    <Button
                      onClick={() => handleSendReply(rev.id)}
                      className="text-xs py-2 px-4 gap-1.5 shrink-0"
                    >
                      <Send size={13} /> Reply
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </ChefShell>
  )
}
