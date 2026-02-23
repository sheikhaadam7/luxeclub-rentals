export default function PublicLoading() {
  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="animate-pulse space-y-8">
          {/* Page heading */}
          <div className="space-y-3 text-center">
            <div className="h-9 w-56 bg-white/[0.06] rounded-lg mx-auto" />
            <div className="h-4 w-80 bg-white/[0.06] rounded mx-auto" />
          </div>

          {/* Content section */}
          <div className="space-y-4 pt-4">
            <div className="h-4 w-full bg-white/[0.06] rounded" />
            <div className="h-4 w-5/6 bg-white/[0.06] rounded" />
            <div className="h-4 w-4/6 bg-white/[0.06] rounded" />
          </div>

          {/* Card-like section */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="h-3 w-24 bg-white/[0.06] rounded" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-white/[0.06] rounded" />
              <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
            </div>
          </div>

          {/* Second card-like section */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="h-3 w-32 bg-white/[0.06] rounded" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-white/[0.06] rounded" />
              <div className="h-4 w-5/6 bg-white/[0.06] rounded" />
              <div className="h-4 w-2/3 bg-white/[0.06] rounded" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
