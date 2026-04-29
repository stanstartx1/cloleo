import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
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
  const { isAuthenticated } = useAuth();
  const { startConversation } = useChat();
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Handle opening chat via floating chat system
  const handleOpenChat = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour discuter avec le vendeur');
      return;
    }

    await startConversation(productId, dropshippedProductId, {
      seller_id: sellerId,
      seller_name: sellerName,
      product_name: productName,
      product_image: productImage
    });
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
      variant="outline"
      className="flex items-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
      data-testid="contact-seller-btn"
    >
      <MessageCircle className="w-4 h-4" />
      Contacter le vendeur
    </Button>
  );
};

export default ProductChat;
