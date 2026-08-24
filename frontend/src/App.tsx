import { Route, Routes } from "react-router-dom";

import GarageProvider from "./contexts/GarageProvider";
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import { ROUTES } from "./lib/constants";
import CarPilotPage from "./pages/CarPilot";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <GarageProvider>
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route index path={ROUTES.HOME} element={<CarPilotPage />} />
          <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        </Route>
      </Routes>
    </GarageProvider>
  )
}

export default App;
