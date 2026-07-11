"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  MapPin, Plus, Pencil, Trash2, Loader2, X, CheckCircle2, AlertCircle,
  Star, Phone, User, Map, Building2, Home, Navigation,
} from "lucide-react";
import type { AddressComponents } from "./components/MapPicker";

const MapPicker = dynamic(() => import("./components/MapPicker"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────

interface Address {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  state: string | null;
  postalCode: string;
  street: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

type AddressFormData = {
  fullName: string;
  phone: string;
  city: string;
  state: string;
  street: string;
};

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const emptyForm: AddressFormData = {
  fullName: "",
  phone: "",
  city: "",
  state: "",
  street: "",
};

// ─── Component ────────────────────────────────────────────────────

export default function AddressesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Default address
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // ── Auth redirect ─────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/addresses");
    }
  }, [sessionStatus, router]);

  // ── Fetch addresses ───────────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/addresses", { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: Address[]; message?: string };
      if (json.success && json.data) {
        const sorted = [...json.data].sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return 0;
        });
        setAddresses(sorted);
      } else {
        setError(json.message || "Failed to load addresses");
      }
    } catch {
      setError("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") fetchAddresses();
  }, [sessionStatus, fetchAddresses]);

  // ── Open modal for create/edit ─────────────────────────────────
  const openCreate = () => {
    setEditingAddress(null);
    setForm(emptyForm);
    setFormError(null);
    setSelectedCoords(null);
    setGeoError(null);
    setModalOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditingAddress(addr);
    setForm({
      fullName: addr.fullName,
      phone: addr.phone,
      city: addr.city,
      state: addr.state ?? "",
      street: addr.street,
    });
    setFormError(null);
    setSelectedCoords(null);
    setGeoError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAddress(null);
    setForm(emptyForm);
    setFormError(null);
    setSelectedCoords(null);
    setGeoError(null);
  };

  // Callback from MapPicker when an address is found
  const handleAddressFound = useCallback((components: AddressComponents) => {
    setForm((prev) => ({
      ...prev,
      street: components.street,
      city: components.city ?? "",
      state: components.state ?? "",
    }));
  }, []);

  const handleCoordsChange = useCallback((coords: { lat: number; lng: number } | null) => {
    setSelectedCoords(coords);
  }, []);

  const handleReverseGeocodingChange = useCallback((loading: boolean) => {
    setReverseGeocoding(loading);
  }, []);

  const handleGeoError = useCallback((error: string | null) => {
    setGeoError(error);
  }, []);

  // ── Save address ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fullName.trim()) { setFormError("Full name is required"); return; }
    if (!form.phone.trim()) { setFormError("Phone number is required"); return; }
    if (!form.street.trim()) { setFormError("Please click on the map to select an address"); return; }
    if (!form.city.trim()) { setFormError("City is required"); return; }

    setSaving(true);
    setFormError(null);

    try {
      const url = editingAddress
        ? `/api/addresses/${editingAddress.id}`
        : "/api/addresses";
      const method = editingAddress ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          state: form.state || undefined,
        }),
      });

      const json = (await res.json()) as { success?: boolean; message?: string };
      if (json.success) {
        setSuccessMsg(
          editingAddress
            ? "Address updated successfully"
            : "Address created successfully",
        );
        setTimeout(() => setSuccessMsg(null), 4000);
        closeModal();
        fetchAddresses();
      } else {
        setFormError(json.message || "Failed to save address");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete address ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (json.success) {
        setSuccessMsg("Address deleted successfully");
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchAddresses();
      } else {
        setError(json.message || "Failed to delete address");
      }
    } catch {
      setError("Failed to delete address");
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  // ── Set default address ────────────────────────────────────────
  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    setError(null);
    try {
      const res = await fetch(`/api/addresses/${id}/default`, { method: "PATCH" });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (json.success) {
        setSuccessMsg("Default address updated");
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchAddresses();
      } else {
        setError(json.message || "Failed to set default address");
      }
    } catch {
      setError("Failed to set default address");
    } finally {
      setSettingDefaultId(null);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 animate-pulse mb-5" />
            <div className="h-9 w-48 bg-white/10 rounded-lg animate-pulse mb-2" />
            <div className="h-6 w-64 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-3xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-32 pb-20">
      {/* Background ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
          style={{ backgroundImage: "radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
          style={{ backgroundImage: "radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)" }} />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/10 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Addresses
          </h1>
          <p className="text-text-secondary font-sans text-lg">
            Manage your shipping addresses
          </p>
        </motion.div>

        {/* Success toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-300"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8"
        >
          <button
            onClick={openCreate}
            className="bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 inline-flex items-center gap-2 hover:bg-white/90 transition-all duration-300 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-sm text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Addresses list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-3xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/5 bg-gradient-to-b from-card/50 to-background/50 px-8 py-24 text-center"
          >
            <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-6">
              <MapPin className="w-10 h-10 text-white/70" />
            </div>
            <h2 className="font-display text-3xl font-semibold">No addresses yet</h2>
            <p className="text-text-secondary mt-4 text-lg max-w-md mx-auto">
              Add a shipping address by clicking on the map to select your location.
            </p>
            <button
              onClick={openCreate}
              className="mt-8 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 inline-flex items-center gap-2 hover:bg-white/90 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Add Your First Address
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {addresses.map((addr) => (
              <motion.div
                key={addr.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-white/5 bg-card/40 backdrop-blur-sm p-6 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-white/50" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{addr.fullName}</p>
                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[0.6rem] font-semibold uppercase tracking-wider">
                              <Star className="w-2.5 h-2.5" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {addr.phone}
                        </p>
                      </div>
                    </div>

                    <div className="ml-12 space-y-1 text-sm text-text-secondary">
                      <p className="flex items-start gap-2">
                        <Home className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{addr.street}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Map className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {[addr.city, addr.state].filter(Boolean).join(", ")}
                        </span>
                      </p>
                    </div>

                    <p className="ml-12 mt-2 text-[0.7rem] text-text-secondary/50">
                      Added {formatDate(addr.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={settingDefaultId === addr.id}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-amber-500/20 hover:border-amber-500/30 transition-all disabled:opacity-50"
                        title="Set as default address"
                      >
                        {settingDefaultId === addr.id ? (
                          <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4 text-white/50" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => openEdit(addr)}
                      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                      title="Edit address"
                    >
                      <Pencil className="w-4 h-4 text-white/60" />
                    </button>

                    {deleteConfirm === addr.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(addr.id)}
                          disabled={deletingId === addr.id}
                          className="px-3 py-2 rounded-xl bg-red-500/20 text-red-300 text-[0.7rem] font-semibold hover:bg-red-500/30 transition-all disabled:opacity-50"
                        >
                          {deletingId === addr.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Confirm"
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-2 rounded-xl bg-white/5 text-text-secondary text-[0.7rem] font-semibold hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(addr.id)}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                        title="Delete address"
                      >
                        <Trash2 className="w-4 h-4 text-white/60 group-hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ───────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal - wider to accommodate the map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-3xl max-h-[95vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {editingAddress ? "Edit Address" : "New Address"}
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Click on the map to select your location
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Interactive Map (dynamically imported, client-side only) */}
              <div className="mb-6">
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
                  <MapPicker
                    onAddressFound={handleAddressFound}
                    onCoordsChange={handleCoordsChange}
                    onReverseGeocodingChange={handleReverseGeocodingChange}
                    onGeoError={handleGeoError}
                  />

                  {/* Coordinate display */}
                  {selectedCoords && !reverseGeocoding && (
                    <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-[0.65rem] text-white/60 font-mono">
                      {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                    </div>
                  )}

                  {/* Reverse geocoding indicator */}
                  {reverseGeocoding && (
                    <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 flex items-center gap-2 text-[0.65rem] text-white/60">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Looking up address...
                    </div>
                  )}

                  {/* Geo error */}
                  {geoError && !reverseGeocoding && (
                    <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-[0.65rem] text-red-300 max-w-[250px]">
                      {geoError}
                    </div>
                  )}
                </div>
                <p className="text-[0.65rem] text-text-secondary/50 mt-1.5 text-center">
                  Click anywhere on the map to select a location. Powered by Baato Maps.
                </p>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="Full name for delivery"
                        className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="98XXXXXXXX"
                        className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Street (auto-filled from map) */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                    Street Address *{selectedCoords ? " (auto-filled from map)" : ""}
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      placeholder="Click on the map to auto-fill"
                      className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                    />
                  </div>
                </div>

                {/* City + State row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      City *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="e.g. Kathmandu"
                        className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      State / Province
                    </label>
                    <div className="relative">
                      <Map className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        placeholder="e.g. Bagmati"
                        className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                  </div>
                </div>



                {/* Form error */}
                {formError && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {formError}
                  </p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-white text-black font-semibold font-sans rounded-xl h-12 flex items-center justify-center gap-2 hover:bg-white/90 transition-all duration-300 disabled:opacity-50 mt-2"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {editingAddress ? "Update Address" : "Save Address"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
