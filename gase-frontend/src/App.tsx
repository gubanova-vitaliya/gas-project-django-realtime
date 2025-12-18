import { Routes, Route, Navigate } from "react-router-dom";
import { AppNavbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { GasesPage } from "./pages/GasesPage";
import { GasDetailPage } from "./pages/GasDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CalculationPage from "./pages/CalculationPage";
import MyCalculationsPage from "./pages/MyCalculationsPage";
import ProfilePage from "./pages/ProfilePage";
import JournalPage from "./pages/JournalPage";
import ModeratorPage from "./pages/ModeratorPage";
import { ROUTES } from "./Routes";

function App() {
  return (
    <>
      <AppNavbar />
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.GASES} element={<GasesPage />} />
        <Route path={`${ROUTES.GASES}/:id`} element={<GasDetailPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.MY_CALCULATIONS} element={<MyCalculationsPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.JOURNAL} element={<JournalPage />} />
        <Route path={ROUTES.MODERATOR} element={<ModeratorPage />} />
        <Route path={`${ROUTES.CALCULATION}/:id`} element={<CalculationPage />} />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </>
  );
}

export default App;


