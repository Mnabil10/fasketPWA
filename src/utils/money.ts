export function centsToCurrency(cents: number, currency = 'EGP') {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency });
}

