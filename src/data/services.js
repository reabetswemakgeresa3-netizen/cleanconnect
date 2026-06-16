export const SERVICES = [
  {
    id: 'residential',
    name: 'Residential Cleaning',
    icon: '🏠',
    description: 'Full home deep clean, regular maintenance, move-in/out cleaning',
    pricePerSqm: 10,
    minSqm: 20,
    popular: true,
    marketRate: 'R15–R25/m²',
    includes: ['Vacuuming & mopping', 'Kitchen & bathrooms', 'Dusting all surfaces', 'Window sills', 'Rubbish removal'],
    duration: '2–5 hrs'
  },
  {
    id: 'industrial',
    name: 'Industrial Cleaning',
    icon: '🏭',
    description: 'Warehouses, factories, construction sites, heavy-duty spaces',
    pricePerSqm: 6,
    minSqm: 200,
    popular: false,
    marketRate: 'R10–R15/m²',
    includes: ['Pressure washing', 'Industrial degreasing', 'Floor scrubbing', 'High-reach cleaning', 'Waste disposal'],
    duration: '4–12 hrs'
  },
  {
    id: 'office',
    name: 'Office & Commercial',
    icon: '🏢',
    description: 'Corporate offices, retail stores, co-working spaces',
    pricePerSqm: 8,
    minSqm: 50,
    popular: true,
    marketRate: 'R12–R20/m²',
    includes: ['Desks & workstations', 'Boardrooms', 'Kitchenettes', 'Ablution facilities', 'Reception areas'],
    duration: '2–8 hrs'
  },
  {
    id: 'gardening',
    name: 'Garden & Outdoor',
    icon: '🌿',
    description: 'Lawn mowing, pruning, landscaping, yard clean-ups',
    pricePerSqm: 5,
    minSqm: 50,
    popular: false,
    marketRate: 'R8–R12/m²',
    includes: ['Lawn mowing & edging', 'Hedge trimming', 'Leaf & debris removal', 'Planting & mulching', 'Irrigation check'],
    duration: '2–6 hrs'
  },
  {
    id: 'medical',
    name: 'Medical & Healthcare',
    icon: '🏥',
    description: 'Clinics, surgeries, dental practices — sanitised to health standards',
    pricePerSqm: 15,
    minSqm: 30,
    popular: false,
    marketRate: 'R20–R35/m²',
    includes: ['Hospital-grade disinfectants', 'Biohazard disposal', 'Waiting room cleaning', 'Theatre prep', 'SABS compliant'],
    duration: '2–6 hrs'
  },
  {
    id: 'carpet',
    name: 'Carpet & Upholstery',
    icon: '🛋️',
    description: 'Steam cleaning, stain treatment, couch & mattress cleaning',
    pricePerSqm: 8,
    minSqm: 10,
    popular: false,
    marketRate: 'R8.80–R19/m²',
    includes: ['Hot water extraction', 'Stain treatment', 'Deodorising', 'Quick-dry technique', 'Fabric protection'],
    duration: '1–4 hrs'
  },
  {
    id: 'postConstruction',
    name: 'Post-Construction',
    icon: '🔨',
    description: 'After renovations or new builds — dust, debris, and builder grime',
    pricePerSqm: 20,
    minSqm: 50,
    popular: false,
    marketRate: 'R35–R60/m²',
    includes: ['Construction dust removal', 'Paint & adhesive removal', 'Window cleaning', 'Debris disposal', 'Final polish'],
    duration: '4–10 hrs'
  },
  {
    id: 'event',
    name: 'Event Clean-up',
    icon: '🎉',
    description: 'Pre- and post-event cleaning for venues, homes, and outdoor spaces',
    pricePerSqm: 8,
    minSqm: 30,
    popular: false,
    marketRate: 'R12–R20/m²',
    includes: ['Before event setup clean', 'Post-event breakdown clean', 'Litter collection', 'Sanitation stations', 'Overnight turnaround'],
    duration: '2–8 hrs'
  }
]

export const PROVINCES = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'
]

export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'badge-orange', icon: '⏳' },
  confirmed: { label: 'Confirmed', color: 'badge-blue', icon: '✅' },
  'in-progress': { label: 'In Progress', color: 'badge-blue', icon: '🔄' },
  completed: { label: 'Completed', color: 'badge-green', icon: '✓' },
  cancelled: { label: 'Cancelled', color: 'badge-red', icon: '✕' }
}

export function calculatePrice(serviceId, sqm) {
  const service = SERVICES.find(s => s.id === serviceId)
  if (!service) return 0
  const area = Math.max(sqm, service.minSqm)
  let price = area * service.pricePerSqm

  // Volume discounts
  if (area > 500) price *= 0.85
  else if (area > 200) price *= 0.90
  else if (area > 100) price *= 0.95

  return Math.round(price)
}

export function formatCurrency(amount) {
  return `R ${amount.toLocaleString('en-ZA')}`
}
