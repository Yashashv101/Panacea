import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import PaymentReturn from "./pages/student/PaymentReturn.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import SubjectDetail from "./pages/SubjectDetail.jsx";
import Users from "./pages/admin/Users";
import AcademicStructure from "./pages/admin/AcademicStructure";
import TimetableGeneration from "./pages/admin/TimetableGeneration";
import LeaveQueue from "./pages/admin/LeaveQueue";
import FeesOverview from "./pages/admin/FeesOverview";
import FeedbackQueue from "./pages/admin/FeedbackQueue";
import ProctorAssignment from "./pages/admin/ProctorAssignment";
import MarkAttendance from "./pages/staff/MarkAttendance.jsx";
import EnterResults from "./pages/staff/EnterResults.jsx";
import CreateQuiz from "./pages/staff/CreateQuiz.jsx";
import QuizResults from "./pages/staff/QuizResults.jsx";
import TakeQuiz from "./pages/student/TakeQuiz.jsx";
import Electives from "./pages/student/Electives.jsx";
import MyProctor from "./pages/student/MyProctor.jsx";
import Mentees from "./pages/staff/Mentees.jsx";
import ElectiveRequests from "./pages/staff/ElectiveRequests.jsx";
import HodDashboard from "./pages/hod/HodDashboard.jsx";

function RootRoute() {
  const { role } = useAuth();
  if (role === "STUDENT") return <StudentDashboard />;
  if (role === "STAFF") return <Navigate to="/staff/attendance" replace />;
  if (role === "ADMIN") return <Navigate to="/admin/users" replace />;
  if (role === "HOD") return <Navigate to="/hod" replace />;
  return <Navigate to="/login" replace />;
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

          <Route
            path="/hod"
            element={
              <ProtectedRoute allowedRoles={["HOD"]}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/subjects/:subjectId"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <SubjectDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quizzes"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <TakeQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/:quizId"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <TakeQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/electives"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <Electives />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proctor"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <MyProctor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/attendance"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <MarkAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/results"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <EnterResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/quizzes"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <QuizResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/quizzes/new"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <CreateQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/mentees"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <Mentees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/electives"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <ElectiveRequests />
              </ProtectedRoute>
            }
          />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
