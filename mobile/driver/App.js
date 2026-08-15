import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

const API = 'https://cloleo.com/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export default function App() {
  const [orders, setOrders] = useState([]);
  const [token, setToken] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') Alert.alert('GPS requis pour les livraisons');
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    const watch = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 20 },
      async (loc) => {
        await axios.post(`${API}/driver/location/update`, {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
    );
    return () => { watch.then(w => w.remove()); };
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    const res = await axios.get(`${API}/driver/orders`, { headers: { Authorization: `Bearer ${token}` } });
    setOrders(res.data.orders || []);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cloléo Livreur</Text>
      <Text style={styles.subtitle}>GPS arrière-plan • Notifications natives • Mode offline</Text>
      <TouchableOpacity style={styles.btn} onPress={fetchOrders}>
        <Text style={styles.btnText}>Actualiser commandes</Text>
      </TouchableOpacity>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.orderNum}>{item.order_number || item.id.slice(0, 8)}</Text>
            <Text>{item.status} — {item.delivery_address?.city}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, padding: 16, backgroundColor: '#0f172a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f97316' },
  subtitle: { color: '#94a3b8', marginBottom: 16 },
  btn: { backgroundColor: '#f97316', padding: 14, borderRadius: 12, marginBottom: 16 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 8 },
  orderNum: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
