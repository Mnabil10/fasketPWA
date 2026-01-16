import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Eye, EyeOff } from "lucide-react";
import appLogo from "../../../icons/icon-256.webp";
import { useApiErrorToast } from "../hooks";
import type { MobileAppConfig } from "../../types/api";
import { getLocalizedString } from "../utils/mobileAppConfig";
import { authLogin, authRegister } from "../../services/auth";
import { persistSessionTokens } from "../../store/session";
import { App as CapacitorApp } from "@capacitor/app";
import { isPhoneLike, isValidEgyptPhone, normalizeEgyptPhone, sanitizeEgyptPhoneInput } from "../../utils/phone";

interface AuthScreenProps {
  mode: "auth" | "register";
  onAuthSuccess: () => Promise<void> | void;
  onToggleMode: () => void;
  branding?: MobileAppConfig["branding"] | null;
}

type FormState = {
  name: string;
  phone: string;
  email: string;
  password: string;
  identifier: string;
};

export function AuthScreen({ mode, onAuthSuccess, onToggleMode, branding }: AuthScreenProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const brandName = getLocalizedString(branding?.appName, lang, t("common.appName", "Fasket"));
  const logoUrl = branding?.logoUrl || branding?.wordmarkUrl || appLogo;
  const [step, setStep] = useState<"login" | "register">(mode === "auth" ? "login" : "register");
  const apiErrorToast = useApiErrorToast();

  const [formData, setFormData] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    password: "",
    identifier: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setStep(mode === "auth" ? "login" : "register");
  }, [mode]);

  const clearSensitiveFields = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      password: "",
    }));
  }, []);

  useEffect(() => {
    if (!CapacitorApp?.addListener) return;
    let listener: { remove: () => void } | undefined;
    const sub = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        clearSensitiveFields();
      }
    });
    if ("then" in sub && typeof sub.then === "function") {
      sub.then((ls) => {
        listener = ls;
      });
    } else {
      listener = sub as unknown as { remove: () => void };
    }
    return () => {
      listener?.remove?.();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErr(null);

    try {
      if (step === "login") {
        const password = formData.password.trim();
        const identifierInput = formData.identifier.trim();
        if (!identifierInput) {
          throw new Error(t("auth.identifierRequired"));
        }
        const prepared = prepareIdentifier(identifierInput);
        if (!prepared) {
          throw new Error(t("auth.identifierRequired"));
        }
        if (prepared.kind === "phone" && !isValidEgyptPhone(prepared.value)) {
          throw new Error(t("auth.phoneInvalid"));
        }
        const res = await authLogin({
          identifier: prepared.value,
          password,
        });
        if (!res.accessToken || !res.refreshToken) {
          throw new Error(t("auth.errorLogin"));
        }
        persistTokens(res.accessToken, res.refreshToken);
        clearSensitiveFields();
        await onAuthSuccess();
      }

      if (step === "register") {
        const password = formData.password.trim();
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          throw new Error(t("auth.passwordMinLength"));
        }
        const name = formData.name?.trim();
        if (!name) throw new Error(t("auth.nameRequired"));
        const normalizedPhone = normalizeEgyptPhone(formData.phone);
        if (!normalizedPhone || !isValidEgyptPhone(normalizedPhone)) {
          throw new Error(t("auth.phoneInvalid"));
        }
        const res = await authRegister({
          name,
          phone: normalizedPhone,
          email: formData.email?.trim() || undefined,
          password,
        });
        if (!res.accessToken || !res.refreshToken) {
          throw new Error(t("auth.errorRegister"));
        }
        persistTokens(res.accessToken, res.refreshToken);
        clearSensitiveFields();
        await onAuthSuccess();
      }
    } catch (e: any) {
      const fallbackKey = step === "login" ? "auth.errorLogin" : "auth.errorRegister";
      const friendly = apiErrorToast(e, fallbackKey);
      setErr(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormState, value: string) => {
    const nextValue =
      field === "phone" || (field === "identifier" && isPhoneLike(value))
        ? sanitizeEgyptPhoneInput(value)
        : value;
    setFormData((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleModeToggle = () => {
    setIsLoading(false);
    setErr(null);
    setFormData((prev) => ({
      ...prev,
      password: "",
    }));
    const nextMode = step === "login" ? "register" : "login";
    setStep(nextMode);
    onToggleMode();
  };

  return (
    <div className="page-shell" dir="auto">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-card overflow-hidden">
          <img src={logoUrl} alt={brandName} className="w-12 h-12 object-contain" />
        </div>
        <div>
          <h1 className="font-poppins text-2xl text-gray-900" style={{ fontWeight: 800 }}>
            {step === "login" ? t("auth.welcomeBack") : t("auth.registerTitle")}
          </h1>
          <p className="text-gray-600">
            {step === "login" ? t("auth.signInSubtitle") : t("auth.registerSubtitle")}
          </p>
        </div>
      </div>

      <div className="section-card w-full max-w-xl self-center">
        {step === "login" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t("auth.identifierLabel") ?? t("auth.identifierPlaceholder")}</Label>
              <Input
                id="identifier"
                type="text"
                placeholder={t("auth.identifierPlaceholder")}
                value={formData.identifier}
                onChange={(e) => handleInputChange("identifier", e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.password")}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="h-12 rounded-xl pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{err}</div>}
            <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl">
              {isLoading ? t("common.loading") : t("auth.signIn")}
            </Button>
            <div className="text-center text-sm mt-2">
              <button type="button" onClick={handleModeToggle} className="text-primary">
                {t("auth.signUp")}
              </button>
            </div>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.fullName")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("auth.fullName")}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("auth.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+20 100 123 4567"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <p className="text-xs text-gray-500">{t("auth.phoneHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.password")}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="h-12 rounded-xl pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{err}</div>}
            <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl">
              {isLoading ? t("common.loading") : t("auth.signUp")}
            </Button>
            <div className="text-center text-sm mt-2">
              <button type="button" onClick={handleModeToggle} className="text-primary">{t("auth.signIn")}</button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

function prepareIdentifier(value: string): { value: string; kind: "phone" | "email" } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isPhoneLike(trimmed)) {
    const normalizedPhone = normalizeEgyptPhone(trimmed);
    if (!normalizedPhone) return null;
    return { value: normalizedPhone, kind: "phone" };
  }
  return { value: trimmed.toLowerCase(), kind: "email" };
}

function persistTokens(access: string, refresh: string) {
  persistSessionTokens(access, refresh);
}
