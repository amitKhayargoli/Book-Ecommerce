export default function WishlistLoading() {
  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
      <div className="mb-12 space-y-3">
        <div className="h-12 w-56 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-5">
            <div className="aspect-[2/3] w-full rounded-2xl bg-card animate-pulse" />
            <div className="space-y-2 px-1">
              <div className="h-5 w-4/5 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
