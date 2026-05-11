import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold">
            A
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">AEM System</h1>
          <p className="mt-2 text-sm text-slate-600">Secure staff workspace for student support and interventions</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Sign in</h2>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} AEM System</p>
      </div>
    </main>
  );
}