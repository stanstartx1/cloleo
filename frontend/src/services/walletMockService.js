// Mock service for wallet API calls
// This simulates backend responses for wallet operations

const mockWalletData = {
  balance: 50000,
  available_balance: 45000,
  pending_balance: 5000,
  currency: 'XOF',
  cards: [
    {
      id: '1',
      type: 'mobile_money',
      provider: 'Orange Money',
      phone: '+225 07 00 00 00 00',
      is_default: true
    },
    {
      id: '2',
      type: 'mobile_money',
      provider: 'MTN Mobile Money',
      phone: '+225 05 00 00 00 00',
      is_default: false
    }
  ],
  transactions: [
    {
      id: '1',
      type: 'credit',
      amount: 15000,
      description: 'Rechargement Mobile Money',
      date: '2024-08-14T10:30:00Z',
      status: 'completed'
    },
    {
      id: '2',
      type: 'debit',
      amount: 8500,
      description: 'Achat boutique Alpha',
      date: '2024-08-14T09:15:00Z',
      status: 'completed'
    },
    {
      id: '3',
      type: 'credit',
      amount: 25000,
      description: 'Remboursement commande',
      date: '2024-08-13T15:45:00Z',
      status: 'completed'
    },
    {
      id: '4',
      type: 'debit',
      amount: 12000,
      description: 'Commande #CLO-A1B2C3D4',
      date: '2024-08-13T14:20:00Z',
      status: 'pending'
    }
  ]
};

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const walletMockService = {
  // Get wallet balance
  getBalance: async () => {
    await delay(500);
    return {
      success: true,
      data: {
        balance: mockWalletData.balance,
        available_balance: mockWalletData.available_balance,
        pending_balance: mockWalletData.pending_balance,
        currency: mockWalletData.currency
      }
    };
  },

  // Get transactions
  getTransactions: async (filters = {}) => {
    await delay(500);
    let transactions = [...mockWalletData.transactions];
    
    // Apply filters if provided
    if (filters.type) {
      transactions = transactions.filter(t => t.type === filters.type);
    }
    if (filters.status) {
      transactions = transactions.filter(t => t.status === filters.status);
    }
    if (filters.limit) {
      transactions = transactions.slice(0, filters.limit);
    }
    
    return {
      success: true,
      data: transactions
    };
  },

  // Get payment methods
  getPaymentMethods: async () => {
    await delay(300);
    return {
      success: true,
      data: mockWalletData.cards
    };
  },

  // Deposit money
  deposit: async (amount, method) => {
    await delay(1500);
    
    if (amount < 100) {
      return {
        success: false,
        error: 'Montant minimum de 100 FCFA requis'
      };
    }
    
    // Update mock data
    mockWalletData.pending_balance += amount;
    mockWalletData.transactions.unshift({
      id: Date.now().toString(),
      type: 'credit',
      amount: amount,
      description: `Dépôt via ${method}`,
      date: new Date().toISOString(),
      status: 'pending'
    });
    
    return {
      success: true,
      data: {
        transaction_id: 'TXN-' + Date.now(),
        status: 'pending',
        amount: amount
      }
    };
  },

  // Transfer money
  transfer: async (amount, recipientPhone, recipientId = null) => {
    await delay(1500);
    
    if (amount < 100) {
      return {
        success: false,
        error: 'Montant minimum de 100 FCFA requis'
      };
    }
    
    if (amount > mockWalletData.available_balance) {
      return {
        success: false,
        error: 'Solde insuffisant'
      };
    }
    
    // Validate phone number
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(recipientPhone.replace(/\s/g, ''))) {
      return {
        success: false,
        error: 'Numéro de téléphone invalide'
      };
    }
    
    // Update mock data
    mockWalletData.available_balance -= amount;
    mockWalletData.balance -= amount;
    mockWalletData.transactions.unshift({
      id: Date.now().toString(),
      type: 'debit',
      amount: amount,
      description: `Transfert vers ${recipientPhone}`,
      date: new Date().toISOString(),
      status: 'completed'
    });
    
    return {
      success: true,
      data: {
        transaction_id: 'TXN-' + Date.now(),
        status: 'completed',
        amount: amount,
        recipient_phone: recipientPhone
      }
    };
  },

  // Add payment method
  addPaymentMethod: async (methodData) => {
    await delay(800);
    
    const newMethod = {
      id: Date.now().toString(),
      ...methodData,
      is_default: false
    };
    
    mockWalletData.cards.push(newMethod);
    
    return {
      success: true,
      data: newMethod
    };
  },

  // Set default payment method
  setDefaultPaymentMethod: async (methodId) => {
    await delay(400);
    
    mockWalletData.cards.forEach(card => {
      card.is_default = card.id === methodId;
    });
    
    return {
      success: true,
      data: { message: 'Méthode de paiement définie par défaut' }
    };
  },

  // Get QR code data
  getQRCodeData: async () => {
    await delay(300);
    
    return {
      success: true,
      data: {
        type: 'receive_payment',
        wallet_id: 'WAL-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        timestamp: Date.now()
      }
    };
  },

  // Simulate receiving payment via QR code
  receivePayment: async (amount) => {
    await delay(1000);
    
    mockWalletData.available_balance += amount;
    mockWalletData.balance += amount;
    mockWalletData.transactions.unshift({
      id: Date.now().toString(),
      type: 'credit',
      amount: amount,
      description: 'Paiement reçu via QR Code',
      date: new Date().toISOString(),
      status: 'completed'
    });
    
    return {
      success: true,
      data: {
        transaction_id: 'TXN-' + Date.now(),
        status: 'completed',
        amount: amount
      }
    };
  },

  // Get wallet statistics
  getStatistics: async () => {
    await delay(400);
    
    const transactions = mockWalletData.transactions;
    const totalCredits = transactions
      .filter(t => t.type === 'credit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = transactions
      .filter(t => t.type === 'debit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      success: true,
      data: {
        total_credits: totalCredits,
        total_debits: totalDebits,
        transaction_count: transactions.length,
        payment_methods_count: mockWalletData.cards.length
      }
    };
  }
};

export default walletMockService;