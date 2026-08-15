# Apps mobiles Cloléo (React Native / Expo)

## Livreur (`mobile/driver`)
- GPS haute précision en arrière-plan
- Notifications push natives
- Sync positions offline via `/api/delivery/driver/sync-positions`
- Scan QR / preuve livraison (expo-camera)

```bash
cd mobile/driver
npm install
npx expo start
```

## Client (`mobile/client`)
- Suivi commandes
- Notifications push
- Wallet (à connecter)

```bash
cd mobile/client
npm install
npx expo start
```

Variables: modifier `API` dans `App.js` ou utiliser `app.json` → `extra.apiUrl`.
