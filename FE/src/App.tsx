import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Homepage from './components/Homepage';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import AddUserPage from './pages/AddUserPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import TeacherPage from './pages/TeacherPage';
import ClassDetailPage from './pages/ClassDetailPage';
import EditClassPage from './pages/EditClassPage';
import CreateMessagePage from './pages/CreateMessagePage';
import ReminderSettingsPage from './pages/ReminderSettingsPage';
import HistoryPage from './pages/HistoryPage';
import MessageSuccessPage from './pages/MessageSuccessPage';
import StudentPage from './pages/StudentPage';
import MessageDetailPage from './pages/MessageDetailPage';
import ReplyPage from './pages/ReplyPage';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/add"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AddUserPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute requiredRole="Teacher">
                  <TeacherPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/classes/:id"
              element={
                <ProtectedRoute requiredRole="Teacher">
                  <ClassDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/classes/:id/edit"
              element={
                <ProtectedRoute requiredRole="Teacher">
                  <EditClassPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/messages/create"
              element={
                <ProtectedRoute requiredRole="Teacher">
                  <CreateMessagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/messages/:id/reminder"
              element={
                <ProtectedRoute requiredRole="Teacher">
                  <ReminderSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/history"
              element={
                <ProtectedRoute requiredRole="Teacher">
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/messages/:id/success"
              element={
                <ProtectedRoute requiredRole="Teacher">
                  <MessageSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="Student">
                  <StudentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/messages/:id"
              element={
                <ProtectedRoute requiredRole="Student">
                  <MessageDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/messages/:id/reply"
              element={
                <ProtectedRoute requiredRole="Student">
                  <ReplyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
