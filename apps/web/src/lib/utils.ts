import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStatus(status: string): string {
  if (!status) return "";
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function formatCurrency(amount: number, currency: string): string {
  if (!currency) return amount.toString();
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
