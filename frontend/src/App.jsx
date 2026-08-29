import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import PaymentReturn from "./pages/student/PaymentReturn.jsx";
import Placeholder from "./pages/Placeholder";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import Users from "./pages/admin/Users";
import AcademicStructure from "./pages/admin/AcademicStructure";
import TimetableGeneration from "./pages/admin/TimetableGeneration";
import LeaveQueue from "./pages/admin/LeaveQueue";
import FeesOverview from "./pages/admin/FeesOverview";
import FeedbackQueue from "./pages/admin/FeedbackQueue";
import ProctorAssignment from "./pages/admin/ProctorAssignment";

function RootRoute() {
  const { role } = useAuth();
  return role === "STUDENT" ? <StudentDashboard /> : <Navigate to="/records" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/fees/success" element={<PaymentReturn variant="success" />} />
        <Route path="/fees/cancel" element={<PaymentReturn variant="cancel" />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<RootRoute />} />
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
          <Route
            path="/admin/leave"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <LeaveQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fees"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <FeesOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <FeedbackQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/proctor"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <ProctorAssignment />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/records" replace />} />
      </Routes>
    </AuthProvider>
  );
}
