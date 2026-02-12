import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Separator } from "../../ui/separator";
import { Switch } from "../../ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../../ui/alert-dialog";
import { Badge } from "../../ui/badge";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { NetworkBanner, EmptyState, RetryBlock } from "../components";
import { useAddresses, useNetworkStatus, useApiErrorToast, useDeliveryZones } from "../hooks";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { useToast } from "../providers/ToastProvider";
import type { Address } from "../../types/api";
import { fmtEGP, fromCents } from "../../lib/money";

interface AddressesScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

const emptyForm: Omit<Address, "id"> = {
  label: "",
  city: "",
  zone: "",
  zoneId: null,
  street: "",
  building: "",
  apartment: "",
  notes: "",
  deliveryZone: null,
  isDefault: false,
};

export function AddressesScreen({ appState, updateAppState }: AddressesScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast();
  const {
    addresses,
    isLoading,
    isError,
    error,
    refetch,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    creating,
    updating,
    deletingId,
    settingDefault,
    settingDefaultId,
  } = useAddresses();
  const deliveryZonesQuery = useDeliveryZones();
  const deliveryZones = deliveryZonesQuery.data?.data ?? [];
  const deliveryZonesStale = deliveryZonesQuery.data?.stale ?? false;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Address, "id">>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const listErrorMessage = mapApiErrorToMessage(error, "addresses.error.load");
  const zoneById = useMemo(() => {
    const map = new Map<string, typeof deliveryZones[number]>();
    deliveryZones.forEach((zone) => map.set(zone.id, zone));
    return map;
  }, [deliveryZones]);
  const currentLang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const getZoneName = (zone?: typeof deliveryZones[number] | null, fallback?: string | null) => {
    if (!zone && !fallback) return "";
    if (!zone) return fallback ?? "";
    const name =
      currentLang === "ar"
        ? zone.nameAr || zone.nameEn || zone.name
        : zone.nameEn || zone.nameAr || zone.name;
    return name || fallback || "";
  };
  const formatZoneSummary = (zone?: typeof deliveryZones[number] | null, fallback?: string | null) => {
    const name = getZoneName(zone, fallback);
    if (!name) return "";
    const fee = zone ? fmtEGP(fromCents(zone.feeCents)) : null;
    const eta =
      zone?.etaMinutes && zone.etaMinutes > 0
        ? t("addresses.zoneEta", { value: zone.etaMinutes, defaultValue: `${zone.etaMinutes} min` })
        : null;
    return [name, fee, eta].filter(Boolean).join(" - ");
  };
  const selectedZone = form.zoneId ? zoneById.get(form.zoneId) ?? null : null;
  const zoneErrorMessage = deliveryZonesQuery.isError
    ? mapApiErrorToMessage(deliveryZonesQuery.error, "addresses.error.zones")
    : null;
  const headerSubtitle = useMemo(() => {
    if (isLoading) return t("addresses.loading");
    if (addresses.length === 0) return t("addresses.empty");
    return t("addresses.count", { count: addresses.length, defaultValue: `${addresses.length}` });
  }, [isLoading, addresses.length, t]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.label?.trim()) next.label = t("addresses.validation.label");
    if (!form.city?.trim()) next.city = t("addresses.validation.city");
    if (!form.zoneId) next.zoneId = t("addresses.validation.zone");
    if (!form.street?.trim()) next.street = t("addresses.validation.street");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleZoneChange = (zoneId: string) => {
    const zoneData = zoneId ? zoneById.get(zoneId) ?? null : null;
    setForm((prev) => ({
      ...prev,
      zoneId: zoneId || null,
      zone: zoneData ? getZoneName(zoneData) : "",
      deliveryZone: zoneData ?? null,
    }));
  };

  const buildPayload = () => {
    const zoneName = getZoneName(selectedZone, form.zone);
    return {
      label: form.label.trim(),
      city: form.city?.trim() || "",
      street: form.street?.trim() || "",
      zoneId: form.zoneId as string,
      region: zoneName || undefined,
      building: form.building?.trim() || undefined,
      apartment: form.apartment?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      isDefault: form.isDefault ?? undefined,
    };
  };

  const onSave = async () => {
    if (!validate()) return;
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateAddress({ id: editingId, data: payload });
      } else {
        await createAddress(payload);
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      showToast({ type: "success", message: t("addresses.success.saved") });
    } catch (e: any) {
      apiErrorToast(e, "addresses.error.save");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteAddress(id);
      showToast({ type: "success", message: t("addresses.success.deleted") });
    } catch (e: any) {
      apiErrorToast(e, "addresses.error.delete");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const onSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      showToast({ type: "success", message: t("addresses.success.defaultSet", "Default address updated.") });
    } catch (e: any) {
      apiErrorToast(e, "addresses.error.default");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (address: Address) => {
    const zoneData = address.deliveryZone || (address.zoneId ? zoneById.get(address.zoneId) ?? null : null);
    setEditingId(address.id);
    setForm({
      label: address.label ?? "",
      city: address.city ?? "",
      zone: getZoneName(zoneData, address.zone ?? ""),
      zoneId: zoneData?.id ?? address.zoneId ?? null,
      street: address.street ?? "",
      building: address.building ?? "",
      apartment: address.apartment ?? "",
      notes: address.notes ?? "",
      deliveryZone: zoneData ?? null,
      isDefault: address.isDefault ?? false,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const renderAddress = (address: Address) => {
    const zoneData = address.deliveryZone || (address.zoneId ? zoneById.get(address.zoneId) ?? null : null);
    const line1 = [address.city, getZoneName(zoneData, address.zone ?? "")].filter(Boolean).join(", ");
    const line2 = [address.street, address.building, address.apartment].filter(Boolean).join(", ");
    const notesLine = address.notes?.trim();
    const shippingInfo = zoneData
      ? [
          fmtEGP(fromCents(zoneData.feeCents)),
          zoneData.etaMinutes && zoneData.etaMinutes > 0
            ? t("addresses.zoneEta", { value: zoneData.etaMinutes, defaultValue: `${zoneData.etaMinutes} min` })
            : null,
        ]
          .filter(Boolean)
          .join(" - ")
      : null;
    return (
      <div key={address.id} className="section-card flex justify-between items-start gap-3">
        <div>
          <div className="flex items-center mb-2 gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{address.label || t("addresses.form.label")}</span>
            {address.isDefault && (
              <Badge variant="secondary" className="text-xs">
                {t("addresses.badges.default", "Default")}
              </Badge>
            )}
          </div>
          <p className="text-gray-700 text-sm">{line1}</p>
          {line2 && <p className="text-gray-500 text-sm">{line2}</p>}
          {shippingInfo && <p className="text-xs text-gray-500 mt-1">{shippingInfo}</p>}
          {notesLine && (
            <p className="text-xs text-gray-500 mt-1">
              {t("addresses.form.notesLabel", "Landmark")}: {notesLine}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!address.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              disabled={settingDefault || settingDefaultId === address.id || isOffline}
              onClick={() => onSetDefault(address.id)}
            >
              {settingDefaultId === address.id
                ? t("addresses.buttons.settingDefault", "Setting...")
                : t("addresses.buttons.setDefault", "Set default")}
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEdit(address)} disabled={isOffline}>
            {t("addresses.buttons.edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600"
            disabled={deletingId === address.id || isOffline}
            onClick={() => setConfirmDeleteId(address.id)}
          >
            {deletingId === address.id ? t("addresses.buttons.deleting") : t("addresses.buttons.delete")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="page-shell">
      <NetworkBanner stale={deliveryZonesStale} />
      <div className="section-card">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "profile" })}
            className="p-2 mr-2 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("addresses.title")}
            </h1>
            <p className="text-xs text-gray-500">{headerSubtitle}</p>
          </div>
          <div className="ml-auto">
            <Button
              onClick={openCreate}
              className="rounded-xl"
              size="sm"
              disabled={isOffline}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t("addresses.buttons.add")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full space-y-3">
        {isError && <RetryBlock message={listErrorMessage} onRetry={() => refetch()} />}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="section-card animate-pulse h-24" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <EmptyState
            icon={<MapPin className="w-10 h-10 text-primary" />}
            title={t("addresses.empty")}
            subtitle={t("addresses.emptySubtitle")}
            actionLabel={t("addresses.buttons.add")}
            onAction={openCreate}
          />
        ) : (
          <div className="space-y-3">{addresses.map(renderAddress)}</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-h-[80vh] overflow-y-auto space-y-4"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{editingId ? t("addresses.dialogs.editTitle") : t("addresses.dialogs.addTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>{t("addresses.form.label")}</Label>
              <Input
                placeholder={t("addresses.form.labelPlaceholder", "Home / Work / Other")}
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
              {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label}</p>}
            </div>

            <Separator />

            <div>
              <Label>{t("addresses.form.city")}</Label>
              <Input
                value={form.city ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <Label>{t("addresses.form.zone")}</Label>
              <select
                value={form.zoneId ?? ""}
                onChange={(e) => handleZoneChange(e.target.value)}
                disabled={deliveryZonesQuery.isLoading || deliveryZones.length === 0}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary"
              >
                <option value="">{t("addresses.form.zonePlaceholder", "Select delivery area")}</option>
                {deliveryZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {formatZoneSummary(zone, zone.nameEn || zone.name)}
                  </option>
                ))}
              </select>
              {errors.zoneId && <p className="text-xs text-red-500 mt-1">{errors.zoneId}</p>}
              {zoneErrorMessage && <p className="text-xs text-red-500 mt-1">{zoneErrorMessage}</p>}
              {selectedZone && (
                <p className="text-xs text-gray-500 mt-1">
                  {t("addresses.zoneSelected", {
                    zone: getZoneName(selectedZone),
                    fee: fmtEGP(fromCents(selectedZone.feeCents)),
                    eta:
                      selectedZone.etaMinutes && selectedZone.etaMinutes > 0
                        ? t("addresses.zoneEta", { value: selectedZone.etaMinutes })
                        : t("addresses.zoneEtaUnknown", "ETA varies"),
                  })}
                </p>
              )}
              {!selectedZone && form.zone && <p className="text-xs text-gray-500 mt-1">{form.zone}</p>}
            </div>
            <div>
              <Label>{t("addresses.form.street")}</Label>
              <Textarea
                value={form.street ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              />
              {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
            </div>

            <div>
              <Label>{t("addresses.form.notesLabel", "Landmark")}</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("addresses.form.notesPlaceholder", "Nearby landmark or delivery notes")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("addresses.form.building")}</Label>
                <Input
                  value={form.building ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t("addresses.form.apartment")}</Label>
                <Input
                  value={form.apartment ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, apartment: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{t("addresses.form.defaultLabel", "Set as default")}</p>
                <p className="text-xs text-gray-500">{t("addresses.form.defaultHint", "Used automatically for checkout")}</p>
              </div>
              <Switch
                checked={form.isDefault ?? false}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isDefault: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              {t("addresses.buttons.cancel")}
            </Button>
            <Button onClick={onSave} disabled={creating || updating || isOffline} className="rounded-xl">
              {creating || updating ? t("addresses.buttons.saving") : editingId ? t("addresses.buttons.save") : t("addresses.buttons.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmDeleteId)} onOpenChange={(open: boolean) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("addresses.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("addresses.confirmDeleteSubtitle")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("addresses.buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && onDelete(confirmDeleteId)} className="bg-red-600 hover:bg-red-700">
              {t("addresses.buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
