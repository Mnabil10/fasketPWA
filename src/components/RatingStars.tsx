import React from 'react';
import { IonIcon } from '@ionic/react';
import { star, starHalf, starOutline } from 'ionicons/icons';

export default function RatingStars({ value = 0 }: { value?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const arr = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return star;
    if (i === full && half) return starHalf;
    return starOutline;
  });
  return (
    <span style={{ color: '#f59e0b' }}>
      {arr.map((icon, i) => (
        <IonIcon key={i} icon={icon} />
      ))}
    </span>
  );
}

