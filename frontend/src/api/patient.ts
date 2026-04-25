import { z } from "zod";
import { http } from "./http";

export const triageResponseSchema = z.object({
  specialty: z.string(),
  urgency: z.string(),
  citations: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url()
      })
    )
    .default([])
});

export type TriageResponse = z.infer<typeof triageResponseSchema>;

export async function triage(symptoms_text: string): Promise<TriageResponse> {
  const res = await http.post("/patient/triage", { symptoms_text });
  return triageResponseSchema.parse(res.data);
}

