"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/primitives";

export function BrandColorField({
  name,
  label,
  hint,
  defaultValue,
}: {
  name: "corPrimaria" | "corSecundaria";
  label: string;
  hint: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Field label={label} htmlFor={name} required hint={hint}>
      <div className="flex gap-2">
        <Input
          aria-label={`Selecionar ${label.toLowerCase()}`}
          type="color"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-10 w-14 p-1"
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          pattern="#[0-9A-Fa-f]{6}"
          required
        />
      </div>
    </Field>
  );
}
