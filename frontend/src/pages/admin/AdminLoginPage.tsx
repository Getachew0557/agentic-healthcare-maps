import { useState } from "react";
import { useForm } from "react-hook-form";

type FormValues = { email: string; password: string };

export function AdminLoginPage() {
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: { email: "", password: "" }
  });

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Hospital Admin</h1>

        <form
          className="rounded-xl border bg-white p-4 space-y-3"
          onSubmit={handleSubmit(async () => {
            setMessage(
              "Starter only: implement login in frontend/src/api/auth.ts and connect to /api/v1/auth/login."
            );
          })}
        >
          <label className="block text-sm font-medium">Email</label>
          <input className="w-full rounded-lg border p-3" {...register("email")} />
          <label className="block text-sm font-medium">Password</label>
          <input className="w-full rounded-lg border p-3" type="password" {...register("password")} />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit">
            Login
          </button>
        </form>

        {message && <div className="text-sm text-slate-700">{message}</div>}
      </div>
    </div>
  );
}

