import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from './FloatingChat';
import { Button } from './ui/button';
import { toast } from 'sonner';

const ProductChat = ({ 
  productId, 
  dropshippedProductId,
  sellerId,
  sellerName,
  productName,
  productImage,
  autoOpen = false
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { startConversation } = useChat();
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Handle opening chat via floating chat system
  const handleOpenChat = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour discuter avec le vendeur');
      return;
    }

    const conversation = await startConversation(productId, dropshippedProductId, {
      seller_id: sellerId,
      seller_name: sellerName,
      product_name: productName,
      product_image: productImage
    });
    if (conversation?.conversationId) {
      navigate(`/mes-messages?conversation=${conversation.conversationId}`);
    } else {
      navigate('/mes-messages');
    }
  };

  // Auto-open chat when autoOpen prop is true and user is authenticated
  useEffect(() => {
    if (autoOpen && isAuthenticated && !hasAutoOpened) {
      setHasAutoOpened(true);
      handleOpenChat();
    }
  }, [autoOpen, isAuthenticated, hasAutoOpened]);

  return (
    <Button
      onClick={handleOpenChat}
      className="flex items-center gap-2 text-white font-semibold bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 hover:from-fuchsia-700 hover:via-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 animate-pulse"
      data-testid="contact-seller-btn"
    >
      <MessageCircle className="w-4 h-4" />
      Contacter le vendeur
    </Button>
  );
};

export default ProductChat;
