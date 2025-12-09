import React from 'react';
import { centsToCurrency } from '../utils/money';

type Props = { value: number; cents?: boolean; currency?: string };
export default function Currency({ value, cents = false, currency = 'EGP' }: Props) {
  if (cents) return <>{centsToCurrency(value, currency)}</>;
  return <>{value.toLocaleString(undefined, { style: 'currency', currency })}</>;
}
