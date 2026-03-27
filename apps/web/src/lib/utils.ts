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
  
  // Normalize common non-standard currency codes to ISO 4217
  let isoCurrency = currency.toUpperCase();
  if (isoCurrency === "EURO") isoCurrency = "EUR";
  
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: isoCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (e) {
    // Fallback if the currency code is still invalid
    return `${amount.toLocaleString()} ${currency}`;
  }
}
