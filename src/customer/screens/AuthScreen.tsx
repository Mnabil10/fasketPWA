import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Eye, EyeOff } from "lucide-react";
import appLogo from "../../../icons/icon-256.webp";
import { useApiErrorToast } from "../hooks";
import type { MobileAppConfig } from "../../types/api";
import { getLocalizedString } from "../utils/mobileAppConfig";
import {
  authLogin,
  verifyPhone,
  passwordResetRequest,
  passwordResetConfirm,
  requestOtp,
  authSignupStartSession,
  signupTelegramLinkToken,
  signupTelegramLinkStatus,
  signupRequestOtp,
  authSignupVerifySession,
} from "../../services/auth";
import { persistSessionTokens } from "../../store/session";
import { openExternalUrl } from "../../lib/fasketLinks";

interface AuthScreenProps {
  mode: "auth" | "register";
  onAuthSuccess: () => Promise<void> | void;
  onToggleMode: () => void;
  onContinueAsGuest: () => void;
  branding?: MobileAppConfig["branding"] | null;
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

export function AuthScreen({ mode, onAuthSuccess, onToggleMode, onContinueAsGuest, branding }: AuthScreenProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const brandName = getLocalizedString(branding?.appName, lang, t("common.appName", "Fasket"));
  const logoUrl = branding?.logoUrl || branding?.wordmarkUrl || appLogo;
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
  const [otpChannel, setOtpChannel] = useState<string | null>(null);
  const fallbackBotUrl = "https://t.me/FasketSuberBot";
  const [signupSessionToken, setSignupSessionToken] = useState<string | null>(null);
  const [signupSessionId, setSignupSessionId] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<{ linked: boolean; telegramChatIdMasked?: string } | null>(null);
  const [isCheckingLink, setIsCheckingLink] = useState(false);
  const [isRequestingSignupOtp, setIsRequestingSignupOtp] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState<number | undefined>();

  useEffect(() => {
    setErr(null);
    setStep(mode === "auth" ? "login" : "register");
    setSignupSessionToken(null);
    setSignupSessionId(null);
    setLinkStatus(null);
    setOtpExpiresIn(undefined);
  }, [mode]);

  useEffect(() => {
    if (!signupSessionId) return;
    setLinkStatus(null);
    void refreshLinkStatus();
  }, [signupSessionId]);

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
        const start = await authSignupStartSession({
          fullName: name,
          phone: normalizedPhone,
          country: "EG",
        });
        setPendingPhone(normalizedPhone);
        setSignupSessionId(start.signupSessionId || (start as any)?.signup_session_id || (start as any)?.signupSessionID || null);
        setSignupSessionToken(start.signupSessionToken || (start as any)?.signup_session_token || null);
        setFormData((prev) => ({ ...prev, otp: "" }));
        setErr(null);
        setLinkStatus(null);
        setOtpExpiresIn(undefined);
        setStep("verifySignup");
      }
    } catch (e: any) {
      const fallbackKey = step === "login" ? "auth.errorLogin" : "auth.errorRegister";
      const friendly = apiErrorToast(e, fallbackKey);
      const code = (e as any)?.response?.data?.code || (e as any)?.code;
      if (code === "PHONE_NOT_VERIFIED") {
        const prepared = prepareIdentifier(formData.identifier);
        const phone = prepared?.value || "";
        setPendingPhone(phone);
        try {
          const sent = await requestOtp({ phone, purpose: "LOGIN" });
          setFormData((prev) => ({ ...prev, otp: "", otpId: sent?.otpId ?? (e as any)?.response?.data?.otpId ?? "" }));
          setOtpChannel(sent?.channel ?? null);
        } catch (sendErr: any) {
          setErr(apiErrorToast(sendErr, "auth.errorLogin"));
        }
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
    setOtpChannel(null);
    setSignupSessionToken(null);
    setSignupSessionId(null);
    setLinkStatus(null);
    setOtpExpiresIn(undefined);
    const nextMode = step === "login" ? "register" : "login";
    setStep(nextMode);
    onToggleMode();
  };

  const handleContinueAsGuest = () => {
    setErr(null);
    setIsLoading(false);
    onContinueAsGuest();
  };

  const handleVerifySignup = async () => {
    if (!signupSessionId || !formData.otp.trim()) {
      setErr(t("auth.otpRequired", "Enter the OTP sent to your phone"));
      return;
    }
    setIsLoading(true);
    setErr(null);
    try {
      const res = await authSignupVerifySession({
        signupSessionId,
        signupSessionToken: signupSessionToken || undefined,
        otp: formData.otp.trim(),
      });
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

  const refreshLinkStatus = async () => {
    if (!signupSessionId) return;
    setIsCheckingLink(true);
    try {
      const res = await signupTelegramLinkStatus({
        signupSessionId,
        signupSessionToken: signupSessionToken || undefined,
      });
      setLinkStatus(res);
    } catch (linkErr: any) {
      apiErrorToast(linkErr, "auth.telegramLinkError");
    } finally {
      setIsCheckingLink(false);
    }
  };

  useEffect(() => {
    if (step !== "verifySignup" || !signupSessionId) return;
    if (linkStatus?.linked) return;
    const id = setInterval(() => {
      void refreshLinkStatus();
    }, 4000);
    return () => clearInterval(id);
  }, [step, signupSessionId, linkStatus?.linked]);

  const handleSignupRequestOtp = async () => {
    if (!signupSessionId) {
      setErr(t("auth.sessionMissing", "Signup session is missing. Please start again."));
      return;
    }
    if (!linkStatus?.linked) {
      setErr(t("auth.telegramNotLinkedError", "Please open the Telegram bot link and tap Start to link your account."));
      return;
    }
    setIsRequestingSignupOtp(true);
    setErr(null);
    try {
      const res = await signupRequestOtp({ signupSessionId, signupSessionToken: signupSessionToken || undefined });
      setOtpChannel(res.channel ?? "telegram");
      setOtpExpiresIn(res.expiresInSeconds);
      setFormData((prev) => ({ ...prev, otp: "" }));
    } catch (otpErr: any) {
      setErr(apiErrorToast(otpErr, "auth.errorRegister"));
    } finally {
      setIsRequestingSignupOtp(false);
    }
  };

  const openTelegramBotWithToken = async () => {
    setErr(null);
    let deeplink: string | null = null;
    try {
      if (!signupSessionId) {
        setErr(t("auth.sessionMissing", "Signup session is missing. Please start again."));
        return;
      }
      const token = await signupTelegramLinkToken({ signupSessionId, signupSessionToken: signupSessionToken || undefined });
      deeplink = token?.deeplink?.trim() || null;
    } catch (linkErr: any) {
      setErr(apiErrorToast(linkErr, "auth.telegramLinkError"));
    }

    if (deeplink) {
      await openExternalUrl(deeplink);
      return;
    }

    await openExternalUrl(fallbackBotUrl);
    setErr(t("auth.telegramLinkMissing", "Unable to open bot link. Please try again."));
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
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              className="w-full h-12 rounded-xl"
              onClick={handleContinueAsGuest}
            >
              {t("auth.continueAsGuest", "Continue as guest")}
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
            <p className="text-sm text-gray-600">
              {t("auth.verifyPhone", "أكمل ربط تيليجرام واضغط إرسال الكود لاستلامه على البوت.")}
            </p>

            <div className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-sm">
              <div>
                <div className="font-medium">
                  {linkStatus?.linked
                    ? t("auth.telegramLinked", "تم ربط تيليجرام بنجاح.")
                    : t("auth.telegramNotLinked", "لم يتم ربط تيليجرام بعد")}
                </div>
                {linkStatus?.telegramChatIdMasked && (
                  <div className="text-gray-600">{linkStatus.telegramChatIdMasked}</div>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={refreshLinkStatus} disabled={isCheckingLink}>
                {isCheckingLink ? t("common.loading") : t("common.refresh", "تحديث")}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={openTelegramBotWithToken}
            >
              {t("auth.telegramOpenBot", "افتح رابط تيليجرام")}
            </Button>

            <div className="space-y-2">
              <Button
                type="button"
                className="w-full h-11 rounded-xl"
                disabled={isRequestingSignupOtp || !signupSessionId}
                onClick={handleSignupRequestOtp}
              >
                {isRequestingSignupOtp ? t("common.loading") : t("auth.sendOtpTelegram", "إرسال الكود عبر تيليجرام")}
              </Button>
              <p className="text-xs text-gray-500">
                {t("auth.telegramOnly", "الكود سيصل فقط عبر تيليجرام. افتح الرابط واضغط Start ثم اطلب الكود.")}
              </p>
              {otpExpiresIn ? (
                <p className="text-xs text-gray-500">
                  {t("auth.otpExpiresIn", {
                    defaultValue: "الكود ينتهي خلال {{min}} دقيقة",
                    min: Math.ceil(otpExpiresIn / 60),
                  })}
                </p>
              ) : null}
            </div>

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
            {otpChannel && (
              <p className="text-xs text-gray-500">
                {otpChannel === "telegram"
                  ? t("auth.otpTelegramHint", "We sent the code on Telegram. Open the bot to view it.")
                  : t("auth.otpSmsHint", "We sent the code via SMS/WhatsApp.")}
              </p>
            )}
            <p className="text-xs text-gray-500 leading-relaxed">
              <button
                type="button"
                onClick={openTelegramBotWithToken}
                className="text-primary underline"
              >
                {t(
                  "auth.telegramLinkHint",
                  "افتح رابط تيليجرام واضغط Start في البوت (FasketSuberBot) ثم اطلب الكود."
                )}
              </button>
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={openTelegramBotWithToken}
            >
              {t("auth.telegramOpenBot", "افتح رابط تيليجرام")}
            </Button>
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
                onClick={async () => {
                  if (!pendingPhone) return;
                  try {
                    setIsLoading(true);
                    const sent = await requestOtp({ phone: pendingPhone, purpose: "LOGIN" });
                    setFormData((prev) => ({ ...prev, otpId: sent?.otpId ?? prev.otpId }));
                    setOtpChannel(sent?.channel ?? otpChannel);
                  } catch (resendErr: any) {
                    setErr(apiErrorToast(resendErr, "auth.errorLogin"));
                  } finally {
                    setIsLoading(false);
                  }
                }}
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
  return /^\+[1-9]\d{7,14}$/.test(value);
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
