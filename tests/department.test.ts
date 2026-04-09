import { describe, expect, it } from "vitest";
import { connectors, department, jobs, roles, skills } from "../src";

describe("@uos/department-people", () => {
  it("captures the people department boundary", () => {
    expect(department.departmentId).toBe("people");
    expect(department.parentFunctionId).toBe("people");
    expect(department.moduleId).toBeNull();
  });

  it("includes the people leadership and enablement roles", () => {
    expect(roles.some((role) => role.roleKey === "people-ops-lead")).toBe(true);
    expect(roles.some((role) => role.roleKey === "people-onboarding-specialist")).toBe(true);
    expect(jobs.map((job) => job.jobKey)).toEqual([
      "people-hiring-review",
      "people-onboarding-review",
    ]);
  });

  it("keeps the people collaboration toolkits together", () => {
    expect(skills.bundleIds).toContain("uos-people-risk");
    expect(skills.externalSkills.some((skill) => skill.id === "uos-external-running-decisions")).toBe(true);
    expect(connectors.requiredToolkits).toContain("googledocs");
    expect(connectors.requiredToolkits).toContain("slack");
    expect(connectors.roleToolkits.some((role) => role.roleKey === "people-talent-lead")).toBe(true);
  });
});
