import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import topicRoutes from './topic.routes';
import postRoutes from './post.routes';
import commentRoutes from './comment.routes';
import voteRoutes from './vote.routes';
import notificationRoutes from './notification.routes';
import tagRoutes from './tag.routes';
import badgeRoutes from './badge.routes';
import reportRoutes from './report.routes';
import savedPostRoutes from './savedPost.routes';
import trendingRoutes from './trending.routes';
import searchRoutes from './search.routes';
import feedRoutes from './feed.routes';
import messageRoutes from './message.routes';
import blockRoutes from './block.routes';
import modLogRoutes from './modLog.routes';
import automodRoutes from './automod.routes';
import mentionRoutes from './mention.routes';
import uploadRoutes from './upload.routes';

const router = Router();

// Core routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/topics', topicRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/votes', voteRoutes);
router.use('/notifications', notificationRoutes);

// Feature routes (Phase 2)
router.use('/tags', tagRoutes);
router.use('/badges', badgeRoutes);
router.use('/reports', reportRoutes);
router.use('/saved', savedPostRoutes);
router.use('/trending', trendingRoutes);
router.use('/search', searchRoutes);
router.use('/feed', feedRoutes);

// Feature routes (Phase 3)
router.use('/messages', messageRoutes);
router.use('/blocks', blockRoutes);
router.use('/modlog', modLogRoutes);
router.use('/automod', automodRoutes);
router.use('/mentions', mentionRoutes);

// File uploads
router.use('/upload', uploadRoutes);

export default router;
