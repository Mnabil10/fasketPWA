import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Separator } from "../../ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { AppState } from "../CustomerApp";

/** خدمات الـ API (عدّل المسارات حسب مشروعك) */
import { listAddresses, createAddress, updateAddress, deleteAddress } from "../../services/addresses";

interface AddressesScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

type Address = {
  id: string;
  label: string;
  city?: string;
  zone?: string;
  street?: string;
  building?: string | null;
  apartment?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const emptyForm: Omit<Address, "id"> = {
  label: "",
  city: "",
  zone: "",
  street: "",
  building: "",
  apartment: "",
  lat: null,
  lng: null,
};

export function AddressesScreen({ appState, updateAppState }: AddressesScreenProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Address[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Address, "id">>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listAddresses();
      setItems(res || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(a: Address) {
    setEditingId(a.id);
    setForm({
      label: a.label ?? "",
      city: a.city ?? "",
      zone: a.zone ?? "",
      street: a.street ?? "",
      building: a.building ?? "",
      apartment: a.apartment ?? "",
      lat: a.lat ?? null,
      lng: a.lng ?? null,
    });
    setDialogOpen(true);
  }

  async function onSave() {
    setSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, form);
      } else {
        await createAddress(form);
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteAddress(id);
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  const headerSubtitle = useMemo(() => {
    if (loading) return "Loading addresses…";
    if (items.length === 0) return "No addresses yet";
    return `${items.length} address${items.length > 1 ? "es" : ""}`;
  }, [loading, items.length]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "profile" })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              My Addresses
            </h1>
            <p className="text-xs text-gray-500">{headerSubtitle}</p>
          </div>
          <div className="ml-auto">
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="w-5 h-5 mr-2" />
              Add New Address
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-600">
            No addresses yet. Click <b>Add New Address</b> to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => {
              const line1 =
                a.street ||
                [a.city, a.zone].filter(Boolean).join(", ") ||
                a.label;
              const line2 = [a.building, a.apartment].filter(Boolean).join(", ");
              return (
                <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="font-medium">{a.label || "Address"}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{line1}</p>
                      {line2 && <p className="text-gray-500 text-sm">{line2}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEdit(a)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        disabled={deletingId === a.id}
                        onClick={() => onDelete(a.id)}
                      >
                        {deletingId === a.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Label</Label>
                <Input
                  placeholder="Home / Work / Other"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>

              <Separator />

              <div>
                <Label>City</Label>
                <Input
                  value={form.city ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>Zone</Label>
                <Input
                  value={form.zone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Street</Label>
                <Input
                  value={form.street ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Building</Label>
                  <Input
                    value={form.building ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Apartment</Label>
                  <Input
                    value={form.apartment ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, apartment: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Lat</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.lat ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lat: e.target.value === "" ? null : Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Lng</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.lng ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lng: e.target.value === "" ? null : Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving} className="rounded-xl">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
