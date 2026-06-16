export default function CartLoading() {
  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
      <div className="mb-12 space-y-3">
        <div className="h-12 w-48 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-6 w-36 bg-white/10 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[100px_1fr_auto_auto] gap-6 px-6 py-4 border-b border-white/10">
            <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
          </div>
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-[100px_1fr_auto_auto] gap-4 md:gap-6 px-6 py-6 border-b border-white/10"
              >
                <div className="h-[120px] w-full md:w-[100px] rounded-xl bg-card animate-pulse" />
                <div className="space-y-3 py-2">
                  <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse md:self-center" />
                <div className="h-10 w-10 bg-white/10 rounded-lg animate-pulse md:self-center md:justify-self-end" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-6 sticky top-24 space-y-6">
          <div className="h-7 w-36 bg-white/10 rounded animate-pulse" />
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between">
              <div className="h-5 w-12 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-14 w-full bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>
    </main>
  );
}
