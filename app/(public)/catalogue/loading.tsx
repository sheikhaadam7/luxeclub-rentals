export default function CatalogueLoading() {
  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          {/* Page header */}
          <div className="mb-10 space-y-2">
            <div className="h-8 w-40 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-72 bg-white/[0.06] rounded" />
          </div>

          {/* Filter pills placeholder */}
          <div className="space-y-4 mb-8">
            {/* Brand row */}
            <div>
              <div className="h-3 w-12 bg-white/[0.06] rounded mb-3" />
              <div className="flex flex-wrap gap-2">
                {[48, 56, 52, 72, 44, 64, 48, 56].map((w, i) => (
                  <div key={i} className="h-9 rounded-full bg-white/[0.06]" style={{ width: w }} />
                ))}
              </div>
            </div>
            {/* Type row */}
            <div>
              <div className="h-3 w-10 bg-white/[0.06] rounded mb-3" />
              <div className="flex flex-wrap gap-2">
                {[48, 80, 64, 96].map((w, i) => (
                  <div key={i} className="h-9 rounded-full bg-white/[0.06]" style={{ width: w }} />
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="h-4 w-24 bg-white/[0.06] rounded mb-6" />

          {/* Vehicle card grid — 6 skeleton cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden"
              >
                {/* Image placeholder (4:3 aspect) */}
                <div className="aspect-[4/3] w-full bg-white/[0.06]" />

                {/* Card content */}
                <div className="p-5 space-y-3">
                  {/* Vehicle name */}
                  <div className="h-5 w-3/4 bg-white/[0.06] rounded" />
                  {/* Price lines */}
                  <div className="flex gap-5 pt-1">
                    <div className="h-4 w-20 bg-white/[0.06] rounded" />
                    <div className="h-4 w-20 bg-white/[0.06] rounded" />
                  </div>
                </div>

                {/* Button placeholders */}
                <div className="px-5 pb-5 flex gap-3">
                  <div className="flex-1 h-10 rounded-xl bg-white/[0.06]" />
                  <div className="w-28 h-10 rounded-xl bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
