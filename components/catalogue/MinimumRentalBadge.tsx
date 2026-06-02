// Pill badge shown on the top-left of every vehicle card image to communicate
// our 2-day rental minimum upfront. Brand-gold (#C9A96E) background with black
// text. Used on the catalogue listing, money-page related-vehicle grids, and
// the homepage Featured Vehicles section. Not used on the car detail page —
// that has its own gallery component.
export function MinimumRentalBadge() {
  return (
    <div className="absolute top-3 left-3 z-10 pointer-events-none">
      <div className="bg-brand-cyan text-black px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider shadow-md">
        Minimum 2 Days Rental
      </div>
    </div>
  )
}
