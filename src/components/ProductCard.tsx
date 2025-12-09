import React from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonImg } from '@ionic/react';
import Currency from './Currency';
import RatingStars from './RatingStars';
import { Product } from '../data/types';
import { useTranslation } from 'react-i18next';

export default function ProductCard({ product, onAdd, to }: { product: Product; onAdd: () => void; to?: string }) {
  const { t } = useTranslation();
  return (
    <IonCard className="rounded-xl" button={!!to} routerLink={to} routerDirection="forward">
      {product.image && <IonImg src={product.image} alt={product.name} />}
      <IonCardHeader>
        <IonCardTitle style={{ fontSize: 16 }}>{product.name}</IonCardTitle>
        <IonCardSubtitle>
          <RatingStars value={product.rating || 0} />
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent className="ion-text-start">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ color: 'var(--ion-color-primary)' }}>
            <Currency value={product.price} />
          </strong>
          {product.oldPrice && (
            <span style={{ textDecoration: 'line-through', color: 'var(--ion-color-medium)' }}>
              <Currency value={product.oldPrice} />
            </span>
          )}
        </div>
        <IonButton className="ion-margin-top" expand="block" disabled={product.stock === 0} onClick={(e) => { e.preventDefault(); onAdd(); }}>
          {(product.stock || 0) <= 0 ? t('products.outOfStock') : t('products.add')}
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
}
