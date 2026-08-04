/**
 * Shared LangGraph.js state shape (spec §8.4).
 * This is the single TypeScript type passed between every node in both
 * state graphs (ingestion + query-answering). Only orchestrator-service
 * builds the actual StateGraph, but repo-service, chat-service, and
 * notification-service all need this shape to read/write AgentRun
 * documents and render trace data, so it lives here rather than being
 * private to one service.
 */

export type AgentSourceType = "code" | "docs" | "issues" | "commits" | "architecture";

export interface Evidence {
  sourceType: AgentSourceType;
  sourceId: string; // file path, PR number, issue number, commit SHA, etc.
  content: string;
  score?: number;
}

export interface Citation {
  sourceType: AgentSourceType;
  sourceId: string;
  url?: string;
  excerpt?: string;
}

export interface RouteHistoryEntry {
  node: string;
  timestamp: string; // ISO string, not Date — this crosses process/service boundaries
  durationMs?: number;
}

/**
 * The single state object threaded through every LangGraph node.
 * Every node appends to routeHistory so the full path taken through the
 * graph is recoverable for the AgentRun trace.
 */
export interface AgentState {
  question: string;
  rewrittenQuery?: string;
  intent?: string;
  evidence: Evidence[];
  citations: Citation[];
  routeHistory: RouteHistoryEntry[];
  /** Bounds the hallucination-checker -> answer-generator retry cycle. */
  retryCount: number;
  answer?: string;
}

export type AgentRunStatus = "pending" | "running" | "completed" | "failed";
