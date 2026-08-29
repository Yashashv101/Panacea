import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import apiClient from "../../api/client";
import StatusStamp from "../../components/StatusStamp";

const RISK_COLORS = {
  HIGH: "#6E2A34",
  MEDIUM: "#93794F",
  LOW: "#49554F",
};

const RISK_VARIANTS = {
  HIGH: "negative",
  MEDIUM: "pending",
  LOW: "positive",
};

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded border border-brass/30 bg-card px-3 py-2 text-xs text-ink shadow-sm">
      <p className="font-medium">{point.studentName}</p>
      <p className="text-slate">
        Attendance {point.attendancePercentage}% · Marks {point.averageMarksPercentage}%
      </p>
      <p className="text-slate">Risk: {point.riskLevel}</p>
    </div>
  );
}

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded border border-brass/30 bg-card px-3 py-2 text-xs text-ink shadow-sm">
      <p className="font-medium">{item.studentName}</p>
      <p className="text-slate">{Math.round(item.riskProbability * 100)}% risk probability</p>
    </div>
  );
}

export default function AtRiskStudents() {
  const [atRisk, setAtRisk] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [atRiskRes, allRes] = await Promise.all([
          apiClient.get("/risk/at-risk"),
          apiClient.get("/risk/all"),
        ]);
        if (cancelled) return;
        setAtRisk(atRiskRes.data);
        setAllStudents(allRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load at-risk students.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const byLevel = { HIGH: [], MEDIUM: [], LOW: [] };
  for (const student of allStudents) {
    (byLevel[student.riskLevel] ?? byLevel.LOW).push(student);
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">At-Risk Students</h1>
        <p className="mt-1 text-sm text-slate">
          Predicted from attendance and marks. MEDIUM/HIGH risk students only, highest risk first.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate">
                Attendance vs. Marks (all students)
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="#93794F" strokeOpacity={0.2} />
                  <XAxis
                    type="number"
                    dataKey="attendancePercentage"
                    name="Attendance %"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fill: "#49554F", fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="averageMarksPercentage"
                    name="Marks %"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fill: "#49554F", fontSize: 11 }}
                  />
                  <ZAxis range={[60, 60]} />
                  <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                  {Object.entries(byLevel).map(([level, points]) => (
                    <Scatter key={level} name={level} data={points} fill={RISK_COLORS[level]} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate">
                Risk Probability (at-risk students)
              </h2>
              {atRisk.length === 0 ? (
                <p className="text-sm text-slate">No at-risk students right now.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={atRisk} margin={{ top: 10, right: 10, bottom: 40, left: 0 }}>
                    <CartesianGrid stroke="#93794F" strokeOpacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="studentName"
                      tick={{ fill: "#49554F", fontSize: 10 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fill: "#49554F", fontSize: 11 }} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: "#93794F", fillOpacity: 0.1 }} />
                    <Bar dataKey="riskProbability">
                      {atRisk.map((item) => (
                        <Cell key={item.studentId} fill={RISK_COLORS[item.riskLevel]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {atRisk.length === 0 ? (
            <p className="border-b border-brass/20 py-3 text-sm text-slate">No at-risk students right now.</p>
          ) : (
            <div className="flex flex-col">
              {atRisk.map((item) => (
                <div key={item.studentId} className="border-b border-brass/20 py-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-ink">{item.studentName}</span>
                    <StatusStamp status={item.riskLevel} variant={RISK_VARIANTS[item.riskLevel]} />
                    <span className="text-xs text-slate">
                      {Math.round(item.riskProbability * 100)}% risk probability
                    </span>
                    {item.riskTrendDelta != null && (
                      <span className={`text-xs ${item.riskTrendDelta > 0 ? "text-oxblood" : "text-slate"}`}>
                        {item.riskTrendDelta > 0 ? "▲" : "▼"} {Math.abs(Math.round(item.riskTrendDelta * 100))} pts vs 5 weeks ago
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate">
                    Attendance {item.attendancePercentage}% · Average marks {item.averageMarksPercentage}%
                    {item.riskFactors?.length ? ` · Biggest factor: ${item.riskFactors[0].factor}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
