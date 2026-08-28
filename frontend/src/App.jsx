import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Placeholder from "./pages/Placeholder";
import Users from "./pages/admin/Users";
import AcademicStructure from "./pages/admin/AcademicStructure";
import TimetableGeneration from "./pages/admin/TimetableGeneration";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/records" element={<Placeholder title="Records" />} />
          <Route path="/timetable" element={<Placeholder title="Timetable" />} />
          <Route path="/attendance" element={<Placeholder title="Attendance" />} />
          <Route path="/fees" element={<Placeholder title="Fees" />} />
          <Route path="/results" element={<Placeholder title="Results" />} />
          <Route path="/leave" element={<Placeholder title="Leave" />} />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-structure"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AcademicStructure />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <TimetableGeneration />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/records" replace />} />
        <Route path="*" element={<Navigate to="/records" replace />} />
      </Routes>
    </AuthProvider>
  );
}
