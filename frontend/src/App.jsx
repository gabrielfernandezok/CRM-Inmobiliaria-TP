import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ComingSoonPage from './pages/ComingSoonPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import CreateContactPage from './pages/CreateContactPage.jsx';
import ContactDetailPage from './pages/ContactDetailPage.jsx';
import ConsultationsPage from './pages/ConsultationsPage.jsx';
import PropertiesPage from './pages/PropertiesPage.jsx';
import PropertyFormPage from './pages/PropertyFormPage.jsx';
import PropertyDetailPage from './pages/PropertyDetailPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import RentalContractsPage from './pages/RentalContractsPage.jsx';
import AdministrationPage from './pages/AdministrationPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="contactos" element={<ContactsPage />} />
          <Route path="contactos/nuevo" element={<CreateContactPage />} />
          <Route path="contactos/:id" element={<ContactDetailPage />} />
          <Route path="consultas" element={<ConsultationsPage />} />
          <Route path="propiedades" element={<PropertiesPage />} />
          <Route path="propiedades/nueva" element={<PropertyFormPage mode="create" />} />
          <Route path="propiedades/:id/editar" element={<PropertyFormPage mode="edit" />} />
          <Route path="propiedades/:id" element={<PropertyDetailPage />} />
          <Route path="operaciones" element={<OperationsPage />} />
          <Route path="contratos" element={<RentalContractsPage />} />
          <Route path="administracion" element={<AdministrationPage />} />
          <Route path="*" element={<ComingSoonPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
