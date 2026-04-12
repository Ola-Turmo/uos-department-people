/**
 * Policy Change Detector
 * Phase 1: Track policy document review dates and detect changes
 *
 * Monitors policy source documents for review date changes,
 * maintains version history, and flags affected answers for review.
 */

import type { PolicySource } from "../types/people.js";

/**
 * Version history entry for a tracked document
 */
export interface VersionEntry {
  lastReviewedAt: string;
  changedAt: string;
}

/**
 * Event emitted when a policy change is detected
 */
export interface PolicyChangeEvent {
  docId: string;
  oldDate: string | undefined;
  newDate: string;
}

/**
 * Callback type for policy change notifications
 */
export type PolicyChangeCallback = (event: PolicyChangeEvent) => void;

/**
 * Answer flagged for needing review
 */
export interface FlaggedAnswer {
  answerId: string;
  flaggedAt: string;
  reason: string;
  docId: string;
}

/**
 * Policy Change Detector
 *
 * Tracks policy documents by their lastReviewedAt date and detects when
 * documents are updated. When changes are detected, callbacks are invoked
 * and affected answers are flagged for review.
 */
export class PolicyChangeDetector {
  // Map of source document ID -> last known review date
  private trackedDocs: Map<string, string> = new Map();

  // Map of source document ID -> version history
  private versionHistory: Map<string, VersionEntry[]> = new Map();

  // Callbacks to invoke on policy changes
  private changeCallbacks: PolicyChangeCallback[] = [];

  // Answers flagged for review due to policy changes
  private flaggedAnswers: Map<string, FlaggedAnswer> = new Map();

  /**
   * Track a document with its current lastReviewedAt date
   * If the document was already tracked, this updates the stored date
   */
  trackDocument(docId: string, lastReviewedAt: string): void {
    const existingDate = this.trackedDocs.get(docId);

    if (existingDate !== lastReviewedAt) {
      // Date has changed - record version history
      const history = this.versionHistory.get(docId) || [];
      history.push({
        lastReviewedAt,
        changedAt: new Date().toISOString(),
      });
      this.versionHistory.set(docId, history);

      // Update tracked date
      this.trackedDocs.set(docId, lastReviewedAt);

      // Emit change event if this is not the initial tracking
      if (existingDate !== undefined) {
        this.emitPolicyChange({
          docId,
          oldDate: existingDate,
          newDate: lastReviewedAt,
        });
      }
    }
  }

  /**
   * Track multiple sources from a policy answer
   */
  trackSources(sources: PolicySource[]): void {
    for (const source of sources) {
      if (source.lastReviewedAt) {
        this.trackDocument(source.id, source.lastReviewedAt);
      }
    }
  }

  /**
   * Check if a document has changed since it was last tracked
   * Returns true if the currentLastReviewedAt differs from the stored date
   */
  checkForChanges(docId: string, currentLastReviewedAt: string): boolean {
    const storedDate = this.trackedDocs.get(docId);

    // If not tracked yet, no change detected
    if (storedDate === undefined) {
      return false;
    }

    return storedDate !== currentLastReviewedAt;
  }

  /**
   * Check if any of the given sources have changed
   * Returns array of source IDs that have changed
   */
  checkSourcesForChanges(sources: PolicySource[]): string[] {
    const changedIds: string[] = [];

    for (const source of sources) {
      if (source.lastReviewedAt && this.checkForChanges(source.id, source.lastReviewedAt)) {
        changedIds.push(source.id);
      }
    }

    return changedIds;
  }

  /**
   * Get the version history for a document
   */
  getVersionHistory(docId: string): VersionEntry[] {
    return this.versionHistory.get(docId) || [];
  }

  /**
   * Get all tracked document IDs
   */
  getTrackedDocuments(): string[] {
    return Array.from(this.trackedDocs.keys());
  }

  /**
   * Register a callback to be invoked when policy changes are detected
   */
  onPolicyChange(callback: PolicyChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Remove a registered callback
   */
  offPolicyChange(callback: PolicyChangeCallback): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * Flag an answer as needing review due to a policy change
   */
  flagAnswerForReview(answerId: string, docId: string, reason: string): void {
    this.flaggedAnswers.set(answerId, {
      answerId,
      flaggedAt: new Date().toISOString(),
      reason,
      docId,
    });
  }

  /**
   * Check if an answer is flagged for review
   */
  isAnswerFlagged(answerId: string): boolean {
    return this.flaggedAnswers.has(answerId);
  }

  /**
   * Get flagged answer info
   */
  getFlaggedAnswer(answerId: string): FlaggedAnswer | undefined {
    return this.flaggedAnswers.get(answerId);
  }

  /**
   * Get all flagged answers
   */
  getFlaggedAnswers(): FlaggedAnswer[] {
    return Array.from(this.flaggedAnswers.values());
  }

  /**
   * Clear a flag from an answer after it has been reviewed
   */
  clearAnswerFlag(answerId: string): boolean {
    return this.flaggedAnswers.delete(answerId);
  }

  /**
   * Clear all flags for answers that were based on a specific document
   */
  clearFlagsForDocument(docId: string): void {
    for (const [answerId, flag] of this.flaggedAnswers) {
      if (flag.docId === docId) {
        this.flaggedAnswers.delete(answerId);
      }
    }
  }

  /**
   * Get the last tracked review date for a document
   */
  getLastTrackedDate(docId: string): string | undefined {
    return this.trackedDocs.get(docId);
  }

  /**
   * Emit a policy change event to all registered callbacks
   */
  private emitPolicyChange(event: PolicyChangeEvent): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in policy change callback:", error);
      }
    }
  }

  /**
   * Reset all tracked documents (for testing purposes)
   */
  reset(): void {
    this.trackedDocs.clear();
    this.versionHistory.clear();
    this.flaggedAnswers.clear();
  }
}
