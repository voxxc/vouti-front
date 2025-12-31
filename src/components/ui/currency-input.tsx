import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number | undefined | null;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
  className,
  disabled,
  id,
}: CurrencyInputProps) {
  // Convert number to cents for internal state
  const [cents, setCents] = React.useState<number>(() => {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Math.round(value * 100);
  });

  // Sync with external value changes
  React.useEffect(() => {
    if (value === undefined || value === null || isNaN(value)) {
      setCents(0);
    } else {
      const newCents = Math.round(value * 100);
      if (newCents !== cents) {
        setCents(newCents);
      }
    }
  }, [value]);

  // Format cents to Brazilian currency string
  const formatCurrency = (centavos: number): string => {
    if (centavos === 0) return "";
    
    const reais = centavos / 100;
    return reais.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowedKeys = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (allowedKeys.includes(e.key)) {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const newCents = Math.floor(cents / 10);
        setCents(newCents);
        onChange(newCents / 100);
      }
      return;
    }

    // Block non-numeric keys
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    
    // Limit to 999.999.999,99 (99999999999 cents)
    if (cents >= 99999999999) return;
    
    const digit = parseInt(e.key, 10);
    const newCents = cents * 10 + digit;
    setCents(newCents);
    onChange(newCents / 100);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    // Extract only digits
    const digits = pastedText.replace(/\D/g, "");
    if (digits) {
      const newCents = Math.min(parseInt(digits, 10), 99999999999);
      setCents(newCents);
      onChange(newCents / 100);
    }
  };

  const displayValue = formatCurrency(cents);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={() => {}} // Controlled by keydown
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
    />
  );
}
