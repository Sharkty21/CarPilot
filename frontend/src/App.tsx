import { Route, Routes } from "react-router-dom";

import RequireAuth from "./components/auth/RequireAuth";
import GarageProvider from "./contexts/GarageProvider";
import AuthenticatedLayout from "./layouts/AuthenticatedLayout";
import PublicLayout from "./layouts/PublicLayout";
import { ROUTES } from "./lib/constants";
import CarPilotPage from "./pages/CarPilot";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<PublicLayout />} />
      <Route element={<RequireAuth />}>
        <Route
          element={
            <GarageProvider>
              <AuthenticatedLayout />
            </GarageProvider>
          }
        >
          <Route index path={ROUTES.HOME} element={<CarPilotPage />} />
          <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
