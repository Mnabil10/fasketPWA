import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CreditCard, Wallet as WalletIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
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
import { NetworkBanner, EmptyState, RetryBlock } from "../components";
import { useApiErrorToast, useNetworkStatus, usePaymentMethods } from "../hooks";
import { useToast } from "../providers/ToastProvider";
import { AppState, type UpdateAppState } from "../CustomerApp";
import type { SavedPaymentMethod } from "../../types/api";
import { normalizeEgyptPhone, sanitizeEgyptPhoneInput } from "../../utils/phone";

interface PaymentMethodsScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

type CardFormState = {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  isDefault: boolean;
};

type WalletFormState = {
  provider: "VODAFONE_CASH" | "ORANGE_MONEY" | "ETISALAT_CASH";
  phone: string;
  isDefault: boolean;
};

const emptyCardForm: CardFormState = {
  brand: "Visa",
  last4: "",
  expMonth: "",
  expYear: "",
  isDefault: false,
};

const emptyWalletForm: WalletFormState = {
  provider: "VODAFONE_CASH",
  phone: "",
  isDefault: false,
};

export function PaymentMethodsScreen({ appState, updateAppState }: PaymentMethodsScreenProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast();
  const {
    methods,
    isLoading,
    isError,
    error,
    refetch,
    createPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    creating,
    deletingId,
    settingDefaultId,
  } = usePaymentMethods();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formType, setFormType] = useState<"CARD" | "WALLET">("CARD");
  const [cardForm, setCardForm] = useState<CardFormState>(emptyCardForm);
  const [walletForm, setWalletForm] = useState<WalletFormState>(emptyWalletForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const cardMethods = useMemo(() => methods.filter((method) => method.type === "CARD"), [methods]);
  const walletMethods = useMemo(() => methods.filter((method) => method.type === "WALLET"), [methods]);

  const listErrorMessage = useMemo(() => {
    if (!error) return "";
    return t("payments.error.load", "Unable to load payment methods.");
  }, [error, t]);

  const openDialog = (type: "CARD" | "WALLET") => {
    setFormType(type);
    setCardForm(emptyCardForm);
    setWalletForm(emptyWalletForm);
    setFormErrors({});
    setDialogOpen(true);
  };

  const generateToken = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `pm_${crypto.randomUUID()}`;
    }
    return `pm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  const validateCard = () => {
    const errors: Record<string, string> = {};
    const last4 = cardForm.last4.replace(/\D/g, "");
    if (last4.length !== 4) errors.last4 = t("payments.validation.last4", "Enter the last 4 digits.");
    const month = Number(cardForm.expMonth);
    if (!month || month < 1 || month > 12) errors.expMonth = t("payments.validation.expMonth", "Enter a valid month.");
    const year = Number(cardForm.expYear);
    if (!year || year < new Date().getFullYear()) errors.expYear = t("payments.validation.expYear", "Enter a valid year.");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateWallet = () => {
    const errors: Record<string, string> = {};
    const normalized = normalizeEgyptPhone(walletForm.phone);
    if (!normalized) errors.phone = t("payments.validation.walletPhone", "Enter a valid wallet phone.");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (formType === "CARD") {
      if (!validateCard()) return;
      try {
        await createPaymentMethod({
          type: "CARD",
          token: generateToken(),
          brand: cardForm.brand || undefined,
          last4: cardForm.last4.replace(/\D/g, ""),
          expMonth: Number(cardForm.expMonth),
          expYear: Number(cardForm.expYear),
          isDefault: cardForm.isDefault,
        });
        showToast({ type: "success", message: t("payments.success.saved", "Payment method saved.") });
        setDialogOpen(false);
      } catch (e: any) {
        apiErrorToast(e, "payments.error.save");
      }
      return;
    }

    if (!validateWallet()) return;
    try {
      await createPaymentMethod({
        type: "WALLET",
        token: generateToken(),
        walletProvider: walletForm.provider,
        walletPhone: normalizeEgyptPhone(walletForm.phone) ?? undefined,
        isDefault: walletForm.isDefault,
      });
      showToast({ type: "success", message: t("payments.success.saved", "Payment method saved.") });
      setDialogOpen(false);
    } catch (e: any) {
      apiErrorToast(e, "payments.error.save");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePaymentMethod(id);
      showToast({ type: "success", message: t("payments.success.deleted", "Payment method removed.") });
    } catch (e: any) {
      apiErrorToast(e, "payments.error.delete");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      showToast({ type: "success", message: t("payments.success.default", "Default payment updated.") });
    } catch (e: any) {
      apiErrorToast(e, "payments.error.default");
    }
  };

  const walletProviderLabel = (value?: string | null) => {
    if (!value) return t("payments.wallet", "Wallet");
    if (value === "VODAFONE_CASH") return t("payments.walletProviders.vodafone", "Vodafone Cash");
    if (value === "ORANGE_MONEY") return t("payments.walletProviders.orange", "Orange Money");
    if (value === "ETISALAT_CASH") return t("payments.walletProviders.etisalat", "Etisalat Cash");
    return value;
  };

  const renderMethod = (method: SavedPaymentMethod) => {
    const label =
      method.type === "WALLET"
        ? `${walletProviderLabel(method.walletProvider)} • ${method.walletPhone ?? ""}`.trim()
        : `${method.brand || t("payments.card", "Card")} •••• ${method.last4 ?? ""}`.trim();
    return (
      <div key={method.id} className="section-card flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          {method.expMonth && method.expYear && (
            <p className="text-xs text-gray-500">
              {t("payments.expiry", {
                defaultValue: "Expires {{month}}/{{year}}",
                month: String(method.expMonth).padStart(2, "0"),
                year: method.expYear,
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {method.isDefault ? (
            <Badge variant="secondary" className="text-xs">
              {t("payments.default", "Default")}
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              disabled={settingDefaultId === method.id || isOffline}
              onClick={() => handleSetDefault(method.id)}
            >
              {settingDefaultId === method.id ? t("payments.settingDefault", "Setting...") : t("payments.setDefault", "Set default")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600"
            disabled={deletingId === method.id || isOffline}
            onClick={() => setConfirmDeleteId(method.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="section-card flex items-center">
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
            {t("payments.title", "Payment methods")}
          </h1>
          <p className="text-xs text-gray-500">{t("payments.subtitle", "Securely save cards and wallets.")}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openDialog("CARD")} disabled={isOffline}>
            <Plus className="w-4 h-4 mr-1" />
            {t("payments.addCard", "Add card")}
          </Button>
          <Button size="sm" className="rounded-xl" onClick={() => openDialog("WALLET")} disabled={isOffline}>
            <WalletIcon className="w-4 h-4 mr-1" />
            {t("payments.addWallet", "Add wallet")}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full space-y-4">
        {isError && <RetryBlock message={listErrorMessage} onRetry={() => refetch()} />}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="section-card animate-pulse h-20" />
            ))}
          </div>
        ) : methods.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-10 h-10 text-primary" />}
            title={t("payments.empty", "No payment methods saved yet")}
            subtitle={t("payments.emptySubtitle", "Add a card or wallet to speed up checkout.")}
            actionLabel={t("payments.addCard", "Add card")}
            onAction={() => openDialog("CARD")}
          />
        ) : (
          <>
            {cardMethods.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">{t("payments.cards", "Cards")}</h3>
                {cardMethods.map(renderMethod)}
              </div>
            )}
            {walletMethods.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">{t("payments.wallets", "Wallets")}</h3>
                {walletMethods.map(renderMethod)}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-h-[80vh] overflow-y-auto space-y-4"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>
              {formType === "CARD"
                ? t("payments.dialogs.addCard", "Add card")
                : t("payments.dialogs.addWallet", "Add wallet")}
            </DialogTitle>
          </DialogHeader>

          {formType === "CARD" ? (
            <div className="space-y-3">
              <div>
                <Label>{t("payments.cardBrand", "Card brand")}</Label>
                <select
                  value={cardForm.brand}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, brand: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary"
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">American Express</option>
                  <option value="Card">{t("payments.other", "Other")}</option>
                </select>
              </div>
              <div>
                <Label>{t("payments.last4", "Last 4 digits")}</Label>
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  value={cardForm.last4}
                  onChange={(e) =>
                    setCardForm((prev) => ({ ...prev, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                  }
                />
                {formErrors.last4 && <p className="text-xs text-red-500 mt-1">{formErrors.last4}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("payments.expMonth", "Exp. month")}</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={2}
                    value={cardForm.expMonth}
                    onChange={(e) => setCardForm((prev) => ({ ...prev, expMonth: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                  />
                  {formErrors.expMonth && <p className="text-xs text-red-500 mt-1">{formErrors.expMonth}</p>}
                </div>
                <div>
                  <Label>{t("payments.expYear", "Exp. year")}</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={cardForm.expYear}
                    onChange={(e) => setCardForm((prev) => ({ ...prev, expYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  />
                  {formErrors.expYear && <p className="text-xs text-red-500 mt-1">{formErrors.expYear}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t("payments.setDefault", "Set default")}</p>
                  <p className="text-xs text-gray-500">{t("payments.defaultHint", "Use this at checkout")}</p>
                </div>
                <Switch
                  checked={cardForm.isDefault}
                  onCheckedChange={(checked) => setCardForm((prev) => ({ ...prev, isDefault: checked }))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>{t("payments.walletProvider", "Wallet provider")}</Label>
                <select
                  value={walletForm.provider}
                  onChange={(e) => setWalletForm((prev) => ({ ...prev, provider: e.target.value as WalletFormState["provider"] }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary"
                >
                  <option value="VODAFONE_CASH">{t("payments.walletProviders.vodafone", "Vodafone Cash")}</option>
                  <option value="ORANGE_MONEY">{t("payments.walletProviders.orange", "Orange Money")}</option>
                  <option value="ETISALAT_CASH">{t("payments.walletProviders.etisalat", "Etisalat Cash")}</option>
                </select>
              </div>
              <div>
                <Label>{t("payments.walletPhone", "Wallet phone")}</Label>
                <Input
                  value={walletForm.phone}
                  onChange={(e) =>
                    setWalletForm((prev) => ({ ...prev, phone: sanitizeEgyptPhoneInput(e.target.value) }))
                  }
                  placeholder={t("payments.walletPhonePlaceholder", "01XXXXXXXXX")}
                />
                {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t("payments.setDefault", "Set default")}</p>
                  <p className="text-xs text-gray-500">{t("payments.defaultHint", "Use this at checkout")}</p>
                </div>
                <Switch
                  checked={walletForm.isDefault}
                  onCheckedChange={(checked) => setWalletForm((prev) => ({ ...prev, isDefault: checked }))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              {t("payments.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSave} disabled={creating || isOffline} className="rounded-xl">
              {creating ? t("payments.saving", "Saving...") : t("payments.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmDeleteId)} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payments.confirmDeleteTitle", "Remove payment method")}</AlertDialogTitle>
            <AlertDialogDescription>{t("payments.confirmDeleteSubtitle", "This payment method will be removed.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("payments.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("payments.delete", "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
