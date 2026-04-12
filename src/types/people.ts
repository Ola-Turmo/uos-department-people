/**
 * People Department Workflow Types
 * VAL-DEPT-PEOPLE-001: New-hire onboarding coordinates stakeholders with privacy-aware readiness tracking
 * VAL-DEPT-PEOPLE-002: Policy questions are answered with citations, confidence, and escalation
 */

// ============================================
// Onboarding Types
// ============================================

export type OnboardingStatus =
  | "not-started"
  | "in-progress"
  | "ready-day-one"
  | "blocked"
  | "completed";

export type OnboardingPriority = "critical" | "high" | "medium" | "low";

export type SensitiveCaseFlag =
  | "none"
  | "accommodation"
  | "legal"
  | "compensation"
  | "performance"
  | "hr-investigation"
  | "medical"
  | "personal";

export interface OnboardingStakeholder {
  roleKey: string;
  title: string;
  name?: string;
  email?: string;
  slackHandle?: string;
  responsibilities: string[];
  notifiedAt?: string;
  completedAt?: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category:
    | "documentation"
    | "equipment"
    | "access"
    | "training"
    | "introduction"
    | "compliance"
    | "benefits"
    | "workspace-setup"
    | "other";
  ownerRoleKey: string;
  assignedTo?: string;
  dueDay: number; // Day number relative to start date (0 = start date, 1 = day 2, etc.)
  status: "pending" | "in-progress" | "completed" | "skipped";
  completedAt?: string;
  blockedBy?: string[]; // Task IDs that must complete first
  privacyLevel: "standard" | "sensitive"; // Controls what data is exposed in logs/reports
  evidenceUrl?: string;
  notes: string[];
}

export interface OnboardingReadiness {
  overallScore: number; // 0-100
  taskCompletion: number; // 0-100 percentage of tasks completed
  stakeholderSignoff: number; // 0-100 percentage of required stakeholders who have signed off
  blockedTasks: string[]; // IDs of blocked tasks
  criticalPathComplete: boolean; // True if all critical tasks on the critical path are done
  dayOneReady: boolean;
  riskFactors: string[]; // Factors that could prevent day-one readiness
  assessedAt: string;
}

export interface NewHireProfile {
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
  workType?: "remote" | "hybrid" | "on-site";
  sensitiveCaseFlag: SensitiveCaseFlag;
  notes: string[]; // Internal notes - NOT exposed in external reports
}

export interface OnboardingWorkflow {
  id: string;
  newHire: NewHireProfile;
  tasks: Record<string, OnboardingTask>; // taskId -> task
  stakeholders: Record<string, OnboardingStakeholder>; // roleKey -> stakeholder
  readiness: OnboardingReadiness;
  status: OnboardingStatus;
  priority: OnboardingPriority;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  privacyBoundary: {
    // Controls what information is shared with whom
    hideSensitiveNotes: boolean; // Never expose internal notes in reports
    hideSensitiveCaseFlag: boolean; // Only show "accommodation" not the specifics
    restrictAccessToRoles: string[]; // Roles that can see full details
  };
  evidenceIds: string[];
}

export interface OnboardingSummary {
  totalOnboardings: number;
  inProgress: number;
  dayOneReady: number;
  blocked: number;
  averageReadinessScore: number;
  criticalBlockers: string[]; // New hire IDs with blockers
}

// ============================================
// Policy Question Types
// ============================================

export type PolicyConfidence = "high" | "medium" | "low";

export type PolicyEscalationUrgency = "routine" | "urgent" | "critical";

export interface PolicySource {
  id: string;
  title: string;
  url?: string;
  documentType: "employee-handbook" | "policy-page" | "kb-article" | "legal-document" | "manager-guide" | "external";
  lastReviewedAt?: string;
  relevanceScore: number; // 0-1
  excerpt?: string;
}

export interface PolicyAnswer {
  id: string;
  question: string;
  answer: string;
  summary?: string;
  confidence: PolicyConfidence;
  confidenceReasoning?: string; // Why this confidence level was assigned
  sources: PolicySource[];
  relatedPolicies?: string[]; // Policy IDs that are related
  applicabilityNotes?: string; // Any caveats or special cases
  answeredAt: string;
  answeredBy?: string; // Role or system that provided the answer
  requiresEscalation: boolean;
  escalationReason?: string;
  escalatedAt?: string;
  escalationUrgency?: PolicyEscalationUrgency;
}

export interface PolicyEscalation {
  id: string;
  questionId: string;
  originalQuestion: string;
  escalatedToRoleKey?: string;
  escalatedToTeam?: string;
  urgency: PolicyEscalationUrgency;
  reason: string;
  status: "pending" | "in-review" | "resolved" | "closed";
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  notes: string[];
  evidenceIds: string[];
}

export interface PolicyQuestionLog {
  id: string;
  question: string;
  askerId?: string;
  askerRole?: string;
  category?: string;
  askedAt: string;
  answerId?: string;
  escalatedId?: string;
  resolvedAt?: string;
}

// ============================================
// Service State Types
// ============================================

export interface OnboardingState {
  workflows: Record<string, OnboardingWorkflow>; // workflowId -> workflow
  newHireIndex: Record<string, string[]>; // employeeId -> workflowIds
  lastUpdated: string;
}

export interface PolicyState {
  questions: Record<string, PolicyQuestionLog>; // questionId -> log
  answers: Record<string, PolicyAnswer>; // answerId -> answer
  escalations: Record<string, PolicyEscalation>; // escalationId -> escalation
  lastUpdated: string;
}

// ============================================
// Action Parameters - Onboarding
// ============================================

export interface CreateOnboardingParams {
  employeeId: string;
  name: string;
  preferredName?: string;
  startDate: string;
  role: string;
  department: string;
  managerId?: string;
  managerName?: string;
  location?: string;
  workType?: "remote" | "hybrid" | "on-site";
  sensitiveCaseFlag?: SensitiveCaseFlag;
  notes?: string[];
}

export interface AddOnboardingTaskParams {
  workflowId: string;
  title: string;
  description: string;
  category: OnboardingTask["category"];
  ownerRoleKey: string;
  assignedTo?: string;
  dueDay: number;
  blockedBy?: string[];
  privacyLevel?: "standard" | "sensitive";
}

export interface UpdateTaskStatusParams {
  workflowId: string;
  taskId: string;
  status: OnboardingTask["status"];
  completedAt?: string;
  notes?: string[];
}

export interface NotifyStakeholderParams {
  workflowId: string;
  roleKey: string;
  message?: string;
}

export interface CompleteStakeholderSignoffParams {
  workflowId: string;
  roleKey: string;
}

export interface AssessReadinessParams {
  workflowId: string;
}

export interface GetOnboardingSummaryParams {
  status?: OnboardingStatus;
  managerId?: string;
  department?: string;
}

// ============================================
// Action Parameters - Policy
// ============================================

export interface AskPolicyQuestionParams {
  question: string;
  askerId?: string;
  askerRole?: string;
  category?: string;
  context?: string; // Additional context about the question
}

export interface GetPolicyAnswerParams {
  answerId: string;
}

export interface EscalatePolicyQuestionParams {
  questionId: string;
  reason: string;
  urgency?: PolicyEscalationUrgency;
  escalatedToRoleKey?: string;
  escalatedToTeam?: string;
}

export interface ResolveEscalationParams {
  escalationId: string;
  resolution: string;
  status: "resolved" | "closed";
}

export interface GetPolicyQuestionsReportParams {
  lookbackDays?: number;
  category?: string;
  status?: "answered" | "escalated" | "pending";
}

export interface PolicyReport {
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
}

// ============================================
// Skills Gap Analysis Types
// ============================================

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface SkillsGapReport {
  employeeId: string;
  matchedSkills: { skillId: string; employeeLevel: string; requiredLevel: string }[];
  gaps: { skillId: string; currentLevel: string; requiredLevel: string; severity: "low" | "medium" | "high" }[];
  learningPath: LearningModule[];
  teamCoverage: Record<string, Record<string, number>>; // member -> skill -> coverage score
  recommendations: string[];
  generatedAt: string;
}

export interface LearningModule {
  skillId: string;
  title: string;
  order: number;
  estimatedHours: number;
  resources: string[];
}

export interface EmployeeSkill {
  skillId: string;
  proficiencyLevel: ProficiencyLevel;
}

export interface RoleRequirement {
  skillId: string;
  requiredLevel: ProficiencyLevel;
}

// ============================================
// Connector Health Types (XAF-007)
// ============================================

export type ConnectorHealthStatus = "ok" | "degraded" | "error" | "unknown";

export interface ConnectorHealthState {
  toolkitId: string;
  status: ConnectorHealthStatus;
  lastChecked: string;
  error?: string;
  limitationMessage?: string;
}

export interface ToolkitLimitation {
  toolkitId: string;
  displayName: string;
  limitationMessage: string;
  severity: "critical" | "high" | "medium" | "low";
  affectedWorkflows: string[];
  suggestedAction: string;
}

export interface ConnectorHealthSummary {
  overallStatus: ConnectorHealthStatus;
  checkedAt: string;
  connectors: ConnectorHealthState[];
  limitations: ToolkitLimitation[];
  hasLimitations: boolean;
}

export interface SetConnectorHealthParams {
  toolkitId: string;
  status: ConnectorHealthStatus;
  error?: string;
}

export interface GetConnectorHealthParams {
  toolkitId?: string;
}
