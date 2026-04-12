/**
 * Policy RAG Engine
 * Phase 1: TF-IDF based keyword vector retrieval (no external embedding API)
 *
 * Provides document ingestion, semantic-like retrieval via TF-IDF cosine similarity,
 * and source citation with relevance scoring.
 */

import type {
  PolicySource,
  PolicyConfidence,
} from "../types/people.js";

/**
 * Policy document stored in the RAG index
 */
export interface PolicyDocument {
  id: string;
  text: string;           // Combined text for retrieval (question + answer + keywords)
  answer: string;        // The actual answer text
  title: string;          // Display title
  category: string;
  keywords: string[];     // Extracted keywords for TF-IDF
  sources: PolicySource[];
  lastReviewedAt?: string;
  question?: string;      // Original question this addresses
}

/**
 * Query result with relevance scoring
 */
export interface QueryResult {
  document: PolicyDocument;
  relevanceScore: number;  // 0-1 normalized cosine similarity
  matchedKeywords: string[];
}

/**
 * IDF data for vocabulary terms
 */
interface IdfData {
  idf: number;
  documentFrequency: number;
}

/**
 * Policy RAG Engine - TF-IDF based retrieval
 *
 * Uses a TF-IDF keyword vector approach to score document-query relevance:
 * - TF (Term Frequency): keyword occurrence count in document
 * - IDF (Inverse Document Frequency): log(N / document frequency)
 * - Cosine similarity between query vector and document vector
 */
export class PolicyRagEngine {
  private documents: Map<string, PolicyDocument> = new Map();
  private idfCache: Map<string, IdfData> = new Map();
  private vocabulary: Set<string> = new Set();
  private documentCount = 0;

  /**
   * Generate a unique document ID
   */
  private generateDocId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Tokenize text into lowercase words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  /**
   * Calculate term frequency for a document
   */
  private calculateTermFrequency(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    // Normalize by document length
    for (const [token, count] of tf) {
      tf.set(token, count / tokens.length);
    }
    return tf;
  }

  /**
   * Calculate IDF for all terms across the corpus
   */
  private calculateIdf(): void {
    this.idfCache.clear();
    this.vocabulary.clear();

    for (const doc of this.documents.values()) {
      const tokens = new Set(this.tokenize(doc.text).concat(doc.keywords.map((k) => k.toLowerCase())));

      for (const token of tokens) {
        this.vocabulary.add(token);
        const idfData = this.idfCache.get(token) || { idf: 0, documentFrequency: 0 };
        idfData.documentFrequency++;
        this.idfCache.set(token, idfData);
      }
    }

    // Calculate IDF = log(N / df)
    for (const [token, idfData] of this.idfCache) {
      idfData.idf = Math.log(this.documentCount / (idfData.documentFrequency + 1));
      this.idfCache.set(token, idfData);
    }
  }

  /**
   * Build TF-IDF vector for a document
   */
  private buildDocumentVector(doc: PolicyDocument): Map<string, number> {
    const tokens = this.tokenize(doc.text);
    const tf = this.calculateTermFrequency(tokens);

    // Include keywords with higher weight
    for (const keyword of doc.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      tf.set(lowerKeyword, (tf.get(lowerKeyword) || 0) + 0.5);
    }

    // Apply IDF
    const tfidf = new Map<string, number>();
    for (const [token, tfValue] of tf) {
      const idfData = this.idfCache.get(token);
      if (idfData) {
        tfidf.set(token, tfValue * idfData.idf);
      }
    }

    return tfidf;
  }

  /**
   * Build TF-IDF vector for a query
   */
  private buildQueryVector(query: string): Map<string, number> {
    const tokens = this.tokenize(query);
    const tf = this.calculateTermFrequency(tokens);

    // Apply IDF
    const tfidf = new Map<string, number>();
    for (const [token, tfValue] of tf) {
      const idfData = this.idfCache.get(token);
      if (idfData) {
        tfidf.set(token, tfValue * idfData.idf);
      }
    }

    return tfidf;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    // Iterate over smaller vector for efficiency
    const smaller = vec1.size < vec2.size ? vec1 : vec2;
    const larger = vec1.size < vec2.size ? vec2 : vec1;

    for (const [token, value1] of smaller) {
      const value2 = larger.get(token) || 0;
      dotProduct += value1 * value2;
    }

    for (const value of vec1.values()) {
      norm1 += value * value;
    }

    for (const value of vec2.values()) {
      norm2 += value * value;
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Calculate keyword overlap score using substring matching (like original approach)
   * Returns raw score (sum of matched keyword lengths) like the original implementation
   */
  private keywordOverlapScore(query: string, doc: PolicyDocument): number {
    const queryLower = query.toLowerCase();

    let rawScore = 0;

    for (const keyword of doc.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Check if keyword appears in query (as substring - handles multi-word phrases)
      if (queryLower.includes(keywordLower)) {
        rawScore += keyword.length; // Same as original: longer keyword = higher score
      } else {
        // Fallback: check if all tokens in keyword are present in query
        const keywordTokens = this.tokenize(keyword);
        if (keywordTokens.length > 1 && keywordTokens.every((t) => queryLower.includes(t))) {
          rawScore += keyword.length;
        }
      }
    }

    return rawScore;
  }

  /**
   * Index documents from the policy knowledge base
   */
  index(policyKB: Array<{
    keywords: string[];
    question: string;
    answer: string;
    sources: PolicySource[];
    confidence: PolicyConfidence;
    escalationTriggers: string[];
    category: string;
  }>): void {
    this.documents.clear();
    this.documentCount = 0;

    for (const policy of policyKB) {
      const docId = this.generateDocId();
      const doc: PolicyDocument = {
        id: docId,
        text: `${policy.question} ${policy.answer} ${policy.keywords.join(" ")}`,
        answer: policy.answer,
        title: policy.sources[0]?.title || policy.question,
        category: policy.category,
        keywords: policy.keywords,
        sources: policy.sources,
        lastReviewedAt: policy.sources[0]?.lastReviewedAt,
        question: policy.question,
      };
      this.documents.set(docId, doc);
      this.documentCount++;
    }

    this.calculateIdf();
  }

  /**
   * Query the index for top-K relevant documents
   */
  query(question: string, topK: number = 3): QueryResult[] {
    if (this.documents.size === 0) {
      return [];
    }

    const queryVector = this.buildQueryVector(question);
    const results: QueryResult[] = [];

    for (const doc of this.documents.values()) {
      const docVector = this.buildDocumentVector(doc);
      const similarity = this.cosineSimilarity(queryVector, docVector);

      // Find matched keywords using substring matching (like original)
      const queryLower = question.toLowerCase();
      const matchedKeywords = doc.keywords.filter(
        (k) => queryLower.includes(k.toLowerCase())
      );

      // Combine TF-IDF cosine similarity with keyword overlap scoring
      // cosineSim is 0-1, keywordScore is sum of matched keyword lengths
      // Normalize by dividing by max possible score (sum of all keyword lengths)
      const cosineSim = Math.max(0, Math.min(1, similarity));
      const keywordScore = this.keywordOverlapScore(question, doc);
      // Normalize by total keyword weight in document
      const totalKeywordWeight = doc.keywords.reduce((sum, k) => sum + k.length, 0);
      const normalizedKeywordScore = totalKeywordWeight > 0 ? Math.min(keywordScore / totalKeywordWeight, 1) : 0;
      // Weighted combination: 30% cosine similarity, 70% keyword overlap (keyword is more reliable)
      const combinedScore = cosineSim * 0.3 + normalizedKeywordScore * 0.7;

      results.push({
        document: doc,
        relevanceScore: combinedScore,
        matchedKeywords,
      });
    }

    // Sort by relevance score descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, topK);
  }

  /**
   * Add a new document to the index
   */
  addDocument(doc: Omit<PolicyDocument, "id">): string {
    const docId = this.generateDocId();
    const newDoc: PolicyDocument = {
      ...doc,
      id: docId,
    };
    this.documents.set(docId, newDoc);
    this.documentCount++;

    // Recalculate IDF for the new document
    this.calculateIdf();

    return docId;
  }

  /**
   * Remove a document from the index
   */
  removeDocument(docId: string): boolean {
    const deleted = this.documents.delete(docId);
    if (deleted) {
      this.documentCount--;
      this.calculateIdf();
    }
    return deleted;
  }

  /**
   * Get a document by ID
   */
  getDocument(docId: string): PolicyDocument | undefined {
    return this.documents.get(docId);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): PolicyDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Check if a policy has been reviewed since a given date
   */
  hasPolicyChanged(docId: string, sinceDate: string): boolean {
    const doc = this.documents.get(docId);
    if (!doc || !doc.lastReviewedAt) {
      return false;
    }
    return new Date(doc.lastReviewedAt) > new Date(sinceDate);
  }

  /**
   * Get sources with relevance score >= threshold
   */
  getRelevantSources(results: QueryResult[], threshold: number = 0.6): PolicySource[] {
    const sources: PolicySource[] = [];
    const seenIds = new Set<string>();

    for (const result of results) {
      if (result.relevanceScore >= threshold) {
        for (const source of result.document.sources) {
          if (!seenIds.has(source.id)) {
            seenIds.add(source.id);
            sources.push({
              ...source,
              relevanceScore: result.relevanceScore,
            });
          }
        }
      }
    }

    return sources;
  }
}
