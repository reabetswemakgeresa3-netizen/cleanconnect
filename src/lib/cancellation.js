// Cancellation & refund policy: full refund outside the window, flagged for
// manual review (fee may apply) inside it. Matches the copy in Terms.jsx.
const REFUND_WINDOW_HOURS = 4

function slotStartTime(timeSlot) {
  return timeSlot?.split(' – ')[0]?.trim()
}

export function hoursUntilBooking(bookingDate, timeSlot) {
  const start = slotStartTime(timeSlot)
  if (!bookingDate || !start) return Infinity
  const target = new Date(`${bookingDate}T${start}:00`)
  if (Number.isNaN(target.getTime())) return Infinity
  return (target.getTime() - Date.now()) / 36e5
}

export function getCancellationPolicy(bookingDate, timeSlot) {
  const hours = hoursUntilBooking(bookingDate, timeSlot)
  const fullRefund = hours > REFUND_WINDOW_HOURS
  return {
    hours,
    fullRefund,
    newPaymentStatus: fullRefund ? 'refunded' : 'pending-review',
    message: fullRefund
      ? "You're cancelling more than 4 hours before your scheduled time — you'll receive a full refund."
      : "You're cancelling less than 4 hours before your scheduled time. A cancellation fee may apply, and your refund will be reviewed manually rather than processed automatically."
  }
}
