import { db } from '../db';
import { posts, comments, reports } from '../db/schema';
import { eq, and, desc, count as drizzleCount } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams } from '../types';

// Import enum types from schema
type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
type ReportType = 'POST' | 'COMMENT';

class ReportService {
  /**
   * Create a new report
   */
  async createReport(
    reporterId: string,
    type: ReportType,
    targetId: string,
    reason: string
  ): Promise<any> {
    // Verify target exists
    if (type === 'POST') {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, targetId),
      });
      if (!post) {
        throw new AppError(404, 'Reported post not found');
      }
    } else if (type === 'COMMENT') {
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, targetId),
      });
      if (!comment) {
        throw new AppError(404, 'Reported comment not found');
      }
    }

    // Check if user has already reported this content
    const existingReport = await db.query.reports.findFirst({
      where: and(
        eq(reports.reporterId, reporterId),
        eq(reports.type, type),
        eq(reports.targetId, targetId),
        eq(reports.status, 'PENDING')
      ),
    });

    if (existingReport) {
      throw new AppError(400, 'You have already reported this content');
    }

    // Create report
    const [createdReport] = await db.insert(reports).values({
      reporterId,
      type,
      targetId,
      reason,
    }).returning();

    // Fetch with relations
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, createdReport.id),
      with: {
        reporter: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    return report;
  }

  /**
   * Get all reports (moderator/admin only)
   */
  async getAllReports(
    { page = 1, limit = 20 }: PaginationParams,
    status?: ReportStatus
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const whereCondition = status ? eq(reports.status, status) : undefined;

    const [reportList, totalResult] = await Promise.all([
      db.query.reports.findMany({
        where: whereCondition,
        with: {
          reporter: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          resolver: {
            columns: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: desc(reports.createdAt),
        offset,
        limit,
      }),
      whereCondition
        ? db.select({ count: drizzleCount() }).from(reports).where(whereCondition)
        : db.select({ count: drizzleCount() }).from(reports),
    ]);

    const total = totalResult[0].count;

    return {
      data: reportList,
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

  /**
   * Get reports by status
   */
  async getReportsByStatus(
    status: ReportStatus,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    return this.getAllReports({ page, limit }, status);
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<any> {
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, reportId),
      with: {
        reporter: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
        resolver: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!report) {
      throw new AppError(404, 'Report not found');
    }

    return report;
  }

  /**
   * Get reports for a specific post
   */
  async getPostReports(
    postId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [reportList, totalResult] = await Promise.all([
      db.query.reports.findMany({
        where: and(
          eq(reports.type, 'POST'),
          eq(reports.targetId, postId)
        ),
        with: {
          reporter: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(reports.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(reports)
        .where(and(
          eq(reports.type, 'POST'),
          eq(reports.targetId, postId)
        )),
    ]);

    const total = totalResult[0].count;

    return {
      data: reportList,
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

  /**
   * Get reports for a specific comment
   */
  async getCommentReports(
    commentId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [reportList, totalResult] = await Promise.all([
      db.query.reports.findMany({
        where: and(
          eq(reports.type, 'COMMENT'),
          eq(reports.targetId, commentId)
        ),
        with: {
          reporter: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(reports.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(reports)
        .where(and(
          eq(reports.type, 'COMMENT'),
          eq(reports.targetId, commentId)
        )),
    ]);

    const total = totalResult[0].count;

    return {
      data: reportList,
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

  /**
   * Resolve a report (moderator only)
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    status: ReportStatus
  ): Promise<any> {
    if (status === 'PENDING') {
      throw new AppError(400, 'Cannot resolve a report to PENDING status');
    }

    const report = await db.query.reports.findFirst({
      where: eq(reports.id, reportId),
    });

    if (!report) {
      throw new AppError(404, 'Report not found');
    }

    await db.update(reports)
      .set({
        status,
        resolvedBy: moderatorId,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    const updatedReport = await db.query.reports.findFirst({
      where: eq(reports.id, reportId),
      with: {
        reporter: {
          columns: {
            id: true,
            username: true,
          },
        },
        resolver: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updatedReport;
  }

  /**
   * Dismiss a report (mark as dismissed)
   */
  async dismissReport(reportId: string, moderatorId: string): Promise<any> {
    return this.resolveReport(reportId, moderatorId, 'DISMISSED');
  }

  /**
   * Mark report as reviewed
   */
  async markAsReviewed(reportId: string, moderatorId: string): Promise<any> {
    return this.resolveReport(reportId, moderatorId, 'REVIEWED');
  }

  /**
   * Mark report as resolved (action was taken)
   */
  async markAsResolved(reportId: string, moderatorId: string): Promise<any> {
    return this.resolveReport(reportId, moderatorId, 'RESOLVED');
  }

  /**
   * Get reports submitted by a specific user
   */
  async getUserReports(
    userId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [reportList, totalResult] = await Promise.all([
      db.query.reports.findMany({
        where: eq(reports.reporterId, userId),
        with: {
          resolver: {
            columns: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: desc(reports.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(reports)
        .where(eq(reports.reporterId, userId)),
    ]);

    const total = totalResult[0].count;

    return {
      data: reportList,
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

  /**
   * Get report statistics
   */
  async getReportStats(): Promise<any> {
    const [totalResult, pendingResult, reviewedResult, resolvedResult, dismissedResult] = await Promise.all([
      db.select({ count: drizzleCount() }).from(reports),
      db.select({ count: drizzleCount() }).from(reports).where(eq(reports.status, 'PENDING')),
      db.select({ count: drizzleCount() }).from(reports).where(eq(reports.status, 'REVIEWED')),
      db.select({ count: drizzleCount() }).from(reports).where(eq(reports.status, 'RESOLVED')),
      db.select({ count: drizzleCount() }).from(reports).where(eq(reports.status, 'DISMISSED')),
    ]);

    return {
      total: totalResult[0].count,
      pending: pendingResult[0].count,
      reviewed: reviewedResult[0].count,
      resolved: resolvedResult[0].count,
      dismissed: dismissedResult[0].count,
    };
  }

  /**
   * Delete a report (admin only)
   */
  async deleteReport(reportId: string): Promise<void> {
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, reportId),
    });

    if (!report) {
      throw new AppError(404, 'Report not found');
    }

    await db.delete(reports)
      .where(eq(reports.id, reportId));
  }
}

export default new ReportService();
