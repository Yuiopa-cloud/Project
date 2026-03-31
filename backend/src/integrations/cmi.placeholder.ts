/**
 * CMI / Moroccan bank gateway — implement redirect + IPN verification
 * using official CMI docs when merchant credentials are available.
 */
export type CmiInitPayload = {
  merchantId: string;
  amountMad: number;
  orderRef: string;
  okUrl: string;
  failUrl: string;
};

export function buildCmiPlaceholderNote(payload: CmiInitPayload): string {
  return `CMI pending: merchant=${payload.merchantId} ref=${payload.orderRef} amount=${payload.amountMad}`;
}
