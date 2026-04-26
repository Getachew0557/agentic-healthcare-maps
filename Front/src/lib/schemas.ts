import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

const signupRole = z.enum(["client", "hospital"], {
  errorMap: () => ({ message: "Choose an account type" }),
});

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Name is too short")
      .max(120, "Name is too long"),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(200, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    role: signupRole,
    organizationName: z.string().max(200, "Name is too long").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (data.role === "hospital" && !data.organizationName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hospital or clinic name is required for staff accounts",
        path: ["organizationName"],
      });
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(255),
  message: z
    .string()
    .trim()
    .min(10, "Please write a few more words")
    .max(2000, "Message is too long"),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const symptomSchema = z.object({
  text: z
    .string()
    .trim()
    .min(8, "Please describe symptoms in at least a short sentence.")
    .max(1000, "Keep it under 1000 characters."),
});
export type SymptomInput = z.infer<typeof symptomSchema>;

/**
 * Builds an availability-update schema bound to current totals so we can
 * enforce `available <= total` and non-negative integers.
 */
export function buildAvailabilitySchema(totals: {
  icu: number;
  general: number;
  ventilators: number;
}) {
  return z.object({
    icu: z
      .number({ invalid_type_error: "Enter a number" })
      .int("Whole numbers only")
      .min(0, "Cannot be negative")
      .max(totals.icu, `Cannot exceed total of ${totals.icu}`),
    general: z
      .number({ invalid_type_error: "Enter a number" })
      .int("Whole numbers only")
      .min(0, "Cannot be negative")
      .max(totals.general, `Cannot exceed total of ${totals.general}`),
    ventilators: z
      .number({ invalid_type_error: "Enter a number" })
      .int("Whole numbers only")
      .min(0, "Cannot be negative")
      .max(totals.ventilators, `Cannot exceed total of ${totals.ventilators}`),
    ambulanceAvailable: z.boolean(),
    emergencyOpen: z.boolean(),
  });
}
export type AvailabilityInput = z.infer<ReturnType<typeof buildAvailabilitySchema>>;
