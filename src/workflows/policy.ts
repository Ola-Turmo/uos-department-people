/**
 * Policy Question Answering Service
 * VAL-DEPT-PEOPLE-002: Policy questions are answered with citations, confidence, and escalation
 *
 * Answers employee or manager policy questions with source citation,
 * confidence handling, and a clear human escalation path for ambiguous
 * or sensitive cases.
 */

import type {
  PolicyState,
  PolicyAnswer,
  PolicyQuestionLog,
  PolicyEscalation,
  PolicySource,
  AskPolicyQuestionParams,
  GetPolicyAnswerParams,
  EscalatePolicyQuestionParams,
  ResolveEscalationParams,
  GetPolicyQuestionsReportParams,
  PolicyReport,
  PolicyConfidence,
  PolicyEscalationUrgency,
} from "../types/people.js";
import { PolicyRagEngine } from "../policy/rag-engine.js";
import { PolicyChangeDetector } from "../policy/change-detector.js";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Policy knowledge base - in a real system this would come from a database or API
 */
const POLICY_KB: Array<{
  keywords: string[];
  question: string;
  answer: string;
  sources: PolicySource[];
  confidence: PolicyConfidence;
  escalationTriggers: string[];
  category: string;
}> = [
  {
    keywords: ["pto", "paid time off", "vacation", "holiday", "leave"],
    question: "How do I request time off?",
    answer:
      "To request PTO, submit your request through the HR system at least 2 weeks in advance for planned time off. For unexpected absences, notify your manager as soon as possible and submit the request retroactively. All PTO requests are subject to manager approval based on team coverage.",
    sources: [
      {
        id: "pol-001",
        title: "Employee Handbook - Time Off Policies",
        url: "https://internal.company.com/handbook/time-off",
        documentType: "employee-handbook",
        lastReviewedAt: "2026-01-15",
        relevanceScore: 0.95,
        excerpt: "All employees accrue PTO based on tenure...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["extended leave", "more than 2 weeks", "bereavement", "jury duty"],
    category: "time-off",
  },
  {
    keywords: ["remote", "work from home", "wfh", "hybrid", "flexible"],
    question: "What is the remote work policy?",
    answer:
      "We support flexible work arrangements. Employees may work remotely up to 3 days per week with manager approval. Core collaboration hours are 10am-3pm in your local timezone. Certain roles may have different requirements based on team needs.",
    sources: [
      {
        id: "pol-002",
        title: "Remote Work Policy",
        url: "https://internal.company.com/policies/remote-work",
        documentType: "policy-page",
        lastReviewedAt: "2026-02-20",
        relevanceScore: 0.9,
        excerpt: "Flexible work arrangements are available to all eligible employees...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["accommodation", "disability", "visa", "international"],
    category: "work-arrangements",
  },
  {
    keywords: ["expense", "reimbursement", "travel", "hotel", "flight"],
    question: "How do I submit expense reports?",
    answer:
      "Submit expense reports through the finance portal within 30 days of incurring the expense. Attach all receipts and include a business purpose for each item. Reimbursements are processed on the next payroll cycle after approval.",
    sources: [
      {
        id: "pol-003",
        title: "Expense Reimbursement Policy",
        url: "https://internal.company.com/finance/expenses",
        documentType: "policy-page",
        relevanceScore: 0.9,
        excerpt: "All business expenses must be submitted within 30 days...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["international", "over $1000", "client entertainment", "alcohol"],
    category: "finance",
  },
  {
    keywords: ["bonus", "commission", "compensation", "salary", "raise", "promotion"],
    question: "How does compensation and bonus work?",
    answer:
      "Base salary reviews occur annually during the performance review cycle. Bonuses are based on individual performance and company results, typically ranging from 5-20% of base salary. Specific targets and metrics are discussed with your manager.",
    sources: [
      {
        id: "pol-004",
        title: "Compensation Philosophy",
        url: "https://internal.company.com/hr/compensation",
        documentType: "manager-guide",
        lastReviewedAt: "2026-01-01",
        relevanceScore: 0.85,
        excerpt: "We target market-competitive compensation...",
      },
    ],
    confidence: "medium",
    escalationTriggers: ["equity", "stock options", "relocation", "counter-offer", "negotiation"],
    category: "compensation",
  },
  {
    keywords: ["performance", "review", "feedback", "goals", "okr", "kpi"],
    question: "How do performance reviews work?",
    answer:
      "Performance reviews are conducted semi-annually. They include self-assessment, manager assessment, and peer feedback where applicable. Reviews assess both impact (what you achieved) and skills (how you achieved it). Results are used for development planning and compensation decisions.",
    sources: [
      {
        id: "pol-005",
        title: "Performance Review Process",
        url: "https://internal.company.com/hr/performance",
        documentType: "employee-handbook",
        lastReviewedAt: "2026-01-10",
        relevanceScore: 0.9,
        excerpt: "The performance review cycle includes...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["pip", "performance improvement", "rating dispute", "termination"],
    category: "performance",
  },
  {
    keywords: ["termination", "quit", "resign", "fired", "laid off", "end employment"],
    question: "What is the resignation process?",
    answer:
      "We request at least 2 weeks notice for voluntary resignations. Please submit your resignation in writing to your manager and HR. An exit interview will be scheduled. Final paycheck includes accrued PTO payout and benefits continuation information.",
    sources: [
      {
        id: "pol-006",
        title: "Separation Policy",
        url: "https://internal.company.com/hr/separation",
        documentType: "policy-page",
        lastReviewedAt: "2026-02-01",
        relevanceScore: 0.9,
        excerpt: "Employees separating from the company should provide...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["discrimination", "wrongful termination", "hostile", "legal"],
    category: "employment",
  },
  {
    keywords: ["harassment", "discrimination", "hostile", "complaint", "ethics"],
    question: "How do I report harassment or discrimination?",
    answer:
      "We take all reports of harassment and discrimination seriously. You can report through: (1) Your manager or HR, (2) The ethics hotline, (3) The anonymous ethics reporting system. All reports are investigated promptly and confidentially to the extent possible.",
    sources: [
      {
        id: "pol-007",
        title: "Anti-Harassment Policy",
        url: "https://internal.company.com/policies/harassment",
        documentType: "policy-page",
        lastReviewedAt: "2026-01-20",
        relevanceScore: 0.95,
        excerpt: "The company is committed to providing a workplace free from...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["legal", "lawyer", "court", "formal complaint"],
    category: "conduct",
  },
  {
    keywords: ["benefits", "health", "dental", "vision", "401k", "insurance"],
    question: "What benefits are available?",
    answer:
      "Benefits include: Medical, dental, and vision insurance (company pays 80% of premiums), 401k with 4% company match, life insurance, disability coverage, and an HSA option. Benefits are effective from your start date after enrollment.",
    sources: [
      {
        id: "pol-008",
        title: "Benefits Summary",
        url: "https://internal.company.com/hr/benefits",
        documentType: "employee-handbook",
        lastReviewedAt: "2026-01-01",
        relevanceScore: 0.9,
        excerpt: "Our benefits package includes...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["cobra", "retirement", "fiduciary", " HSA contribution limits"],
    category: "benefits",
  },
  {
    keywords: ["onboarding", "new hire", "first day", "orientation", "start"],
    question: "What should I expect on my first day?",
    answer:
      "Your first day includes: Welcome email with schedule, office/workspace setup, account creation, HR paperwork (I-9, tax forms), benefits enrollment, orientation session, and meet-and-greet with your team. Plan for about 4-6 hours for all onboarding activities.",
    sources: [
      {
        id: "pol-009",
        title: "New Hire Guide",
        url: "https://internal.company.com/onboarding/first-day",
        documentType: "employee-handbook",
        lastReviewedAt: "2026-02-15",
        relevanceScore: 0.9,
        excerpt: "Your first day experience includes...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["i-9", "documentation", "work authorization", "visa"],
    category: "onboarding",
  },
  {
    keywords: ["sick", "illness", "medical", "doctor", "hospital"],
    question: "What is the sick leave policy?",
    answer:
      "Sick leave is provided for personal illness, medical appointments, and caring for sick family members. Use sick leave in the HR system and notify your manager as early as possible. Sick leave does not carry over year-to-year but short-term disability may cover extended illness.",
    sources: [
      {
        id: "pol-010",
        title: "Sick Leave Policy",
        url: "https://internal.company.com/handbook/sick-leave",
        documentType: "employee-handbook",
        lastReviewedAt: "2026-01-15",
        relevanceScore: 0.9,
        excerpt: "Sick leave is provided to employees who are ill...",
      },
    ],
    confidence: "high",
    escalationTriggers: ["fmla", "long term disability", "medical accommodation", "workers comp"],
    category: "time-off",
  },
];

/**
 * Keywords that indicate a sensitive or ambiguous case requiring escalation
 */
const ESCALATION_KEYWORDS = new Set([
  "legal",
  "lawyer",
  "court",
  "lawsuit",
  "investigation",
  "fmla",
  "disability",
  "accommodation",
  "discrimination",
  "harassment",
  "wrongful",
  "violation",
  "compliance",
  "confidential",
  "hr-investigation",
  "termination",
  "fired",
  "pip",
  "performance improvement",
  " salary discussion",
  "compensation",
  "equity",
  "discrimination",
  "hostile",
]);

/**
 * Check if question text contains escalation trigger keywords
 */
function containsEscalationTriggers(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const keyword of ESCALATION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the best matching policy for a question
 */
function findBestPolicyMatch(question: string): {
  policy: typeof POLICY_KB[0];
  confidence: PolicyConfidence;
  confidenceReasoning: string;
  relevanceScore: number;
} | null {
  const lowerQuestion = question.toLowerCase();
  let bestMatch: typeof POLICY_KB[0] | null = null;
  let bestScore = 0;

  for (const policy of POLICY_KB) {
    let score = 0;
    for (const keyword of policy.keywords) {
      if (lowerQuestion.includes(keyword)) {
        score += keyword.length; // Longer keyword matches = higher score
      }
    }

    // Bonus for exact phrase matches
    if (lowerQuestion.includes(policy.question.toLowerCase())) {
      score += 100;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = policy;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return null;
  }

  // Determine confidence based on match quality
  let confidence: PolicyConfidence = "medium";
  let confidenceReasoning = "Partial match based on keyword overlap.";

  if (bestScore >= 20) {
    confidence = "high";
    confidenceReasoning = "Strong keyword match indicating likely policy coverage.";
  } else if (bestScore >= 10) {
    confidence = "medium";
    confidenceReasoning = "Moderate keyword overlap - answer may need context verification.";
  } else {
    confidence = "low";
    confidenceReasoning = "Weak keyword match - answer is a best-effort estimate and may not fully apply.";
  }

  return {
    policy: bestMatch,
    confidence,
    confidenceReasoning,
    relevanceScore: Math.min(bestScore / 50, 1), // Normalize to 0-1
  };
}

export class PolicyService {
  private state: PolicyState;
  private ragEngine: PolicyRagEngine;
  private changeDetector: PolicyChangeDetector;

  constructor(initialState?: PolicyState) {
    this.state = initialState ?? {
      questions: {},
      answers: {},
      escalations: {},
      lastUpdated: new Date().toISOString(),
    };
    // Initialize RAG engine and index the policy knowledge base
    this.ragEngine = new PolicyRagEngine();
    this.ragEngine.index(POLICY_KB);

    // Initialize change detector
    this.changeDetector = new PolicyChangeDetector();

    // Register callback for policy changes to flag affected answers
    this.changeDetector.onPolicyChange((event) => {
      this.flagAnswersBasedOnDocument(event.docId);
    });
  }

  /**
   * Flag all answers that are based on a specific document for review
   */
  private flagAnswersBasedOnDocument(docId: string): void {
    for (const [answerId, answer] of Object.entries(this.state.answers)) {
      const hasSource = answer.sources.some((s) => s.id === docId);
      if (hasSource) {
        this.changeDetector.flagAnswerForReview(
          answerId,
          docId,
          `Policy document ${docId} was updated`
        );
      }
    }
  }

  /**
   * Get the change detector instance
   */
  getChangeDetector(): PolicyChangeDetector {
    return this.changeDetector;
  }

  /**
   * Get the RAG engine instance for advanced queries
   */
  getRagEngine(): PolicyRagEngine {
    return this.ragEngine;
  }

  /**
   * Ask a policy question and get an answer
   * VAL-DEPT-PEOPLE-002
   */
  askQuestion(params: AskPolicyQuestionParams): PolicyAnswer {
    const now = new Date().toISOString();
    const questionId = generateId();

    // Log the question
    const questionLog: PolicyQuestionLog = {
      id: questionId,
      question: params.question,
      askerId: params.askerId,
      askerRole: params.askerRole,
      category: params.category,
      askedAt: now,
    };

    this.state.questions[questionId] = questionLog;

    // Query RAG engine for best matching policies
    const ragResults = this.ragEngine.query(params.question, 3);
    const bestMatch = ragResults.length > 0 ? ragResults[0] : null;

    let answer: PolicyAnswer;

    // Threshold of 0.1 to accept any match (original returned null only if score === 0)
    if (bestMatch && bestMatch.relevanceScore >= 0.1) {
      // Build answer from RAG-matched policy
      const policy = bestMatch.document;
      const requiresEscalation =
        containsEscalationTriggers(params.question) ||
        policy.keywords.some((trigger) =>
          params.question.toLowerCase().includes(trigger.toLowerCase())
        );

      // Determine confidence based on relevance score
      let confidence: PolicyConfidence = "medium";
      let confidenceReasoning = "Moderate relevance score - answer may need context verification.";

      if (bestMatch.relevanceScore >= 0.6) {
        confidence = "high";
        confidenceReasoning = "Strong relevance score indicating likely accurate policy match.";
      } else if (bestMatch.relevanceScore < 0.2) {
        confidence = "low";
        confidenceReasoning = "Low relevance score - answer is a best-effort estimate and may not fully apply.";
      }

      // Filter sources by relevance threshold (>= 0.6)
      const relevantSources = this.ragEngine.getRelevantSources(ragResults, 0.6);

      answer = {
        id: generateId(),
        question: params.question,
        answer: policy.answer,
        summary: `Policy answer based on "${policy.question || policy.title}"`,
        confidence,
        confidenceReasoning,
        sources: relevantSources.length > 0 ? relevantSources : policy.sources,
        relatedPolicies: policy.sources.map((s) => s.id),
        applicabilityNotes: confidence === "low"
          ? "This is a best-effort answer based on partial policy match. Please verify with HR if exact compliance is required."
          : undefined,
        answeredAt: now,
        answeredBy: "policy-rag-engine",
        requiresEscalation,
        escalationReason: requiresEscalation
          ? "Question contains escalation-triggering keywords that require human review"
          : undefined,
      };
    } else {
      // No matching policy found
      answer = {
        id: generateId(),
        question: params.question,
        answer:
          "I couldn't find a specific policy to fully answer your question. This has been flagged for human review. In the meantime, you may find the employee handbook helpful at https://internal.company.com/handbook or contact HR directly.",
        summary: "No exact policy match found",
        confidence: "low",
        confidenceReasoning:
          "No matching policy found in the knowledge base. Question requires human review.",
        sources: [],
        applicabilityNotes: "This question may require policy clarification or creation.",
        answeredAt: now,
        answeredBy: "policy-rag-engine",
        requiresEscalation: true,
        escalationReason: "No policy match found - requires human review for accurate answer",
      };
    }

    // Track sources with change detector and check for changes
    this.changeDetector.trackSources(answer.sources);

    this.state.answers[answer.id] = answer;
    questionLog.answerId = answer.id;
    this.state.lastUpdated = now;

    return answer;
  }

  /**
   * Get a policy answer by ID
   */
  getAnswer(answerId: string): PolicyAnswer | undefined {
    return this.state.answers[answerId];
  }

  /**
   * Check if an answer is flagged for review due to policy changes
   */
  isAnswerFlaggedForReview(answerId: string): boolean {
    return this.changeDetector.isAnswerFlagged(answerId);
  }

  /**
   * Get flagged answer info
   */
  getFlaggedAnswerInfo(answerId: string) {
    return this.changeDetector.getFlaggedAnswer(answerId);
  }

  /**
   * Get a question log by ID
   */
  getQuestion(questionId: string): PolicyQuestionLog | undefined {
    return this.state.questions[questionId];
  }

  /**
   * Escalate a policy question to human review
   * VAL-DEPT-PEOPLE-002
   */
  escalateQuestion(params: EscalatePolicyQuestionParams): PolicyEscalation | undefined {
    const question = this.state.questions[params.questionId];
    if (!question) return undefined;

    const now = new Date().toISOString();
    const escalationId = generateId();

    // Determine urgency
    let urgency: PolicyEscalationUrgency = params.urgency ?? "routine";
    const lowerQuestion = question.question.toLowerCase();

    if (
      lowerQuestion.includes("legal") ||
      lowerQuestion.includes("court") ||
      lowerQuestion.includes("lawsuit") ||
      lowerQuestion.includes("discrimination") ||
      lowerQuestion.includes("harassment")
    ) {
      urgency = "critical";
    } else if (
      lowerQuestion.includes("accommodation") ||
      lowerQuestion.includes("disability") ||
      lowerQuestion.includes("fmla") ||
      lowerQuestion.includes("termination")
    ) {
      urgency = "urgent";
    }

    const escalation: PolicyEscalation = {
      id: escalationId,
      questionId: params.questionId,
      originalQuestion: question.question,
      escalatedToRoleKey: params.escalatedToRoleKey ?? "people-reviewer",
      escalatedToTeam: params.escalatedToTeam ?? "hr-policy-team",
      urgency,
      reason: params.reason,
      status: "pending",
      createdAt: now,
      notes: [],
      evidenceIds: question.answerId ? [question.answerId] : [],
    };

    this.state.escalations[escalationId] = escalation;
    question.escalatedId = escalationId;

    // Update answer if exists
    if (question.answerId) {
      const answer = this.state.answers[question.answerId];
      if (answer) {
        answer.requiresEscalation = true;
        answer.escalatedAt = now;
        answer.escalationUrgency = urgency;
      }
    }

    this.state.lastUpdated = now;
    return escalation;
  }

  /**
   * Resolve an escalation
   * VAL-DEPT-PEOPLE-002
   */
  resolveEscalation(params: ResolveEscalationParams): PolicyEscalation | undefined {
    const escalation = this.state.escalations[params.escalationId];
    if (!escalation) return undefined;

    const now = new Date().toISOString();
    escalation.status = params.status;
    escalation.resolvedAt = now;
    escalation.resolution = params.resolution;

    // Update question log
    const question = this.state.questions[escalation.questionId];
    if (question) {
      question.resolvedAt = now;
    }

    this.state.lastUpdated = now;
    return escalation;
  }

  /**
   * Get an escalation by ID
   */
  getEscalation(escalationId: string): PolicyEscalation | undefined {
    return this.state.escalations[escalationId];
  }

  /**
   * Get all pending escalations
   */
  getPendingEscalations(): PolicyEscalation[] {
    return Object.values(this.state.escalations).filter((e) => e.status === "pending");
  }

  /**
   * Get escalations by urgency
   */
  getEscalationsByUrgency(urgency: PolicyEscalationUrgency): PolicyEscalation[] {
    return Object.values(this.state.escalations).filter((e) => e.urgency === urgency);
  }

  /**
   * Add a note to an escalation
   */
  addEscalationNote(escalationId: string, note: string): PolicyEscalation | undefined {
    const escalation = this.state.escalations[escalationId];
    if (!escalation) return undefined;

    escalation.notes.push(note);
    this.state.lastUpdated = new Date().toISOString();
    return escalation;
  }

  /**
   * Generate a policy questions report
   * VAL-DEPT-PEOPLE-002
   */
  generateReport(params?: GetPolicyQuestionsReportParams): PolicyReport {
    let questions = Object.values(this.state.questions);

    // Apply date filter
    if (params?.lookbackDays) {
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - params.lookbackDays);
      questions = questions.filter((q) => new Date(q.askedAt) >= lookbackDate);
    }

    // Apply category filter
    if (params?.category) {
      questions = questions.filter((q) => q.category === params.category);
    }

    // Count statuses
    let answered = 0;
    let escalated = 0;
    let pending = 0;
    const byCategory: Record<string, number> = {};
    let confidenceSum = 0;
    let answeredCount = 0;
    let coveredCount = 0;
    let partiallyCoveredCount = 0;
    let notFoundCount = 0;

    for (const question of questions) {
      // Count by resolution status
      if (question.escalatedId) {
        escalated++;
      } else if (question.answerId) {
        answered++;
      } else {
        pending++;
      }

      // Count by category
      if (question.category) {
        byCategory[question.category] = (byCategory[question.category] ?? 0) + 1;
      }

      // Analyze answer quality
      if (question.answerId) {
        const answer = this.state.answers[question.answerId];
        if (answer) {
          confidenceSum +=
            answer.confidence === "high" ? 1 : answer.confidence === "medium" ? 0.6 : 0.3;
          answeredCount++;

          if (answer.sources.length > 0 && answer.confidence === "high") {
            coveredCount++;
          } else if (answer.sources.length > 0 || answer.confidence !== "low") {
            partiallyCoveredCount++;
          } else {
            notFoundCount++;
          }
        }
      }
    }

    // Get recent escalations
    const recentEscalations = Object.values(this.state.escalations)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalQuestions: questions.length,
      answered,
      escalated,
      pending,
      byCategory,
      averageConfidence: answeredCount > 0 ? confidenceSum / answeredCount : 0,
      recentEscalations,
      policyCoverage: {
        covered: coveredCount,
        partiallyCovered: partiallyCoveredCount,
        notFound: notFoundCount,
      },
    };
  }

  /**
   * Get current state for persistence
   */
  getState(): PolicyState {
    return this.state;
  }

  /**
   * Load state from persistence
   */
  loadState(state: PolicyState): void {
    this.state = state;
  }
}
