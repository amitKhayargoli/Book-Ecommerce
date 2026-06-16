export type EsewaFormFields = {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
};

export type PaymentProvider = "ESEWA" | "KHALTI";

export interface CheckoutInitiationResponse {
  orderId: string;
  transactionUuid: string;
  paymentProvider: PaymentProvider;
  action?: string;
  form?: EsewaFormFields;
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
  initiateEsewa(userId: string): Promise<CheckoutInitiationResponse>;
  initiateKhalti(userId: string): Promise<CheckoutInitiationResponse>;
  verifyEsewaSuccess(encodedData: string): Promise<CheckoutVerificationResponse>;
  verifyKhaltiSuccess(pidx: string): Promise<CheckoutVerificationResponse>;
  handleEsewaFailure(query: Record<string, unknown>): Promise<CheckoutFailureResponse>;
  handleKhaltiFailure(query: Record<string, unknown>): Promise<CheckoutFailureResponse>;
}
