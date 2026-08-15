import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

const API = 'https://cloleo.com/api';

export default function App() {
  const [orders, setOrders] = useState([]);
  const [token, setToken] = useState(null);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  const fetchOrders = async () => {
    if (!token) return;
    const res = await axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } });
    setOrders(res.data.orders || res.data || []);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cloléo Client</Text>
      <Text style={styles.subtitle}>Suivi livraison • Push • Wallet</Text>
      <TouchableOpacity style={styles.btn} onPress={fetchOrders}>
        <Text style={styles.btnText}>Mes commandes</Text>
      </TouchableOpacity>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.orderNum}>{item.order_number || item.id.slice(0, 8)}</Text>
            <Text>Statut: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f97316' },
  subtitle: { color: '#64748b', marginBottom: 16 },
  btn: { backgroundColor: '#f97316', padding: 14, borderRadius: 12, marginBottom: 16 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  card: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, marginBottom: 8 },
  orderNum: { fontWeight: 'bold', fontSize: 16 },
});
