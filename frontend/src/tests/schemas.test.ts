import { describe, it, expect } from "vitest";
import { buildAvailabilitySchema, symptomSchema, loginSchema } from "@/lib/schemas";

describe("schemas — dashboard validation", () => {
  const schema = buildAvailabilitySchema({ icu: 10, general: 100, ventilators: 5 });
  const base = {
    icu: 5,
    general: 50,
    ventilators: 2,
    ambulanceAvailable: true,
    emergencyOpen: true,
  };

  it("accepts a valid payload", () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it("rejects negative ICU", () => {
    const r = schema.safeParse({ ...base, icu: -1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/negative/i);
  });

  it("rejects available exceeding total", () => {
    const r = schema.safeParse({ ...base, general: 101 });
    expect(r.success).toBe(false);
  });

  it("rejects non-integer", () => {
    const r = schema.safeParse({ ...base, ventilators: 2.5 });
    expect(r.success).toBe(false);
  });
});

describe("schemas — triage", () => {
  it("requires min length", () => {
    expect(symptomSchema.safeParse({ text: "hi" }).success).toBe(false);
    expect(
      symptomSchema.safeParse({ text: "Chest pain and difficulty breathing" }).success,
    ).toBe(true);
  });
});

describe("schemas — login", () => {
  it("requires valid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "x" }).success,
    ).toBe(true);
  });
});
