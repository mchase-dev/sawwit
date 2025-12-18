import { db } from '../db';
import { topics, automodRules, topicMembers } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import modLogService from './modLogService';

// Import enum types from schema
type AutomodAction = 'REMOVE' | 'REPORT' | 'FILTER' | 'LOCK' | 'MESSAGE' | 'APPROVE';

interface AutomodCondition {
  type: string; // e.g., 'title_contains', 'content_contains', 'user_karma_below'
  operator?: string; // e.g., 'contains', 'equals', 'less_than'
  value: string | number;
}

class AutomodService {
  /**
   * Create an automod rule (moderator only)
   */
  async createRule(
    topicId: string,
    moderatorId: string,
    data: {
      name: string;
      conditions: AutomodCondition[];
      action: AutomodAction;
      actionData?: any;
      priority?: number;
      enabled?: boolean;
    }
  ): Promise<any> {
    // Verify topic exists
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    // Check if user is a moderator or owner
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, moderatorId)
      ),
    });

    if (!membership || (membership.role !== 'MODERATOR' && topic.ownerId !== moderatorId)) {
      throw new AppError(403, 'Only moderators can create automod rules');
    }

    // Create rule
    const [createdRule] = await db.insert(automodRules).values({
      topicId,
      name: data.name,
      conditions: JSON.stringify(data.conditions),
      action: data.action,
      actionData: data.actionData ? JSON.stringify(data.actionData) : null,
      priority: data.priority || 0,
      enabled: data.enabled !== false,
      createdBy: moderatorId,
    }).returning();

    // Fetch with relations
    const rule = await db.query.automodRules.findFirst({
      where: eq(automodRules.id, createdRule.id),
      with: {
        topic: {
          columns: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        creator: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Log rule creation
    await modLogService.createLog({
      moderatorId,
      topicId,
      action: 'ADD_MODERATOR', // Using existing ModAction enum value
      targetType: 'POST',
      targetId: createdRule.id,
      reason: `Created automod rule: ${data.name}`,
    });

    return {
      ...rule,
      conditions: JSON.parse(rule!.conditions),
      actionData: rule!.actionData ? JSON.parse(rule!.actionData) : null,
    };
  }

  /**
   * Get all automod rules for a topic
   */
  async getTopicRules(topicId: string): Promise<any[]> {
    // Verify topic exists
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    const rules = await db.query.automodRules.findMany({
      where: eq(automodRules.topicId, topicId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [desc(automodRules.priority), desc(automodRules.createdAt)],
    });

    return rules.map((rule) => ({
      ...rule,
      conditions: JSON.parse(rule.conditions),
      actionData: rule.actionData ? JSON.parse(rule.actionData) : null,
    }));
  }

  /**
   * Get active (enabled) automod rules for a topic
   */
  async getActiveTopicRules(topicId: string): Promise<any[]> {
    const rules = await db.query.automodRules.findMany({
      where: and(
        eq(automodRules.topicId, topicId),
        eq(automodRules.enabled, true)
      ),
      orderBy: [desc(automodRules.priority), desc(automodRules.createdAt)],
    });

    return rules.map((rule) => ({
      ...rule,
      conditions: JSON.parse(rule.conditions),
      actionData: rule.actionData ? JSON.parse(rule.actionData) : null,
    }));
  }

  /**
   * Get rule by ID
   */
  async getRuleById(ruleId: string): Promise<any> {
    const rule = await db.query.automodRules.findFirst({
      where: eq(automodRules.id, ruleId),
      with: {
        topic: {
          columns: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        creator: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!rule) {
      throw new AppError(404, 'Automod rule not found');
    }

    return {
      ...rule,
      conditions: JSON.parse(rule.conditions),
      actionData: rule.actionData ? JSON.parse(rule.actionData) : null,
    };
  }

  /**
   * Update an automod rule (moderator only)
   */
  async updateRule(
    ruleId: string,
    moderatorId: string,
    data: {
      name?: string;
      conditions?: AutomodCondition[];
      action?: AutomodAction;
      actionData?: any;
      priority?: number;
      enabled?: boolean;
    }
  ): Promise<any> {
    const rule = await db.query.automodRules.findFirst({
      where: eq(automodRules.id, ruleId),
      with: {
        topic: true,
      },
    });

    if (!rule) {
      throw new AppError(404, 'Automod rule not found');
    }

    // Check if user is a moderator or owner
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, rule.topicId),
        eq(topicMembers.userId, moderatorId)
      ),
    });

    if (!membership || (membership.role !== 'MODERATOR' && rule.topic.ownerId !== moderatorId)) {
      throw new AppError(403, 'Only moderators can update automod rules');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.conditions !== undefined)
      updateData.conditions = JSON.stringify(data.conditions);
    if (data.action !== undefined) updateData.action = data.action;
    if (data.actionData !== undefined)
      updateData.actionData = JSON.stringify(data.actionData);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;

    await db.update(automodRules)
      .set(updateData)
      .where(eq(automodRules.id, ruleId));

    const updatedRule = await db.query.automodRules.findFirst({
      where: eq(automodRules.id, ruleId),
      with: {
        topic: {
          columns: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        creator: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Log rule update
    await modLogService.createLog({
      moderatorId,
      topicId: rule.topicId,
      action: 'ADD_MODERATOR', // Using existing ModAction enum value
      targetType: 'POST',
      targetId: rule.id,
      reason: `Updated automod rule: ${updatedRule!.name}`,
    });

    return {
      ...updatedRule,
      conditions: JSON.parse(updatedRule!.conditions),
      actionData: updatedRule!.actionData ? JSON.parse(updatedRule!.actionData) : null,
    };
  }

  /**
   * Delete an automod rule (moderator only)
   */
  async deleteRule(ruleId: string, moderatorId: string): Promise<void> {
    const rule = await db.query.automodRules.findFirst({
      where: eq(automodRules.id, ruleId),
      with: {
        topic: true,
      },
    });

    if (!rule) {
      throw new AppError(404, 'Automod rule not found');
    }

    // Check if user is a moderator or owner
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, rule.topicId),
        eq(topicMembers.userId, moderatorId)
      ),
    });

    if (!membership || (membership.role !== 'MODERATOR' && rule.topic.ownerId !== moderatorId)) {
      throw new AppError(403, 'Only moderators can delete automod rules');
    }

    await db.delete(automodRules)
      .where(eq(automodRules.id, ruleId));

    // Log rule deletion
    await modLogService.createLog({
      moderatorId,
      topicId: rule.topicId,
      action: 'REMOVE_MODERATOR', // Using existing ModAction enum value
      targetType: 'POST',
      targetId: ruleId,
      reason: `Deleted automod rule: ${rule.name}`,
    });
  }

  /**
   * Toggle rule enabled status (moderator only)
   */
  async toggleRule(ruleId: string, enabled: boolean): Promise<any> {
    const rule = await db.query.automodRules.findFirst({
      where: eq(automodRules.id, ruleId),
    });

    if (!rule) {
      throw new AppError(404, 'Automod rule not found');
    }

    await db.update(automodRules)
      .set({ enabled })
      .where(eq(automodRules.id, ruleId));

    const updatedRule = await db.query.automodRules.findFirst({
      where: eq(automodRules.id, ruleId),
    });

    return {
      ...updatedRule,
      conditions: JSON.parse(updatedRule!.conditions),
      actionData: updatedRule!.actionData ? JSON.parse(updatedRule!.actionData) : null,
    };
  }
}

export default new AutomodService();
