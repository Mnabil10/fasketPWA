import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router';
import { Button } from '../ui'; // styled like second file
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback'; // styled image component

export default function Onboarding() {
  const history = useHistory();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slides (kept from first file)
  const slides = [
    {
      title: 'Shop Everything You Need',
      description:
        'Discover fresh groceries, pantry essentials, and household items all in one place.',
      image:
        'https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0cyUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzU5NzU5NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
    {
      title: 'Fast Delivery',
      description: 'Get your groceries delivered to your doorstep in under 30 minutes.',
      image:
        'https://images.unsplash.com/photo-1665521032636-e8d2f6927053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpdmVyeSUyMHRydWNrJTIwZmFzdHxlbnwxfHx8fDE3NTk4NDIxNjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
    {
      title: 'Smart Shopping',
      description: 'AI-powered recommendations and smart lists make shopping effortless.',
      image:
        'https://images.unsplash.com/photo-1636673341470-54f37c461457?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhzbWFydCUyMHNob3BwaW5nJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NTk4NDgzMjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
  ];

  // First-file logic preserved
  const finish = () => history.replace('/auth');
  const nextSlide = () =>
    currentSlide < slides.length - 1 ? setCurrentSlide((s) => s + 1) : finish();
  const prevSlide = () => currentSlide > 0 && setCurrentSlide((s) => s - 1);

  return (
    <IonPage>
      <IonHeader collapse="condense">
        <IonToolbar className="flex justify-end p-2">
          <Button variant="ghost" onClick={finish} className="text-gray-500">
            Skip
          </Button>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="flex flex-col h-full bg-white">
          {/* Slide Content (styled like second file) */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
            <div className="w-64 h-64 mb-8 rounded-2xl overflow-hidden shadow-lg">
              <ImageWithFallback
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className="w-full h-full object-cover"
              />
            </div>

            <h2
              className="font-poppins text-2xl text-center mb-4 text-gray-900"
              style={{ fontWeight: 700 }}
            >
              {slides[currentSlide].title}
            </h2>

            <p className="text-center text-gray-600 mb-8 leading-relaxed px-4">
              {slides[currentSlide].description}
            </p>

            {/* Dots Indicator */}
            <div className="flex space-x-2 mb-8">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Navigation (styled like second file) */}
          <div className="flex justify-between items-center p-6">
            <Button
              variant="outline"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="w-12 h-12 rounded-full p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Button onClick={nextSlide} className="flex-1 mx-4 h-12 rounded-xl">
              {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
              {currentSlide < slides.length - 1 && <ChevronRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
