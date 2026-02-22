"use client";

import PhoneInputLib from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function PhoneInput({ value, onChange }: Props) {
  return (
    <PhoneInputLib
      international
      defaultCountry="US"
      value={value}
      onChange={(v) => onChange(v || "")}
      className="phone-input-custom glass-input w-full px-4 py-3 text-sm outline-none"
      placeholder="Phone number"
    />
  );
}
