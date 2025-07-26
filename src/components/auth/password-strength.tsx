"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password?: string;
}

const requirements = [
  { id: 1, text: "Minimum 8 characters", regex: /.{8,}/ },
  { id: 2, text: "At least one uppercase letter", regex: /[A-Z]/ },
  { id: 3, text: "At least one lowercase letter", regex: /[a-z]/ },
  { id: 4, text: "At least one number", regex: /[0-9]/ },
  { id: 5, text: "At least one special character", regex: /[^A-Za-z0-9]/ },
];

export function PasswordStrength({ password = "" }: PasswordStrengthProps) {
  return (
    <ul className="mt-2 space-y-1">
      {requirements.map((req) => {
        const isValid = req.regex.test(password);
        return (
          <li key={req.id} className="flex items-center text-sm">
            {isValid ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-muted-foreground",
                isValid && "text-foreground"
              )}
            >
              {req.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
