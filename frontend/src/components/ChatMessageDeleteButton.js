import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteChatMessage } from '../utils/chatApi';

const ChatMessageDeleteButton = ({
  token,
  conversationId,
  messageId,
  onDeleted,
  className = 'text-slate-400 hover:text-red-500',
  disabled = false,
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!token || !conversationId || !messageId || deleting || disabled) return;
    if (!window.confirm('Supprimer ce message ?')) return;

    setDeleting(true);
    try {
      await deleteChatMessage(token, conversationId, messageId);
      onDeleted?.(messageId);
      toast.success('Message supprimé');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Impossible de supprimer le message');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting || disabled}
      className={`p-1 rounded opacity-70 hover:opacity-100 disabled:opacity-40 ${className}`}
      aria-label="Supprimer le message"
      title="Supprimer"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
};

export default ChatMessageDeleteButton;
