import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Eye, EyeOff } from "lucide-react";
import appLogo from "../../../icons/icon-256.webp";
import { useApiErrorToast } from "../hooks";
import {
  authLogin,
  authSignupStart,
  authSignupVerify,
  resendPhoneVerification,
  verifyPhone,
  passwordResetRequest,
  passwordResetConfirm,
} from "../../services/auth";
import { persistSessionTokens } from "../../store/session";
interface AuthScreenProps {
  mode: "auth" | "register";
  onAuthSuccess: () => Promise<void> | void;
  onToggleMode: () => void;
}

type FormState = {
  name: string;
  phone: string;
  email: string;
  password: string;
  identifier: string;
  otp: string;
  otpId: string;
  newPassword: string;
};

export function AuthScreen({ mode, onAuthSuccess, onToggleMode }: AuthScreenProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"login" | "register" | "verifySignup" | "verifyPhone" | "forgot" | "resetVerify">(
    mode === "auth" ? "login" : "register"
  );
  const isLogin = step === "login";
  const apiErrorToast = useApiErrorToast();

  const [formData, setFormData] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    password: "",
    identifier: "",
    otp: "",
    otpId: "",
    newPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string>("");

  useEffect(() => {
    setErr(null);
    setStep(mode === "auth" ? "login" : "register");
  }, [mode]);

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
        if (prepared.kind === "phone" && !isValidPhoneNumber(prepared.value)) {
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
        await onAuthSuccess();
      }

      if (step === "register") {
        const password = formData.password.trim();
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          throw new Error(t("auth.passwordMinLength"));
        }
        const name = formData.name?.trim();
        if (!name) throw new Error(t("auth.nameRequired"));
        const normalizedPhone = normalizeEgPhone(formData.phone);
        if (!isValidPhoneNumber(normalizedPhone)) {
          throw new Error(t("auth.phoneInvalid"));
        }
        const trimmedEmail = formData.email?.trim() || "";
        const start = await authSignupStart({
          name,
          phone: normalizedPhone,
          email: trimmedEmail || undefined,
          password,
        });
        setPendingPhone(normalizedPhone);
        setFormData((prev) => ({ ...prev, otpId: start.otpId, otp: "" }));
        setStep("verifySignup");
      }
    } catch (e: any) {
      const fallbackKey = step === "login" ? "auth.errorLogin" : "auth.errorRegister";
      const friendly = apiErrorToast(e, fallbackKey);
      const code = (e as any)?.response?.data?.code || (e as any)?.code;
      if (code === "PHONE_NOT_VERIFIED") {
        const prepared = prepareIdentifier(formData.identifier);
        setPendingPhone(prepared?.value || "");
        setFormData((prev) => ({ ...prev, otp: "", otpId: (e as any)?.response?.data?.otpId ?? "" }));
        setStep("verifyPhone");
      } else {
        setErr(friendly);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModeToggle = () => {
    setIsLoading(false);
    setErr(null);
    setFormData((prev) => ({
      ...prev,
      otp: "",
      otpId: "",
      newPassword: "",
    }));
    const nextMode = step === "login" ? "register" : "login";
    setStep(nextMode);
    onToggleMode();
  };

  const handleVerifySignup = async () => {
    if (!formData.otpId || !formData.otp.trim()) {
      setErr(t("auth.otpRequired", "Enter the OTP sent to your phone"));
      return;
    }
    setIsLoading(true);
    setErr(null);
    try {
      const res = await authSignupVerify({ otpId: formData.otpId, otp: formData.otp.trim() });
      if (!res.accessToken || !res.refreshToken) {
        throw new Error(t("auth.errorRegister"));
      }
      persistTokens(res.accessToken, res.refreshToken);
      await onAuthSuccess();
    } catch (e: any) {
      setErr(apiErrorToast(e, "auth.errorRegister"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!pendingPhone || !formData.otp.trim()) {
      setErr(t("auth.otpRequired", "Enter the OTP sent to your phone"));
      return;
    }
    setIsLoading(true);
    setErr(null);
    try {
      const res = await verifyPhone({ phone: pendingPhone, otp: formData.otp.trim(), otpId: formData.otpId });
      if (res.accessToken && res.refreshToken) {
        persistTokens(res.accessToken, res.refreshToken);
        await onAuthSuccess();
      } else {
        setStep("login");
      }
    } catch (e: any) {
      setErr(apiErrorToast(e, "auth.errorLogin"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const identifier = formData.identifier.trim();
    if (!identifier) {
      setErr(t("auth.identifierRequired"));
      return;
    }
    setIsLoading(true);
    setErr(null);
    try {
      const { otpId } = await passwordResetRequest(identifier);
      setFormData((prev) => ({ ...prev, otpId, otp: "", newPassword: "" }));
      setStep("resetVerify");
    } catch (e: any) {
      setErr(apiErrorToast(e, "auth.errorForgot"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!formData.otpId || !formData.otp.trim() || !formData.newPassword.trim()) {
      setErr(t("auth.resetRequired", "Provide OTP and new password"));
      return;
    }
    setIsLoading(true);
    setErr(null);
    try {
      await passwordResetConfirm({ otpId: formData.otpId, otp: formData.otp.trim(), newPassword: formData.newPassword.trim() });
      setStep("login");
      setErr(null);
      setFormData((prev) => ({ ...prev, password: "", otp: "", otpId: "", newPassword: "" }));
    } catch (e: any) {
      setErr(apiErrorToast(e, "auth.errorReset"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell" dir="auto">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-card overflow-hidden">
          <img src={appLogo} alt={t("common.appName", "Fasket")} className="w-12 h-12 object-contain" />
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
            <div className="flex justify-between text-sm text-primary mt-2">
              <button type="button" onClick={() => setStep("forgot")}>{t("auth.forgot", "Forgot password?")}</button>
              <button type="button" onClick={handleModeToggle}>{t("auth.signUp")}</button>
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

        {step === "verifySignup" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t("auth.verifyPhone", "Enter the OTP sent to your phone")}</p>
            <Input
              type="text"
              placeholder={t("auth.otpPlaceholder", "Enter OTP")}
              value={formData.otp}
              onChange={(e) => handleInputChange("otp", e.target.value)}
              className="h-12 rounded-xl"
            />
            {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{err}</div>}
            <Button onClick={handleVerifySignup} disabled={isLoading} className="w-full h-12 rounded-xl">
              {isLoading ? t("common.loading") : t("auth.verify", "Verify")}
            </Button>
            <button type="button" onClick={() => setStep("register")} className="text-sm text-primary">
              {t("auth.back", "Back")}
            </button>
          </div>
        )}

        {step === "verifyPhone" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t("auth.verifyPhoneLogin", "Verify your phone to continue")}</p>
            <Input
              type="text"
              placeholder={t("auth.otpPlaceholder", "Enter OTP")}
              value={formData.otp}
              onChange={(e) => handleInputChange("otp", e.target.value)}
              className="h-12 rounded-xl"
            />
            {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{err}</div>}
            <div className="flex gap-2">
              <Button onClick={handleVerifyPhone} disabled={isLoading} className="flex-1 h-12 rounded-xl">
                {isLoading ? t("common.loading") : t("auth.verify", "Verify")}
              </Button>
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={() => pendingPhone && resendPhoneVerification(pendingPhone)}
                className="h-12 rounded-xl"
              >
                {t("auth.resend", "Resend")}
              </Button>
            </div>
            <button type="button" onClick={() => setStep("login")} className="text-sm text-primary">
              {t("auth.back", "Back")}
            </button>
          </div>
        )}

        {step === "forgot" && (
          <div className="space-y-4">
            <Label>{t("auth.identifierLabel")}</Label>
            <Input
              type="text"
              placeholder={t("auth.identifierPlaceholder")}
              value={formData.identifier}
              onChange={(e) => handleInputChange("identifier", e.target.value)}
              className="h-12 rounded-xl"
            />
            {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{err}</div>}
            <Button onClick={handleForgotPassword} disabled={isLoading} className="w-full h-12 rounded-xl">
              {isLoading ? t("common.loading") : t("auth.send_reset", "Send reset code")}
            </Button>
            <button type="button" onClick={() => setStep("login")} className="text-sm text-primary">
              {t("auth.back", "Back")}
            </button>
          </div>
        )}

        {step === "resetVerify" && (
          <div className="space-y-4">
            <Input
              type="text"
              placeholder={t("auth.otpPlaceholder", "Enter OTP")}
              value={formData.otp}
              onChange={(e) => handleInputChange("otp", e.target.value)}
              className="h-12 rounded-xl"
            />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.newPassword", "New password")}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              className="h-12 rounded-xl"
            />
            {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{err}</div>}
            <Button onClick={handleResetPassword} disabled={isLoading} className="w-full h-12 rounded-xl">
              {isLoading ? t("common.loading") : t("auth.resetPassword", "Reset password")}
            </Button>
            <button type="button" onClick={() => setStep("login")} className="text-sm text-primary">
              {t("auth.back", "Back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeEgPhone(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return "";
  if (digitsOnly.startsWith("20")) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith("0")) {
    const rest = digitsOnly.slice(1);
    return rest ? `+20${rest}` : "+20";
  }
  if (digitsOnly.startsWith("1") && digitsOnly.length >= 9) {
    return `+20${digitsOnly}`;
  }
  if (trimmed.startsWith("+")) {
    return `+${digitsOnly}`;
  }
  return `+${digitsOnly}`;
}

function isPhoneLike(value: string) {
  if (!value) return false;
  if (value.includes("@")) return false;
  return /^[\d\s()+-]+$/.test(value);
}

function isValidPhoneNumber(value: string | undefined) {
  if (!value) return false;
  return /^\+20\d{8,11}$/.test(value);
}

function prepareIdentifier(value: string): { value: string; kind: "phone" | "email" } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isPhoneLike(trimmed)) {
    const normalizedPhone = normalizeEgPhone(trimmed);
    return { value: normalizedPhone, kind: "phone" };
  }
  return { value: trimmed.toLowerCase(), kind: "email" };
}

function persistTokens(access: string, refresh: string) {
  persistSessionTokens(access, refresh);
}
