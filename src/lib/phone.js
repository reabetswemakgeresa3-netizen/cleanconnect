// South African phone number helpers.
// Supabase phone auth requires E.164 format (+27721234567).

export function normalizeSAPhone(input) {
  if (!input) return null
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+27') && digits.length === 12) return digits
  if (digits.startsWith('27') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`
  return null
}

export function formatSAPhone(e164) {
  if (!e164?.startsWith('+27')) return e164
  const local = `0${e164.slice(3)}`
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}
