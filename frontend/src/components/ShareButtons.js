import React, { useState } from 'react';
import { Share2, Copy, Check, Link2, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const ShareButtons = ({ 
  url, 
  title, 
  description,
  variant = 'default', // 'default', 'compact', 'inline'
  showLabel = true,
  className
}) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;
  const shareTitle = title || document.title;
  const shareDescription = description || '';

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Lien copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleShareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleShareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`,
      '_blank'
    );
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          onClick={handleNativeShare}
          className="p-2 rounded-full bg-gray-100 hover:bg-orange-100 hover:text-orange-600 transition-colors"
          title="Partager"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleCopyLink}
          className={cn(
            "p-2 rounded-full transition-colors",
            copied ? "bg-green-100 text-green-600" : "bg-gray-100 hover:bg-orange-100 hover:text-orange-600"
          )}
          title="Copier le lien"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNativeShare}
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          {showLabel && 'Partager'}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopyLink}
          className={cn("gap-2", copied && "bg-green-50 border-green-200 text-green-600")}
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {showLabel && (copied ? 'Copié !' : 'Copier le lien')}
        </Button>
      </div>
    );
  }

  // Default variant - full share panel
  return (
    <div className={cn("space-y-4", className)}>
      {showLabel && (
        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Partager
        </h4>
      )}
      
      {/* Copy Link */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="flex-1 bg-transparent text-sm text-gray-600 outline-none truncate"
        />
        <Button
          size="sm"
          onClick={handleCopyLink}
          className={cn(
            "transition-all",
            copied ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"
          )}
        >
          {copied ? (
            <><Check className="w-4 h-4 mr-1" /> Copié</>
          ) : (
            <><Copy className="w-4 h-4 mr-1" /> Copier</>
          )}
        </Button>
      </div>

      {/* Social Share Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleShareFacebook}
          className="w-12 h-12 rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-blue-500/30"
          title="Partager sur Facebook"
        >
          <Facebook className="w-5 h-5" />
        </button>
        <button
          onClick={handleShareTwitter}
          className="w-12 h-12 rounded-full bg-[#1DA1F2] hover:bg-[#1A91DA] text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-sky-500/30"
          title="Partager sur Twitter"
        >
          <Twitter className="w-5 h-5" />
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#22C55E] text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-green-500/30"
          title="Partager sur WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        <button
          onClick={handleNativeShare}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-orange-500/30"
          title="Plus d'options"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ShareButtons;
