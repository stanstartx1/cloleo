import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, History, 
  CreditCard, Plus, QrCode, Send, RefreshCw,
  TrendingUp, AlertCircle, CheckCircle, Clock, Eye, EyeOff, Scan, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { API_URL } from '../config/api';
import { QRCodeSVG } from 'qrcode.react';
import walletMockService from '../services/walletMockService';

// Custom animation wrapper
const AnimatedCard = ({ children, delay = 0 }) => {
  return (
    <div
      style={{
        animation: `fadeInUp 0.5s ease-out ${delay}s both`
      }}
    >
      {children}
    </div>
  );
};

// Simple balance chart component
const BalanceChart = ({ transactions }) => {
  // Process transactions to create chart data
  const chartData = transactions
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7); // Last 7 transactions
  
  if (chartData.length < 2) {
    return (
      <div className="text-center py-8 text-slate-500">
        <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Pas assez de données pour afficher le graphique</p>
      </div>
    );
  }
  
  // Calculate cumulative balance
  let cumulativeBalance = 0;
  const dataPoints = chartData.map(t => {
    cumulativeBalance += t.type === 'credit' ? t.amount : -t.amount;
    return {
      date: new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      balance: cumulativeBalance
    };
  });
  
  const maxBalance = Math.max(...dataPoints.map(d => d.balance));
  const minBalance = Math.min(...dataPoints.map(d => d.balance));
  const range = maxBalance - minBalance || 1;
  
  return (
    <div className="relative h-48 w-full">
      <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1="0"
            y1={ratio * 150}
            x2="400"
            y2={ratio * 150}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        
        {/* Chart line */}
        <polyline
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          points={dataPoints.map((d, i) => {
            const x = (i / (dataPoints.length - 1)) * 400;
            const y = 150 - ((d.balance - minBalance) / range) * 130 - 10;
            return `${x},${y}`;
          }).join(' ')}
        />
        
        {/* Data points */}
        {dataPoints.map((d, i) => {
          const x = (i / (dataPoints.length - 1)) * 400;
          const y = 150 - ((d.balance - minBalance) / range) * 130 - 10;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#f97316"
              className="hover:r-6 transition-all cursor-pointer"
            />
          );
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        {dataPoints.map((d, i) => (
          <span key={i}>{d.date}</span>
        ))}
      </div>
    </div>
  );
};

const API = API_URL;

const formatBalance = (balance) => {
  if (balance === null || balance === undefined) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(balance) + ' FCFA';
};

const WalletPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  
  // Wallet data (mock for now, will be replaced with API calls)
  const [walletData, setWalletData] = useState({
    balance: 0,
    available_balance: 0,
    pending_balance: 0,
    currency: 'XOF',
    transactions: [],
    cards: []
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Fetch wallet data using mock service
    const fetchWalletData = async () => {
      setLoading(true);
      try {
        // Use mock service - will be replaced with actual API calls
        const [balanceResponse, transactionsResponse, cardsResponse] = await Promise.all([
          walletMockService.getBalance(),
          walletMockService.getTransactions(),
          walletMockService.getPaymentMethods()
        ]);
        
        if (balanceResponse.success) {
          setWalletData(prev => ({
            ...prev,
            balance: balanceResponse.data.balance,
            available_balance: balanceResponse.data.available_balance,
            pending_balance: balanceResponse.data.pending_balance,
            currency: balanceResponse.data.currency
          }));
        }
        
        if (transactionsResponse.success) {
          setWalletData(prev => ({
            ...prev,
            transactions: transactionsResponse.data
          }));
        }
        
        if (cardsResponse.success) {
          setWalletData(prev => ({
            ...prev,
            cards: cardsResponse.data
          }));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        toast.error('Erreur lors du chargement du wallet');
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [token]);

  const handleRefresh = () => {
    setLoading(true);
    // Will be replaced with actual API call
    setTimeout(() => {
      setLoading(false);
      toast.success('Solde mis à jour');
    }, 1000);
  };

  const handleGenerateQR = () => {
    // Generate QR code data for receiving money
    // In production, this would be a unique payment link or code
    const qrData = JSON.stringify({
      type: 'receive_payment',
      user_id: user?.id,
      wallet_id: 'WAL-' + (user?.id || '').slice(0, 8).toUpperCase(),
      timestamp: Date.now()
    });
    setQrCodeData(qrData);
    setShowQRModal(true);
  };

  const handleScanQR = () => {
    setShowScanModal(true);
    // QR scanning will be implemented with a library like react-qr-reader
    toast.info('Scan QR code pour un transfert rapide', {
      description: 'Fonctionnalité de scan à venir avec caméra'
    });
  };

  const handleReceivePayment = (amount) => {
    toast.success('Paiement reçu !', {
      description: `${formatBalance(amount)} ajoutés à votre portefeuille`
    });
    setWalletData(prev => ({
      ...prev,
      available_balance: prev.available_balance + amount,
      transactions: [
        {
          id: Date.now().toString(),
          type: 'credit',
          amount: amount,
          description: 'Paiement reçu via QR Code',
          date: new Date().toISOString(),
          status: 'completed'
        },
        ...prev.transactions
      ]
    }));
    setShowQRModal(false);
  };

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide', {
        description: 'Le montant doit être supérieur à 0 FCFA'
      });
      return;
    }
    if (parseFloat(depositAmount) < 100) {
      toast.error('Montant minimum non atteint', {
        description: 'Le dépôt minimum est de 100 FCFA'
      });
      return;
    }
    
    toast.loading('Traitement de la demande de dépôt...', {
      description: 'Veuillez patienter pendant le traitement'
    });
    
    // Simulate API call delay
    setTimeout(() => {
      toast.dismiss();
      toast.success('Demande de dépôt envoyée avec succès !', {
        description: 'Vous recevrez une confirmation sur votre téléphone',
        action: {
          label: 'Voir les détails',
          onClick: () => setActiveTab('history')
        }
      });
      setDepositAmount('');
      
      // Update mock balance
      setWalletData(prev => ({
        ...prev,
        pending_balance: prev.pending_balance + parseFloat(depositAmount)
      }));
    }, 2000);
  };

  const handleTransfer = () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide', {
        description: 'Le montant doit être supérieur à 0 FCFA'
      });
      return;
    }
    if (!transferPhone) {
      toast.error('Numéro de téléphone requis', {
        description: 'Veuillez entrer le numéro du destinataire'
      });
      return;
    }
    if (parseFloat(transferAmount) > walletData.available_balance) {
      toast.error('Solde insuffisant', {
        description: `Votre solde disponible est de ${formatBalance(walletData.available_balance)}`
      });
      return;
    }
    if (parseFloat(transferAmount) < 100) {
      toast.error('Montant minimum non atteint', {
        description: 'Le transfert minimum est de 100 FCFA'
      });
      return;
    }
    
    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(transferPhone.replace(/\s/g, ''))) {
      toast.error('Format de téléphone invalide', {
        description: 'Veuillez entrer un numéro de téléphone valide'
      });
      return;
    }
    
    toast.loading('Traitement du transfert...', {
      description: 'Veuillez patienter pendant le traitement'
    });
    
    // Simulate API call delay
    setTimeout(() => {
      toast.dismiss();
      toast.success('Transfert effectué avec succès !', {
        description: `${formatBalance(transferAmount)} envoyés à ${transferPhone}`,
        action: {
          label: 'Voir l\'historique',
          onClick: () => setActiveTab('history')
        }
      });
      setTransferAmount('');
      setTransferPhone('');
      
      // Update mock balance
      setWalletData(prev => ({
        ...prev,
        available_balance: prev.available_balance - parseFloat(transferAmount),
        transactions: [
          {
            id: Date.now().toString(),
            type: 'debit',
            amount: parseFloat(transferAmount),
            description: `Transfert vers ${transferPhone}`,
            date: new Date().toISOString(),
            status: 'completed'
          },
          ...prev.transactions
        ]
      }));
    }, 2000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement du wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white py-8 px-4">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          .animate-pulse-once {
            animation: pulse 0.3s ease-in-out;
          }
          .transaction-item {
            animation: slideIn 0.3s ease-out both;
          }
        `}
      </style>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-orange-500" />
              Mon Portefeuille
            </h1>
            <p className="text-slate-600 mt-1">Gérez vos finances et transactions</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="rounded-full"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        {/* Balance Card */}
        <AnimatedCard delay={0}>
          <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-xl mb-6 hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-orange-100 text-sm mb-1">Solde disponible</p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl md:text-4xl font-bold transition-all duration-300">
                      {showBalance ? formatBalance(walletData.available_balance) : '•••••••'}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-white hover:bg-orange-600/30 transition-colors"
                    >
                      {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </Button>
                  </div>
                  {walletData.pending_balance > 0 && (
                    <p className="text-orange-100 text-sm mt-2">
                      + {formatBalance(walletData.pending_balance)} en attente
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    className="bg-white text-orange-600 hover:bg-orange-50 text-sm md:text-base transition-all duration-300 hover:scale-105"
                    onClick={() => setActiveTab('deposit')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Déposer
                  </Button>
                  <Button 
                    className="bg-orange-600 text-white hover:bg-orange-700 text-sm md:text-base transition-all duration-300 hover:scale-105"
                    onClick={() => setActiveTab('transfer')}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Transférer
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-white text-orange-600 hover:bg-orange-50 border-orange-200 text-sm md:text-base hidden sm:flex transition-all duration-300 hover:scale-105"
                    onClick={handleGenerateQR}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Code
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs md:text-sm py-3">
              <Wallet className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Aperçu</span>
              <span className="sm:hidden">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger value="deposit" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs md:text-sm py-3">
              <ArrowDownLeft className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Déposer</span>
              <span className="sm:hidden">Déposer</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs md:text-sm py-3">
              <ArrowUpRight className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Transférer</span>
              <span className="sm:hidden">Transférer</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs md:text-sm py-3">
              <History className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Historique</span>
              <span className="sm:hidden">Historique</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Balance Chart */}
            <AnimatedCard delay={0}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-lg">Évolution du solde</CardTitle>
                  <CardDescription>Dernières 7 transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <BalanceChart transactions={walletData.transactions} />
                </CardContent>
              </Card>
            </AnimatedCard>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <AnimatedCard delay={0.1}>
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg">Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-slate-700 text-sm md:text-base">Solde total</span>
                      </div>
                      <span className="font-bold text-green-600 text-sm md:text-base">{formatBalance(walletData.balance)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <span className="text-slate-700 text-sm md:text-base">Méthodes</span>
                      </div>
                      <span className="font-bold text-blue-600 text-sm md:text-base">{walletData.cards.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Payment Methods */}
              <AnimatedCard delay={0.2}>
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg">Méthodes de paiement</CardTitle>
                    <CardDescription className="text-sm md:text-base">Gérez vos cartes et comptes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {walletData.cards.length > 0 ? (
                      walletData.cards.map((card) => (
                        <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-slate-600" />
                            <div>
                              <p className="font-medium text-sm md:text-base">{card.provider}</p>
                              <p className="text-sm text-slate-500">{card.phone}</p>
                            </div>
                          </div>
                          {card.is_default && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Par défaut</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500">
                        <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aucune méthode de paiement</p>
                      </div>
                    )}
                    <Button variant="outline" className="w-full mt-3 text-sm md:text-base hover:bg-orange-50 hover:border-orange-300 transition-colors">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une méthode
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>

            {/* Recent Transactions */}
            <AnimatedCard delay={0.3}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-lg">Transactions récentes</CardTitle>
                  <CardDescription>Les dernières opérations</CardDescription>
                </CardHeader>
                <CardContent>
                  {walletData.transactions.length > 0 ? (
                    <div className="space-y-3">
                      {walletData.transactions.slice(0, 5).map((transaction, index) => (
                        <div 
                          key={transaction.id} 
                          className="transaction-item flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {transaction.type === 'credit' ? (
                                <ArrowDownLeft className="w-5 h-5 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm md:text-base truncate">{transaction.description}</p>
                              <p className="text-xs md:text-sm text-slate-500">
                                {new Date(transaction.date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className={`font-bold text-sm md:text-base ${
                              transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'credit' ? '+' : '-'}{formatBalance(transaction.amount)}
                            </p>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              {getStatusIcon(transaction.status)}
                              <span className="text-xs text-slate-500 hidden sm:inline">{getStatusText(transaction.status)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune transaction</p>
                  </div>
                )}
                {walletData.transactions.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => setActiveTab('history')}
                  >
                    Voir tout l'historique
                  </Button>
                )}
              </CardContent>
            </Card>
            </AnimatedCard>
          </TabsContent>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <AnimatedCard delay={0}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>Déposer de l'argent</CardTitle>
                  <CardDescription>Ajoutez des fonds à votre portefeuille</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deposit-amount">Montant (FCFA)</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="Entrez le montant"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min="100"
                      step="100"
                    />
                  </div>
                  
                  <div>
                    <Label>Méthode de dépôt</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {walletData.cards.map((card) => (
                        <div 
                          key={card.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            card.is_default ? 'border-orange-500 bg-orange-50' : 'hover:border-orange-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-5 h-5 text-slate-600" />
                            <span className="font-medium">{card.provider}</span>
                          </div>
                          <p className="text-sm text-slate-500">{card.phone}</p>
                        </div>
                      ))}
                      <div className="p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-orange-300 transition-colors flex flex-col items-center justify-center text-slate-500">
                        <Plus className="w-6 h-6 mb-2" />
                        <span className="text-sm">Ajouter</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Note importante</p>
                      <p>Le système de dépôt sera activé dès l'intégration des API de paiement mobile.</p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                  onClick={handleDeposit}
                  disabled={!depositAmount}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Confirmer le dépôt
                </Button>
              </CardContent>
            </Card>
            </AnimatedCard>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <AnimatedCard delay={0}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>Transférer de l'argent</CardTitle>
                  <CardDescription>Envoyez de l'argent à un autre utilisateur</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="transfer-phone">Numéro de téléphone du destinataire</Label>
                    <Input
                      id="transfer-phone"
                      type="tel"
                      placeholder="+225 07 00 00 00 00"
                      value={transferPhone}
                      onChange={(e) => setTransferPhone(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="transfer-amount">Montant (FCFA)</Label>
                    <Input
                      id="transfer-amount"
                      type="number"
                      placeholder="Entrez le montant"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      min="100"
                      step="100"
                    />
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Solde disponible</span>
                      <span className="font-medium">{formatBalance(walletData.available_balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-600">Frais de transfert</span>
                      <span className="font-medium text-green-600">Gratuit</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <QrCode className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Transfert rapide</p>
                      <p>Vous pouvez scanner un QR code pour transférer de l'argent directement.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                    onClick={handleTransfer}
                    disabled={!transferAmount || !transferPhone}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer le transfert
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={handleScanQR}
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    Scanner QR
                  </Button>
                </div>
              </CardContent>
            </Card>
            </AnimatedCard>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <AnimatedCard delay={0}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>Historique des transactions</CardTitle>
                  <CardDescription>Toutes vos opérations</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Filtres:</span>
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-slate-50 transition-colors"
                    >
                      <option value="all">Tous les types</option>
                      <option value="credit">Crédits</option>
                      <option value="debit">Débits</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-slate-50 transition-colors"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="completed">Complétés</option>
                      <option value="pending">En attente</option>
                      <option value="failed">Échoués</option>
                    </select>
                  </div>

                  {walletData.transactions.length > 0 ? (
                    <div className="space-y-3">
                      {walletData.transactions
                        .filter(t => filterType === 'all' || t.type === filterType)
                        .filter(t => filterStatus === 'all' || t.status === filterStatus)
                        .length > 0 ? (
                        <div className="space-y-3">
                          {walletData.transactions
                            .filter(t => filterType === 'all' || t.type === filterType)
                            .filter(t => filterStatus === 'all' || t.status === filterStatus)
                            .map((transaction) => (
                              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                    transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                                  }`}>
                                    {transaction.type === 'credit' ? (
                                      <ArrowDownLeft className="w-6 h-6 text-green-600" />
                                    ) : (
                                      <ArrowUpRight className="w-6 h-6 text-red-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm md:text-base truncate">{transaction.description}</p>
                                    <p className="text-xs md:text-sm text-slate-500">
                                      {new Date(transaction.date).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <p className={`font-bold text-base md:text-lg ${
                                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {transaction.type === 'credit' ? '+' : '-'}{formatBalance(transaction.amount)}
                                  </p>
                                  <div className="flex items-center gap-1 justify-end mt-1">
                                    {getStatusIcon(transaction.status)}
                                    <span className="text-sm text-slate-500 hidden sm:inline">{getStatusText(transaction.status)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-500">
                            <History className="w-16 h-16 mx-auto mb-3 opacity-50" />
                            <p className="text-lg">Aucune transaction ne correspond aux filtres</p>
                            <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        <History className="w-16 h-16 mx-auto mb-3 opacity-50" />
                        <p className="text-lg">Aucune transaction</p>
                        <p className="text-sm mt-1">Vos transactions apparaîtront ici</p>
                      </div>
                    )}
              </CardContent>
            </Card>
          </AnimatedCard>
          </TabsContent>
        </Tabs>

        {/* QR Code Modal */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Recevoir un paiement</DialogTitle>
              <DialogDescription>
                Scannez ce QR code pour envoyer de l'argent à ce portefeuille
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
                {qrCodeData && (
                  <QRCodeSVG 
                    value={qrCodeData}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-600">
                  Partagez ce QR code pour recevoir des paiements
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(qrCodeData);
                    toast.success('Code copié dans le presse-papier');
                  }}
                >
                  Copier le code
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scan QR Modal */}
        <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Scanner un QR Code</DialogTitle>
              <DialogDescription>
                Scannez le QR code du destinataire pour un transfert rapide
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                <div className="text-center space-y-2">
                  <Scan className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-500">
                    La fonctionnalité de scan sera disponible avec l'intégration de la caméra
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowScanModal(false)}
              >
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WalletPage;