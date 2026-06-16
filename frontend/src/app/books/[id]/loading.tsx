export default function BookDetailLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-grow pt-24 pb-16 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-10">
          <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-4 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-4 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
        </div>

        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-24">
          {/* Gallery skeleton */}
          <div className="space-y-4">
            <div className="aspect-[3/4] md:aspect-square w-full rounded-xl bg-card animate-pulse" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-20 h-20 rounded-lg bg-card animate-pulse" />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="space-y-6 pt-4 lg:pr-10">
            <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
            <div className="h-12 w-3/4 bg-white/10 rounded-xl animate-pulse" />
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
            <div className="space-y-3 pt-8 border-t border-white/10">
              <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex gap-4 pt-4">
              <div className="h-14 w-40 bg-white/10 rounded-xl animate-pulse" />
              <div className="h-14 w-14 bg-white/10 rounded-xl animate-pulse" />
            </div>
          </div>
        </section>

        {/* Related Books skeleton */}
        <section className="mb-24 pt-10 border-t border-white/5">
          <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 bg-card rounded-xl border border-white/5">
                <div className="aspect-[3/4] w-full bg-white/10 rounded-lg animate-pulse mb-6" />
                <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse mb-3" />
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* Reviews skeleton */}
        <section className="mb-24 pt-10 border-t border-white/5">
          <div className="flex items-center justify-between mb-10">
            <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse" />
            <div className="h-12 w-36 bg-white/10 rounded-xl animate-pulse" />
          </div>
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="w-full lg:w-1/3 space-y-6">
              <div className="h-24 w-24 rounded-full bg-white/10 animate-pulse" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 w-full bg-white/10 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="w-full lg:w-2/3 space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b border-white/5 pb-8 space-y-3">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="h-4 w-4 bg-white/10 rounded animate-pulse" />
                    ))}
                  </div>
                  <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
