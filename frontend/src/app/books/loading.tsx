export default function BooksLoading() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-10">
        <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-4 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
      </div>

      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-white/10 pb-10 mb-12">
        <div className="space-y-4">
          <div className="h-12 w-48 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-5 w-96 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="h-14 w-72 bg-white/10 rounded-2xl animate-pulse" />
          <div className="h-14 w-56 bg-white/10 rounded-2xl animate-pulse" />
        </div>
      </div>

      {/* Book grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="aspect-[2/3] w-full rounded-3xl bg-card animate-pulse" />
            <div className="space-y-2 px-1">
              <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
              <div className="flex gap-2 mt-4">
                <div className="h-5 w-16 bg-white/10 rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-white/10 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
