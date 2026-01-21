import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ArrowLeft, Lock } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useNetworkStatus, useProfile, useApiErrorToast } from "../hooks";
import { useToast } from "../providers/ToastProvider";
import { NetworkBanner } from "../components";

interface ChangePasswordScreenProps {
    appState: AppState;
    updateAppState: UpdateAppState;
}

export function ChangePasswordScreen({ appState, updateAppState }: ChangePasswordScreenProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { isOffline } = useNetworkStatus();
    const apiErrorToast = useApiErrorToast();
    const profileQuery = useProfile({ enabled: Boolean(appState.user) });

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChangePassword = async () => {
        const next: Record<string, string> = {};
        if (!currentPassword) next.currentPassword = t("profile.validation.currentPassword");
        if (!newPassword) next.newPassword = t("profile.validation.newPassword");
        if (newPassword !== confirmPassword) next.confirmPassword = t("profile.validation.confirmPassword");
        setErrors(next);
        if (Object.keys(next).length) return;

        try {
            await profileQuery.changePassword({ currentPassword, newPassword });
            showToast({ type: "success", message: t("profile.passwordChanged") });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            // Go back to profile after success
            updateAppState({ currentScreen: "profile" });
        } catch (error: any) {
            apiErrorToast(error, "profile.errorPassword");
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
                        {t("profile.changePassword")}
                    </h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-col items-center py-4">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                            <Lock className="w-10 h-10" />
                        </div>
                        <p className="text-sm text-gray-500">{t("profile.changePasswordHint", "Secure your account with a new password")}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">{t("profile.currentPassword")}</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={isOffline}
                                placeholder="••••••••"
                                className="rounded-xl h-11"
                            />
                            {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword}</p>}
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">{t("profile.newPassword")}</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isOffline}
                                placeholder="••••••••"
                                className="rounded-xl h-11"
                            />
                            {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">{t("profile.confirmPassword")}</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isOffline}
                                placeholder="••••••••"
                                className="rounded-xl h-11"
                            />
                            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleChangePassword}
                            disabled={profileQuery.changingPassword || isOffline}
                            className="w-full rounded-xl h-12 text-base font-semibold"
                        >
                            {profileQuery.changingPassword ? t("common.loading") : t("profile.savePassword")}
                        </Button>
                    </div>
                </div>
            </div>

            <MobileNav appState={appState} updateAppState={updateAppState} />
        </div>
    );
}
