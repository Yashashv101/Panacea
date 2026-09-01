import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

/**
 * Loads the current staff member's own subject/section assignments
 * (GET /academic/staff-assignments/me) and resolves whichever one matches
 * `subjectId`. Shared by MarkAttendance and EnterResults, which both build
 * a subject dropdown from this list and need the selected entry's assigned
 * sections.
 */
export function useMyAssignedSubjects(subjectId, { errorMessage = "Could not load your assigned subjects." } = {}) {
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/academic/staff-assignments/me")
      .then((res) => {
        if (!cancelled) setAssignedSubjects(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(errorMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSubject = useMemo(
    () => assignedSubjects.find((s) => s.subjectId === Number(subjectId)),
    [assignedSubjects, subjectId]
  );

  return { assignedSubjects, selectedSubject, loading, loadError };
}
