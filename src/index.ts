import department from "./data/department.json";
import roles from "./data/roles.json";
import jobs from "./data/jobs.json";
import skills from "./data/skills.json";
import connectors from "./data/connectors.json";

export { department, roles, jobs, skills, connectors };

// Types
export * from "./types/people.js";

// Workflows
export { OnboardingService } from "./workflows/onboarding.js";
export { PolicyService } from "./workflows/policy.js";
