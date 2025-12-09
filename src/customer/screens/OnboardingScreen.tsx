import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useTranslation();
  const fallbackSlides = [
    { title: "Fresh picks, every day", subtitle: "Browse curated groceries and essentials with same-day delivery." },
    { title: "Track and reorder fast", subtitle: "See your favorites, repeat orders, and never run out again." },
    { title: "Pay on delivery", subtitle: "Secure checkout with cash on delivery and loyalty rewards." },
  ];
  const slideImages = [
    "https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0cyUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzU5NzU5NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    "https://images.unsplash.com/photo-1665521032636-e8d2f6927053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpdmVyeSUyMHRydWNrJTIwZmFzdHxlbnwxfHx8fDE3NTk4NDIxNjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    "https://images.unsplash.com/photo-1636673341470-54f37c461457?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhzbWFydCUyMHNob3BwaW5nJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NTk4NDgzMjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  ];
  const slideContent = t('onboarding.slides', { returnObjects: true }) as Array<{
    title: string;
    subtitle: string;
  }>;
  const slides = (slideContent && slideContent.length ? slideContent : fallbackSlides).map((slide, index) => ({
    ...slide,
    image: slideImages[index % slideImages.length],
  }));

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const current = slides[currentSlide];

  return (
    <div className="page-shell relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_20%_20%,#E53935,transparent_35%),radial-gradient(circle_at_80%_0%,#0f172a,transparent_30%)]" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="font-poppins font-extrabold text-primary text-lg">F</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("onboarding.welcome", "Welcome to")}</p>
            <p className="font-poppins font-semibold text-gray-900">Fasket</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onComplete} className="text-gray-600">
          {t('onboarding.skip')}
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center text-center gap-6">
        <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden shadow-elevated bg-gray-100">
          <ImageWithFallback
            src={current.image}
            alt={current.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        <div className="space-y-3 px-2">
          <h2 className="font-poppins text-2xl text-gray-900" style={{ fontWeight: 800 }}>
            {current.title}
          </h2>
          <p className="text-gray-600 leading-relaxed">{current.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-gray-300'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="w-12 h-12 rounded-full p-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <Button
          onClick={nextSlide}
          className="flex-1 h-12 rounded-xl"
        >
          {currentSlide === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
          {currentSlide < slides.length - 1 && <ChevronRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
