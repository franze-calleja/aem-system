import ChangePasswordForm from "@/components/auth/change-password-form";
import Link from "next/link";
import { requireSession, roleLandingPath } from "@/lib/session";

export default async function ChangePasswordPage() {
  const session = await requireSession();
  const forced = session.user.mustChangePassword;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
            A
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-wide">AEM System</span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-2">Account security</p>
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          {forced ? "Choose your password" : "Change your password"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {forced
            ? "Your account was created with a password an administrator issued. Pick your own before continuing."
            : "Signed in as " + session.user.email + "."}
        </p>

        <div className="my-8 h-px bg-slate-200" />

        <ChangePasswordForm forced={forced} />

        {!forced && (
          <Link
            href={roleLandingPath(session.user.role)}
            className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back to workspace
          </Link>
        )}
      </div>
    </main>
  );
}
