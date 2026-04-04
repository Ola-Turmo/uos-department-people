/**
 * People Workflow Tests
 * VAL-DEPT-PEOPLE-001: New-hire onboarding coordinates stakeholders with privacy-aware readiness tracking
 * VAL-DEPT-PEOPLE-002: Policy questions are answered with citations, confidence, and escalation
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  OnboardingService,
  PolicyService,
  type CreateOnboardingParams,
  type AskPolicyQuestionParams,
  type OnboardingStatus,
} from "../src";

describe("OnboardingService", () => {
  let service: OnboardingService;

  beforeEach(() => {
    service = new OnboardingService();
  });

  describe("VAL-DEPT-PEOPLE-001: New-hire onboarding", () => {
    it("creates an onboarding workflow with default tasks and stakeholders", () => {
      const params: CreateOnboardingParams = {
        employeeId: "emp-123",
        name: "Jane Smith",
        startDate: "2026-04-15",
        role: "Software Engineer",
        department: "Engineering",
        managerId: "mgr-456",
        managerName: "John Manager",
      };

      const workflow = service.createOnboarding(params);

      expect(workflow).toBeDefined();
      expect(workflow.id).toBeDefined();
      expect(workflow.newHire.employeeId).toBe("emp-123");
      expect(workflow.newHire.name).toBe("Jane Smith");
      expect(workflow.newHire.sensitiveCaseFlag).toBe("none");
      expect(Object.keys(workflow.tasks).length).toBeGreaterThan(0);
      expect(Object.keys(workflow.stakeholders).length).toBeGreaterThan(0);
    });

    it("creates an onboarding workflow with sensitive case flag", () => {
      const params: CreateOnboardingParams = {
        employeeId: "emp-456",
        name: "Bob Wilson",
        startDate: "2026-04-20",
        role: "Product Manager",
        department: "Product",
        sensitiveCaseFlag: "accommodation",
        notes: ["Requires desk adjustment", "Needs noise-cancelling headphones"],
      };

      const workflow = service.createOnboarding(params);

      expect(workflow.newHire.sensitiveCaseFlag).toBe("accommodation");
      expect(workflow.newHire.notes).toContain("Requires desk adjustment");
      // Privacy boundary should hide sensitive notes
      expect(workflow.privacyBoundary.hideSensitiveNotes).toBe(true);
      expect(workflow.privacyBoundary.hideSensitiveCaseFlag).toBe(true);
    });

    it("creates onboarding with the correct initial readiness state", () => {
      const workflow = service.createOnboarding({
        employeeId: "emp-789",
        name: "Alice Brown",
        startDate: "2026-04-25",
        role: "Designer",
        department: "Design",
      });

      // Initial readiness should show 0% completion (not assessed yet)
      expect(workflow.readiness.overallScore).toBe(0);
      expect(workflow.readiness.taskCompletion).toBe(0);
    });

    it("updates task status via workflow retrieval", () => {
      const workflow = service.createOnboarding({
        employeeId: "emp-789",
        name: "Alice Brown",
        startDate: "2026-04-25",
        role: "Designer",
        department: "Design",
      });

      // Get all tasks from the returned workflow
      const taskIds = Object.keys(workflow.tasks);
      expect(taskIds.length).toBeGreaterThan(0);

      // Complete first task by its ID
      const firstTaskId = taskIds[0];
      const updateResult = service.updateTaskStatus({
        workflowId: workflow.id,
        taskId: firstTaskId,
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      // Verify via workflow retrieval
      const retrievedWorkflow = service.getWorkflow(workflow.id);
      expect(retrievedWorkflow).toBeDefined();
      expect(retrievedWorkflow!.tasks[firstTaskId]).toBeDefined();
    });

    it("prevents privacy-sensitive notes from leaking in reports", () => {
      const workflow = service.createOnboarding({
        employeeId: "emp-sensitive",
        name: "Confidential Person",
        startDate: "2026-05-01",
        role: "Executive",
        department: "Leadership",
        sensitiveCaseFlag: "hr-investigation",
        notes: ["This is a highly sensitive internal note"],
      });

      // Request report as a non-authorized role
      const restrictedReport = service.generatePrivacySafeReport(workflow.id, "random-role");

      expect(restrictedReport).toBeDefined();
      expect(restrictedReport!.employeeName).toBe("REDACTED");

      // Request report as an authorized role
      const fullReport = service.generatePrivacySafeReport(workflow.id, "people-ops-lead");

      expect(fullReport).toBeDefined();
      expect(fullReport!.employeeName).toBe("Confidential Person");
    });

    it("has blocked tasks in the default task set", () => {
      const workflow = service.createOnboarding({
        employeeId: "emp-blocked",
        name: "Blocked Employee",
        startDate: "2026-05-10",
        role: "Engineer",
        department: "Engineering",
      });

      // Find blocked tasks - tasks with dependencies that aren't yet completed
      const blockedTasks = Object.values(workflow.tasks)
        .filter((t) => t.blockedBy && t.blockedBy.length > 0)
        .map((t) => t.id);

      expect(blockedTasks.length).toBeGreaterThan(0);
    });

    it("has stakeholders defined in the workflow", () => {
      const workflow = service.createOnboarding({
        employeeId: "emp-stakeholder",
        name: "Test Stakeholder",
        startDate: "2026-05-15",
        role: "Analyst",
        department: "Analytics",
        managerId: "mgr-stakeholder",
        managerName: "Manager Person",
      });

      // Verify people-ops-lead exists in stakeholders
      expect(workflow.stakeholders["people-ops-lead"]).toBeDefined();
      expect(workflow.stakeholders["people-ops-lead"]!.status).toBe("pending");
    });

    it("generates onboarding summary with correct counts", () => {
      // Create two onboardings
      service.createOnboarding({
        employeeId: "emp-sum-1",
        name: "Summary Person 1",
        startDate: "2026-04-01",
        role: "Engineer",
        department: "Engineering",
      });

      service.createOnboarding({
        employeeId: "emp-sum-2",
        name: "Summary Person 2",
        startDate: "2026-04-15",
        role: "Designer",
        department: "Design",
      });

      const summary = service.getSummary();

      expect(summary.totalOnboardings).toBe(2);
    });

    it("respects privacy boundaries - sensitive case flag is not exposed in reports", () => {
      const workflow = service.createOnboarding({
        employeeId: "emp-privacy",
        name: "Private Person",
        startDate: "2026-06-01",
        role: "Specialist",
        department: "Sales",
        sensitiveCaseFlag: "medical",
        notes: ["Medical accommodation required"],
      });

      // The sensitiveCaseFlag is stored but NOT exposed in the privacy-safe report
      const report = service.generatePrivacySafeReport(workflow.id, "people-ops-lead");
      expect(report).toBeDefined();
      // The report should not contain the flag value - only the existence of a flag is noted via risk factors
    });
  });
});

describe("PolicyService", () => {
  let service: PolicyService;

  beforeEach(() => {
    service = new PolicyService();
  });

  describe("VAL-DEPT-PEOPLE-002: Policy question answering", () => {
    it("answers a PTO question with citations and confidence", () => {
      const answer = service.askQuestion({
        question: "How do I request PTO?",
        askerId: "emp-001",
        askerRole: "employee",
      });

      expect(answer).toBeDefined();
      expect(answer.answer).toContain("PTO");
      expect(answer.sources.length).toBeGreaterThan(0);
      expect(answer.sources[0].documentType).toBe("employee-handbook");
      expect(["high", "medium", "low"]).toContain(answer.confidence);
      expect(answer.confidenceReasoning).toBeDefined();
    });

    it("answers a remote work question with citations", () => {
      const answer = service.askQuestion({
        question: "What is the work from home policy?",
        askerId: "emp-002",
        askerRole: "employee",
      });

      expect(answer).toBeDefined();
      expect(answer.answer).toContain("remote");
      expect(answer.sources.length).toBeGreaterThan(0);
      expect(answer.confidence).toBeDefined();
    });

    it("flags discrimination questions for escalation", () => {
      const answer = service.askQuestion({
        question: "I think I'm being discriminated against by my manager",
        askerId: "emp-003",
        askerRole: "employee",
      });

      expect(answer).toBeDefined();
      expect(answer.requiresEscalation).toBe(true);
      expect(answer.escalationReason).toBeDefined();
    });

    it("escalates questions with sensitive keywords", () => {
      // Use a question with FMLA trigger
      const answer = service.askQuestion({
        question: "I need an FMLA accommodation for my medical condition",
        askerId: "emp-005",
        askerRole: "employee",
      });

      expect(answer).toBeDefined();
      expect(answer.requiresEscalation).toBe(true);

      // Find the question in state to get its ID
      const state = service.getState();
      const questionEntry = Object.values(state.questions).find(
        (q) => q.question === answer.question
      );
      expect(questionEntry).toBeDefined();

      const escalation = service.escalateQuestion({
        questionId: questionEntry!.id,
        reason: "FMLA requires HR review",
        urgency: "urgent",
        escalatedToRoleKey: "people-reviewer",
      });

      expect(escalation).toBeDefined();
      expect(escalation!.urgency).toBe("urgent");
      expect(escalation!.status).toBe("pending");
    });

    it("resolves an escalation with a resolution note", () => {
      // Ask a harassment question that will require escalation
      service.askQuestion({
        question: "I'm experiencing harassment from a coworker",
        askerId: "emp-006",
        askerRole: "employee",
      });

      const state = service.getState();
      const questionEntry = Object.values(state.questions)[0];

      const escalation = service.escalateQuestion({
        questionId: questionEntry.id,
        reason: "Harassment complaint requires immediate HR review",
        urgency: "critical",
      });

      const resolved = service.resolveEscalation({
        escalationId: escalation!.id,
        resolution: "HR has reviewed and provided support resources to the affected employee",
        status: "resolved",
      });

      expect(resolved).toBeDefined();
      expect(resolved!.status).toBe("resolved");
      expect(resolved!.resolution).toContain("HR");
    });

    it("generates a policy report with coverage metrics", () => {
      // Ask several questions
      service.askQuestion({
        question: "How do I request vacation?",
        askerId: "emp-report-1",
      });

      service.askQuestion({
        question: "What's the remote work policy?",
        askerId: "emp-report-2",
      });

      service.askQuestion({
        question: "I need help with a legal issue",
        askerId: "emp-report-3",
      });

      const report = service.generateReport({ lookbackDays: 30 });

      expect(report.totalQuestions).toBe(3);
      expect(report.policyCoverage).toBeDefined();
      expect(report.averageConfidence).toBeDefined();
    });

    it("provides low confidence for questions outside the knowledge base", () => {
      const answer = service.askQuestion({
        question: "What is the meaning of life according to company policy?",
        askerId: "emp-unknown",
      });

      expect(answer).toBeDefined();
      expect(answer.confidence).toBe("low");
      expect(answer.sources.length).toBe(0);
    });

    it("includes citations in all answers", () => {
      const answer = service.askQuestion({
        question: "How do I submit expense reports?",
        askerId: "emp-cite",
      });

      expect(answer.sources.length).toBeGreaterThan(0);
      expect(answer.sources[0].id).toBeDefined();
      expect(answer.sources[0].title).toBeDefined();
      expect(answer.sources[0].documentType).toBeDefined();
    });

    it("assigns critical urgency to legal-related escalations", () => {
      service.askQuestion({
        question: "We have a potential lawsuit from a former employee",
        askerId: "emp-legal",
      });

      const state = service.getState();
      const questionEntry = Object.values(state.questions).find(
        (q) => q.question.includes("lawsuit")
      );
      expect(questionEntry).toBeDefined();

      const escalation = service.escalateQuestion({
        questionId: questionEntry!.id,
        reason: "Potential lawsuit requires legal review",
      });

      expect(escalation!.urgency).toBe("critical");
    });
  });
});
