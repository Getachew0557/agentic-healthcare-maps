import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { triage } from "../../api/patient";

const formSchema = z.object({
  symptoms_text: z.string().min(3, "Please describe symptoms")
});

type FormValues = z.infer<typeof formSchema>;

export function PatientHomePage() {
  const [result, setResult] = useState<{ specialty: string; urgency: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { symptoms_text: "" }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => triage(values.symptoms_text),
    onSuccess: (data) => setResult({ specialty: data.specialty, urgency: data.urgency })
  });

  const header = useMemo(
    () => (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Agentic Healthcare Maps</h1>
        <p className="text-sm text-slate-600">
          Describe symptoms in plain language. The system identifies the specialty and urgency.
        </p>
      </div>
    ),
    []
  );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        {header}

        <form
          className="rounded-xl border bg-white p-4 space-y-3"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="block text-sm font-medium">Symptoms</label>
          <textarea
            className="w-full rounded-lg border p-3 focus:outline-none focus:ring"
            rows={4}
            placeholder="e.g., chest pain and difficulty breathing..."
            {...register("symptoms_text")}
          />
          {errors.symptoms_text && (
            <div className="text-sm text-red-600">{errors.symptoms_text.message}</div>
          )}

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Analyzing..." : "Get recommendation"}
          </button>
        </form>

        {mutation.isError && (
          <div className="rounded-xl border bg-white p-4 text-sm text-red-700">
            Failed to call API. Check backend is running at{" "}
            <span className="font-mono">{import.meta.env.VITE_API_BASE_URL}</span>.
          </div>
        )}

        {result && (
          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm text-slate-600">Triage result</div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Specialty</div>
                <div className="font-medium">{result.specialty}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Urgency</div>
                <div className="font-medium">{result.urgency}</div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500">
          Starter template: map + hospital ranking modules should go in `frontend/src/pages/patient/`
          and shared Leaflet components in `frontend/src/components/map/`.
        </div>
      </div>
    </div>
  );
}

