"use client";

import { useState } from "react";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2.6 2.6 0 0 0 3.7 3.7" />
      <path d="M7.1 7.3C4.6 8.8 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.4 4.5-1.1" />
      <path d="M12.8 6.6A10.4 10.4 0 0 1 12 5.5C6 5.5 2.5 12 2.5 12" />
      <path d="M16.4 12.8A9.4 9.4 0 0 0 21.5 12s-1.2-2.2-3.3-4" />
    </svg>
  );
}

export function PasswordField({
  name = "password",
  placeholder = "Mot de passe",
  required,
  minLength,
  autoComplete,
  className = "w-full rounded-xl border px-4 py-3",
}: {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((open) => !open)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-wine/65 hover:text-wine"
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
