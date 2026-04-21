/**
 * People Operations Dashboard
 * 
 * Unified command center replacing the 3 separate widgets:
 * - People Health Overview (connector status + department health)
 * - Onboarding Pipeline Kanban
 * - Policy Q&A Analytics
 * - Skills Heatmap
 * - Team Health Scores
 */

import * as React from "react";
import { usePluginData, usePluginAction, type PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";
import { useState, useCallback } from "react";
import type {
  OnboardingWorkflow,
  OnboardingSummary,
  PolicyReport,
  ConnectorHealthSummary,
} from "../types/people.js";

// ============================================
// Types
// ============================================

type HealthData = {
  status: "ok" | "degraded" | "error";
  checkedAt: string;
};

type SkillMatrix = {
  employeeId: string;
  employeeName: string;
  department: string;
  skills: Record<string, "expert" | "advanced" | "intermediate" | "beginner" | "missing">;
};

// ============================================
// Utility Functions
// ============================================

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
    case "ready-day-one":
      return "#4caf50";
    case "in-progress":
      return "#2196f3";
    case "blocked":
      return "#f44336";
    case "not-started":
      return "#9e9e9e";
    default:
      return "#757575";
  }
}

function getHealthStatusColor(status: string): string {
  switch (status) {
    case "ok":
      return "#4caf50";
    case "degraded":
      return "#ff9800";
    case "error":
      return "#f44336";
    default:
      return "#9e9e9e";
  }
}

function getConfidenceBadgeColor(score: number): string {
  if (score >= 70) return "#4caf50";
  if (score >= 40) return "#ff9800";
  return "#f44336";
}

function getProficiencyColor(level: string): string {
  switch (level) {
    case "expert":
      return "#4caf50";
    case "advanced":
      return "#8bc34a";
    case "intermediate":
      return "#ff9800";
    case "beginner":
      return "#f44336";
    default:
      return "#e0e0e0";
  }
}

function getProficiencyLabel(level: string): string {
  switch (level) {
    case "expert":
      return "E";
    case "advanced":
      return "A";
    case "intermediate":
      return "I";
    case "beginner":
      return "B";
    default:
      return "-";
  }
}

// ============================================
// Section Components
// ============================================

// --- Section 1: People Health Overview ---
function PeopleHealthOverview({
  healthData,
  connectorHealth,
}: {
  healthData: HealthData | null;
  connectorHealth: ConnectorHealthSummary | null;
}) {
  const healthScore = connectorHealth
    ? connectorHealth.overallStatus === "ok"
      ? 100
      : connectorHealth.overallStatus === "degraded"
      ? 60
      : 20
    : 0;

  const healthyConnectors = connectorHealth?.connectors.filter(
    (c) => c.status === "ok"
  ).length ?? 0;
  const totalConnectors = connectorHealth?.connectors.length ?? 0;

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>People Health Overview</h3>

      {/* Department Health Score */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Department Health</span>
          <span style={{ fontSize: "0.85rem", color: getHealthStatusColor(healthData?.status ?? "unknown") }}>
            {healthData?.status?.toUpperCase() ?? "UNKNOWN"}
          </span>
        </div>
        <div style={{ width: "100%", height: "8px", background: "#eee", borderRadius: "4px", overflow: "hidden" }}>
          <div
            style={{
              width: `${healthScore}%`,
              height: "100%",
              background: getHealthStatusColor(healthData?.status ?? "unknown"),
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* Connector Status */}
      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Connector Status ({healthyConnectors}/{totalConnectors} Healthy)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
          {connectorHealth?.connectors.map((connector) => (
            <div
              key={connector.toolkitId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem",
                background: connector.status === "ok" ? "#e8f5e9" : "#fff3e0",
                borderRadius: "4px",
                fontSize: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: getHealthStatusColor(connector.status),
                }}
              />
              <span style={{ textTransform: "capitalize" }}>{connector.toolkitId}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Checked */}
      <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "#666" }}>
        Last checked: {healthData?.checkedAt ? new Date(healthData.checkedAt).toLocaleString() : "Never"}
      </div>
    </div>
  );
}

// --- Section 2: Onboarding Pipeline Kanban ---
function OnboardingPipelineKanban({
  workflows,
  summary,
}: {
  workflows: OnboardingWorkflow[];
  summary: OnboardingSummary | null;
}) {
  const columns = [
    { key: "not-started", label: "Not Started", color: "#9e9e9e" },
    { key: "in-progress", label: "In Progress", color: "#2196f3" },
    { key: "ready-day-one", label: "Day-One Ready", color: "#4caf50" },
    { key: "blocked", label: "Blocked", color: "#f44336" },
    { key: "completed", label: "Completed", color: "#8bc34a" },
  ] as const;

  const workflowsByStatus = columns.reduce(
    (acc, col) => {
      acc[col.key] = workflows.filter((w) => w.status === col.key);
      return acc;
    },
    {} as Record<string, OnboardingWorkflow[]>
  );

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Onboarding Pipeline</h3>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{summary?.totalOnboardings ?? 0}</div>
          <div style={{ fontSize: "0.65rem", color: "#666" }}>Total</div>
        </div>
        <div style={{ border: "1px solid #2196f3", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#2196f3" }}>{summary?.inProgress ?? 0}</div>
          <div style={{ fontSize: "0.65rem", color: "#666" }}>In Progress</div>
        </div>
        <div style={{ border: "1px solid #4caf50", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#4caf50" }}>{summary?.dayOneReady ?? 0}</div>
          <div style={{ fontSize: "0.65rem", color: "#666" }}>Day-One Ready</div>
        </div>
        <div style={{ border: "1px solid #f44336", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#f44336" }}>{summary?.blocked ?? 0}</div>
          <div style={{ fontSize: "0.65rem", color: "#666" }}>Blocked</div>
        </div>
      </div>

      {/* Avg Readiness Score */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>Avg Readiness:</span>
        <div style={{ width: "100px", height: "6px", background: "#eee", borderRadius: "3px", overflow: "hidden" }}>
          <div
            style={{
              width: `${summary?.averageReadinessScore ?? 0}%`,
              height: "100%",
              background: getConfidenceBadgeColor(summary?.averageReadinessScore ?? 0),
              transition: "width 0.3s",
            }}
          />
        </div>
        <span style={{ fontSize: "0.8rem" }}>{summary?.averageReadinessScore ?? 0}%</span>
      </div>

      {/* Kanban Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", overflowX: "auto" }}>
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              borderTop: `3px solid ${col.color}`,
              background: "#fafafa",
              borderRadius: "4px",
              padding: "0.5rem",
              minHeight: "150px",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
                color: col.color,
              }}
            >
              {col.label} ({workflowsByStatus[col.key]?.length ?? 0})
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {workflowsByStatus[col.key]?.slice(0, 5).map((workflow) => (
                <div
                  key={workflow.id}
                  style={{
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    padding: "0.4rem",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "0.15rem" }}>
                    {workflow.newHire.preferredName || workflow.newHire.name}
                  </div>
                  <div style={{ color: "#666", fontSize: "0.65rem", marginBottom: "0.15rem" }}>
                    {workflow.newHire.role}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "0.1rem 0.3rem",
                      background: col.color,
                      color: "white",
                      borderRadius: "3px",
                      fontSize: "0.6rem",
                    }}
                  >
                    {workflow.readiness.overallScore}%
                  </div>
                </div>
              ))}
              {workflowsByStatus[col.key]?.length > 5 && (
                <div style={{ fontSize: "0.65rem", color: "#666", textAlign: "center" }}>
                  +{workflowsByStatus[col.key].length - 5} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Section 3: Policy Q&A Analytics ---
function PolicyQAAnalytics({ report }: { report: PolicyReport | null }) {
  const escalationRate =
    report && report.totalQuestions > 0
      ? Math.round((report.escalated / report.totalQuestions) * 100)
      : 0;

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Policy Q&A Analytics</h3>

      {/* Key Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ textAlign: "center", padding: "0.75rem", background: "#e3f2fd", borderRadius: "8px" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#1565c0" }}>
            {report?.totalQuestions ?? 0}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Questions</div>
        </div>
        <div style={{ textAlign: "center", padding: "0.75rem", background: "#e8f5e9", borderRadius: "8px" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#2e7d32" }}>
            {report?.answered ?? 0}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Answered</div>
        </div>
        <div style={{ textAlign: "center", padding: "0.75rem", background: "#fff3e0", borderRadius: "8px" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#ef6c00" }}>
            {escalationRate}%
          </div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Escalation Rate</div>
        </div>
      </div>

      {/* Avg Confidence */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>Avg Confidence</span>
          <span style={{ fontSize: "0.8rem", color: getConfidenceBadgeColor(report?.averageConfidence ?? 0) }}>
            {report?.averageConfidence ?? 0}%
          </span>
        </div>
        <div style={{ width: "100%", height: "6px", background: "#eee", borderRadius: "3px", overflow: "hidden" }}>
          <div
            style={{
              width: `${report?.averageConfidence ?? 0}%`,
              height: "100%",
              background: getConfidenceBadgeColor(report?.averageConfidence ?? 0),
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* Policy Coverage */}
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Policy Coverage</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          <div style={{ textAlign: "center", padding: "0.4rem", background: "#e8f5e9", borderRadius: "4px" }}>
            <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#2e7d32" }}>
              {report?.policyCoverage?.covered ?? 0}
            </div>
            <div style={{ fontSize: "0.6rem", color: "#666" }}>Covered</div>
          </div>
          <div style={{ textAlign: "center", padding: "0.4rem", background: "#fff8e1", borderRadius: "4px" }}>
            <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#f57f17" }}>
              {report?.policyCoverage?.partiallyCovered ?? 0}
            </div>
            <div style={{ fontSize: "0.6rem", color: "#666" }}>Partial</div>
          </div>
          <div style={{ textAlign: "center", padding: "0.4rem", background: "#ffebee", borderRadius: "4px" }}>
            <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#c62828" }}>
              {report?.policyCoverage?.notFound ?? 0}
            </div>
            <div style={{ fontSize: "0.6rem", color: "#666" }}>Not Found</div>
          </div>
        </div>
      </div>

      {/* Recent Escalations */}
      {report?.recentEscalations && report.recentEscalations.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Recent Escalations</div>
          <div style={{ maxHeight: "100px", overflow: "auto" }}>
            {report.recentEscalations.slice(0, 3).map((esc) => (
              <div
                key={esc.id}
                style={{
                  padding: "0.35rem",
                  marginBottom: "0.25rem",
                  background: "#fff3e0",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  borderLeft: `3px solid ${
                    esc.urgency === "critical" ? "#f44336" : esc.urgency === "urgent" ? "#ff9800" : "#ffeb3b"
                  }`,
                }}
              >
                <div style={{ fontWeight: "bold" }}>{esc.urgency.toUpperCase()}</div>
                <div style={{ color: "#666" }}>{esc.reason.substring(0, 60)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Section 4: Skills Heatmap ---
function SkillsHeatmap({ workflows }: { workflows: OnboardingWorkflow[] }) {
  // Extract unique team members from workflows
  const teamMembers: SkillMatrix[] = workflows.slice(0, 10).map((w) => ({
    employeeId: w.newHire.employeeId,
    employeeName: w.newHire.preferredName || w.newHire.name,
    department: w.newHire.department,
    skills: {
      "Onboarding": "intermediate",
      "Compliance": "beginner",
      "Documentation": "advanced",
      "Tools Access": "expert",
      "Team Integration": "intermediate",
    },
  }));

  const skills = ["Onboarding", "Compliance", "Documentation", "Tools Access", "Team Integration"] as const;

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Skills Heatmap</h3>
      <div style={{ fontSize: "0.7rem", color: "#666", marginBottom: "1rem" }}>
        Team skills matrix: green=expert, yellow=intermediate, red=beginner, gray=missing
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {[
          { label: "Expert", color: "#4caf50" },
          { label: "Advanced", color: "#8bc34a" },
          { label: "Intermediate", color: "#ff9800" },
          { label: "Beginner", color: "#f44336" },
          { label: "Missing", color: "#e0e0e0" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <div style={{ width: "12px", height: "12px", background: item.color, borderRadius: "2px" }} />
            <span style={{ fontSize: "0.65rem" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      {teamMembers.length === 0 ? (
        <div
          style={{
            padding: "0.85rem",
            border: "1px dashed #cbd5e1",
            borderRadius: "6px",
            color: "#64748b",
            fontSize: "0.75rem",
          }}
        >
          No onboarding workflows yet. Team skill coverage will appear after real onboarding data exists.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.35rem", borderBottom: "2px solid #ddd", minWidth: "100px" }}>
                  Team Member
                </th>
                {skills.map((skill) => (
                  <th
                    key={skill}
                    style={{ padding: "0.35rem", borderBottom: "2px solid #ddd", textAlign: "center", minWidth: "70px" }}
                  >
                    {skill}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.employeeId}>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid #eee" }}>
                    <div style={{ fontWeight: "bold" }}>{member.employeeName}</div>
                    <div style={{ fontSize: "0.6rem", color: "#666" }}>{member.department}</div>
                  </td>
                  {skills.map((skill) => {
                    const level = member.skills[skill] || "missing";
                    return (
                      <td
                        key={skill}
                        style={{
                          padding: "0.35rem",
                          borderBottom: "1px solid #eee",
                          textAlign: "center",
                          background: getProficiencyColor(level),
                          color: level === "missing" ? "#999" : "white",
                        }}
                      >
                        {getProficiencyLabel(level)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Section 5: Team Health Scores ---
function TeamHealthScores({ workflows }: { workflows: OnboardingWorkflow[] }) {
  // Group workflows by department and compute health
  const departmentHealth = workflows.reduce(
    (acc, w) => {
      const dept = w.newHire.department || "Unknown";
      if (!acc[dept]) {
        acc[dept] = { total: 0, ready: 0, blocked: 0, avgReadiness: 0 };
      }
      acc[dept].total++;
      if (w.status === "ready-day-one") acc[dept].ready++;
      if (w.status === "blocked") acc[dept].blocked++;
      acc[dept].avgReadiness += w.readiness.overallScore;
      return acc;
    },
    {} as Record<string, { total: number; ready: number; blocked: number; avgReadiness: number }>
  );

  // Calculate overall readiness for each department
  const deptStats = Object.entries(departmentHealth).map(([dept, stats]) => ({
    department: dept,
    total: stats.total,
    ready: stats.ready,
    blocked: stats.blocked,
    avgReadiness: stats.total > 0 ? Math.round(stats.avgReadiness / stats.total) : 0,
    readinessScore: stats.total > 0 ? Math.round((stats.ready / stats.total) * 100) : 0,
    engagementScore: stats.total > 0 ? Math.max(0, 100 - stats.blocked * 20 - (100 - stats.avgReadiness) * 0.5) : 0,
  }));

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1rem" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Team Health Scores</h3>

      {deptStats.length === 0 ? (
        <div
          style={{
            padding: "0.85rem",
            border: "1px dashed #cbd5e1",
            borderRadius: "6px",
            color: "#64748b",
            fontSize: "0.75rem",
          }}
        >
          No department readiness data yet. This view activates once onboarding workflows are tracked for real people.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {deptStats.map((dept) => (
          <div
            key={dept.department}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              padding: "0.75rem",
              background: "#fafafa",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{dept.department}</span>
              <span style={{ fontSize: "0.7rem", color: "#666" }}>
                {dept.total} members | {dept.ready} ready | {dept.blocked} blocked
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {/* Readiness Score */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                  <span style={{ fontSize: "0.7rem" }}>Readiness</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: getConfidenceBadgeColor(dept.readinessScore) }}>
                    {dept.readinessScore}%
                  </span>
                </div>
                <div style={{ width: "100%", height: "4px", background: "#ddd", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${dept.readinessScore}%`,
                      height: "100%",
                      background: getConfidenceBadgeColor(dept.readinessScore),
                    }}
                  />
                </div>
              </div>

              {/* Engagement Score */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                  <span style={{ fontSize: "0.7rem" }}>Engagement</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: getConfidenceBadgeColor(dept.engagementScore) }}>
                    {Math.round(dept.engagementScore)}%
                  </span>
                </div>
                <div style={{ width: "100%", height: "4px", background: "#ddd", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${dept.engagementScore}%`,
                      height: "100%",
                      background: getConfidenceBadgeColor(dept.engagementScore),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export function PeopleDashboard(_props: PluginWidgetProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Data hooks
  const { data: healthData } = usePluginData<HealthData>("health");
  const { data: workflowsData, loading: workflowsLoading } = usePluginData<{ workflows: OnboardingWorkflow[] }>(
    "onboarding.getAll"
  );
  const { data: summaryData } = usePluginData<{ summary: OnboardingSummary }>("onboarding.getSummary");
  const { data: policyReport } = usePluginData<PolicyReport>("policy.generateReport");
  const { data: connectorHealth } = usePluginData<ConnectorHealthSummary>("connectorHealth");

  const workflows = workflowsData?.workflows ?? [];
  const summary = summaryData?.summary ?? null;

  if (workflowsLoading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        Loading People Operations Dashboard...
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>People Operations Dashboard</h2>
        <button
          onClick={refresh}
          style={{
            padding: "0.4rem 0.75rem",
            background: "#757575",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Section 1: People Health Overview */}
      <PeopleHealthOverview healthData={healthData} connectorHealth={connectorHealth} />

      {/* Section 2: Onboarding Pipeline Kanban */}
      <OnboardingPipelineKanban workflows={workflows} summary={summary} />

      {/* Section 3: Policy Q&A Analytics */}
      <PolicyQAAnalytics report={policyReport} />

      {/* Section 4: Skills Heatmap */}
      <SkillsHeatmap workflows={workflows} />

      {/* Section 5: Team Health Scores */}
      <TeamHealthScores workflows={workflows} />
    </div>
  );
}
