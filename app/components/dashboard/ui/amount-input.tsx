"use client";

import type { InputHTMLAttributes } from "react";
import { formatAmountGrouping } from "@/app/lib/parse-amount";

type AmountInputProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "inputMode"
> & {
    value: string | number;
    onChange: (formatted: string) => void;
};

export function AmountInput({
    value,
    onChange,
    className,
    ...rest
}: AmountInputProps) {
    const display = value === "" || value == null ? "" : formatAmountGrouping(String(value));

    return (
        <input
            {...rest}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={display}
            onChange={(e) => onChange(formatAmountGrouping(e.target.value))}
            className={className}
        />
    );
}
