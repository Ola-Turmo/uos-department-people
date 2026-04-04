/**
 * People Department UI Widgets
 * VAL-DEPT-PEOPLE-001: New-hire onboarding coordinates stakeholders with privacy-aware readiness tracking
 * VAL-DEPT-PEOPLE-002: Policy questions are answered with citations, confidence, and escalation
 */

import { usePluginAction, usePluginData, type PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";
import { useState, useCallback } from "react";

// ============================================
// Shared Types
// ============================================

type HealthData = {
  status: "ok" | "degraded" | "error";
  checkedAt: string;
};

// ============================================
// Onboarding Types
// ============================================

type OnboardingWorkflow = {
  id: string;
  newHire: {
    id: string;
    employeeId: string;
    name: string;
    preferredName?: string;
    startDate: string;
    role: string;
    department: string;
    managerId?: string;
    managerName?: string;
    location?: string;
    workType?: string;
    sensitiveCaseFlag: string;
    notes: string[];
  };
  tasks: Record<string, {
    id: string;
    title: string;
    description: string;
    category: string;
    ownerRoleKey: string;
    assignedTo?: string;
    dueDay: number;
    status: string;
    completedAt?: string;
    blockedBy?: string[];
    privacyLevel: string;
    notes: string[];
  }>;
  stakeholders: Record<string, {
    roleKey: string;
    title: string;
    name?: string;
    responsibilities: string[];
    notifiedAt?: string;
    completedAt?: string;
    status: string;
  }>;
  readiness: {
    overallScore: number;
    taskCompletion: number;
    stakeholderSignoff: number;
    blockedTasks: string[];
    criticalPathComplete: boolean;
    dayOneReady: boolean;
    riskFactors: string[];
    assessedAt: string;
  };
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  privacyBoundary: {
    hideSensitiveNotes: boolean;
    hideSensitiveCaseFlag: boolean;
    restrictAccessToRoles: string[];
  };
};

type OnboardingSummary = {
  totalOnboardings: number;
  inProgress: number;
  dayOneReady: number;
  blocked: number;
  averageReadinessScore: number;
  criticalBlockers: string[];
};

// ============================================
// Policy Types
// ============================================

type PolicySource = {
  id: string;
  title: string;
  url?: string;
  documentType: string;
  lastReviewedAt?: string;
  relevanceScore: number;
  excerpt?: string;
};

type PolicyAnswer = {
  id: string;
  question: string;
  answer: string;
  summary?: string;
  confidence: "high" | "medium" | "low";
  confidenceReasoning?: string;
  sources: PolicySource[];
  relatedPolicies?: string[];
  applicabilityNotes?: string;
  answeredAt: string;
  answeredBy?: string;
  requiresEscalation: boolean;
  escalationReason?: string;
  escalatedAt?: string;
  escalationUrgency?: "routine" | "urgent" | "critical";
};

type PolicyEscalation = {
  id: string;
  questionId: string;
  originalQuestion: string;
  escalatedToRoleKey?: string;
  escalatedToTeam?: string;
  urgency: "routine" | "urgent" | "critical";
  reason: string;
  status: "pending" | "in-review" | "resolved" | "closed";
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  notes: string[];
  evidenceIds: string[];
};

type PolicyReport = {
  totalQuestions: number;
  answered: number;
  escalated: number;
  pending: number;
  byCategory: Record<string, number>;
  averageConfidence: number;
  recentEscalations: PolicyEscalation[];
  policyCoverage: {
    covered: number;
    partiallyCovered: number;
    notFound: number;
  };
};

// ============================================
// Dashboard Widget (Health Check)
// ============================================

export function DashboardWidget(_props: PluginWidgetProps) {
  const { data, loading, error } = usePluginData<HealthData>("health");
  const ping = usePluginAction("ping");

  if (loading) return <div>Loading plugin health...</div>;
  if (error) return <div>Plugin error: {error.message}</div>;

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <strong>Department People</strong>
      <div>Health: {data?.status ?? "unknown"}</div>
      <div>Checked: {data?.checkedAt ?? "never"}</div>
      <button onClick={() => void ping()}>Ping Worker</button>
    </div>
  );
}

// ============================================
// Onboarding Widget (VAL-DEPT-PEOPLE-001)
// ============================================

export function OnboardingWidget(_props: PluginWidgetProps) {
  // Use a refresh key to force re-render when data changes
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [createFormData, setCreateFormData] = useState({
    employeeId: "",
    name: "",
    preferredName: "",
    startDate: "",
    role: "",
    department: "",
    managerId: "",
    managerName: "",
    location: "",
    workType: "hybrid" as "remote" | "hybrid" | "on-site",
  });

  // Data hooks - key changes force refresh
  const { data: summaryData, loading: summaryLoading } = usePluginData<{ summary: OnboardingSummary }>("onboarding.getSummary");
  const { data: workflowsData, loading: workflowsLoading } = usePluginData<{ workflows: OnboardingWorkflow[] }>("onboarding.getAll");

  // Action hooks
  const createOnboarding = usePluginAction("onboarding.create");
  const updateTaskStatus = usePluginAction("onboarding.updateTaskStatus");
  const assessReadiness = usePluginAction("onboarding.assessReadiness");

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const summary = summaryData?.summary;
  const workflows = workflowsData?.workflows ?? [];

  const handleCreate = async () => {
    if (!createFormData.employeeId || !createFormData.name || !createFormData.startDate || !createFormData.role || !createFormData.department) {
      return;
    }
    await createOnboarding(createFormData);
    setCreateFormData({
      employeeId: "",
      name: "",
      preferredName: "",
      startDate: "",
      role: "",
      department: "",
      managerId: "",
      managerName: "",
      location: "",
      workType: "hybrid",
    });
    setShowCreateForm(false);
    refresh();
  };

  const handleTaskStatusUpdate = async (workflowId: string, taskId: string, newStatus: string) => {
    await updateTaskStatus({ workflowId, taskId, status: newStatus as "pending" | "in-progress" | "completed" | "skipped" });
    void assessReadiness({ workflowId });
    refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#4caf50";
      case "ready-day-one": return "#8bc34a";
      case "in-progress": return "#2196f3";
      case "blocked": return "#f44336";
      default: return "#9e9e9e";
    }
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 70) return "#4caf50";
    if (score >= 40) return "#ff9800";
    return "#f44336";
  };

  if (summaryLoading || workflowsLoading) return <div key={refreshKey}>Loading onboarding data...</div>;

  return (
    <div key={refreshKey} style={{ display: "grid", gap: "1rem", padding: "1rem" }}>
      <strong>Onboarding Dashboard</strong>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{summary?.totalOnboardings ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Total</div>
        </div>
        <div style={{ border: "1px solid #2196f3", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2196f3" }}>{summary?.inProgress ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>In Progress</div>
        </div>
        <div style={{ border: "1px solid #4caf50", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4caf50" }}>{summary?.dayOneReady ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Day-One Ready</div>
        </div>
        <div style={{ border: "1px solid #f44336", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#f44336" }}>{summary?.blocked ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Blocked</div>
        </div>
      </div>

      {/* Average Readiness Score */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontWeight: "bold" }}>Avg Readiness:</span>
        <div style={{
          width: "100px",
          height: "8px",
          background: "#eee",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${summary?.averageReadinessScore ?? 0}%`,
            height: "100%",
            background: getConfidenceBadgeColor(summary?.averageReadinessScore ?? 0),
            transition: "width 0.3s"
          }} />
        </div>
        <span>{summary?.averageReadinessScore ?? 0}%</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ padding: "0.5rem", background: showCreateForm ? "#e3f2fd" : "#2196f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          {showCreateForm ? "Cancel" : "+ New Onboarding"}
        </button>
        <button
          onClick={refresh}
          style={{ padding: "0.5rem", background: "#757575", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div style={{ border: "1px solid #2196f3", padding: "1rem", borderRadius: "4px", background: "#f5f5f5" }}>
          <h4>Create New Onboarding</h4>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <input
                placeholder="Employee ID *"
                value={createFormData.employeeId}
                onChange={(e) => setCreateFormData({ ...createFormData, employeeId: e.target.value })}
                style={{ padding: "0.25rem" }}
              />
              <input
                placeholder="Name *"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                style={{ padding: "0.25rem" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <input
                placeholder="Start Date *"
                type="date"
                value={createFormData.startDate}
                onChange={(e) => setCreateFormData({ ...createFormData, startDate: e.target.value })}
                style={{ padding: "0.25rem" }}
              />
              <input
                placeholder="Role *"
                value={createFormData.role}
                onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
                style={{ padding: "0.25rem" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <input
                placeholder="Department *"
                value={createFormData.department}
                onChange={(e) => setCreateFormData({ ...createFormData, department: e.target.value })}
                style={{ padding: "0.25rem" }}
              />
              <input
                placeholder="Work Type"
                value={createFormData.workType}
                onChange={(e) => setCreateFormData({ ...createFormData, workType: e.target.value as "remote" | "hybrid" | "on-site" })}
                style={{ padding: "0.25rem" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <input
                placeholder="Manager Name"
                value={createFormData.managerName}
                onChange={(e) => setCreateFormData({ ...createFormData, managerName: e.target.value })}
                style={{ padding: "0.25rem" }}
              />
              <input
                placeholder="Location"
                value={createFormData.location}
                onChange={(e) => setCreateFormData({ ...createFormData, location: e.target.value })}
                style={{ padding: "0.25rem" }}
              />
            </div>
            <button
              onClick={handleCreate}
              style={{ padding: "0.5rem", background: "#4caf50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Create Onboarding
            </button>
          </div>
        </div>
      )}

      {/* Workflow List */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
        <h4>Active Onboardings ({workflows.length})</h4>
        {workflows.length === 0 ? (
          <div style={{ color: "#666", fontStyle: "italic" }}>No onboarding workflows yet</div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem", maxHeight: "400px", overflow: "auto" }}>
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: selectedWorkflow?.id === workflow.id ? "#e3f2fd" : "white",
                  borderLeft: `4px solid ${getStatusColor(workflow.status)}`
                }}
                onClick={() => setSelectedWorkflow(selectedWorkflow?.id === workflow.id ? null : workflow)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: "bold" }}>{workflow.newHire.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "#666", marginLeft: "0.5rem" }}>
                      {workflow.newHire.role} | {workflow.newHire.department}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>
                    Start: {workflow.newHire.startDate}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem", fontSize: "0.75rem" }}>
                  <span>Status: <strong style={{ color: getStatusColor(workflow.status) }}>{workflow.status}</strong></span>
                  <span>Readiness: <strong>{workflow.readiness.overallScore}%</strong></span>
                  <span>Tasks: <strong>{workflow.readiness.taskCompletion}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Workflow Detail */}
      {selectedWorkflow && (
        <div style={{ border: "1px solid #2196f3", padding: "1rem", borderRadius: "4px", background: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4>Workflow: {selectedWorkflow.newHire.name}</h4>
            <button
              onClick={() => setSelectedWorkflow(null)}
              style={{ padding: "0.25rem 0.5rem", background: "#757575", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>

          {/* Readiness Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{ background: "#fff", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: getConfidenceBadgeColor(selectedWorkflow.readiness.overallScore) }}>
                {selectedWorkflow.readiness.overallScore}%
              </div>
              <div style={{ fontSize: "0.7rem", color: "#666" }}>Overall Readiness</div>
            </div>
            <div style={{ background: "#fff", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{selectedWorkflow.readiness.taskCompletion}%</div>
              <div style={{ fontSize: "0.7rem", color: "#666" }}>Tasks Done</div>
            </div>
            <div style={{ background: "#fff", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{selectedWorkflow.readiness.stakeholderSignoff}%</div>
              <div style={{ fontSize: "0.7rem", color: "#666" }}>Stakeholders</div>
            </div>
          </div>

          {/* Risk Factors */}
          {selectedWorkflow.readiness.riskFactors.length > 0 && (
            <div style={{ marginBottom: "1rem", padding: "0.5rem", background: selectedWorkflow.readiness.dayOneReady ? "#e8f5e9" : "#fff3e0", borderRadius: "4px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>Risk Factors:</div>
              {selectedWorkflow.readiness.riskFactors.map((factor, i) => (
                <div key={i} style={{ fontSize: "0.75rem", color: "#d84315" }}>• {factor}</div>
              ))}
            </div>
          )}

          {/* Tasks */}
          <div style={{ marginBottom: "1rem" }}>
            <h5>Tasks ({Object.keys(selectedWorkflow.tasks).length})</h5>
            <div style={{ maxHeight: "200px", overflow: "auto" }}>
              {Object.values(selectedWorkflow.tasks).slice(0, 10).map((task) => (
                <div key={task.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.25rem 0.5rem",
                  borderBottom: "1px solid #eee",
                  background: task.status === "completed" ? "#e8f5e9" : task.blockedBy?.length ? "#fff3e0" : "transparent"
                }}>
                  <div style={{ fontSize: "0.8rem" }}>
                    <span style={{ textDecoration: task.status === "completed" ? "line-through" : "none" }}>{task.title}</span>
                    <span style={{ fontSize: "0.7rem", color: "#666", marginLeft: "0.5rem" }}>Day {task.dueDay}</span>
                  </div>
                  <select
                    value={task.status}
                    onChange={(e) => void handleTaskStatusUpdate(selectedWorkflow.id, task.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: "0.7rem", padding: "0.1rem" }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Stakeholders */}
          <div>
            <h5>Stakeholders</h5>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              {Object.values(selectedWorkflow.stakeholders).map((stakeholder) => (
                <div key={stakeholder.roleKey} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.25rem 0.5rem",
                  background: stakeholder.status === "completed" ? "#e8f5e9" : "#f5f5f5",
                  borderRadius: "4px",
                  fontSize: "0.8rem"
                }}>
                  <span>{stakeholder.title}: {stakeholder.name ?? stakeholder.roleKey}</span>
                  <span style={{ color: stakeholder.status === "completed" ? "#4caf50" : "#757575" }}>
                    {stakeholder.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy-Safe Notice */}
          <div style={{ marginTop: "1rem", padding: "0.5rem", background: "#e8f5e9", borderRadius: "4px", fontSize: "0.75rem", color: "#2e7d32" }}>
            ✓ Privacy boundaries active - sensitive case details are protected
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Policy Widget (VAL-DEPT-PEOPLE-002)
// ============================================

export function PolicyWidget(_props: PluginWidgetProps) {
  // Use a refresh key to force re-render when data changes
  const [refreshKey, setRefreshKey] = useState(0);
  const [questionText, setQuestionText] = useState("");
  const [lastAnswer, setLastAnswer] = useState<PolicyAnswer | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<PolicyEscalation | null>(null);
  const [resolution, setResolution] = useState("");

  // Data hooks - key changes force refresh
  const { data: reportData, loading: reportLoading } = usePluginData<{ report: PolicyReport }>("policy.generateReport");
  const { data: escalationsData, loading: escalationsLoading } = usePluginData<{ escalations: PolicyEscalation[] }>("policy.getPendingEscalations");

  // Action hooks
  const askQuestion = usePluginAction("policy.ask");
  const escalateQuestion = usePluginAction("policy.escalate");
  const resolveEscalation = usePluginAction("policy.resolveEscalation");

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const report = reportData?.report;
  const pendingEscalations = escalationsData?.escalations ?? [];

  const handleAsk = async () => {
    if (!questionText.trim()) return;
    setIsAsking(true);
    try {
      const result = await askQuestion({
        question: questionText,
        askerId: "ui-user",
        askerRole: "employee",
      }) as { answer: PolicyAnswer };
      setLastAnswer(result.answer);
    } finally {
      setIsAsking(false);
    }
  };

  const handleEscalate = async () => {
    if (!lastAnswer) return;
    await escalateQuestion({
      questionId: lastAnswer.id,
      reason: lastAnswer.escalationReason ?? "Requires human review",
      urgency: lastAnswer.escalationUrgency ?? "routine",
    });
    refresh();
  };

  const handleResolve = async (status: "resolved" | "closed") => {
    if (!selectedEscalation) return;
    await resolveEscalation({
      escalationId: selectedEscalation.id,
      resolution,
      status,
    });
    setSelectedEscalation(null);
    setResolution("");
    refresh();
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "#4caf50";
      case "medium": return "#ff9800";
      case "low": return "#f44336";
      default: return "#757575";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "#f44336";
      case "urgent": return "#ff9800";
      case "routine": return "#2196f3";
      default: return "#757575";
    }
  };

  if (reportLoading || escalationsLoading) return <div key={refreshKey}>Loading policy data...</div>;

  return (
    <div key={refreshKey} style={{ display: "grid", gap: "1rem", padding: "1rem" }}>
      <strong>Policy Q&A Dashboard</strong>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{report?.totalQuestions ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Total Questions</div>
        </div>
        <div style={{ border: "1px solid #4caf50", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4caf50" }}>{report?.policyCoverage?.covered ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Answered</div>
        </div>
        <div style={{ border: "1px solid #ff9800", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#ff9800" }}>{report?.policyCoverage?.partiallyCovered ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Partial</div>
        </div>
        <div style={{ border: "1px solid #f44336", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#f44336" }}>{report?.policyCoverage?.notFound ?? 0}</div>
          <div style={{ fontSize: "0.7rem", color: "#666" }}>Not Found</div>
        </div>
      </div>

      {/* Policy Coverage */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontWeight: "bold" }}>Avg Confidence:</span>
        <div style={{
          width: "100px",
          height: "8px",
          background: "#eee",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${(report?.averageConfidence ?? 0) * 100}%`,
            height: "100%",
            background: getConfidenceColor(report?.averageConfidence ?? 0.5 >= 0.7 ? "high" : report?.averageConfidence ?? 0.5 >= 0.4 ? "medium" : "low"),
            transition: "width 0.3s"
          }} />
        </div>
        <span>{Math.round((report?.averageConfidence ?? 0) * 100)}%</span>
      </div>

      {/* Ask Question Form */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
        <h4>Ask a Policy Question</h4>
        <textarea
          placeholder="Type your policy question here (e.g., 'How do I request PTO?', 'What is the remote work policy?')"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd", resize: "vertical" }}
        />
        <button
          onClick={handleAsk}
          disabled={isAsking || !questionText.trim()}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1rem",
            background: isAsking ? "#bdbdbd" : "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isAsking ? "not-allowed" : "pointer"
          }}
        >
          {isAsking ? "Searching..." : "Ask Question"}
        </button>
      </div>

      {/* Answer Display */}
      {lastAnswer && (
        <div style={{ border: "1px solid #4caf50", padding: "1rem", borderRadius: "4px", background: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <h4>Answer</h4>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: "bold",
                color: "white",
                background: getConfidenceColor(lastAnswer.confidence)
              }}>
                {lastAnswer.confidence.toUpperCase()} CONFIDENCE
              </span>
              {lastAnswer.requiresEscalation && (
                <span style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "white",
                  background: "#ff9800"
                }}>
                  ESCALATION REQUIRED
                </span>
              )}
            </div>
          </div>

          {/* Answer Text */}
          <div style={{ marginBottom: "1rem", lineHeight: "1.5" }}>
            {lastAnswer.answer}
          </div>

          {/* Confidence Reasoning */}
          {lastAnswer.confidenceReasoning && (
            <div style={{ marginBottom: "1rem", padding: "0.5rem", background: "#e3f2fd", borderRadius: "4px", fontSize: "0.85rem" }}>
              <strong>Confidence reasoning:</strong> {lastAnswer.confidenceReasoning}
            </div>
          )}

          {/* Applicability Notes */}
          {lastAnswer.applicabilityNotes && (
            <div style={{ marginBottom: "1rem", padding: "0.5rem", background: "#fff3e0", borderRadius: "4px", fontSize: "0.85rem" }}>
              <strong>Note:</strong> {lastAnswer.applicabilityNotes}
            </div>
          )}

          {/* Citations */}
          {lastAnswer.sources.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h5 style={{ marginBottom: "0.5rem" }}>Sources & Citations</h5>
              {lastAnswer.sources.map((source, i) => (
                <div key={source.id} style={{
                  padding: "0.5rem",
                  marginBottom: "0.5rem",
                  background: "#f5f5f5",
                  borderRadius: "4px",
                  borderLeft: `3px solid ${getConfidenceColor(lastAnswer.confidence)}`
                }}>
                  <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{source.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>
                    {source.documentType} | Relevance: {Math.round(source.relevanceScore * 100)}%
                  </div>
                  {source.url && (
                    <div style={{ fontSize: "0.75rem", color: "#2196f3" }}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>
                    </div>
                  )}
                  {source.excerpt && (
                    <div style={{ fontSize: "0.8rem", fontStyle: "italic", marginTop: "0.25rem" }}>
                      "{source.excerpt}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Escalation Button */}
          {lastAnswer.requiresEscalation && (
            <div style={{ padding: "0.5rem", background: "#fff3e0", borderRadius: "4px", marginTop: "0.5rem" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Escalation Reason:</strong> {lastAnswer.escalationReason}
              </div>
              {lastAnswer.escalationUrgency && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Urgency:</strong>{" "}
                  <span style={{ color: getUrgencyColor(lastAnswer.escalationUrgency), fontWeight: "bold" }}>
                    {lastAnswer.escalationUrgency.toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={handleEscalate}
                style={{ padding: "0.5rem 1rem", background: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Escalate to Human Review
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Escalations */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h4>Pending Escalations ({pendingEscalations.length})</h4>
          <button
            onClick={refresh}
            style={{ padding: "0.25rem 0.5rem", background: "#757575", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
        {pendingEscalations.length === 0 ? (
          <div style={{ color: "#666", fontStyle: "italic" }}>No pending escalations</div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem", maxHeight: "200px", overflow: "auto" }}>
            {pendingEscalations.slice(0, 5).map((escalation) => (
              <div
                key={escalation.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: selectedEscalation?.id === escalation.id ? "#e3f2fd" : "white",
                  borderLeft: `4px solid ${getUrgencyColor(escalation.urgency)}`
                }}
                onClick={() => setSelectedEscalation(selectedEscalation?.id === escalation.id ? null : escalation)}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "bold" }}>{escalation.originalQuestion.substring(0, 50)}...</span>
                  <span style={{
                    padding: "0.1rem 0.4rem",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    color: "white",
                    background: getUrgencyColor(escalation.urgency)
                  }}>
                    {escalation.urgency}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                  To: {escalation.escalatedToTeam ?? escalation.escalatedToRoleKey ?? "HR"} | Reason: {escalation.reason.substring(0, 40)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Panel */}
      {selectedEscalation && (
        <div style={{ border: "1px solid #ff9800", padding: "1rem", borderRadius: "4px", background: "#fffbf5" }}>
          <h4>Resolve Escalation</h4>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Question:</strong> {selectedEscalation.originalQuestion}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Reason:</strong> {selectedEscalation.reason}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Urgency:</strong>{" "}
            <span style={{ color: getUrgencyColor(selectedEscalation.urgency), fontWeight: "bold" }}>
              {selectedEscalation.urgency.toUpperCase()}
            </span>
          </div>
          <textarea
            placeholder="Resolution notes..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd", resize: "vertical", marginBottom: "0.5rem" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <button
              onClick={() => void handleResolve("resolved")}
              style={{ padding: "0.5rem", background: "#4caf50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Mark Resolved
            </button>
            <button
              onClick={() => void handleResolve("closed")}
              style={{ padding: "0.5rem", background: "#757575", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
