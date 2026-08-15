/**
 * ThreadedComment - Component for displaying threaded/nested comments
 * Supports nested replies, voting, and best answer marking
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, ThumbsUp, ThumbsDown, Check, Reply, Send, Store } from 'lucide-react';
import { MentionRenderer } from './MentionParser';
import MediaImg from './MediaImg';

const ThreadedComment = ({
  comment,
  depth = 0,
  onReply,
  onVote,
  onMarkBestAnswer,
  isBestAnswer = false,
  isTopicAuthor = false,
  currentUserId = null,
  onContactAuthor,
  onViewShop,
  children = []
}) => {
  const [showReplies, setShowReplies] = useState(depth < 2); // Auto-expand first 2 levels
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const handleVote = (voteType) => {
    onVote(comment.id, voteType);
  };

  const voteScore = (comment.upvotes || 0) - (comment.downvotes || 0);

  return (
    <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-slate-200' : ''}`}>
      <div className={`relative ${isBestAnswer ? 'bg-green-50 border-2 border-green-500 rounded-lg p-4' : 'py-3'}`}>
        {/* Best Answer Badge */}
        {isBestAnswer && (
          <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Check className="w-3 h-3" />
            Meilleure réponse
          </div>
        )}

        {/* Comment Header */}
        <div className="flex items-start gap-3">
          {comment.author_avatar ? (
            <MediaImg
              src={comment.author_avatar}
              alt={comment.author_name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {comment.author_name?.[0] || 'U'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.author_name}</span>
              {comment.author_profile?.is_verified && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Vérifié</span>
              )}
              <span className="text-xs text-slate-400">
                {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {isTopicAuthor && comment.author_id === currentUserId && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  Auteur
                </span>
              )}
            </div>

            {/* Comment Content */}
            <div className="text-sm text-slate-700">
              <MentionRenderer
                content={comment.content}
                onMentionClick={(username) => console.log('Clicked mention:', username)}
              />
            </div>

            {/* Media */}
            {comment.media_url && (
              <div className="mt-2">
                <MediaImg
                  src={comment.media_url}
                  alt="Media"
                  className="max-w-[70%] h-auto rounded-lg"
                />
              </div>
            )}

            {/* Audio */}
            {comment.audio_url && (
              <div className="mt-2">
                <audio controls className="w-full" src={comment.audio_url}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Comment Actions */}
            <div className="flex items-center gap-4 mt-2">
              {/* Voting */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleVote('up')}
                  className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                    comment.user_vote === 'up' ? 'text-green-600' : 'text-slate-400'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">{voteScore}</span>
                <button
                  onClick={() => handleVote('down')}
                  className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                    comment.user_vote === 'down' ? 'text-red-600' : 'text-slate-400'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>

              {/* Reply */}
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 transition-colors"
              >
                <Reply className="w-4 h-4" />
                Répondre
              </button>

              {comment.author_id !== currentUserId && onContactAuthor && (
                <button
                  onClick={() => onContactAuthor(comment.author_profile || comment)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 transition-colors"
                  title={`Écrire à ${comment.author_name}`}
                >
                  <Send className="w-4 h-4" />
                  Écrire
                </button>
              )}

              {comment.author_id !== currentUserId && comment.author_profile?.role !== 'admin' && onViewShop && (
                <button
                  onClick={() => onViewShop(comment.author_profile || comment)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 transition-colors"
                >
                  <Store className="w-4 h-4" />
                  Boutique
                </button>
              )}

              {/* Mark as Best Answer (topic author only) */}
              {isTopicAuthor && !isBestAnswer && depth === 0 && (
                <button
                  onClick={() => onMarkBestAnswer(comment.id)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-green-600 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Meilleure réponse
                </button>
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Écrivez votre réponse..."
                  rows={3}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleReply}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Envoyer
                  </button>
                  <button
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyContent('');
                    }}
                    className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {children && children.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 transition-colors mb-2"
          >
            {showReplies ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{children.length} réponse{children.length > 1 ? 's' : ''}</span>
          </button>

          {showReplies && (
            <div className="space-y-3">
              {children.map((child) => (
                <ThreadedComment
                  key={child.id}
                  comment={child}
                  depth={depth + 1}
                  onReply={onReply}
                  onVote={onVote}
                  isTopicAuthor={isTopicAuthor}
                  currentUserId={currentUserId}
                  onContactAuthor={onContactAuthor}
                  onViewShop={onViewShop}
                  children={child.replies || []}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadedComment;
