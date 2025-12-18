import { db } from '../db';
import { topics, topicMembers, postTags, posts } from '../db/schema';
import { eq, and, asc, desc, count as drizzleCount } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';

class TagService {
  /**
   * Create a new tag (moderator only)
   */
  async createTag(
    moderatorId: string,
    topicId: string,
    data: {
      name: string;
      color?: string;
      description?: string;
    }
  ): Promise<any> {
    // Verify topic exists
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    // Verify user is a moderator or owner
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, moderatorId)
      ),
    });

    if (!membership || (membership.role !== 'MODERATOR' && topic.ownerId !== moderatorId)) {
      throw new AppError(403, 'Only moderators can create tags');
    }

    // Check if tag name already exists in this topic
    const existingTag = await db.query.postTags.findFirst({
      where: and(
        eq(postTags.topicId, topicId),
        eq(postTags.name, data.name)
      ),
    });

    if (existingTag) {
      throw new AppError(409, 'Tag with this name already exists in this topic');
    }

    // Create tag
    const [tag] = await db.insert(postTags).values({
      topicId,
      name: data.name,
      bgColor: data.color || '#0079D3',
    }).returning();

    return tag;
  }

  /**
   * Get all tags for a topic
   */
  async getTopicTags(topicId: string): Promise<any[]> {
    const tagList = await db.query.postTags.findMany({
      where: eq(postTags.topicId, topicId),
      orderBy: asc(postTags.name),
    });

    // Add post counts
    const tagsWithCounts = await Promise.all(
      tagList.map(async (tag) => {
        const postCount = await db.select({ count: drizzleCount() })
          .from(posts)
          .where(eq(posts.tagId, tag.id));

        return {
          ...tag,
          _count: {
            posts: postCount[0].count,
          },
        };
      })
    );

    return tagsWithCounts;
  }

  /**
   * Get tag by ID
   */
  async getTagById(tagId: string): Promise<any> {
    const tag = await db.query.postTags.findFirst({
      where: eq(postTags.id, tagId),
      with: {
        topic: {
          columns: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    if (!tag) {
      throw new AppError(404, 'Tag not found');
    }

    // Count posts
    const postCount = await db.select({ count: drizzleCount() })
      .from(posts)
      .where(eq(posts.tagId, tagId));

    return {
      ...tag,
      _count: {
        posts: postCount[0].count,
      },
    };
  }

  /**
   * Update a tag (moderator only)
   */
  async updateTag(
    moderatorId: string,
    tagId: string,
    data: {
      name?: string;
      color?: string;
      description?: string;
    }
  ): Promise<any> {
    // Get tag with topic info
    const tag = await db.query.postTags.findFirst({
      where: eq(postTags.id, tagId),
      with: { topic: true },
    });

    if (!tag) {
      throw new AppError(404, 'Tag not found');
    }

    // Verify user is a moderator or owner
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, tag.topicId),
        eq(topicMembers.userId, moderatorId)
      ),
    });

    if (!membership || (membership.role !== 'MODERATOR' && tag.topic.ownerId !== moderatorId)) {
      throw new AppError(403, 'Only moderators can update tags');
    }

    // If name is being changed, check for duplicates
    if (data.name && data.name !== tag.name) {
      const existingTag = await db.query.postTags.findFirst({
        where: and(
          eq(postTags.topicId, tag.topicId),
          eq(postTags.name, data.name)
        ),
      });

      if (existingTag) {
        throw new AppError(409, 'Tag with this name already exists in this topic');
      }
    }

    // Update tag
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.color) updateData.bgColor = data.color;
    if (data.description !== undefined) updateData.description = data.description;

    await db.update(postTags)
      .set(updateData)
      .where(eq(postTags.id, tagId));

    const updatedTag = await db.query.postTags.findFirst({
      where: eq(postTags.id, tagId),
    });

    return updatedTag;
  }

  /**
   * Delete a tag (moderator only)
   */
  async deleteTag(tagId: string, moderatorId: string): Promise<void> {
    // Get tag with topic info
    const tag = await db.query.postTags.findFirst({
      where: eq(postTags.id, tagId),
      with: { topic: true },
    });

    if (!tag) {
      throw new AppError(404, 'Tag not found');
    }

    // Verify user is a moderator or owner
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, tag.topicId),
        eq(topicMembers.userId, moderatorId)
      ),
    });

    if (!membership || (membership.role !== 'MODERATOR' && tag.topic.ownerId !== moderatorId)) {
      throw new AppError(403, 'Only moderators can delete tags');
    }

    // Check if tag is being used
    const postCountResult = await db.select({ count: drizzleCount() })
      .from(posts)
      .where(eq(posts.tagId, tagId));

    const postCount = postCountResult[0].count;

    if (postCount > 0) {
      throw new AppError(
        400,
        `Cannot delete tag "${tag.name}" because it is being used by ${postCount} post(s). Please remove the tag from all posts first.`
      );
    }

    // Delete tag
    await db.delete(postTags)
      .where(eq(postTags.id, tagId));
  }

  /**
   * Get posts with a specific tag
   */
  async getPostsByTag(
    tagId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [postList, totalResult] = await Promise.all([
      db.query.posts.findMany({
        where: and(
          eq(posts.tagId, tagId),
          eq(posts.isDeleted, false)
        ),
        with: {
          author: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          topic: {
            columns: {
              name: true,
              displayName: true,
            },
          },
          tag: true,
        },
        orderBy: desc(posts.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(posts)
        .where(and(
          eq(posts.tagId, tagId),
          eq(posts.isDeleted, false)
        )),
    ]);

    const total = totalResult[0].count;

    return {
      data: postList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }
}

export default new TagService();
