/**
 * MarkdownEditor - Rich text editor with Markdown support
 * Supports bold, italic, code, links, lists, tables, and more
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Code, Link, List, ListOrdered, 
  Heading1, Heading2, Quote, Image, Code2,
  Undo, Redo, HelpCircle
} from 'lucide-react';
import { MentionParser } from './MentionParser';

const MarkdownEditor = ({ 
  value, 
  onChange, 
  placeholder = "Écrivez en Markdown...",
  rows = 10,
  showPreview = false,
  toolbar = true,
  enableMentions = false,
  mentionedUsers = [],
  onMention = null
}) => {
  const [previewHtml, setPreviewHtml] = useState('');
  const textareaRef = useRef(null);

  // Simple markdown parser (in production, use a library like marked.js)
  const parseMarkdown = (markdown) => {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-image" />')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Unordered lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Line breaks
      .replace(/\n/g, '<br />');
    
    return html;
  };

  useEffect(() => {
    if (showPreview) {
      setPreviewHtml(parseMarkdown(value));
    }
  }, [value, showPreview]);

  const insertMarkdown = (before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || placeholder;

    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    onChange(newText);

    // Set cursor position after insertion
    const newCursorPos = start + before.length + selectedText.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => insertMarkdown('**', '**', 'texte en gras');
  const handleItalic = () => insertMarkdown('*', '*', 'texte en italique');
  const handleCode = () => insertMarkdown('`', '`', 'code');
  const handleCodeBlock = () => insertMarkdown('```\n', '\n```', 'code');
  const handleLink = () => insertMarkdown('[', '](url)', 'texte du lien');
  const handleImage = () => insertMarkdown('![alt](', ')', 'url de l\'image');
  const handleH1 = () => insertMarkdown('# ', '', 'Titre');
  const handleH2 = () => insertMarkdown('## ', '', 'Sous-titre');
  const handleQuote = () => insertMarkdown('> ', '', 'Citation');
  const handleList = () => insertMarkdown('* ', '', 'Élément de liste');
  const handleOrderedList = () => insertMarkdown('1. ', '', 'Élément de liste numérotée');

  return (
    <div className="w-full">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100 border border-slate-300 rounded-t-lg">
          <button
            onClick={handleBold}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Gras (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={handleItalic}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Italique (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={handleCode}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Code inline"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={handleCodeBlock}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Bloc de code"
          >
            <Code2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <button
            onClick={handleLink}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Lien"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            onClick={handleImage}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Image"
          >
            <Image className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <button
            onClick={handleH1}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Titre H1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={handleH2}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Titre H2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleQuote}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Citation"
          >
            <Quote className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <button
            onClick={handleList}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Liste à puces"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={handleOrderedList}
            className="p-2 hover:bg-slate-200 rounded transition-colors"
            title="Liste numérotée"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`p-2 rounded transition-colors ${
              showPreview ? 'bg-purple-500 text-white' : 'hover:bg-slate-200'
            }`}
            title="Aperçu"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {enableMentions ? (
        <MentionParser
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          mentionedUsers={mentionedUsers}
          onMention={onMention}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full p-3 border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
            toolbar ? 'rounded-b-lg' : 'rounded-lg'
          } ${showPreview ? 'hidden' : ''}`}
        />
      )}

      {showPreview && (
        <div 
          className="w-full p-4 border border-slate-300 bg-white rounded-b-lg prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      <div className="mt-2 text-xs text-slate-500">
        <span className="font-medium">Markdown supporté:</span> **gras**, *italique*, `code`, [lien](url), # titre, > citation, * liste
      </div>
    </div>
  );
};

export default MarkdownEditor;
