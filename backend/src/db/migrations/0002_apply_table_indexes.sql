CREATE INDEX "idx_comments_post_created" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_author_created" ON "comments" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_status" ON "notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_posts_topic_created" ON "posts" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_posts_author_created" ON "posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_posts_created_at" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_reports_status" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reports_status_created" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_saved_posts_user" ON "saved_posts" USING btree ("user_id","saved_at");--> statement-breakpoint
CREATE INDEX "idx_topic_members_user" ON "topic_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_topics_trending" ON "topics" USING btree ("trending_score");--> statement-breakpoint
CREATE INDEX "idx_topics_last_activity" ON "topics" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "idx_user_badges_user" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_votes_post" ON "votes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_votes_comment" ON "votes" USING btree ("comment_id");