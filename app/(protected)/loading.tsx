export default function ProtectedLoading() {
  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse space-y-8">
          {/* Section header: label + title */}
          <div className="space-y-2">
            <div className="h-3 w-16 bg-white/[0.06] rounded" />
            <div className="h-8 w-44 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-48 bg-white/[0.06] rounded" />
          </div>

          {/* Card section (account details / booking list) */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-5">
            <div className="h-3 w-28 bg-white/[0.06] rounded" />
            {/* Row items */}
            <div className="space-y-4 divide-y divide-white/[0.06]">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 pt-4 first:pt-0">
                  {/* Thumbnail placeholder */}
                  <div className="flex-shrink-0 w-[80px] h-[60px] rounded-xl bg-white/[0.06]" />
                  {/* Text lines */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-white/[0.06] rounded" />
                    <div className="h-3 w-48 bg-white/[0.06] rounded" />
                    <div className="flex gap-2">
                      <div className="h-4 w-14 bg-white/[0.06] rounded" />
                      <div className="h-4 w-16 bg-white/[0.06] rounded" />
                    </div>
                  </div>
                  {/* Price placeholder */}
                  <div className="flex-shrink-0 w-16 h-4 bg-white/[0.06] rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Second card section */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="h-3 w-24 bg-white/[0.06] rounded" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-white/[0.06] rounded" />
                <div className="h-4 w-32 bg-white/[0.06] rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-white/[0.06] rounded" />
                <div className="h-4 w-28 bg-white/[0.06] rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
