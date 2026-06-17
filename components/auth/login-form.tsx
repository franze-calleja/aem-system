"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";

const DEMO_ACCOUNTS = [
  { email: "admin@school.edu", role: "Admin" },
  { email: "teacher@school.edu", role: "Teacher" },
  { email: "counselor@school.edu", role: "Counselor" },
  { email: "principal@school.edu", role: "Principal" },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    const result = await loginAction(formData);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(result.redirectTo);
    router.refresh();
  };

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@school.edu"
          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Demo accounts (seeded)</p>
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => {
              setEmail(a.email);
              setPassword(`${a.role.toLowerCase()}123`);
              setError(null);
            }}
            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            <span className="font-medium">{a.role}</span>
            <span className="text-slate-400">{a.email}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
