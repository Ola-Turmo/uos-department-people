---
repo: "uos-department-people"
display_name: "@uos/department-people"
package_name: "@uos/department-people"
lane: "department overlay"
artifact_class: "TypeScript package / business-domain overlay"
maturity: "domain overlay focused on people operations and policy support"
generated_on: "2026-04-03"
assumptions: "Grounded in the current split-repo contents, package metadata, README/PRD alignment pass, and the Paperclip plugin scaffold presence where applicable; deeper module-level inspection should refine implementation detail as the code evolves."
autonomy_mode: "maximum-capability autonomous work with deep research and explicit learning loops"
---

# PRD: @uos/department-people

## 1. Product Intent

**Package / repo:** `@uos/department-people`  
**Lane:** department overlay  
**Artifact class:** TypeScript package / business-domain overlay  
**Current maturity:** domain overlay focused on people operations and policy support  
**Source-of-truth assumption:** Department-specific people overlay.
**Runtime form:** Split repo with package code as the source of truth and a Paperclip plugin scaffold available for worker, manifest, UI, and validation surfaces when the repo needs runtime or operator-facing behavior.

@uos/department-people packages people operations, onboarding, policy guidance, employee-service workflows, and manager enablement into a privacy-aware operating layer. Its job is to make employee-facing operations reliable, humane, and compliant.

## 2. Problem Statement

People operations are high-context and high-risk: privacy, fairness, compliance, and trust matter more here than raw automation throughput. This overlay should reduce repetitive admin work while preserving judgment, dignity, and auditability.

## 3. Target Users and Jobs to Be Done

- People operations teams and managers.
- Employees seeking guidance or support.
- Autonomous agents assisting with onboarding, policy retrieval, and process coordination.
- Compliance and leadership stakeholders overseeing sensitive workflows.

## 4. Outcome Thesis

**North star:** People workflows become faster and more consistent without becoming impersonal or risky: onboarding improves, policy guidance is accurate, and sensitive cases escalate appropriately.

### 12-month KPI targets
- Day-1 onboarding readiness reaches >= 90% for maintained onboarding flows.
- Policy-answer citation coverage reaches 100% for employee-facing policy responses.
- People-service SLA stays <= 2 business days for standard requests and <= 1 business day for urgent routed cases.
- Sensitive-case automation leakage remains at 0 incidents.
- Manager enablement assets are refreshed within 5 business days of detecting repeated pain points.

### Acceptance thresholds for the next implementation wave
- Policy retrieval and answer workflows always show the source, confidence, and escalation path.
- Sensitive cases route to humans with audit trails and explicit access boundaries.
- Onboarding and manager coordination workflows are structured enough to be measured and improved.
- People-service requests can be triaged, tracked, and closed without losing privacy or context.

## 5. In Scope

- Onboarding and employee lifecycle workflow support.
- Policy retrieval, explanation, and ambiguity identification.
- Manager enablement and coordination workflows.
- Service request routing and operational follow-through.
- Learning loops from policy questions and repeated friction points.

## 6. Explicit Non-Goals

- Automating sensitive employment decisions without human ownership.
- Becoming a substitute for legal or compliance review.
- Treating employee data as a generic operations dataset.

## 7. Maximum Tool and Connection Surface

- This repo should assume it may use any connection, API, browser flow, CLI, document surface, dataset, or storage system materially relevant to completing the job, as long as the access pattern is lawful, auditable, and proportionate to risk.
- Do not artificially limit execution to the tools already named in the repo if adjacent systems are clearly required to close the loop.
- Prefer first-party APIs and direct integrations when available, but use browser automation, provider CLIs, structured import/export, and human-review queues when they are the most reliable path to completion.
- Treat communication systems, docs, spreadsheets, issue trackers, code hosts, cloud consoles, dashboards, databases, and admin panels as valid operating surfaces whenever the repo's job depends on them.
- Escalate only when the action is irreversible, privacy-sensitive, financially material, or likely to create external side effects without adequate review.

### Priority surfaces for people work
- HRIS and ATS systems such as BambooHR, Workday, Ashby, Greenhouse, onboarding tools, docs, policy stores, forms, surveys, Gmail/Google Workspace, Slack, and calendar surfaces needed to support real employee and candidate workflows.
- Spreadsheets, approvals, case-management systems, learning systems, audit trails, and manager-review surfaces when people work requires traceability, handoffs, or human review.
- Browser access for admin flows, policy lookup, and employee-service workflows when official integrations are incomplete or insufficiently expressive.
- Only use the maximum available tool surface in ways that preserve privacy, fairness, consent, least privilege, and clear human ownership for sensitive cases.

### Selection rules
- Start by identifying the systems that would let the repo complete the real job end to end, not just produce an intermediate artifact.
- Use the narrowest safe action for high-risk domains, but not the narrowest tool surface by default.
- When one system lacks the evidence or authority needed to finish the task, step sideways into the adjacent system that does have it.
- Prefer a complete, reviewable workflow over a locally elegant but operationally incomplete one.

## 8. Autonomous Operating Model

This PRD assumes **maximum-capability autonomous work**. The repo should not merely accept tasks; it should research deeply, compare options, reduce uncertainty, ship safely, and learn from every outcome. Autonomy here means higher standards for evidence, reversibility, observability, and knowledge capture—not just faster execution.

### Required research before every material task
1. Read the repo README, this PRD, touched source modules, existing tests, and recent change history before proposing a solution.
1. Trace impact across adjacent UOS repos and shared contracts before changing interfaces, schemas, or runtime behavior.
1. Prefer evidence over assumption: inspect current code paths, add repro cases, and study real failure modes before implementing a fix.
1. Use external official documentation and standards for any upstream dependency, provider API, framework, CLI, or format touched by the task.
1. For non-trivial work, compare at least two approaches and explicitly choose based on reversibility, operational safety, and long-term maintainability.

### Repo-specific decision rules
- Privacy, fairness, and compliance beat automation convenience.
- Sensitive cases should surface quickly to the right humans.
- Policy guidance should cite source material and uncertainty when applicable.
- Any automation that changes employee experience at scale must be observable and reviewable.

### Mandatory escalation triggers
- Sensitive employment matters, leave/health issues, comp/performance decisions, or legal risk.
- Ambiguous policy interpretations with material impact.
- Changes affecting privacy controls or regulated data handling.

## 9. Continuous Learning Requirements

### Required learning loop after every task
- Every completed task must leave behind at least one durable improvement: a test, benchmark, runbook, migration note, ADR, or automation asset.
- Capture the problem, evidence, decision, outcome, and follow-up questions in repo-local learning memory so the next task starts smarter.
- Promote repeated fixes into reusable abstractions, templates, linters, validators, or code generation rather than solving the same class of issue twice.
- Track confidence and unknowns; unresolved ambiguity becomes a research backlog item, not a silent assumption.
- Prefer instrumented feedback loops: telemetry, evaluation harnesses, fixtures, or replayable traces should be added whenever feasible.

### Repo-specific research agenda
- Which employee-service workflows create the most repetitive admin load?
- Where are policy documents ambiguous, outdated, or hard to retrieve?
- What onboarding steps most influence time-to-productivity and confidence?
- Which manager questions recur often enough to productize better support?
- How can learning be captured without over-collecting sensitive detail?

### Repo-specific memory objects that must stay current
- Onboarding journey map.
- Policy ambiguity backlog.
- Manager enablement FAQ and playbook library.
- Sensitive-case routing guide.
- Service friction log.

## 10. Core Workflows the Repo Must Master

1. New-hire onboarding and manager coordination.
1. Answering policy questions with evidence and confidence handling.
1. Routing and tracking people-service requests.
1. Identifying policy ambiguity or repeated pain points.
1. Improving manager enablement assets from recurring support demand.

## 11. Interfaces and Dependencies

- Paperclip plugin scaffold for worker, manifest, UI, and validation surfaces.

- `@uos/core` for workflow orchestration.
- Potential policy, people-system, or knowledge connectors.
- `@uos/department-operations` for cross-functional cadence and knowledge hygiene.

## 12. Implementation Backlog

### Now
- Define the onboarding, people-service, and policy-answer workflows with explicit privacy boundaries.
- Build cited policy retrieval and routing for common employee and manager questions.
- Set up sensitive-case escalation and auditability so human ownership is never ambiguous.

### Next
- Improve manager enablement assets based on recurring pain points from onboarding and policy demand.
- Measure SLA performance and repeated friction so the team can prioritize improvements rationally.
- Integrate ATS, HRIS, and onboarding context where it shortens time to resolution without increasing risk.

### Later
- Support more proactive people-ops recommendations using aggregated, privacy-safe operational patterns.
- Extend the overlay from support and onboarding into broader employee lifecycle coordination.

## 13. Risks and Mitigations

- Automation applied to decisions that require human judgment.
- Policy answers that sound certain while source material is ambiguous.
- Over-collection or poor handling of sensitive people data.
- Manager convenience prioritized over employee trust.

## 14. Definition of Done

A task in this repo is only complete when all of the following are true:

- The code, configuration, or skill behavior has been updated with clear intent.
- Tests, evals, replay cases, or validation artifacts were added or updated to protect the changed behavior.
- Documentation, runbooks, or decision records were updated when the behavior, contract, or operating model changed.
- The task produced a durable learning artifact rather than only a code diff.
- Cross-repo consequences were checked wherever this repo touches shared contracts, orchestration, or downstream users.

### Repo-specific completion requirements
- Privacy, compliance, and escalation implications are explicit in every workflow.
- Any answer-generating feature cites sources or records uncertainty behavior.
- Learning artifacts avoid unnecessary sensitive detail while still preserving operational insight.

## 15. Recommended Repo-Local Knowledge Layout

- `/docs/research/` for research briefs, benchmark notes, and upstream findings.
- `/docs/adrs/` for decision records and contract changes.
- `/docs/lessons/` for task-by-task learning artifacts and postmortems.
- `/evals/` for executable quality checks, golden cases, and regression suites.
- `/playbooks/` for operator runbooks, migration guides, and incident procedures.
