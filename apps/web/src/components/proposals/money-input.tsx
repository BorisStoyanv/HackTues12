"use client";

import { useReducer, useEffect, useMemo } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  form: UseFormReturn<any>;
  name: string;
  label?: string;
  placeholder?: string;
  currencyCode?: string;
  className?: string;
};

export function MoneyInput({
  form,
  name,
  label,
  placeholder = "0.00",
  currencyCode = "EUR",
  className,
}: MoneyInputProps) {
  // Memoize formatter to handle different European currencies
  const moneyFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-IE", {
      currency: currencyCode,
      currencyDisplay: "symbol",
      currencySign: "standard",
      style: "currency",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [currencyCode]);

  const getInitialFormattedValue = () => {
    const rawValue = form.getValues()[name];
    return typeof rawValue === "number" ? moneyFormatter.format(rawValue) : "";
  };

  const [displayValue, setDisplayValue] = useReducer((_: string, next: string) => {
    const digits = next.replace(/\D/g, "");
    return moneyFormatter.format(Number(digits) / 100);
  }, getInitialFormattedValue());

  // Sync when currency changes
  useEffect(() => {
    const rawValue = form.getValues()[name] || 0;
    setDisplayValue(moneyFormatter.format(rawValue));
  }, [currencyCode, moneyFormatter, name, form]);

  function handleChange(realChangeFn: (val: number) => void, formattedValue: string) {
    const digits = formattedValue.replace(/\D/g, "");
    const realValue = Number(digits) / 100;
    realChangeFn(realValue);
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        // We handle the display value via our local reducer
        // but we must notify react-hook-form of the numeric change
        const { onChange: formOnChange } = field;

        return (
          <FormItem className="space-y-3">
            {label && (
              <FormLabel className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground ml-1">
                {label}
              </FormLabel>
            )}
            <FormControl>
              <Input
                placeholder={placeholder}
                type="text"
                className={cn(
                  "h-16 text-3xl font-semibold tracking-tight border-border/40 bg-muted/5 rounded-2xl focus:border-foreground transition-all tabular-nums px-8",
                  className
                )}
                value={displayValue}
                onChange={(ev) => {
                  const nextValue = ev.target.value;
                  setDisplayValue(nextValue);
                  handleChange(formOnChange, nextValue);
                }}
              />
            </FormControl>
            <FormMessage className="text-[10px] font-bold uppercase" />
          </FormItem>
        );
      }}
    />
  );
}
