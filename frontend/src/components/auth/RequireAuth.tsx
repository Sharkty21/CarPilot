import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/src/contexts/AuthProvider";
import { ROUTES } from "@/src/lib/constants";

/** Renders children only when a Bearer token is present; otherwise redirects to login. */
const RequireAuth = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <Outlet />;
};

export default RequireAuth;
