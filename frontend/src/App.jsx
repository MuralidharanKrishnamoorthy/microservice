import { useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AuthContext } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { isAuthenticated } = useContext(AuthContext);
  const home = <Navigate to="/dashboard" replace />;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? home : <Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      <Route path="*" element={home} />
    </Routes>
  );
}
