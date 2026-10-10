import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { AuthContext } from '../context/AuthContext';

// Renders child routes only for logged-in users; otherwise redirects to /login
// and remembers where the user was going.
export default function ProtectedRoute() {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
