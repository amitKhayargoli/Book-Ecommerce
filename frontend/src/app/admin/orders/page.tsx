import { OrdersManager } from "./components/OrdersManager";

export default function AdminOrdersPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-10">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Orders
          </h1>
          <p className="mt-2 text-text-secondary font-sans text-sm">
            View, filter, and manage all customer orders. Update order statuses and track
            the fulfillment pipeline.
          </p>
        </div>
        <OrdersManager />
      </div>
    </main>
  );
}
