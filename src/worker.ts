import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { OnboardingService } from "./workflows/onboarding.js";
import { PolicyService } from "./workflows/policy.js";
import {
  createInitialConnectorHealthState,
  updateConnectorHealthState,
  computeDepartmentHealthStatus,
  generateToolkitLimitations,
  formatAllLimitations,
  performRuntimeHealthCheck,
  type ConnectorHealthState,
} from "./connector-health.js";
import type {
  CreateOnboardingParams,
  AddOnboardingTaskParams,
  UpdateTaskStatusParams,
  NotifyStakeholderParams,
  CompleteStakeholderSignoffParams,
  GetOnboardingSummaryParams,
  AskPolicyQuestionParams,
  EscalatePolicyQuestionParams,
  ResolveEscalationParams,
  GetPolicyQuestionsReportParams,
  ConnectorHealthSummary,
  SetConnectorHealthParams,
  GetConnectorHealthParams,
} from "./types/people.js";

// Initialize services
const onboardingService = new OnboardingService();
const policyService = new PolicyService();

// Connector health state (XAF-007)
let connectorHealthState: ConnectorHealthState[] = createInitialConnectorHealthState();

const plugin = definePlugin({
  async setup(ctx) {
    ctx.events.on("issue.created", async (event) => {
      const issueId = event.entityId ?? "unknown";
      await ctx.state.set({ scopeKind: "issue", scopeId: issueId, stateKey: "seen" }, true);
      ctx.logger.info("Observed issue.created", { issueId });
    });

    // Health check (now includes connector health status - XAF-007)
    ctx.data.register("health", async () => {
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        status: overallStatus,
        checkedAt: new Date().toISOString(),
        hasLimitations: limitations.length > 0,
        limitations: limitations,
      };
    });

    // Connector health data (XAF-007)
    ctx.data.register("connectorHealth", async (params) => {
      const p = params as unknown as GetConnectorHealthParams;
      if (p?.toolkitId) {
        const state = connectorHealthState.find((s) => s.toolkitId === p.toolkitId);
        if (!state) {
          return { error: `Connector '${p.toolkitId}' not found` };
        }
        const limitations = state.status !== "ok"
          ? generateToolkitLimitations([state])
          : [];
        return { connector: state, limitations };
      }
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      const summary: ConnectorHealthSummary = {
        overallStatus,
        checkedAt: new Date().toISOString(),
        connectors: connectorHealthState,
        limitations,
        hasLimitations: limitations.length > 0,
      };
      return summary;
    });

    // Ping action for testing
    ctx.actions.register("ping", async () => {
      ctx.logger.info("Ping action invoked");
      return { pong: true, at: new Date().toISOString() };
    });

    // ============================================
    // Connector Health Actions (XAF-007)
    // ============================================

    /**
     * Set connector health status (for simulation/testing)
     * XAF-007: Simulate connector degradation to verify limitation messaging
     */
    ctx.actions.register("connector.setHealth", async (params) => {
      const p = params as unknown as SetConnectorHealthParams;
      ctx.logger.info("Setting connector health", { toolkitId: p.toolkitId, status: p.status });
      connectorHealthState = updateConnectorHealthState(
        connectorHealthState,
        p.toolkitId,
        p.status,
        p.error
      );
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        success: true,
        toolkitId: p.toolkitId,
        status: p.status,
        overallStatus,
        limitations,
        formattedLimitations: limitations.length > 0 ? formatAllLimitations(limitations) : undefined,
      };
    });

    /**
     * Get connector health summary
     * XAF-007
     */
    ctx.actions.register("connector.getHealth", async () => {
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        overallStatus,
        checkedAt: new Date().toISOString(),
        connectors: connectorHealthState,
        limitations,
        hasLimitations: limitations.length > 0,
      };
    });

    /**
     * Simulate connector degradation for testing
     * XAF-007
     */
    ctx.actions.register("connector.simulateDegradation", async (params) => {
      const p = params as unknown as { toolkitId: string; severity?: "degraded" | "error" };
      const status = p.severity ?? "degraded";
      ctx.logger.info("Simulating connector degradation", { toolkitId: p.toolkitId, status });
      connectorHealthState = updateConnectorHealthState(
        connectorHealthState,
        p.toolkitId,
        status,
        status === "error"
          ? "Simulated: Connector authentication failed"
          : "Simulated: Connector responding slowly"
      );
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        success: true,
        toolkitId: p.toolkitId,
        status,
        overallStatus,
        limitations,
        formattedLimitations: limitations.length > 0 ? formatAllLimitations(limitations) : undefined,
      };
    });

    /**
     * Restore connector to healthy state
     * XAF-007
     */
    ctx.actions.register("connector.restore", async (params) => {
      const p = params as unknown as { toolkitId: string };
      ctx.logger.info("Restoring connector health", { toolkitId: p.toolkitId });
      connectorHealthState = updateConnectorHealthState(
        connectorHealthState,
        p.toolkitId,
        "ok"
      );
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        success: true,
        toolkitId: p.toolkitId,
        status: "ok",
        overallStatus,
        limitations,
        hasLimitations: limitations.length > 0,
      };
    });

    /**
     * Perform actual runtime health check for all connectors.
     * 
     * This implements XAF-007: Department workflows degrade explicitly when
     * dependent connectors or tools are impaired, rather than blindly reporting ok.
     */
    ctx.actions.register("connector.checkHealth", async () => {
      ctx.logger.info("Performing runtime connector health check", { 
        connectorCount: connectorHealthState.length 
      });
      
      const checkResult = await performRuntimeHealthCheck(connectorHealthState);
      connectorHealthState = checkResult.updatedStates;
      
      ctx.logger.info("Connector health check completed", {
        overallStatus: checkResult.overallStatus,
        checkedConnectors: checkResult.checkResults.filter(r => r.wasChecked).length,
        hasImpaired: checkResult.checkResults.some(r => r.status !== "ok"),
      });
      
      const limitations = generateToolkitLimitations(connectorHealthState);
      
      return {
        success: true,
        overallStatus: checkResult.overallStatus,
        checkedAt: new Date().toISOString(),
        connectors: connectorHealthState,
        checkResults: checkResult.checkResults,
        limitations,
        hasLimitations: limitations.length > 0,
        formattedLimitations: limitations.length > 0 ? formatAllLimitations(limitations) : undefined,
      };
    });

    // ============================================
    // Onboarding Actions (VAL-DEPT-PEOPLE-001)
    // ============================================

    /**
     * Create a new onboarding workflow
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.create", async (params) => {
      const p = params as unknown as CreateOnboardingParams;
      ctx.logger.info("Creating onboarding workflow", { employeeId: p.employeeId, name: p.name });
      const workflow = onboardingService.createOnboarding(p);
      return { workflow };
    });

    /**
     * Get an onboarding workflow by ID
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.get", async (params) => {
      const p = params as unknown as { workflowId: string };
      const workflow = onboardingService.getWorkflow(p.workflowId);
      return { workflow: workflow ?? null };
    });

    /**
     * Get all onboarding workflows
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.getAll", async () => {
      const workflows = onboardingService.getAllWorkflows();
      return { workflows };
    });

    /**
     * Get workflows by employee ID
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.getByEmployee", async (params) => {
      const p = params as unknown as { employeeId: string };
      const workflows = onboardingService.getWorkflowsByEmployee(p.employeeId);
      return { workflows };
    });

    /**
     * Get workflows by status
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.getByStatus", async (params) => {
      const p = params as unknown as { status: "not-started" | "in-progress" | "ready-day-one" | "blocked" | "completed" };
      const workflows = onboardingService.getWorkflowsByStatus(p.status);
      return { workflows };
    });

    /**
     * Add a task to an onboarding workflow
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.addTask", async (params) => {
      const p = params as unknown as AddOnboardingTaskParams;
      ctx.logger.info("Adding task to onboarding workflow", { workflowId: p.workflowId, title: p.title });
      const task = onboardingService.addTask(p.workflowId, p);
      return { task: task ?? null };
    });

    /**
     * Update task status in an onboarding workflow
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.updateTaskStatus", async (params) => {
      const p = params as unknown as UpdateTaskStatusParams;
      ctx.logger.info("Updating task status", { workflowId: p.workflowId, taskId: p.taskId, status: p.status });
      const task = onboardingService.updateTaskStatus(p.workflowId, p);
      return { task: task ?? null };
    });

    /**
     * Notify a stakeholder about onboarding progress
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.notifyStakeholder", async (params) => {
      const p = params as unknown as NotifyStakeholderParams;
      const stakeholder = onboardingService.notifyStakeholder(p.workflowId, p);
      return { stakeholder: stakeholder ?? null };
    });

    /**
     * Complete stakeholder signoff
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.completeStakeholderSignoff", async (params) => {
      const p = params as unknown as CompleteStakeholderSignoffParams;
      ctx.logger.info("Completing stakeholder signoff", { workflowId: p.workflowId, roleKey: p.roleKey });
      const stakeholder = onboardingService.completeStakeholderSignoff(p.workflowId, p);
      return { stakeholder: stakeholder ?? null };
    });

    /**
     * Assess readiness for an onboarding workflow
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.assessReadiness", async (params) => {
      const p = params as unknown as { workflowId: string };
      ctx.logger.info("Assessing onboarding readiness", { workflowId: p.workflowId });
      const readiness = onboardingService.assessReadiness(p.workflowId);
      return { readiness: readiness ?? null };
    });

    /**
     * Get onboarding summary statistics
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.getSummary", async (params) => {
      const p = params as unknown as GetOnboardingSummaryParams;
      const summary = onboardingService.getSummary(p);
      return { summary };
    });

    /**
     * Get privacy-safe onboarding report
     * VAL-DEPT-PEOPLE-001
     */
    ctx.actions.register("onboarding.getPrivacySafeReport", async (params) => {
      const p = params as unknown as { workflowId: string; requestingRole: string };
      const report = onboardingService.generatePrivacySafeReport(p.workflowId, p.requestingRole);
      return { report: report ?? null };
    });

    // ============================================
    // Policy Question Actions (VAL-DEPT-PEOPLE-002)
    // ============================================

    /**
     * Ask a policy question
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.ask", async (params) => {
      const p = params as unknown as AskPolicyQuestionParams;
      ctx.logger.info("Policy question asked", { question: p.question.substring(0, 50) });
      const answer = policyService.askQuestion(p);
      return { answer };
    });

    /**
     * Get a policy answer by ID
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.getAnswer", async (params) => {
      const p = params as unknown as { answerId: string };
      const answer = policyService.getAnswer(p.answerId);
      return { answer: answer ?? null };
    });

    /**
     * Get a policy question log by ID
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.getQuestion", async (params) => {
      const p = params as unknown as { questionId: string };
      const question = policyService.getQuestion(p.questionId);
      return { question: question ?? null };
    });

    /**
     * Escalate a policy question to human review
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.escalate", async (params) => {
      const p = params as unknown as EscalatePolicyQuestionParams;
      ctx.logger.info("Escalating policy question", { questionId: p.questionId, urgency: p.urgency });
      const escalation = policyService.escalateQuestion(p);
      return { escalation: escalation ?? null };
    });

    /**
     * Get an escalation by ID
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.getEscalation", async (params) => {
      const p = params as unknown as { escalationId: string };
      const escalation = policyService.getEscalation(p.escalationId);
      return { escalation: escalation ?? null };
    });

    /**
     * Get all pending escalations
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.getPendingEscalations", async () => {
      const escalations = policyService.getPendingEscalations();
      return { escalations };
    });

    /**
     * Get escalations by urgency
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.getEscalationsByUrgency", async (params) => {
      const p = params as unknown as { urgency: "routine" | "urgent" | "critical" };
      const escalations = policyService.getEscalationsByUrgency(p.urgency);
      return { escalations };
    });

    /**
     * Resolve an escalation
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.resolveEscalation", async (params) => {
      const p = params as unknown as ResolveEscalationParams;
      ctx.logger.info("Resolving policy escalation", { escalationId: p.escalationId, status: p.status });
      const escalation = policyService.resolveEscalation(p);
      return { escalation: escalation ?? null };
    });

    /**
     * Add a note to an escalation
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.addEscalationNote", async (params) => {
      const p = params as unknown as { escalationId: string; note: string };
      const escalation = policyService.addEscalationNote(p.escalationId, p.note);
      return { escalation: escalation ?? null };
    });

    /**
     * Generate a policy questions report
     * VAL-DEPT-PEOPLE-002
     */
    ctx.actions.register("policy.generateReport", async (params) => {
      const p = params as unknown as GetPolicyQuestionsReportParams;
      const report = policyService.generateReport(p);
      return { report };
    });
  },

  async onHealth() {
    return { status: "ok", message: "Plugin worker is running" };
  }
});

export default plugin;
runWorker(plugin, import.meta.url);
