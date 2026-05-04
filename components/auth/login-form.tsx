'use client';

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const roleOptions = {
  admin: {
    label: "Admin",
    hint: "System governance, user management, consent, and audit logs.",
  },
  teacher: {
    label: "Teacher",
    hint: "Attendance, grades, section insights, and public intervention fields.",
  },
  counselor: {
    label: "Counselor",
    hint: "Caseload review, counseling notes, intervention planning, and revisions.",
  },
  principal: {
    label: "Principal",
    hint: "Oversight, bias monitoring, and approval authority for broader plans.",
  },
} as const;

type RoleKey = keyof typeof roleOptions;

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleKey>("counselor");
  const [rememberMe, setRememberMe] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  // roleOptions retained for potential future use

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Signing in to the AEM workspace...");

    router.push(`/${role}`);
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

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="role">
          Role
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as RoleKey)}
          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
        >
          {Object.entries(roleOptions).map(([key, option]) => (
            <option key={key} value={key} className="bg-white text-slate-900">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border border-slate-200 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Remember</span>
        </label>

        <a className="text-sm text-indigo-600 hover:underline" href="#">
          Forgot?
        </a>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Sign in
      </button>

      <p className="text-center text-xs text-slate-500" aria-live="polite">
        {status ?? (rememberMe ? "Session will stay active on this device." : "")}
      </p>
    </form>
  );
}