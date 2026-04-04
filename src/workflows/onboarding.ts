/**
 * Onboarding Workflow Service
 * VAL-DEPT-PEOPLE-001: New-hire onboarding coordinates stakeholders with privacy-aware readiness tracking
 *
 * Coordinates onboarding tasks across stakeholders, tracks day-one readiness,
 * and preserves privacy boundaries for sensitive cases.
 */

import type {
  OnboardingState,
  OnboardingWorkflow,
  OnboardingTask,
  OnboardingStakeholder,
  OnboardingReadiness,
  NewHireProfile,
  CreateOnboardingParams,
  AddOnboardingTaskParams,
  UpdateTaskStatusParams,
  NotifyStakeholderParams,
  CompleteStakeholderSignoffParams,
  AssessReadinessParams,
  GetOnboardingSummaryParams,
  OnboardingSummary,
  OnboardingStatus,
  SensitiveCaseFlag,
} from "../types/people.js";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Default stakeholders for onboarding workflow
 */
function createDefaultStakeholders(): Record<string, OnboardingStakeholder> {
  return {
    "people-ops-lead": {
      roleKey: "people-ops-lead",
      title: "People Ops Lead",
      responsibilities: [
        "Ensure all people-side onboarding tasks are complete",
        "Coordinate with manager on any issues",
        "Final signoff on readiness",
      ],
      status: "pending",
    },
    "people-onboarding-specialist": {
      roleKey: "people-onboarding-specialist",
      title: "Onboarding Specialist",
      responsibilities: [
        "Send welcome communications",
        "Complete HR and benefits setup",
        "Coordinate first-day logistics",
      ],
      status: "pending",
    },
    "people-talent-lead": {
      roleKey: "people-talent-lead",
      title: "Talent Lead",
      responsibilities: [
        "Ensure role and team introduction schedule is set",
        "Confirm training plan is in place",
      ],
      status: "pending",
    },
  };
}

/**
 * Standard onboarding tasks for a typical new hire
 */
function createStandardTasks(
  startDate: string,
  roleKey: string = "people-onboarding-specialist"
): Record<string, OnboardingTask> {
  const start = new Date(startDate);
  const tasks: Record<string, OnboardingTask> = {};

  // Day 0 tasks (start date)
  const day0Tasks: Omit<OnboardingTask, "id">[] = [
    {
      title: "Send welcome email",
      description: "Send welcome email with first-day instructions and schedule",
      category: "introduction",
      ownerRoleKey: roleKey,
      dueDay: 0,
      status: "pending",
      privacyLevel: "standard",
      notes: [],
    },
    {
      title: "Prepare workspace/equipment",
      description: "Set up desk, computer, monitors, and any requested equipment",
      category: "equipment",
      ownerRoleKey: roleKey,
      dueDay: 0,
      status: "pending",
      privacyLevel: "standard",
      notes: [],
    },
    {
      title: "Create email and accounts",
      description: "Create corporate email, Slack, and necessary system accounts",
      category: "access",
      ownerRoleKey: roleKey,
      dueDay: 0,
      status: "pending",
      privacyLevel: "sensitive",
      notes: [],
    },
  ];

  // Day 1 tasks
  const day1Tasks: Omit<OnboardingTask, "id">[] = [
    {
      title: "First-day orientation",
      description: "Office tour, team introductions, and company overview",
      category: "introduction",
      ownerRoleKey: roleKey,
      dueDay: 1,
      status: "pending",
      privacyLevel: "standard",
      notes: [],
    },
    {
      title: "Complete I-9 and tax forms",
      description: "Complete employment eligibility and tax withholding forms",
      category: "compliance",
      ownerRoleKey: roleKey,
      dueDay: 1,
      status: "pending",
      privacyLevel: "sensitive",
      notes: [],
    },
    {
      title: "Benefits enrollment",
      description: "Enroll in health, dental, vision, and 401k benefits",
      category: "benefits",
      ownerRoleKey: roleKey,
      dueDay: 1,
      status: "pending",
      blockedBy: ["complete-i9"],
      privacyLevel: "sensitive",
      notes: [],
    },
    {
      title: "Security and compliance training",
      description: "Complete required security awareness and compliance training",
      category: "training",
      ownerRoleKey: roleKey,
      dueDay: 1,
      status: "pending",
      privacyLevel: "standard",
      notes: [],
    },
    {
      title: "Meet with manager",
      description: "Initial 1:1 with direct manager to discuss role expectations",
      category: "introduction",
      ownerRoleKey: roleKey,
      dueDay: 1,
      status: "pending",
      privacyLevel: "standard",
      notes: [],
    },
  ];

  // Day 2-5 tasks
  const day2to5Tasks: Omit<OnboardingTask, "id">[] = [
    {
      title: "Complete role-specific training",
      description: "Complete required training modules for the specific role",
      category: "training",
      ownerRoleKey: roleKey,
      dueDay: 5,
      status: "pending",
      privacyLevel: "standard",
      notes: [],
    },
    {
      title: "Set up development environment",
      description: "Configure laptop, tools, and access to required repositories",
      category: "workspace-setup",
      ownerRoleKey: roleKey,
      dueDay: 3,
      status: "pending",
      blockedBy: ["create-email-accounts"],
      privacyLevel: "standard",
      notes: [],
    },
    {
      title: "Review team documentation",
      description: "Review team wiki, processes, and ongoing projects",
      category: "documentation",
      ownerRoleKey: roleKey,
      dueDay: 5,
      status: "pending",
      blockedBy: ["create-email-accounts"],
      privacyLevel: "standard",
      notes: [],
    },
    {
      title: "Meet key stakeholders",
      description: "Introductions with cross-functional partners and key collaborators",
      category: "introduction",
      ownerRoleKey: roleKey,
      dueDay: 5,
      status: "pending",
      privacyLevel: "standard",
      notes: [],
    },
  ];

  // Assign IDs and add to tasks map
  let taskIndex = 0;
  const addTasks = (taskList: Omit<OnboardingTask, "id">[], startIndex: number) => {
    for (const task of taskList) {
      const id = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30);
      tasks[`${id}-${startIndex}`] = {
        ...task,
        id: `${id}-${startIndex}`,
      };
      taskIndex++;
    }
  };

  addTasks(day0Tasks, 0);
  addTasks(day1Tasks, 1);
  addTasks(day2to5Tasks, 2);

  return tasks;
}

/**
 * Calculate readiness score for an onboarding workflow
 */
function calculateReadiness(workflow: OnboardingWorkflow): OnboardingReadiness {
  const tasks = Object.values(workflow.tasks);
  const stakeholders = Object.values(workflow.stakeholders);

  // Task completion score
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const taskCompletion = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Stakeholder signoff score
  const signedOffStakeholders = stakeholders.filter((s) => s.status === "completed").length;
  const stakeholderSignoff = stakeholders.length > 0 ? (signedOffStakeholders / stakeholders.length) * 100 : 0;

  // Overall score is weighted average
  const overallScore = Math.round(taskCompletion * 0.7 + stakeholderSignoff * 0.3);

  // Identify blocked tasks
  const blockedTasks: string[] = [];
  for (const task of tasks) {
    if (task.status === "pending" && task.blockedBy) {
      for (const blockedId of task.blockedBy) {
        const blockingTask = workflow.tasks[blockedId];
        if (blockingTask && blockingTask.status !== "completed") {
          blockedTasks.push(task.id);
          break;
        }
      }
    }
  }

  // Check critical path completion (tasks due by day 1)
  const criticalTasks = tasks.filter((t) => t.dueDay <= 1);
  const criticalPathComplete = criticalTasks.every((t) => t.status === "completed");

  // Day one ready means: critical path complete AND most standard tasks done
  const dayOneReady = criticalPathComplete && taskCompletion >= 70;

  // Risk factors
  const riskFactors: string[] = [];
  if (blockedTasks.length > 0) {
    riskFactors.push(`${blockedTasks.length} task(s) blocked by dependencies`);
  }
  if (!criticalPathComplete) {
    riskFactors.push("Critical path tasks incomplete");
  }
  if (taskCompletion < 50) {
    riskFactors.push("Less than 50% of tasks completed");
  }
  if (workflow.newHire.sensitiveCaseFlag !== "none") {
    riskFactors.push("Sensitive case flag requires attention");
  }

  return {
    overallScore,
    taskCompletion: Math.round(taskCompletion),
    stakeholderSignoff: Math.round(stakeholderSignoff),
    blockedTasks: [...new Set(blockedTasks)],
    criticalPathComplete,
    dayOneReady,
    riskFactors,
    assessedAt: new Date().toISOString(),
  };
}

export class OnboardingService {
  private state: OnboardingState;

  constructor(initialState?: OnboardingState) {
    this.state = initialState ?? {
      workflows: {},
      newHireIndex: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Create a new onboarding workflow
   * VAL-DEPT-PEOPLE-001
   */
  createOnboarding(params: CreateOnboardingParams): OnboardingWorkflow {
    const now = new Date().toISOString();
    const workflowId = generateId();

    // Build new hire profile - note that sensitive case flag specifics are stored
    // but privacy boundaries control what is exposed in reports
    const newHire: NewHireProfile = {
      id: workflowId,
      employeeId: params.employeeId,
      name: params.name,
      preferredName: params.preferredName,
      startDate: params.startDate,
      role: params.role,
      department: params.department,
      managerId: params.managerId,
      managerName: params.managerName,
      location: params.location,
      workType: params.workType,
      sensitiveCaseFlag: params.sensitiveCaseFlag ?? "none",
      notes: params.notes ?? [],
    };

    // Create default stakeholders, adding manager if provided
    const stakeholders = createDefaultStakeholders();
    if (params.managerId && params.managerName) {
      stakeholders["manager"] = {
        roleKey: "manager",
        title: "Direct Manager",
        name: params.managerName,
        responsibilities: [
          "Ensure role clarity and expectations",
          "Facilitate team introductions",
          "Provide ongoing support and feedback",
        ],
        status: "pending",
      };
    }

    // Create standard tasks
    const tasks = createStandardTasks(params.startDate);

    // Initial readiness assessment
    const initialWorkflow: OnboardingWorkflow = {
      id: workflowId,
      newHire,
      tasks,
      stakeholders,
      readiness: {
        overallScore: 0,
        taskCompletion: 0,
        stakeholderSignoff: 0,
        blockedTasks: [],
        criticalPathComplete: false,
        dayOneReady: false,
        riskFactors: ["Onboarding just created - readiness not yet assessed"],
        assessedAt: now,
      },
      status: "not-started",
      priority: "high",
      createdAt: now,
      updatedAt: now,
      privacyBoundary: {
        hideSensitiveNotes: true,
        hideSensitiveCaseFlag: true,
        restrictAccessToRoles: ["people-ops-lead", "people-onboarding-specialist", "people-reviewer"],
      },
      evidenceIds: [],
    };

    // Index by employee ID
    if (!this.state.newHireIndex[params.employeeId]) {
      this.state.newHireIndex[params.employeeId] = [];
    }
    this.state.newHireIndex[params.employeeId].push(workflowId);

    this.state.workflows[workflowId] = initialWorkflow;
    this.state.lastUpdated = now;

    return initialWorkflow;
  }

  /**
   * Get an onboarding workflow by ID
   */
  getWorkflow(workflowId: string): OnboardingWorkflow | undefined {
    return this.state.workflows[workflowId];
  }

  /**
   * Get workflows by employee ID
   */
  getWorkflowsByEmployee(employeeId: string): OnboardingWorkflow[] {
    const workflowIds = this.state.newHireIndex[employeeId] ?? [];
    return workflowIds.map((id) => this.state.workflows[id]).filter(Boolean);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): OnboardingWorkflow[] {
    return Object.values(this.state.workflows);
  }

  /**
   * Get workflows by status
   */
  getWorkflowsByStatus(status: OnboardingStatus): OnboardingWorkflow[] {
    return Object.values(this.state.workflows).filter((w) => w.status === status);
  }

  /**
   * Add a custom task to an onboarding workflow
   * VAL-DEPT-PEOPLE-001
   */
  addTask(workflowId: string, params: AddOnboardingTaskParams): OnboardingTask | undefined {
    const workflow = this.state.workflows[workflowId];
    if (!workflow) return undefined;

    const taskId = generateId();
    const task: OnboardingTask = {
      id: taskId,
      title: params.title,
      description: params.description,
      category: params.category,
      ownerRoleKey: params.ownerRoleKey,
      assignedTo: params.assignedTo,
      dueDay: params.dueDay,
      status: "pending",
      blockedBy: params.blockedBy ?? [],
      privacyLevel: params.privacyLevel ?? "standard",
      notes: [],
    };

    workflow.tasks[taskId] = task;
    workflow.updatedAt = new Date().toISOString();
    this.state.lastUpdated = workflow.updatedAt;

    return task;
  }

  /**
   * Update task status
   * VAL-DEPT-PEOPLE-001
   */
  updateTaskStatus(workflowId: string, params: UpdateTaskStatusParams): OnboardingTask | undefined {
    const workflow = this.state.workflows[workflowId];
    if (!workflow) return undefined;

    const task = workflow.tasks[params.taskId];
    if (!task) return undefined;

    task.status = params.status;
    if (params.completedAt) {
      task.completedAt = params.completedAt;
    }
    if (params.notes) {
      task.notes.push(...params.notes);
    }

    // Reassess readiness
    workflow.readiness = calculateReadiness(workflow);
    workflow.updatedAt = new Date().toISOString();

    // Update overall status
    if (workflow.readiness.dayOneReady && workflow.status !== "completed") {
      workflow.status = "ready-day-one";
    } else if (workflow.readiness.blockedTasks.length > 0 && workflow.status !== "completed") {
      workflow.status = "blocked";
    } else if (task.status !== "completed" && workflow.status !== "completed") {
      workflow.status = "in-progress";
    }

    this.state.lastUpdated = workflow.updatedAt;
    return task;
  }

  /**
   * Notify a stakeholder about onboarding progress
   * VAL-DEPT-PEOPLE-001
   */
  notifyStakeholder(workflowId: string, params: NotifyStakeholderParams): OnboardingStakeholder | undefined {
    const workflow = this.state.workflows[workflowId];
    if (!workflow) return undefined;

    const stakeholder = workflow.stakeholders[params.roleKey];
    if (!stakeholder) return undefined;

    const now = new Date().toISOString();
    stakeholder.notifiedAt = now;
    if (stakeholder.status === "pending") {
      stakeholder.status = "in-progress";
    }

    workflow.updatedAt = now;
    this.state.lastUpdated = now;

    return stakeholder;
  }

  /**
   * Complete stakeholder signoff
   * VAL-DEPT-PEOPLE-001
   */
  completeStakeholderSignoff(
    workflowId: string,
    params: CompleteStakeholderSignoffParams
  ): OnboardingStakeholder | undefined {
    const workflow = this.state.workflows[workflowId];
    if (!workflow) return undefined;

    const stakeholder = workflow.stakeholders[params.roleKey];
    if (!stakeholder) return undefined;

    const now = new Date().toISOString();
    stakeholder.status = "completed";
    stakeholder.completedAt = now;

    // Reassess readiness
    workflow.readiness = calculateReadiness(workflow);
    workflow.updatedAt = now;

    // If all stakeholders signed off, check for completion
    const allSignedOff = Object.values(workflow.stakeholders).every(
      (s) => s.status === "completed"
    );
    if (allSignedOff && workflow.readiness.taskCompletion >= 90) {
      workflow.status = "completed";
      workflow.completedAt = now;
    } else if (workflow.readiness.dayOneReady) {
      workflow.status = "ready-day-one";
    }

    this.state.lastUpdated = now;
    return stakeholder;
  }

  /**
   * Assess and update readiness for an onboarding workflow
   * VAL-DEPT-PEOPLE-001
   */
  assessReadiness(workflowId: string): OnboardingReadiness | undefined {
    const workflow = this.state.workflows[workflowId];
    if (!workflow) return undefined;

    workflow.readiness = calculateReadiness(workflow);
    workflow.updatedAt = new Date().toISOString();

    // Update status based on readiness
    if (workflow.status !== "completed") {
      if (workflow.readiness.dayOneReady) {
        workflow.status = "ready-day-one";
      } else if (workflow.readiness.blockedTasks.length > 0) {
        workflow.status = "blocked";
      } else if (workflow.readiness.taskCompletion > 0) {
        workflow.status = "in-progress";
      }
    }

    this.state.lastUpdated = workflow.updatedAt;
    return workflow.readiness;
  }

  /**
   * Get onboarding summary report
   * VAL-DEPT-PEOPLE-001
   */
  getSummary(params?: GetOnboardingSummaryParams): OnboardingSummary {
    let workflows = Object.values(this.state.workflows);

    // Apply filters
    if (params?.status) {
      workflows = workflows.filter((w) => w.status === params.status);
    }
    if (params?.managerId) {
      workflows = workflows.filter((w) => w.newHire.managerId === params.managerId);
    }
    if (params?.department) {
      workflows = workflows.filter((w) => w.newHire.department === params.department);
    }

    const inProgress = workflows.filter((w) => w.status === "in-progress").length;
    const dayOneReady = workflows.filter((w) => w.status === "ready-day-one").length;
    const blocked = workflows.filter((w) => w.status === "blocked").length;
    const readinessScores = workflows.map((w) => w.readiness.overallScore);
    const averageReadinessScore =
      readinessScores.length > 0
        ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length)
        : 0;

    // Identify critical blockers (workflows that are blocked)
    const criticalBlockers = workflows
      .filter((w) => w.status === "blocked")
      .map((w) => w.id);

    return {
      totalOnboardings: workflows.length,
      inProgress,
      dayOneReady,
      blocked,
      averageReadinessScore,
      criticalBlockers,
    };
  }

  /**
   * Generate a privacy-safe onboarding report
   * VAL-DEPT-PEOPLE-001: Preserves privacy boundaries for sensitive cases
   */
  generatePrivacySafeReport(workflowId: string, requestingRole: string): {
    workflowId: string;
    employeeName: string;
    startDate: string;
    role: string;
    department: string;
    status: OnboardingStatus;
    readinessScore: number;
    taskCompletion: number;
    dayOneReady: boolean;
    criticalBlockers: string[];
    // Sensitive fields are omitted based on privacy boundaries
  } | undefined {
    const workflow = this.state.workflows[workflowId];
    if (!workflow) return undefined;

    // Check if role is allowed to see full details
    const canSeeFullDetails = workflow.privacyBoundary.restrictAccessToRoles.includes(requestingRole);

    return {
      workflowId: workflow.id,
      employeeName: canSeeFullDetails ? workflow.newHire.name : "REDACTED",
      startDate: workflow.newHire.startDate,
      role: workflow.newHire.role,
      department: workflow.newHire.department,
      status: workflow.status,
      readinessScore: workflow.readiness.overallScore,
      taskCompletion: workflow.readiness.taskCompletion,
      dayOneReady: workflow.readiness.dayOneReady,
      criticalBlockers: workflow.readiness.blockedTasks,
      // SensitiveCaseFlag is NEVER exposed directly - only implied by blockers
    };
  }

  /**
   * Get current state for persistence
   */
  getState(): OnboardingState {
    return this.state;
  }

  /**
   * Load state from persistence
   */
  loadState(state: OnboardingState): void {
    this.state = state;
  }
}
