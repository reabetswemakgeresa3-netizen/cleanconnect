import { useState } from 'react'
import { supabase } from '../lib/supabase'
import StarPicker from './StarPicker'
import PinSpinner from './PinSpinner'

export default function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!rating) { setError('Please select a star rating.'); return }
    setSubmitting(true)
    setError('')
    try {
      const { data, error: insertError } = await supabase.from('reviews').insert({
        booking_id: booking.id,
        cleaner_id: booking.cleaner_id,
        user_id: booking.user_id,
        rating,
        comment: comment.trim() || null,
        // Reviews are public but profiles are private — capture just the
        // first name here rather than joining to profiles for display later.
        reviewer_name: booking.contact_name?.split(' ')[0] || 'Customer'
      }).select().single()
      if (insertError) throw insertError
      onSubmitted(data)
    } catch (err) {
      setError(err.message || 'Could not submit your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(24px + var(--sat)) calc(24px + var(--sar)) calc(24px + var(--sab)) calc(24px + var(--sal))',
      backdropFilter: 'blur(4px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 20,
        width: '100%', maxWidth: 440, padding: 32
      }}>
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Rate Your Cleaner</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          {booking.cleaner_assigned ? `How was your experience with ${booking.cleaner_assigned}?` : 'How was your experience?'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <StarPicker value={rating} onChange={setRating} size={38} />
        </div>

        <textarea
          className="input-field" rows={3} placeholder="Leave a comment (optional)"
          value={comment} onChange={e => setComment(e.target.value)}
          style={{ resize: 'vertical', marginBottom: 16 }}
        />

        {error && <p style={{ color: '#E11900', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={submitting} className="btn-outline" style={{ flex: 1, justifyContent: 'center', padding: 12 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 12 }}>
            {submitting ? <PinSpinner size={18} variant="mono" /> : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
