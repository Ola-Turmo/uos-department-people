/**
 * Onboarding Completion Predictor
 * Predicts day-one readiness probability and identifies at-risk factors
 */

import type { OnboardingWorkflow, OnboardingTask } from "../types/people.js";

export interface AtRiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  description: string;
}

export interface PredictionResult {
  dayOneReadinessProbability: number; // 0-100
  estimatedCompletionDay: number; // estimated day number when 100% complete
  riskLevel: "low" | "medium" | "high" | "critical";
  atRiskFactors: AtRiskFactor[];
  confidence: "high" | "medium" | "low"; // how confident is this prediction
  blockers: string[]; // task IDs that are blocking completion
  recommendedActions: string[]; // what should be done to improve readiness
}

interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  blockedTasks: string[];
  taskCompletionRate: number;
  blockedRatio: number;
}

interface StakeholderMetrics {
  totalStakeholders: number;
  signedOffStakeholders: number;
  stakeholderSignoffRate: number;
}

export class CompletionPredictor {
  /**
   * Predict onboarding completion probability for a workflow
   */
  predict(workflow: OnboardingWorkflow): PredictionResult {
    const taskMetrics = this.calculateTaskMetrics(workflow);
    const stakeholderMetrics = this.calculateStakeholderMetrics(workflow);
    const daysUntilStart = this.calculateDaysUntilStart(workflow);
    const isStartSoon = daysUntilStart <= 3 && daysUntilStart >= 0;

    // Calculate base score using the algorithm
    const baseScore = this.calculateBaseScore(taskMetrics, stakeholderMetrics);

    // Apply urgency multiplier if start date is soon
    const urgencyMultiplier = this.calculateUrgencyMultiplier(
      baseScore,
      isStartSoon,
      taskMetrics.taskCompletionRate
    );

    // Calculate day-one readiness probability
    const dayOneReadinessProbability = Math.min(
      100,
      Math.max(0, Math.round(baseScore * urgencyMultiplier))
    );

    // Identify at-risk factors
    const atRiskFactors = this.identifyAtRiskFactors(
      workflow,
      taskMetrics,
      stakeholderMetrics,
      isStartSoon
    );

    // Determine overall risk level
    const riskLevel = this.determineRiskLevel(atRiskFactors, isStartSoon, taskMetrics.taskCompletionRate);

    // Calculate confidence based on at-risk factors
    const confidence = this.calculateConfidence(atRiskFactors, taskMetrics);

    // Get blocker task IDs
    const blockers = this.getBlockerTaskIds(workflow, taskMetrics);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendations(
      workflow,
      atRiskFactors,
      taskMetrics,
      stakeholderMetrics
    );

    // Estimate completion day
    const estimatedCompletionDay = this.estimateCompletionDay(
      workflow,
      taskMetrics,
      dayOneReadinessProbability
    );

    return {
      dayOneReadinessProbability,
      estimatedCompletionDay,
      riskLevel,
      atRiskFactors,
      confidence,
      blockers,
      recommendedActions,
    };
  }

  private calculateTaskMetrics(workflow: OnboardingWorkflow): TaskMetrics {
    const tasks = Object.values(workflow.tasks);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const pendingTasks = totalTasks - completedTasks;

    // Find blocked tasks (pending tasks that have incomplete blockers)
    const blockedTasks: string[] = [];
    for (const task of tasks) {
      if (task.status === "pending" && task.blockedBy && task.blockedBy.length > 0) {
        const allBlockersComplete = task.blockedBy.every((blockerId) => {
          const blocker = workflow.tasks[blockerId];
          return blocker && blocker.status === "completed";
        });
        if (!allBlockersComplete) {
          blockedTasks.push(task.id);
        }
      }
    }

    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const blockedRatio = pendingTasks > 0 ? blockedTasks.length / pendingTasks : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      blockedTasks,
      taskCompletionRate,
      blockedRatio,
    };
  }

  private calculateStakeholderMetrics(workflow: OnboardingWorkflow): StakeholderMetrics {
    const stakeholders = Object.values(workflow.stakeholders);
    const totalStakeholders = stakeholders.length;
    const signedOffStakeholders = stakeholders.filter((s) => s.status === "completed").length;
    const stakeholderSignoffRate = totalStakeholders > 0
      ? (signedOffStakeholders / totalStakeholders) * 100
      : 0;

    return {
      totalStakeholders,
      signedOffStakeholders,
      stakeholderSignoffRate,
    };
  }

  private calculateDaysUntilStart(workflow: OnboardingWorkflow): number {
    const startDate = new Date(workflow.newHire.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    const diffTime = startDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateBaseScore(taskMetrics: TaskMetrics, stakeholderMetrics: StakeholderMetrics): number {
    // Base score = taskCompletion% * 0.5 + stakeholderSignoff% * 0.3 + (1 - blockedRatio) * 0.2
    const taskComponent = taskMetrics.taskCompletionRate * 0.5;
    const stakeholderComponent = stakeholderMetrics.stakeholderSignoffRate * 0.3;
    const blockedComponent = (1 - taskMetrics.blockedRatio) * 20; // Scale to 0-20

    return taskComponent + stakeholderComponent + blockedComponent;
  }

  private calculateUrgencyMultiplier(
    baseScore: number,
    isStartSoon: boolean,
    taskCompletionRate: number
  ): number {
    if (!isStartSoon) return 1.0;

    // If start is soon and completion is low, apply urgency penalty
    if (taskCompletionRate < 50) {
      return 0.5; // Critical urgency - severe reduction
    } else if (taskCompletionRate < 70) {
      return 0.7; // Moderate urgency
    } else if (taskCompletionRate < 90) {
      return 0.85; // Mild urgency
    }
    return 1.0;
  }

  private identifyAtRiskFactors(
    workflow: OnboardingWorkflow,
    taskMetrics: TaskMetrics,
    stakeholderMetrics: StakeholderMetrics,
    isStartSoon: boolean
  ): AtRiskFactor[] {
    const factors: AtRiskFactor[] = [];

    // Low completion rate (< 50%) → high risk
    if (taskMetrics.taskCompletionRate < 50) {
      factors.push({
        factor: "Low completion rate",
        severity: "high",
        description: `Only ${taskMetrics.completedTasks}/${taskMetrics.totalTasks} tasks completed (${Math.round(taskMetrics.taskCompletionRate)}%)`,
      });
    } else if (taskMetrics.taskCompletionRate < 70) {
      factors.push({
        factor: "Below target completion",
        severity: "medium",
        description: `${Math.round(taskMetrics.taskCompletionRate)}% tasks completed - below optimal threshold`,
      });
    }

    // Many blocked tasks (3+) → high risk
    if (taskMetrics.blockedTasks.length >= 3) {
      factors.push({
        factor: "Multiple blocked tasks",
        severity: "high",
        description: `${taskMetrics.blockedTasks.length} tasks are blocked by incomplete dependencies`,
      });
    } else if (taskMetrics.blockedTasks.length > 0) {
      factors.push({
        factor: "Blocked tasks present",
        severity: "medium",
        description: `${taskMetrics.blockedTasks.length} task(s) cannot proceed due to blocking dependencies`,
      });
    }

    // No manager assigned → medium risk
    if (!workflow.newHire.managerId) {
      factors.push({
        factor: "No manager assigned",
        severity: "medium",
        description: "New hire has no manager assigned - key introductions and support may be delayed",
      });
    }

    // Start date within 3 days and tasks < 50% → critical risk
    if (isStartSoon && taskMetrics.taskCompletionRate < 50) {
      factors.push({
        factor: "Critical time crunch",
        severity: "high",
        description: "Start date within 3 days but less than 50% of tasks completed",
      });
    } else if (isStartSoon && taskMetrics.taskCompletionRate < 70) {
      factors.push({
        factor: "Tight timeline",
        severity: "medium",
        description: "Start date approaching with incomplete tasks",
      });
    }

    // Low stakeholder signoff → medium risk
    if (stakeholderMetrics.stakeholderSignoffRate < 50) {
      factors.push({
        factor: "Low stakeholder signoff",
        severity: "medium",
        description: `Only ${stakeholderMetrics.signedOffStakeholders}/${stakeholderMetrics.totalStakeholders} stakeholders have signed off`,
      });
    }

    // Sensitive case flag - add risk
    if (workflow.newHire.sensitiveCaseFlag !== "none") {
      factors.push({
        factor: "Sensitive case flag",
        severity: "medium",
        description: `Sensitive case flag (${workflow.newHire.sensitiveCaseFlag}) may require additional attention`,
      });
    }

    return factors;
  }

  private determineRiskLevel(
    atRiskFactors: AtRiskFactor[],
    isStartSoon: boolean,
    taskCompletionRate: number
  ): "low" | "medium" | "high" | "critical" {
    // Check for critical: start soon + < 50% completion
    if (isStartSoon && taskCompletionRate < 50) {
      return "critical";
    }

    // Check for high severity factors
    const highSeverityCount = atRiskFactors.filter((f) => f.severity === "high").length;
    if (highSeverityCount >= 2) {
      return "high";
    }
    if (highSeverityCount >= 1) {
      return "high";
    }

    // Check for medium severity
    const mediumSeverityCount = atRiskFactors.filter((f) => f.severity === "medium").length;
    if (mediumSeverityCount >= 3) {
      return "high";
    }
    if (mediumSeverityCount >= 1) {
      return "medium";
    }

    return "low";
  }

  private calculateConfidence(
    atRiskFactors: AtRiskFactor[],
    taskMetrics: TaskMetrics
  ): "high" | "medium" | "low" {
    const highSeverityCount = atRiskFactors.filter((f) => f.severity === "high").length;
    const mediumSeverityCount = atRiskFactors.filter((f) => f.severity === "medium").length;

    // Low confidence if many at-risk factors
    if (highSeverityCount >= 2 || mediumSeverityCount >= 4) {
      return "low";
    }

    // Medium confidence if some at-risk factors
    if (highSeverityCount >= 1 || mediumSeverityCount >= 2) {
      return "medium";
    }

    // High confidence if few/no at-risk factors
    return "high";
  }

  private getBlockerTaskIds(workflow: OnboardingWorkflow, taskMetrics: TaskMetrics): string[] {
    // Return the task IDs that are blocking completion
    return taskMetrics.blockedTasks;
  }

  private generateRecommendations(
    workflow: OnboardingWorkflow,
    atRiskFactors: AtRiskFactor[],
    taskMetrics: TaskMetrics,
    stakeholderMetrics: StakeholderMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Address low completion
    if (taskMetrics.taskCompletionRate < 70) {
      recommendations.push("Prioritize completing critical path tasks (due day 0-1)");
    }

    // Address blocked tasks
    if (taskMetrics.blockedTasks.length > 0) {
      recommendations.push("Unblock dependency chain - complete blocking tasks first");
    }

    // Address no manager
    if (!workflow.newHire.managerId) {
      recommendations.push("Assign a manager immediately to enable team introductions");
    }

    // Address low stakeholder signoff
    if (stakeholderMetrics.stakeholderSignoffRate < 70) {
      recommendations.push("Follow up with pending stakeholders to get signoffs");
    }

    // Address sensitive case
    if (workflow.newHire.sensitiveCaseFlag !== "none") {
      recommendations.push("Coordinate with People Ops on sensitive case handling");
    }

    // General recommendation if low probability
    if (taskMetrics.taskCompletionRate < 50) {
      recommendations.push("Escalate to People Ops Lead for intervention");
    }

    return recommendations;
  }

  private estimateCompletionDay(
    workflow: OnboardingWorkflow,
    taskMetrics: TaskMetrics,
    dayOneReadinessProbability: number
  ): number {
    if (dayOneReadinessProbability >= 100) {
      return 1; // Ready by day 1
    }

    if (dayOneReadinessProbability >= 80) {
      return 2; // Likely day 2
    }

    if (dayOneReadinessProbability >= 60) {
      return 3; // Likely day 3
    }

    if (dayOneReadinessProbability >= 40) {
      return 5; // Likely end of first week
    }

    // Find the latest due day among incomplete tasks
    const incompleteTasks = Object.values(workflow.tasks).filter(
      (t) => t.status !== "completed" && t.status !== "skipped"
    );

    if (incompleteTasks.length === 0) {
      return 1;
    }

    const latestDueDay = Math.max(...incompleteTasks.map((t) => t.dueDay));
    return Math.max(latestDueDay, 5); // At least 5 days if there are pending tasks
  }
}
