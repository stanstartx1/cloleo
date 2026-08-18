# Configuration Apache pour WebSocket

## 1. Activer les modules Apache requis

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
```

## 2. Créer ou modifier la configuration du site

Éditez le fichier de configuration Apache pour cloleo.com :

```bash
sudo nano /etc/apache2/sites-available/cloleo-le-ssl.conf
```

Ou si c'est un fichier différent :
```bash
sudo nano /etc/apache2/sites-available/cloleo.com.conf
```

## 3. Ajouter la configuration WebSocket

Ajoutez ces directives dans la section VirtualHost, APRÈS les directives ProxyPass existantes :

```apache
# WebSocket Proxy Configuration
ProxyPreserveHost On
ProxyRequests Off

# WebSocket upgrade headers
ProxyPass /api/ws/ ws://127.0.0.1:8000/api/ws/ retry=0
ProxyPassReverse /api/ws/ ws://127.0.0.1:8000/api/ws/

# Important: Use the following for WebSocket upgrade
ProxyPass /api/ws ws://127.0.0.1:8000/api/ws
ProxyPassReverse /api/ws ws://127.0.0.1:8000/api/ws
```

## 4. Alternative : Configuration complète avec Upgrade

Si la configuration ci-dessus ne fonctionne pas, utilisez cette configuration plus complète :

```apache
# WebSocket Proxy Configuration
<Proxy "ws://127.0.0.1:8000/api/ws/*">
    ProxyPass ws://127.0.0.1:8000/api/ws/
    ProxyPassReverse ws://127.0.0.1:8000/api/ws/
</Proxy>

# HTTP API Proxy (existant, à conserver)
ProxyPass /api/ http://127.0.0.1:8000/api/
ProxyPassReverse /api/ http://127.0.0.1:8000/api/
```

## 5. Alternative : Configuration avec Location

```apache
# WebSocket specific location
<Location /api/ws>
    ProxyPass ws://127.0.0.1:8000/api/ws
    ProxyPassReverse ws://127.0.0.1:8000/api/ws
</Location>

# Regular API location
<Location /api>
    ProxyPass http://127.0.0.1:8000/api
    ProxyPassReverse http://127.0.0.1:8000/api
</Location>
```

## 6. Tester la configuration

```bash
sudo apache2ctl configtest
```

## 7. Redémarrer Apache

```bash
sudo systemctl restart apache2
```

## 8. Vérifier que le backend FastAPI écoute sur le bon port

```bash
sudo netstat -tlnp | grep 8000
```

Si le backend n'écoute pas sur 127.0.0.1:8000, vérifiez le service backend :

```bash
sudo systemctl status cloleo-backend
```

## 9. Tester la connexion WebSocket

Une fois Apache redémarré, vous pouvez tester avec curl :

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://cloleo.com/api/ws/chat/test
```

## 10. Logs Apache pour debugging

```bash
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log
```

## 11. Si problèmes persistent

Vérifiez que les modules sont activés :

```bash
apache2ctl -M | grep proxy
```

Vous devriez voir :
- proxy_module
- proxy_http_module
- proxy_wstunnel_module

## Configuration recommandée complète

Voici une configuration complète recommandée à ajouter à votre VirtualHost :

```apache
<VirtualHost *:443>
    ServerName cloleo.com
    ServerAlias www.cloleo.com
    
    # SSL Configuration (existant)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/cloleo.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/cloleo.com/privkey.pem
    
    # Document Root
    DocumentRoot /var/www/cloleo/frontend/build
    
    # HTTP API Proxy
    ProxyPass /api/ http://127.0.0.1:8000/api/
    ProxyPassReverse /api/ http://127.0.0.1:8000/api/
    
    # WebSocket Proxy (nouveau)
    ProxyPass /api/ws ws://127.0.0.1:8000/api/ws
    ProxyPassReverse /api/ws ws://127.0.0.1:8000/api/ws
    
    # Enable WebSocket upgrade
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/api/ws/(.*)$ ws://127.0.0.1:8000/api/ws/$1 [P,L]
    
    # Static files
    <Directory /var/www/cloleo/frontend/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Error handling
    ErrorLog ${APACHE_LOG_DIR}/cloleo_error.log
    CustomLog ${APACHE_LOG_DIR}/cloleo_access.log combined
</VirtualHost>
```

## Après la configuration

Une fois la configuration terminée et Apache redémarré, réactivez les WebSocket dans le frontend en annulant les commentaires dans :
- `frontend/src/components/FloatingChat.js`
- `frontend/src/pages/CustomerChatPage.js`
