export type PaymentProvider = "KHALTI";

export interface CheckoutInitiationResponse {
  orderId: string;
  transactionUuid: string;
  paymentProvider: PaymentProvider;
  paymentUrl?: string;
  pidx?: string;
}

export interface CheckoutVerificationResponse {
  orderId: string;
  transactionUuid: string;
  paymentStatus: "PAID" | "FAILED";
  orderStatus: "CONFIRMED" | "PENDING";
  statusCheck: string;
  alreadyProcessed: boolean;
}

export interface CheckoutFailureResponse {
  handled: boolean;
  orderId: string | null;
  transactionUuid: string | null;
  paymentStatus: "FAILED" | "PAID" | null;
}

export interface ICheckoutService {
  initiateKhalti(userId: string, addressId?: string): Promise<CheckoutInitiationResponse>;
  verifyKhaltiSuccess(pidx: string, purchaseOrderId?: string): Promise<CheckoutVerificationResponse>;
  handleKhaltiFailure(query: Record<string, unknown>): Promise<CheckoutFailureResponse>;
}
