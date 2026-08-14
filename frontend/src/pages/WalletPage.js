import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, History, 
  CreditCard, Plus, QrCode, Send, RefreshCw,
  TrendingUp, AlertCircle, CheckCircle, Clock, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { API_URL } from '../config/api';

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

  useEffect(() => {
    // Simulate wallet data fetch (will be replaced with API)
    const fetchWalletData = async () => {
      setLoading(true);
      try {
        // Mock data - will be replaced with actual API call
        // const response = await axios.get(`${API}/wallet/balance`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        
        // Temporary mock data
        setTimeout(() => {
          setWalletData({
            balance: 50000,
            available_balance: 45000,
            pending_balance: 5000,
            currency: 'XOF',
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
            ],
            cards: [
              {
                id: '1',
                type: 'mobile_money',
                provider: 'Orange Money',
                phone: '+225 07 00 00 00 00',
                is_default: true
              }
            ]
          });
          setLoading(false);
        }, 500);
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

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    toast.success('Demande de dépôt envoyée (fonctionnalité backend à venir)');
    setDepositAmount('');
  };

  const handleTransfer = () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    if (!transferPhone) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }
    toast.success('Transfert initié (fonctionnalité backend à venir)');
    setTransferAmount('');
    setTransferPhone('');
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
        <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-xl mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Solde disponible</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-bold">
                    {showBalance ? formatBalance(walletData.available_balance) : '•••••••'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-white hover:bg-orange-600/30"
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
              <div className="flex gap-2">
                <Button 
                  className="bg-white text-orange-600 hover:bg-orange-50"
                  onClick={() => setActiveTab('deposit')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Déposer
                </Button>
                <Button 
                  className="bg-orange-600 text-white hover:bg-orange-700"
                  onClick={() => setActiveTab('transfer')}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Transférer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Wallet className="w-4 h-4 mr-2" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="deposit" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Déposer
            </TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Transférer
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <History className="w-4 h-4 mr-2" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statistiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-slate-700">Solde total</span>
                    </div>
                    <span className="font-bold text-green-600">{formatBalance(walletData.balance)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="text-slate-700">Méthodes</span>
                    </div>
                    <span className="font-bold text-blue-600">{walletData.cards.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Méthodes de paiement</CardTitle>
                  <CardDescription>Gérez vos cartes et comptes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {walletData.cards.length > 0 ? (
                    walletData.cards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-slate-600" />
                          <div>
                            <p className="font-medium">{card.provider}</p>
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
                      <p>Aucune méthode de paiement</p>
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-3">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une méthode
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transactions récentes</CardTitle>
                <CardDescription>Les dernières opérations</CardDescription>
              </CardHeader>
              <CardContent>
                {walletData.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {walletData.transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {transaction.type === 'credit' ? (
                              <ArrowDownLeft className="w-5 h-5 text-green-600" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-slate-500">
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
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatBalance(transaction.amount)}
                          </p>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            {getStatusIcon(transaction.status)}
                            <span className="text-xs text-slate-500">{getStatusText(transaction.status)}</span>
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
          </TabsContent>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <Card>
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
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Card>
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
                      <p>Vous pourrez également scanner un QR code pour transférer de l'argent directement.</p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                  onClick={handleTransfer}
                  disabled={!transferAmount || !transferPhone}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le transfert
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique des transactions</CardTitle>
                <CardDescription>Toutes vos opérations</CardDescription>
              </CardHeader>
              <CardContent>
                {walletData.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {walletData.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {transaction.type === 'credit' ? (
                              <ArrowDownLeft className="w-6 h-6 text-green-600" />
                            ) : (
                              <ArrowUpRight className="w-6 h-6 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-slate-500">
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
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatBalance(transaction.amount)}
                          </p>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            {getStatusIcon(transaction.status)}
                            <span className="text-sm text-slate-500">{getStatusText(transaction.status)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WalletPage;