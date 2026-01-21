import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ArrowLeft, User } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useNetworkStatus, useProfile, useApiErrorToast } from "../hooks";
import { useToast } from "../providers/ToastProvider";
import { NetworkBanner } from "../components";
import { normalizeEgyptPhone, sanitizeEgyptPhoneInput, isValidEgyptPhone } from "../../utils/phone";

interface EditProfileScreenProps {
    appState: AppState;
    updateAppState: UpdateAppState;
}

export function EditProfileScreen({ appState, updateAppState }: EditProfileScreenProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { isOffline } = useNetworkStatus();
    const apiErrorToast = useApiErrorToast();
    const profileQuery = useProfile({ enabled: Boolean(appState.user) });
    const profile = profileQuery.profile || appState.user;

    const [name, setName] = useState(profile?.name || "");
    const [email, setEmail] = useState(profile?.email || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (profile) {
            setName(profile.name || "");
            setEmail(profile.email || "");
            setPhone(profile.phone || "");
        }
    }, [profile?.name, profile?.email, profile?.phone]);

    const validateProfile = () => {
        const next: Record<string, string> = {};
        if (!name.trim()) next.name = t("profile.validation.name");
        if (!phone.trim()) {
            next.phone = t("profile.validation.phone");
        } else if (!isValidEgyptPhone(phone)) {
            next.phone = t("profile.validation.phoneInvalid", "Enter a valid phone number.");
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSaveProfile = async () => {
        if (!validateProfile()) return;
        try {
            const normalizedPhone = normalizeEgyptPhone(phone);
            if (!normalizedPhone) {
                setErrors((prev) => ({ ...prev, phone: t("profile.validation.phoneInvalid", "Enter a valid phone number.") }));
                return;
            }
            const updated = await profileQuery.updateProfile({ name, email, phone: normalizedPhone });
            updateAppState({ user: updated });
            showToast({ type: "success", message: t("profile.saved") });
            // Go back to profile after save?
            updateAppState({ currentScreen: "profile" });
        } catch (error: any) {
            apiErrorToast(error, "profile.errorSave");
        }
    };

    return (
        <div className="page-shell">
            <NetworkBanner />
            <div className="bg-white px-4 py-4 shadow-sm flex items-center">
                <Button variant="ghost" size="sm" onClick={() => updateAppState({ currentScreen: "profile" })} className="p-2 mr-2">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
                        {t("profile.editProfile")}
                    </h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-col items-center py-4">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                            <User className="w-10 h-10" />
                        </div>
                        <p className="text-sm text-gray-500">{t("profile.updateInfoHint", "Update your personal information")}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">{t("auth.fullName")}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isOffline}
                                placeholder={t("auth.fullNamePlaceholder", "Enter your full name")}
                                className="rounded-xl h-11"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">{t("auth.email")}</Label>
                            <Input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isOffline}
                                placeholder={t("auth.emailPlaceholder", "Enter your email")}
                                className="rounded-xl h-11"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">{t("auth.phone")}</Label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(sanitizeEgyptPhoneInput(e.target.value))}
                                disabled={isOffline}
                                placeholder={t("auth.phonePlaceholder", "01x xxxx xxxx")}
                                className="rounded-xl h-11"
                            />
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleSaveProfile}
                            disabled={profileQuery.updating || isOffline}
                            className="w-full rounded-xl h-12 text-base font-semibold"
                        >
                            {profileQuery.updating ? t("common.loading") : t("profile.saveProfile")}
                        </Button>
                    </div>
                </div>
            </div>

            <MobileNav appState={appState} updateAppState={updateAppState} />
        </div>
    );
}
