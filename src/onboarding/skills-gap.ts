/**
 * Skills Gap Analyzer for Onboarding
 * Dynamic skills assessment against role requirements
 */

import type { SkillsGapReport, LearningModule } from "../types/people.js";

// ============================================
// Proficiency Level Definitions
// ============================================

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";

const PROFICIENCY_ORDER: Record<ProficiencyLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
};

const LEVEL_LABELS: Record<ProficiencyLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

// ============================================
// In-Memory Skills Taxonomy
// ============================================

export interface SkillDefinition {
  skillId: string;
  name: string;
  category: "communication" | "leadership" | "technical" | "domain" | "tools" | "compliance";
  description: string;
  defaultHours: number; // Estimated learning time
}

const SKILLS_TAXONOMY: SkillDefinition[] = [
  // Communication Skills
  { skillId: "comm-written", name: "Written Communication", category: "communication", description: "Clear written expression for emails, docs, reports", defaultHours: 8 },
  { skillId: "comm-verbal", name: "Verbal Communication", category: "communication", description: "Effective spoken communication in meetings", defaultHours: 6 },
  { skillId: "comm-presenting", name: "Presentation Skills", category: "communication", description: "Delivering presentations to groups", defaultHours: 12 },
  { skillId: "comm-active-listening", name: "Active Listening", category: "communication", description: "Focused listening and understanding", defaultHours: 4 },
  { skillId: "comm-feedback", name: "Giving & Receiving Feedback", category: "communication", description: "Constructive feedback delivery and reception", defaultHours: 6 },

  // Leadership Skills
  { skillId: "lead-coaching", name: "Coaching & Mentoring", category: "leadership", description: "Developing others through guidance", defaultHours: 16 },
  { skillId: "lead-decision", name: "Decision Making", category: "leadership", description: "Structured decision analysis and execution", defaultHours: 10 },
  { skillId: "lead-delegation", name: "Delegation", category: "leadership", description: "Assigning work appropriately", defaultHours: 4 },
  { skillId: "lead-conflict", name: "Conflict Resolution", category: "leadership", description: "Managing and resolving disagreements", defaultHours: 8 },
  { skillId: "lead-strategic", name: "Strategic Thinking", category: "leadership", description: "Long-term planning and vision setting", defaultHours: 20 },

  // Technical Skills
  { skillId: "tech-data-analysis", name: "Data Analysis", category: "technical", description: "Analyzing datasets to derive insights", defaultHours: 24 },
  { skillId: "tech-sql", name: "SQL & Databases", category: "technical", description: "Database querying and management", defaultHours: 16 },
  { skillId: "tech-programming", name: "Programming Fundamentals", category: "technical", description: "Basic programming concepts", defaultHours: 40 },
  { skillId: "tech-api", name: "API Integration", category: "technical", description: "Working with APIs and web services", defaultHours: 12 },
  { skillId: "tech-version-control", name: "Version Control (Git)", category: "technical", description: "Code versioning and collaboration", defaultHours: 8 },
  { skillId: "tech-testing", name: "Testing & QA", category: "technical", description: "Quality assurance and testing methodologies", defaultHours: 12 },

  // Domain Skills (People/HR)
  { skillId: "domain-hr-policy", name: "HR Policy & Compliance", category: "domain", description: "Understanding employment laws and policies", defaultHours: 16 },
  { skillId: "domain-onboarding", name: "Onboarding Best Practices", category: "domain", description: "Employee onboarding methodologies", defaultHours: 8 },
  { skillId: "domain-performance", name: "Performance Management", category: "domain", description: "Performance reviews and feedback cycles", defaultHours: 12 },
  { skillId: "domain-talent", name: "Talent Acquisition", category: "domain", description: "Recruiting and hiring processes", defaultHours: 16 },
  { skillId: "domain-compensation", name: "Compensation & Benefits", category: "domain", description: "Pay structures and benefits administration", defaultHours: 12 },
  { skillId: "domain-employment-law", name: "Employment Law", category: "domain", description: "Legal requirements for employment", defaultHours: 20 },
  { skillId: "domain-privacy", name: "Data Privacy & GDPR", category: "domain", description: "Privacy regulations and data handling", defaultHours: 8 },

  // Tools & Systems
  { skillId: "tools-hris", name: "HRIS Systems (Workday/SAP)", category: "tools", description: "Human Resources Information Systems", defaultHours: 16 },
  { skillId: "tools-atlassian", name: "Atlassian Suite (Jira/Confluence)", category: "tools", description: "Project tracking and documentation", defaultHours: 10 },
  { skillId: "tools-ms365", name: "Microsoft 365", category: "tools", description: "Office productivity tools", defaultHours: 8 },
  { skillId: "tools-crm", name: "CRM Systems", category: "tools", description: "Customer relationship management", defaultHours: 12 },
  { skillId: "tools-analytics", name: "Analytics Dashboards", category: "tools", description: "Data visualization tools", defaultHours: 8 },

  // Compliance & Security
  { skillId: "comp-security", name: "Security Awareness", category: "compliance", description: "Cybersecurity best practices", defaultHours: 4 },
  { skillId: "comp-privacy", name: "Privacy Compliance", category: "compliance", description: "Data protection regulations", defaultHours: 8 },
  { skillId: "comp-diversity", name: "Diversity & Inclusion", category: "compliance", description: "Inclusive workplace practices", defaultHours: 6 },
  { skillId: "comp-ethics", name: "Business Ethics", category: "compliance", description: "Ethical decision making", defaultHours: 4 },
];

const SKILLS_MAP = new Map<string, SkillDefinition>(
  SKILLS_TAXONOMY.map((s) => [s.skillId, s])
);

// ============================================
// Employee Skill Input
// ============================================

export interface EmployeeSkill {
  skillId: string;
  proficiencyLevel: ProficiencyLevel;
}

// ============================================
// Role Requirement Input
// ============================================

export interface RoleRequirement {
  skillId: string;
  requiredLevel: ProficiencyLevel;
}

// ============================================
// Gap Severity Calculation
// ============================================

function calculateSeverity(
  currentLevel: ProficiencyLevel,
  requiredLevel: ProficiencyLevel
): "low" | "medium" | "high" {
  const diff = PROFICIENCY_ORDER[requiredLevel] - PROFICIENCY_ORDER[currentLevel];
  if (diff <= 0) return "low";
  if (diff === 1) return "low";
  if (diff === 2) return "medium";
  return "high";
}

// ============================================
// Skills Gap Analyzer Class
// ============================================

export class SkillsGapAnalyzer {
  private skillsMap: Map<string, SkillDefinition>;

  constructor(customSkills?: SkillDefinition[]) {
    // Merge custom skills with default taxonomy
    this.skillsMap = new Map(SKILLS_MAP);
    if (customSkills) {
      customSkills.forEach((s) => this.skillsMap.set(s.skillId, s));
    }
  }

  /**
   * Assess skills gap for a single employee against role requirements
   */
  assess(
    employeeSkills: EmployeeSkill[],
    roleRequirements: RoleRequirement[]
  ): SkillsGapReport {
    const employeeSkillMap = new Map<string, ProficiencyLevel>(
      employeeSkills.map((es) => [es.skillId, es.proficiencyLevel])
    );

    const matchedSkills: SkillsGapReport["matchedSkills"] = [];
    const gaps: SkillsGapReport["gaps"] = [];
    const recommendations: string[] = [];

    // Find matched skills and gaps
    for (const req of roleRequirements) {
      const employeeLevel = employeeSkillMap.get(req.skillId);
      const skillDef = this.skillsMap.get(req.skillId);

      if (!employeeLevel) {
        // Missing skill entirely
        gaps.push({
          skillId: req.skillId,
          currentLevel: "beginner",
          requiredLevel: req.requiredLevel,
          severity: "high",
        });
        recommendations.push(
          `Missing skill "${skillDef?.name || req.skillId}" - requires immediate training`
        );
      } else if (PROFICIENCY_ORDER[employeeLevel] < PROFICIENCY_ORDER[req.requiredLevel]) {
        // Proficiency too low
        const severity = calculateSeverity(employeeLevel, req.requiredLevel);
        gaps.push({
          skillId: req.skillId,
          currentLevel: employeeLevel,
          requiredLevel: req.requiredLevel,
          severity,
        });
        recommendations.push(
          `Skill "${skillDef?.name || req.skillId}" needs improvement from ${LEVEL_LABELS[employeeLevel]} to ${LEVEL_LABELS[req.requiredLevel]}`
        );
      } else {
        // Skill meets requirement
        matchedSkills.push({
          skillId: req.skillId,
          employeeLevel,
          requiredLevel: req.requiredLevel,
        });
      }
    }

    // Sort gaps by severity (high first)
    gaps.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Generate learning path
    const learningPath = this.generateLearningPath(gaps);

    // Calculate team coverage (for a single employee, just self-coverage)
    const teamCoverage = this.calculateTeamCoverage([employeeSkills]);

    return {
      employeeId: "", // Caller should fill this
      matchedSkills,
      gaps,
      learningPath,
      teamCoverage,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Assess gaps and include employee ID in report
   */
  assessForEmployee(
    employeeId: string,
    employeeSkills: EmployeeSkill[],
    roleRequirements: RoleRequirement[]
  ): SkillsGapReport {
    const report = this.assess(employeeSkills, roleRequirements);
    report.employeeId = employeeId;
    return report;
  }

  /**
   * Generate ordered learning modules to close skills gaps
   */
  private generateLearningPath(gaps: SkillsGapReport["gaps"]): LearningModule[] {
    const modules: LearningModule[] = [];
    let order = 1;

    for (const gap of gaps) {
      const skillDef = this.skillsMap.get(gap.skillId);
      const estimatedHours = skillDef?.defaultHours || 8;

      // Calculate additional hours based on gap severity
      const currentLevel = gap.currentLevel as ProficiencyLevel;
      const requiredLevel = gap.requiredLevel as ProficiencyLevel;
      const gapDiff = PROFICIENCY_ORDER[requiredLevel] - PROFICIENCY_ORDER[currentLevel];
      const adjustedHours = Math.round(estimatedHours * (1 + gapDiff * 0.25));

      modules.push({
        skillId: gap.skillId,
        title: `Learn ${skillDef?.name || gap.skillId}`,
        order,
        estimatedHours: adjustedHours,
        resources: this.suggestResources(gap.skillId, skillDef?.category),
      });
      order++;
    }

    return modules;
  }

  /**
   * Suggest learning resources for a skill
   */
  private suggestResources(
    skillId: string,
    category?: SkillDefinition["category"]
  ): string[] {
    const baseResources: Record<string, string[]> = {
      "comm-written": ["Writing Effective Emails Workshop", "Documentation Style Guide"],
      "comm-verbal": ["Public Speaking Fundamentals", "Meeting Facilitation Guide"],
      "comm-presenting": ["Presentation Design Course", "Storytelling for Business"],
      "comm-active-listening": ["Active Listening Techniques", "Empathy in Communication"],
      "comm-feedback": ["Feedback Framework Training", "Crucial Conversations"],
      "lead-coaching": ["Coaching Certification Program", "Mentoring Best Practices"],
      "lead-decision": ["Decision Making Frameworks", "Critical Thinking Workshop"],
      "lead-delegation": ["Delegation Skills Training", "Managing Through Others"],
      "lead-conflict": ["Conflict Resolution Certificate", "Mediation Skills Workshop"],
      "lead-strategic": ["Strategic Planning Intensive", "Executive Leadership Program"],
      "tech-data-analysis": ["Data Analysis with Excel/Python", "Statistics Fundamentals"],
      "tech-sql": ["SQL Masterclass", "Database Design Principles"],
      "tech-programming": ["Programming 101 Course", "Clean Code Principles"],
      "tech-api": ["REST API Design", "Integration Patterns Workshop"],
      "tech-version-control": ["Git Fundamentals", "Collaboration with Git"],
      "tech-testing": ["QA Methodology Course", "Test Automation Basics"],
      "domain-hr-policy": ["HR Compliance Certification", "Employment Law Overview"],
      "domain-onboarding": ["Onboarding Excellence Workshop", "First 90 Days Guide"],
      "domain-performance": ["Performance Management Systems", "Review Writing Workshop"],
      "domain-talent": ["Talent Acquisition Bootcamp", "Interviewing Techniques"],
      "domain-compensation": ["Compensation Design Course", "Benefits Administration Guide"],
      "domain-employment-law": ["Employment Law Certification", "Legal Compliance Training"],
      "domain-privacy": ["GDPR Training", "Privacy by Design Framework"],
      "tools-hris": ["Workday Training Portal", "HRIS Configuration Guide"],
      "tools-atlassian": ["Jira Fundamentals", "Confluence Documentation Standards"],
      "tools-ms365": ["Microsoft 365 Certification", "Teams & SharePoint Masterclass"],
      "tools-crm": ["Salesforce Admin Course", "CRM Best Practices"],
      "tools-analytics": ["Tableau Training", "Data Visualization Principles"],
      "comp-security": ["Security Awareness Training", "Phishing Prevention Course"],
      "comp-privacy": ["Data Privacy Certification", "PIPL/GDPR Compliance Course"],
      "comp-diversity": ["D&I Certificate Program", "Unconscious Bias Training"],
      "comp-ethics": ["Business Ethics Course", "Code of Conduct Training"],
    };

    const defaults = [
      `Online Course: ${category || "General"} Fundamentals`,
      `Internal Documentation: ${skillId} Guide`,
      "Mentorship Session",
      "Hands-on Practice Project",
    ];

    return baseResources[skillId] || defaults;
  }

  /**
   * Generate team skills matrix
   * Returns: { memberName: { skillCategory: coverageScore } }
   */
  calculateTeamCoverage(
    teamSkills: EmployeeSkill[][]
  ): Record<string, Record<string, number>> {
    const teamCoverage: Record<string, Record<string, number>> = {};
    const categories = ["communication", "leadership", "technical", "domain", "tools", "compliance"];

    teamSkills.forEach((memberSkills, index) => {
      const memberName = `member_${index + 1}`;
      teamCoverage[memberName] = {};

      // Group skills by category
      const categoryScores: Record<string, { total: number; count: number }> = {};
      categories.forEach((cat) => {
        categoryScores[cat] = { total: 0, count: 0 };
      });

      for (const skill of memberSkills) {
        const skillDef = this.skillsMap.get(skill.skillId);
        if (skillDef) {
          const cat = skillDef.category;
          categoryScores[cat].total += PROFICIENCY_ORDER[skill.proficiencyLevel] + 1; // +1 to convert 0-indexed to 1-4 scale
          categoryScores[cat].count++;
        }
      }

      // Calculate coverage percentage per category (max is 4 = expert)
      for (const cat of categories) {
        const { total, count } = categoryScores[cat];
        if (count > 0) {
          teamCoverage[memberName][cat] = Math.round((total / (count * 4)) * 100);
        } else {
          teamCoverage[memberName][cat] = 0;
        }
      }
    });

    return teamCoverage;
  }

  /**
   * Get skill definitions from taxonomy
   */
  getSkillDefinition(skillId: string): SkillDefinition | undefined {
    return this.skillsMap.get(skillId);
  }

  /**
   * Get all skills in a category
   */
  getSkillsByCategory(category: SkillDefinition["category"]): SkillDefinition[] {
    return SKILLS_TAXONOMY.filter((s) => s.category === category);
  }

  /**
   * Get all available skill IDs
   */
  getAvailableSkillIds(): string[] {
    return Array.from(this.skillsMap.keys());
  }
}

// ============================================
// Default Export
// ============================================

export const skillsGapAnalyzer = new SkillsGapAnalyzer();

export default SkillsGapAnalyzer;
