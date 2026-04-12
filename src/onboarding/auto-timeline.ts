/**
 * Auto-Timeline Generator for Onboarding
 * Dynamically generates onboarding task timelines based on role profile, department, and work type
 */

import type { OnboardingTask } from "../types/people.js";
import rolesData from "../data/roles.json";
import jobsData from "../data/jobs.json";

export type WorkType = "remote" | "hybrid" | "on-site";

export interface RoleProfile {
  role: string;
  department: string;
  workType: WorkType;
}

interface RoleDefinition {
  roleKey: string;
  title: string;
  roleType: "executive" | "manager" | "specialist" | "reviewer";
  layer: string;
  moduleScoped: boolean;
}

interface JobDefinition {
  jobKey: string;
  name: string;
  cadence: string;
  ownerRoleKey: string;
  projectKey: string;
  goalKey: string;
}

type TaskCategory = OnboardingTask["category"];

/**
 * Default task owner for onboarding tasks
 */
const DEFAULT_OWNER = "people-onboarding-specialist";

/**
 * Maps common department keywords to specific task additions
 */
const DEPARTMENT_TASK_MAP: Record<string, { category: TaskCategory; task: Omit<OnboardingTask, "id"> }[]> = {
  engineering: [
    {
      category: "workspace-setup",
      task: {
        title: "Set up development environment",
        description: "Configure IDE, tools, and access to required code repositories",
        category: "workspace-setup",
        ownerRoleKey: DEFAULT_OWNER,
        dueDay: 3,
        status: "pending",
        privacyLevel: "standard",
        notes: [],
      },
    },
    {
      category: "access",
      task: {
        title: "Grant repository access",
        description: "Add to required GitHub/GitLab organizations and relevant repos",
        category: "access",
        ownerRoleKey: DEFAULT_OWNER,
        dueDay: 1,
        status: "pending",
        privacyLevel: "sensitive",
        notes: [],
      },
    },
  ],
  sales: [
    {
      category: "access",
      task: {
        title: "Set up CRM access",
        description: "Grant access to Salesforce or company CRM system",
        category: "access",
        ownerRoleKey: DEFAULT_OWNER,
        dueDay: 1,
        status: "pending",
        privacyLevel: "sensitive",
        notes: [],
      },
    },
    {
      category: "training",
      task: {
        title: "Complete sales methodology training",
        description: "Learn company sales process and methodologies",
        category: "training",
        ownerRoleKey: DEFAULT_OWNER,
        dueDay: 5,
        status: "pending",
        privacyLevel: "standard",
        notes: [],
      },
    },
  ],
  people: [
    {
      category: "access",
      task: {
        title: "Set up HRIS access",
        description: "Grant access to human resources information system",
        category: "access",
        ownerRoleKey: DEFAULT_OWNER,
        dueDay: 1,
        status: "pending",
        privacyLevel: "sensitive",
        notes: [],
      },
    },
  ],
};

/**
 * Tasks for remote workers
 */
const REMOTE_SPECIFIC_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Set up VPN access",
    description: "Install and configure VPN for secure remote connectivity",
    category: "access",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Test video conferencing setup",
    description: "Verify camera, microphone, and audio are working for remote meetings",
    category: "workspace-setup",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Virtual team introductions",
    description: "Schedule and conduct virtual introductions with team members",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 2,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Review remote work policy",
    description: "Read and acknowledge remote work guidelines and expectations",
    category: "compliance",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
];

/**
 * Tasks for on-site workers
 */
const ONSITE_SPECIFIC_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Collect building access badge",
    description: "Obtain security badge and building access credentials",
    category: "workspace-setup",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
  {
    title: "Workspace orientation",
    description: "Tour of office layout, break rooms, and facilities",
    category: "workspace-setup",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Meet facilities coordinator",
    description: "Introduction to facilities contact for workspace needs",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
];

/**
 * Tasks for hybrid workers (combination)
 */
const HYBRID_SPECIFIC_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Configure remote access tools",
    description: "Set up VPN and verify ability to work remotely when needed",
    category: "workspace-setup",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Review hybrid work policy",
    description: "Understand expectations for in-office and remote days",
    category: "compliance",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
];

/**
 * Executive-specific onboarding tasks
 */
const EXECUTIVE_SPECIFIC_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Executive onboarding briefing",
    description: "Comprehensive briefing with executive team on company strategy and direction",
    category: "introduction",
    ownerRoleKey: "people-ops-lead",
    dueDay: 1,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Board meeting preparation",
    description: "Prepare for first board meeting if applicable",
    category: "documentation",
    ownerRoleKey: "people-ops-lead",
    dueDay: 10,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
  {
    title: "Strategic stakeholder introductions",
    description: "Meet with key external stakeholders and partners",
    category: "introduction",
    ownerRoleKey: "people-ops-lead",
    dueDay: 5,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Executive benefits orientation",
    description: "Review executive compensation package and benefits",
    category: "benefits",
    ownerRoleKey: "people-ops-lead",
    dueDay: 1,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
];

/**
 * Manager-specific onboarding tasks
 */
const MANAGER_SPECIFIC_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Leadership orientation",
    description: "Meet with HR to discuss team management responsibilities and expectations",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 2,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Review team structure",
    description: "Understand team composition, roles, and reporting relationships",
    category: "documentation",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 3,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Manager toolkit training",
    description: "Complete training on performance management, hiring, and team tools",
    category: "training",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 5,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
];

/**
 * Specialist/Individual contributor-specific tasks
 */
const SPECIALIST_SPECIFIC_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Role-specific tools setup",
    description: "Configure tools and access specific to your role",
    category: "workspace-setup",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 2,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Shadow team members",
    description: "Spend time shadowing peers to understand day-to-day work",
    category: "training",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 5,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
];

/**
 * Reviewer-specific tasks
 */
const REVIEWER_SPECIFIC_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Review methodology training",
    description: "Learn the review and approval processes",
    category: "training",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 3,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Review tooling access",
    description: "Set up access to review queues and approval systems",
    category: "access",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
];

/**
 * Core tasks that apply to all new hires - Day 0
 */
const CORE_DAY0_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Send welcome email",
    description: "Send welcome email with first-day instructions and schedule",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Create corporate accounts",
    description: "Create email, Slack, and necessary system accounts",
    category: "access",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
  {
    title: "Complete I-9 verification",
    description: "Employment eligibility verification",
    category: "compliance",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 0,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
];

/**
 * Core tasks that apply to all new hires - Day 1
 */
const CORE_DAY1_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "First-day orientation",
    description: "Company overview, policies, and administrative procedures",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Benefits enrollment",
    description: "Enroll in health, dental, vision, and 401k benefits",
    category: "benefits",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    blockedBy: ["complete-i9-verification"],
    privacyLevel: "sensitive",
    notes: [],
  },
  {
    title: "Security awareness training",
    description: "Complete required security awareness training",
    category: "training",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Meet with direct manager",
    description: "Initial 1:1 to discuss role expectations and get oriented",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Complete tax forms",
    description: "W-4 and state tax withholding forms",
    category: "compliance",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 1,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
];

/**
 * Core tasks that apply to all new hires - Day 2-5
 */
const CORE_DAY2TO5_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Complete compliance training",
    description: "Finish all required compliance and policy training modules",
    category: "training",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 5,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Review team documentation",
    description: "Read team wiki, processes, and ongoing projects",
    category: "documentation",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 5,
    status: "pending",
    blockedBy: ["create-corporate-accounts"],
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Meet key stakeholders",
    description: "Introductions with cross-functional partners",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 5,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
];

/**
 * Core tasks that apply to all new hires - Day 6-10
 */
const CORE_DAY6TO10_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Complete role-specific training",
    description: "Finish required training modules for your specific role",
    category: "training",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 10,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "30-day goals discussion",
    description: "Discuss and align on 30-day probation goals with manager",
    category: "introduction",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 10,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
];

/**
 * Core tasks that apply to all new hires - Day 11-30
 */
const CORE_DAY11TO30_TASKS: Omit<OnboardingTask, "id">[] = [
  {
    title: "Complete first major project milestone",
    description: "Demonstrate competence by completing initial work deliverables",
    category: "training",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 30,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "30-day check-in with HR",
    description: "HR review of onboarding experience and any outstanding issues",
    category: "introduction",
    ownerRoleKey: "people-ops-lead",
    dueDay: 30,
    status: "pending",
    privacyLevel: "standard",
    notes: [],
  },
  {
    title: "Probationary period documentation",
    description: "Complete all required probationary period paperwork",
    category: "compliance",
    ownerRoleKey: DEFAULT_OWNER,
    dueDay: 30,
    status: "pending",
    privacyLevel: "sensitive",
    notes: [],
  },
];

/**
 * AutoTimelineGenerator
 * Dynamically generates onboarding task timelines based on role profile
 */
export class AutoTimelineGenerator {
  private roles: RoleDefinition[];
  private jobs: JobDefinition[];

  constructor() {
    this.roles = rolesData as RoleDefinition[];
    this.jobs = jobsData as JobDefinition[];
  }

  /**
   * Find role definition by role key
   */
  private findRoleDefinition(roleKey: string): RoleDefinition | undefined {
    return this.roles.find((r) => r.roleKey === roleKey);
  }

  /**
   * Find role type from role key or department context
   */
  private inferRoleType(roleProfile: RoleProfile): "executive" | "manager" | "specialist" | "reviewer" {
    // First try to find in roles.json
    const roleDef = this.findRoleDefinition(roleProfile.role);
    if (roleDef?.roleType) {
      return roleDef.roleType;
    }

    // Infer from role title/keywords
    const roleLower = roleProfile.role.toLowerCase();
    if (
      roleLower.includes("chief") ||
      roleLower.includes("vp") ||
      roleLower.includes("director") ||
      roleLower.includes("executive")
    ) {
      return "executive";
    }
    if (roleLower.includes("manager") || roleLower.includes("lead")) {
      return "manager";
    }
    if (roleLower.includes("reviewer") || roleLower.includes("audit")) {
      return "reviewer";
    }
    return "specialist";
  }

  /**
   * Get department-specific tasks based on department keyword matching
   */
  private getDepartmentTasks(department: string): Omit<OnboardingTask, "id">[] {
    const deptLower = department.toLowerCase();
    const tasks: Omit<OnboardingTask, "id">[] = [];

    for (const [deptKey, deptTasks] of Object.entries(DEPARTMENT_TASK_MAP)) {
      if (deptLower.includes(deptKey)) {
        tasks.push(...deptTasks.map((t) => t.task));
      }
    }

    return tasks;
  }

  /**
   * Get work-type specific tasks
   */
  private getWorkTypeTasks(workType: WorkType): Omit<OnboardingTask, "id">[] {
    switch (workType) {
      case "remote":
        return REMOTE_SPECIFIC_TASKS;
      case "on-site":
        return ONSITE_SPECIFIC_TASKS;
      case "hybrid":
        return HYBRID_SPECIFIC_TASKS;
      default:
        return [];
    }
  }

  /**
   * Get role-type specific tasks
   */
  private getRoleTypeTasks(
    roleType: "executive" | "manager" | "specialist" | "reviewer"
  ): Omit<OnboardingTask, "id">[] {
    switch (roleType) {
      case "executive":
        return EXECUTIVE_SPECIFIC_TASKS;
      case "manager":
        return MANAGER_SPECIFIC_TASKS;
      case "specialist":
        return SPECIALIST_SPECIFIC_TASKS;
      case "reviewer":
        return REVIEWER_SPECIFIC_TASKS;
      default:
        return [];
    }
  }

  /**
   * Normalize task ID for blockedBy references
   */
  private normalizeTaskId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30);
  }

  /**
   * Update blockedBy references to use normalized task IDs
   */
  private updateBlockedBy(
    task: Omit<OnboardingTask, "id">,
    allTasks: Omit<OnboardingTask, "id">[]
  ): Omit<OnboardingTask, "id"> {
    if (!task.blockedBy || task.blockedBy.length === 0) {
      return task;
    }

    const updatedBlockedBy = task.blockedBy.map((blockedId) => {
      // Check if it's already a normalized ID
      const found = allTasks.find((t) => this.normalizeTaskId(t.title) === blockedId);
      if (found) return blockedId;

      // Try to find by original title
      const foundByTitle = allTasks.find(
        (t) => t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30) === blockedId
      );
      return foundByTitle ? this.normalizeTaskId(foundByTitle.title) : blockedId;
    });

    return { ...task, blockedBy: updatedBlockedBy };
  }

  /**
   * Generate onboarding timeline tasks from a role profile
   * @param roleProfile - The role profile containing role, department, and work type
   * @returns Array of onboarding tasks (without IDs - IDs are assigned by OnboardingService.addTask)
   */
  generateFromRole(roleProfile: RoleProfile): Omit<OnboardingTask, "id">[] {
    const roleType = this.inferRoleType(roleProfile);
    const workType = roleProfile.workType;

    // Collect all tasks
    const allTasks: Omit<OnboardingTask, "id">[] = [];

    // Add core tasks by time period
    allTasks.push(...CORE_DAY0_TASKS);
    allTasks.push(...CORE_DAY1_TASKS);
    allTasks.push(...CORE_DAY2TO5_TASKS);
    allTasks.push(...CORE_DAY6TO10_TASKS);
    allTasks.push(...CORE_DAY11TO30_TASKS);

    // Add work-type specific tasks
    allTasks.push(...this.getWorkTypeTasks(workType));

    // Add role-type specific tasks
    allTasks.push(...this.getRoleTypeTasks(roleType));

    // Add department-specific tasks
    allTasks.push(...this.getDepartmentTasks(roleProfile.department));

    // Normalize task IDs and update blockedBy references
    const normalizedTasks: Omit<OnboardingTask, "id">[] = [];
    for (const task of allTasks) {
      // Update blockedBy to use normalized IDs
      const updatedTask = this.updateBlockedBy(task, normalizedTasks);
      normalizedTasks.push(updatedTask);
    }

    // Sort by dueDay for consistent ordering
    normalizedTasks.sort((a, b) => a.dueDay - b.dueDay);

    return normalizedTasks;
  }

  /**
   * Generate a timeline summary showing task distribution by day
   */
  generateTimelineSummary(tasks: Omit<OnboardingTask, "id">[]): Record<number, number> {
    const summary: Record<number, number> = {};
    for (const task of tasks) {
      summary[task.dueDay] = (summary[task.dueDay] || 0) + 1;
    }
    return summary;
  }
}

// Default instance for convenience
export const autoTimelineGenerator = new AutoTimelineGenerator();
