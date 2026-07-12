import type { BaseRecord, PlanCurrency } from "@/types/models";

// Migration-only shape for persisted stores created before unified TreatmentPlan v15.
export type LegacyQuoteStatus =
  "draft" | "approved" | "sent" | "viewed" | "accepted" | "declined" | "expired";
export interface LegacyQuote extends BaseRecord {
  clinic_id: string;
  patient_user_id: string;
  clinic_patient_id?: string;
  treatment_plan_id: string;
  currency: PlanCurrency;
  items: { id: string; label: string; qty: number; unit_price: number }[];
  hotel_total: number;
  transfer_total: number;
  discount: number;
  payment_schedule: { label: string; amount: number; due: string }[];
  notes?: string;
  valid_until?: string;
  included_services?: string[];
  excluded_services?: string[];
  patient_message?: string;
  status?: LegacyQuoteStatus;
  share_token?: string;
}
