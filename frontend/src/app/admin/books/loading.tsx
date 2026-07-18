export default function AdminBooksLoading() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-10 w-48 bg-white/10 rounded-xl animate-pulse" />
            <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="h-12 w-40 bg-white/10 rounded-full animate-pulse" />
        </div>

        {/* Search and filter skeleton */}
        <div className="flex gap-4">
          <div className="h-12 w-72 bg-white/10 rounded-2xl animate-pulse" />
          <div className="h-12 w-40 bg-white/10 rounded-2xl animate-pulse" />
          <div className="h-12 w-32 bg-white/10 rounded-2xl animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-[40px] border border-white/5 bg-card/40 backdrop-blur-3xl p-8 space-y-6">
          <div className="h-px bg-white/5" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 py-4">
              <div className="w-12 h-16 rounded-lg bg-card animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-white/10 rounded-lg animate-pulse" />
                <div className="h-8 w-16 bg-white/10 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
