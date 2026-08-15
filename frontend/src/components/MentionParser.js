/**
 * MentionParser - Component for parsing and rendering @mentions in text
 * Supports @username mentions with autocomplete
 */

import React, { useState, useRef, useEffect } from 'react';
import { AtSign, User } from 'lucide-react';

const MentionParser = ({ 
  value, 
  content,
  onChange, 
  placeholder = "Écrivez votre message...",
  rows = 4,
  mentionedUsers = [],
  onMention = null
}) => {
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const popupRef = useRef(null);

  // Support both value and content props for backward compatibility
  const textValue = value !== undefined ? value : content;

  // Handle text input
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    onChange(value);

    // Check if user is typing a mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      
      // Filter users based on query
      const filtered = mentionedUsers.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.username?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSelectedIndex(0);
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
      setMentionQuery('');
    }
  };

  // Handle mention selection
  const handleMentionSelect = (user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const value = textarea.value;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Find the @mention pattern
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newValue = beforeMention + `@${user.username || user.name} ` + textAfterCursor;
      
      onChange(newValue);
      setShowMentionPopup(false);
      setMentionQuery('');
      
      // Move cursor after the mention
      const newCursorPos = beforeMention.length + (user.username || user.name).length + 2;
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);

      if (onMention) {
        onMention(user);
      }
    }
  };

  // Handle keyboard navigation in mention popup
  const handleKeyDown = (e) => {
    if (!showMentionPopup || filteredUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleMentionSelect(filteredUsers[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentionPopup(false);
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowMentionPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse mentions for rendering
  const parseMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      parts.push(text.substring(lastIndex, match.index));
      parts.push({
        type: 'mention',
        username: match[1]
      });
      lastIndex = mentionRegex.lastIndex;
    }

    parts.push(text.substring(lastIndex));
    return parts;
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={textValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
      />

      {/* Mention Popup */}
      {showMentionPopup && filteredUsers.length > 0 && (
        <div
          ref={popupRef}
          className="absolute z-50 w-full max-h-60 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl mt-1"
        >
          {filteredUsers.map((user, index) => (
            <div
              key={user.id || index}
              onClick={() => handleMentionSelect(user)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex ? 'bg-purple-500/20' : 'hover:bg-slate-700'
              }`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.name?.[0] || 'U'}
                </div>
              )}
              <div className="flex-1">
                <p className="text-white font-medium">{user.name}</p>
                {user.username && (
                  <p className="text-xs text-slate-400">@{user.username}</p>
                )}
              </div>
              <AtSign className="w-4 h-4 text-purple-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * MentionRenderer - Component for rendering text with @mentions highlighted
 */
const MentionRenderer = ({ content, onMentionClick = null }) => {
  const parseMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      parts.push(text.substring(lastIndex, match.index));
      parts.push({
        type: 'mention',
        username: match[1]
      });
      lastIndex = mentionRegex.lastIndex;
    }

    parts.push(text.substring(lastIndex));
    return parts;
  };

  const parts = parseMentions(content);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        } else if (part.type === 'mention') {
          return (
            <span
              key={index}
              onClick={() => onMentionClick && onMentionClick(part.username)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded cursor-pointer hover:bg-purple-500/30 transition-colors"
            >
              <AtSign className="w-3 h-3" />
              {part.username}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};

export { MentionParser, MentionRenderer };
