import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'Admin' | 'Teacher' | 'Student';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Đợi cho đến khi kiểm tra xong token từ localStorage
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Điều hướng về trang tương ứng với vai trò
    if (user?.role === 'Admin') {
      return <Navigate to="/admin" replace />;
    } else if (user?.role === 'Teacher') {
      return <Navigate to="/teacher" replace />;
    } else {
      return <Navigate to="/student" replace />;
    }
  }

  return <>{children}</>;
}
