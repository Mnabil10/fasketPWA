import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import appLogo from "../../../icons/icon-256.webp";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{ background: "linear-gradient(140deg, #E53935 0%, #c92b2b 45%, #0f172a 110%)" }}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,#fff,transparent_35%),radial-gradient(circle_at_80%_0%,#fff,transparent_25%)]" />
      <div className="relative flex flex-col items-center gap-4 text-white px-6">
        <div className="w-24 h-24 rounded-3xl bg-white/15 border border-white/20 shadow-2xl backdrop-blur-sm flex items-center justify-center overflow-hidden">
          <img src={appLogo} alt="Fasket" className="w-16 h-16 object-contain" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="font-poppins text-3xl" style={{ fontWeight: 800 }}>
            {t("splash.title", "Fasket")}
          </h1>
          <p className="text-lg opacity-90">{t("splash.subtitle", "Shop everything you need, faster.")}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
}
