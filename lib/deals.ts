import type { Database } from "@/lib/database.types";

export type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"];
export type Stage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type StageKind = Database["public"]["Enums"]["stage_kind"];

export type BoardDeal = Pick<Deal, "id" | "name" | "value" | "currency" | "close_date" | "stage_id" | "position" | "owner_id"> & {
  company_name: string | null;
};

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

