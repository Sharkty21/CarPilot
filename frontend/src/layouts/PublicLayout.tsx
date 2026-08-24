import { useState, type FormEvent } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import carPilotLogo from "@/public/CarPilot.png";
import { useAuth } from "@/src/contexts/AuthProvider";
import { ROUTES } from "@/src/lib/constants";
import { ApiError } from "@/src/api/client";

type Mode = "login" | "register";

const PublicLayout = () => {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("john.smith@carpilot.demo");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#0b1f3a] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.45), transparent 45%), radial-gradient(circle at 80% 70%, rgba(14,165,233,0.35), transparent 40%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2">
          <img src={carPilotLogo} alt="CarPilot" className="size-10" />
          <span className="font-heading text-2xl font-semibold tracking-tight text-white">
            Car<span className="text-sky-400">Pilot</span>
          </span>
        </div>
        <div className="relative z-10 max-w-md space-y-5">
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-white">
            Your garage, documents, and service history in one place.
          </h1>
          <p className="text-base leading-relaxed text-slate-300">
            Track finance, insurance, warranty, and maintenance for every
            vehicle you own — then ask CarPilot questions grounded in your own
            records.
          </p>
          <ul className="space-y-3 text-sm text-slate-200">
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-400" />
              Secure document vault with searchable uploads
            </li>
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-400" />
              Ownership timeline across every car in the household
            </li>
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-400" />
              Answers cited back to your files and service records
            </li>
          </ul>
        </div>
        <p className="relative z-10 text-xs text-slate-500">
          Demo account: john.smith@carpilot.demo / demo
        </p>
      </aside>

      <main className="flex flex-col justify-center bg-[#f6f9fe] px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <img src={carPilotLogo} alt="CarPilot" className="size-9" />
            <span className="font-heading text-xl font-semibold tracking-tight">
              Car<span className="text-blue-500">Pilot</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to open your garage."
                : "Start tracking vehicles and documents in minutes."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? (
              <>
                New to CarPilot?{" "}
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:underline"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                    setEmail("");
                    setPassword("");
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setEmail("john.smith@carpilot.demo");
                    setPassword("demo");
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
