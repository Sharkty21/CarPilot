import { useState, type FormEvent } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import carPilotLogo from "@/public/CarPilot.png";
import { useAuth } from "@/src/contexts/AuthProvider";
import { ROUTES } from "@/src/lib/constants";
import { ApiError } from "@/src/api/client";

const PublicLayout = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
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
      await login(email.trim(), password);
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
    <div className="flex min-h-svh bg-slate-50">
      <main className="flex w-full flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <img
              src={carPilotLogo}
              alt="CarPilot"
              className="h-10 w-10 rounded-lg"
            />
            <span className="font-heading text-xl font-semibold tracking-tight text-slate-900">
              Car<span className="text-blue-500">Pilot</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in with the demo account to open your garage.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
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
                autoComplete="current-password"
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
              {submitting ? "Please wait…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Demo: <span className="font-medium text-slate-700">john.smith@carpilot.demo</span> /{" "}
            <span className="font-medium text-slate-700">demo</span>
          </p>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
