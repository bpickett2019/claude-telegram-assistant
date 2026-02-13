/**
 * Supabase Memory System
 *
 * Handles persistent memory: messages, facts, goals, and semantic search
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config, Memory, Message } from '../types';

export class MemorySystem {
  private client: SupabaseClient;

  constructor(private config: Config) {
    this.client = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );
  }

  /**
   * Save a message to history
   */
  async saveMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.client.from('messages').insert({
        role,
        content,
        channel: 'telegram',
        metadata,
      });
    } catch (error) {
      console.error('[Memory] Error saving message:', error);
    }
  }

  /**
   * Process memory intent tags from Claude's response
   * Strips tags and saves to database
   */
  async processMemoryIntents(response: string): Promise<string> {
    let clean = response;

    // [REMEMBER: fact]
    const rememberMatches = response.matchAll(/\[REMEMBER:\s*(.+?)\]/gi);
    for (const match of rememberMatches) {
      await this.saveFact(match[1]);
      clean = clean.replace(match[0], '');
    }

    // [GOAL: text | DEADLINE: date] or [GOAL: text]
    const goalMatches = response.matchAll(
      /\[GOAL:\s*(.+?)(?:\s*\|\s*DEADLINE:\s*(.+?))?\]/gi
    );
    for (const match of goalMatches) {
      await this.saveGoal(match[1], match[2] || undefined);
      clean = clean.replace(match[0], '');
    }

    // [DONE: search text]
    const doneMatches = response.matchAll(/\[DONE:\s*(.+?)\]/gi);
    for (const match of doneMatches) {
      await this.completeGoal(match[1]);
      clean = clean.replace(match[0], '');
    }

    return clean.trim();
  }

  /**
   * Save a fact to memory
   */
  private async saveFact(content: string): Promise<void> {
    try {
      await this.client.from('memory').insert({
        type: 'fact',
        content,
      });
    } catch (error) {
      console.error('[Memory] Error saving fact:', error);
    }
  }

  /**
   * Save a goal
   */
  private async saveGoal(content: string, deadline?: string): Promise<void> {
    try {
      await this.client.from('memory').insert({
        type: 'goal',
        content,
        deadline: deadline || null,
      });
    } catch (error) {
      console.error('[Memory] Error saving goal:', error);
    }
  }

  /**
   * Mark a goal as completed
   */
  private async completeGoal(searchText: string): Promise<void> {
    try {
      const { data } = await this.client
        .from('memory')
        .select('id')
        .eq('type', 'goal')
        .ilike('content', `%${searchText}%`)
        .limit(1);

      if (data?.[0]) {
        await this.client
          .from('memory')
          .update({
            type: 'completed_goal',
            completed_at: new Date().toISOString(),
          })
          .eq('id', data[0].id);
      }
    } catch (error) {
      console.error('[Memory] Error completing goal:', error);
    }
  }

  /**
   * Get memory context (facts and goals) for prompt enrichment
   */
  async getMemoryContext(): Promise<string> {
    try {
      const [factsResult, goalsResult] = await Promise.all([
        this.client.rpc('get_facts'),
        this.client.rpc('get_active_goals'),
      ]);

      const parts: string[] = [];

      if (factsResult.data?.length) {
        parts.push(
          'FACTS:',
          ...factsResult.data.map((f: any) => `- ${f.content}`)
        );
      }

      if (goalsResult.data?.length) {
        const goals = goalsResult.data.map((g: any) => {
          const deadline = g.deadline
            ? ` (by ${new Date(g.deadline).toLocaleDateString()})`
            : '';
          return `- ${g.content}${deadline}`;
        });
        parts.push('', 'GOALS:', ...goals);
      }

      return parts.join('\n');
    } catch (error) {
      console.error('[Memory] Error getting memory context:', error);
      return '';
    }
  }

  /**
   * Semantic search for relevant past messages
   */
  async getRelevantContext(query: string, limit: number = 5): Promise<string> {
    try {
      const { data, error } = await this.client.functions.invoke('search', {
        body: {
          query,
          match_count: limit,
          table: 'messages',
        },
      });

      if (error || !data?.length) {
        return '';
      }

      const messages = data.map(
        (m: any) => `[${m.role}]: ${m.content}`
      );

      return ['RELEVANT PAST MESSAGES:', ...messages].join('\n');
    } catch (error) {
      // Search function not deployed yet - that's okay
      console.debug('[Memory] Search function not available yet');
      return '';
    }
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(limit: number = 20): Promise<Message[]> {
    try {
      const { data } = await this.client
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []) as Message[];
    } catch (error) {
      console.error('[Memory] Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Get all facts
   */
  async getFacts(): Promise<Memory[]> {
    try {
      const { data } = await this.client
        .from('memory')
        .select('*')
        .eq('type', 'fact')
        .order('created_at', { ascending: false });

      return (data || []) as Memory[];
    } catch (error) {
      console.error('[Memory] Error getting facts:', error);
      return [];
    }
  }

  /**
   * Get active goals
   */
  async getActiveGoals(): Promise<Memory[]> {
    try {
      const { data } = await this.client
        .from('memory')
        .select('*')
        .eq('type', 'goal')
        .order('created_at', { ascending: false });

      return (data || []) as Memory[];
    } catch (error) {
      console.error('[Memory] Error getting goals:', error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('messages')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}
