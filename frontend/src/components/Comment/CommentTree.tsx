import React, { useState } from 'react';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  voteCount: number;
  createdAt: string;
  updatedAt?: string;
  children?: Comment[];
}

interface CommentTreeProps {
  comments: Comment[];
  currentUserId?: string;
  onUpvote: (commentId: string) => void;
  onDownvote: (commentId: string) => void;
  onReply: (commentId: string, content: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  getUserVote?: (commentId: string) => 'upvote' | 'downvote' | null;
  depth?: number;
}

export const CommentTree: React.FC<CommentTreeProps> = ({
  comments,
  currentUserId,
  onUpvote,
  onDownvote,
  onReply,
  onEdit,
  onDelete,
  getUserVote,
  depth = 0,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());

  const handleReply = async (commentId: string, content: string) => {
    await onReply(commentId, content);
    setReplyingTo(null);
  };

  const handleEdit = async (commentId: string, newContent: string) => {
    if (onEdit) {
      await onEdit(commentId, newContent);
      setEditingId(null);
    }
  };

  const toggleCollapse = (commentId: string) => {
    setCollapsedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  return (
    <div>
      {comments.map((comment) => {
        const isOwner = currentUserId === comment.author.id;
        const isCollapsed = collapsedComments.has(comment.id);
        const userVote = getUserVote ? getUserVote(comment.id) : null;

        return (
          <div key={comment.id}>
            <CommentItem
              comment={comment}
              userVote={userVote}
              onUpvote={() => onUpvote(comment.id)}
              onDownvote={() => onDownvote(comment.id)}
              onReply={() => setReplyingTo(comment.id)}
              onEdit={onEdit ? (newContent) => handleEdit(comment.id, newContent) : undefined}
              onDelete={onDelete ? () => onDelete(comment.id) : undefined}
              isEditing={editingId === comment.id}
              onStartEdit={() => setEditingId(comment.id)}
              onCancelEdit={() => setEditingId(null)}
              isOwner={isOwner}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCollapse(comment.id)}
              depth={depth}
            >
              {!isCollapsed && (
                <>
                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                      <CommentForm
                        onSubmit={(content) => handleReply(comment.id, content)}
                        onCancel={() => setReplyingTo(null)}
                        placeholder="Write a reply..."
                        submitText="Reply"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Nested Comments */}
                  {comment.children && comment.children.length > 0 && (
                    <CommentTree
                      comments={comment.children}
                      currentUserId={currentUserId}
                      onUpvote={onUpvote}
                      onDownvote={onDownvote}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      getUserVote={getUserVote}
                      depth={depth + 1}
                    />
                  )}
                </>
              )}
            </CommentItem>
          </div>
        );
      })}
    </div>
  );
};
