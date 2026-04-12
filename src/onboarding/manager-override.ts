/**
 * Manager Override Service for Onboarding
 * Provides manager override capabilities for task assignment, timeline adjustments,
 * and audit trail logging for all override operations.
 */

import type {
  OnboardingWorkflow,
  OnboardingTask,
  NewHireProfile,
} from "../types/people.js";

/**
 * Override audit entry for tracking all manager override operations
 */
export interface OverrideAuditEntry {
  id: string;
  workflowId: string;
  taskId?: string;
  action: "assign" | "skip" | "timeline" | "add" | "remove" | "update";
  actorRole: string;
  reason: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

/**
 * Parameters for assigning a task to a different person
 */
export interface AssignTaskParams {
  taskId: string;
  assignee: string;
}

/**
 * Parameters for skipping a task
 */
export interface SkipTaskParams {
  taskId: string;
  reason: string;
}

/**
 * Parameters for adjusting task timeline
 */
export interface AdjustTimelineParams {
  taskId: string;
  newDueDay: number;
}

/**
 * Parameters for adding a custom task
 */
export interface AddCustomTaskParams {
  title: string;
  description: string;
  category: OnboardingTask["category"];
  ownerRoleKey: string;
  assignedTo?: string;
  dueDay: number;
  blockedBy?: string[];
  privacyLevel?: "standard" | "sensitive";
}

/**
 * Parameters for removing a task
 */
export interface RemoveTaskParams {
  taskId: string;
  reason: string;
}

/**
 * Parameters for updating a task
 */
export interface UpdateTaskParams {
  taskId: string;
  updates: Partial<Pick<OnboardingTask, "title" | "description" | "category" | "assignedTo" | "dueDay" | "privacyLevel" | "notes">>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export class ManagerOverrideService {
  private auditLog: Map<string, OverrideAuditEntry[]>;
  private workflows: Map<string, OnboardingWorkflow>;

  constructor(workflows: Map<string, OnboardingWorkflow>) {
    this.auditLog = new Map();
    this.workflows = workflows;
  }

  /**
   * Update the workflows reference (for integration with OnboardingService)
   */
  setWorkflows(workflows: Map<string, OnboardingWorkflow>): void {
    this.workflows = workflows;
  }

  /**
   * Create an audit entry for an override action
   */
  private createAuditEntry(
    workflowId: string,
    action: OverrideAuditEntry["action"],
    actorRole: string,
    reason: string,
    taskId?: string,
    previousValue?: string,
    newValue?: string
  ): OverrideAuditEntry {
    const entry: OverrideAuditEntry = {
      id: generateId(),
      workflowId,
      taskId,
      action,
      actorRole,
      reason,
      previousValue,
      newValue,
      timestamp: new Date().toISOString(),
    };

    // Store in audit log
    if (!this.auditLog.has(workflowId)) {
      this.auditLog.set(workflowId, []);
    }
    this.auditLog.get(workflowId)!.push(entry);

    return entry;
  }

  /**
   * Assign a task to a different person
   * VAL-DEPT-PEOPLE-001: Manager override for task reassignment
   */
  assignTask(
    workflowId: string,
    taskId: string,
    assignee: string,
    actorRole: string = "manager"
  ): OnboardingTask | undefined {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    const task = workflow.tasks[taskId];
    if (!task) return undefined;

    const previousAssignee = task.assignedTo ?? "unassigned";
    task.assignedTo = assignee;

    // Create audit entry
    this.createAuditEntry(
      workflowId,
      "assign",
      actorRole,
      `Task reassigned to ${assignee}`,
      taskId,
      previousAssignee,
      assignee
    );

    // Update workflow timestamp
    workflow.updatedAt = new Date().toISOString();

    return task;
  }

  /**
   * Skip a task with a required reason
   * VAL-DEPT-PEOPLE-001: Manager override to skip tasks with audit trail
   */
  skipTask(
    workflowId: string,
    taskId: string,
    reason: string,
    actorRole: string = "manager"
  ): OnboardingTask | undefined {
    if (!reason || reason.trim().length === 0) {
      throw new Error("Skip reason is required");
    }

    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    const task = workflow.tasks[taskId];
    if (!task) return undefined;

    const previousStatus = task.status;
    task.status = "skipped";

    // Create audit entry
    this.createAuditEntry(
      workflowId,
      "skip",
      actorRole,
      reason,
      taskId,
      previousStatus,
      "skipped"
    );

    // Update workflow timestamp
    workflow.updatedAt = new Date().toISOString();

    return task;
  }

  /**
   * Adjust the timeline for a task (change due day)
   * VAL-DEPT-PEOPLE-001: Manager override for timeline adjustments
   */
  adjustTimeline(
    workflowId: string,
    taskId: string,
    newDueDay: number,
    actorRole: string = "manager"
  ): OnboardingTask | undefined {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    const task = workflow.tasks[taskId];
    if (!task) return undefined;

    const previousDueDay = task.dueDay;
    task.dueDay = newDueDay;

    // Create audit entry
    this.createAuditEntry(
      workflowId,
      "timeline",
      actorRole,
      `Timeline adjusted from day ${previousDueDay} to day ${newDueDay}`,
      taskId,
      String(previousDueDay),
      String(newDueDay)
    );

    // Update workflow timestamp
    workflow.updatedAt = new Date().toISOString();

    return task;
  }

  /**
   * Add a custom task outside the standard template
   * VAL-DEPT-PEOPLE-001: Manager override to add custom tasks
   */
  addCustomTask(
    workflowId: string,
    params: AddCustomTaskParams,
    actorRole: string = "manager"
  ): OnboardingTask | undefined {
    const workflow = this.workflows.get(workflowId);
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

    // Create audit entry
    this.createAuditEntry(
      workflowId,
      "add",
      actorRole,
      `Custom task added: ${params.title}`,
      taskId,
      undefined,
      JSON.stringify({ title: params.title, dueDay: params.dueDay, category: params.category })
    );

    // Update workflow timestamp
    workflow.updatedAt = new Date().toISOString();

    return task;
  }

  /**
   * Remove a task with a required reason
   * VAL-DEPT-PEOPLE-001: Manager override to remove tasks with audit trail
   */
  removeTask(
    workflowId: string,
    taskId: string,
    reason: string,
    actorRole: string = "manager"
  ): boolean {
    if (!reason || reason.trim().length === 0) {
      throw new Error("Remove reason is required");
    }

    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const task = workflow.tasks[taskId];
    if (!task) return false;

    // Create audit entry before removing
    this.createAuditEntry(
      workflowId,
      "remove",
      actorRole,
      reason,
      taskId,
      JSON.stringify(task),
      undefined
    );

    // Remove the task
    delete workflow.tasks[taskId];

    // Update workflow timestamp
    workflow.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Update task fields
   * VAL-DEPT-PEOPLE-001: Manager override to update task details
   */
  updateTask(
    workflowId: string,
    taskId: string,
    params: UpdateTaskParams,
    actorRole: string = "manager"
  ): OnboardingTask | undefined {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    const task = workflow.tasks[taskId];
    if (!task) return undefined;

    // Track changes for audit
    const changes: string[] = [];

    // Apply updates
    if (params.updates.title !== undefined && params.updates.title !== task.title) {
      changes.push(`title: "${task.title}" -> "${params.updates.title}"`);
      task.title = params.updates.title;
    }
    if (params.updates.description !== undefined && params.updates.description !== task.description) {
      changes.push(`description: "${task.description}" -> "${params.updates.description}"`);
      task.description = params.updates.description;
    }
    if (params.updates.category !== undefined && params.updates.category !== task.category) {
      changes.push(`category: "${task.category}" -> "${params.updates.category}"`);
      task.category = params.updates.category;
    }
    if (params.updates.assignedTo !== undefined && params.updates.assignedTo !== task.assignedTo) {
      changes.push(`assignedTo: "${task.assignedTo ?? "unassigned"}" -> "${params.updates.assignedTo}"`);
      task.assignedTo = params.updates.assignedTo;
    }
    if (params.updates.dueDay !== undefined && params.updates.dueDay !== task.dueDay) {
      changes.push(`dueDay: ${task.dueDay} -> ${params.updates.dueDay}`);
      task.dueDay = params.updates.dueDay;
    }
    if (params.updates.privacyLevel !== undefined && params.updates.privacyLevel !== task.privacyLevel) {
      changes.push(`privacyLevel: "${task.privacyLevel}" -> "${params.updates.privacyLevel}"`);
      task.privacyLevel = params.updates.privacyLevel;
    }
    if (params.updates.notes !== undefined) {
      task.notes = [...task.notes, ...params.updates.notes];
      changes.push(`added ${params.updates.notes.length} note(s)`);
    }

    // Create audit entry if there were changes
    if (changes.length > 0) {
      this.createAuditEntry(
        workflowId,
        "update",
        actorRole,
        `Task updated: ${changes.join("; ")}`,
        taskId,
        undefined,
        changes.join("; ")
      );

      // Update workflow timestamp
      workflow.updatedAt = new Date().toISOString();
    }

    return task;
  }

  /**
   * Get the audit log for a workflow
   * VAL-DEPT-PEOPLE-001: Audit trail retrieval
   */
  getAuditLog(workflowId: string): OverrideAuditEntry[] {
    return this.auditLog.get(workflowId) ?? [];
  }

  /**
   * Get all audit entries across all workflows
   */
  getAllAuditEntries(): Map<string, OverrideAuditEntry[]> {
    return new Map(this.auditLog);
  }
}
