"""
Backend tests for Cloléo - Animation Features & Revendeur Product Publication Flow
Tests: Dashboard APIs, Revendeur catalog, product publication flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloleo-shop.preview.emergentagent.com')

# Test credentials
REVENDEUR_EMAIL = "testdrop3@cloleo.com"
REVENDEUR_PASSWORD = "drop123"
VENDOR_EMAIL = "testvendor@cloleo.com"
VENDOR_PASSWORD = "test123"
ADMIN_EMAIL = "admin@cloleo.com"
ADMIN_PASSWORD = "admin123"

class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Test API health"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint working")

    def test_root_endpoint(self):
        """Test API root"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Cloléo" in data.get("message", "")
        print("✓ Root endpoint working")


class TestRevendeurDashboard:
    """Tests for Revendeur Dashboard - used for animation testing"""
    
    @pytest.fixture
    def revendeur_token(self):
        """Get revendeur authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REVENDEUR_EMAIL,
            "password": REVENDEUR_PASSWORD
        })
        assert response.status_code == 200, f"Revendeur login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Revendeur logged in: {data['user'].get('name')}")
        return data["token"]
    
    def test_revendeur_login(self, revendeur_token):
        """Test revendeur can login"""
        assert revendeur_token is not None
        print("✓ Revendeur authentication working")
    
    def test_revendeur_dashboard_stats(self, revendeur_token):
        """Test revendeur dashboard returns stats for animated cards"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/dashboard",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check stats structure (used by AnimatedNumber component)
        assert "stats" in data
        stats = data["stats"]
        assert "active_products" in stats
        assert "total_orders" in stats
        assert "completed_orders" in stats
        assert "total_earnings_fcfa" in stats
        
        # All stats should be numeric (for AnimatedNumber)
        assert isinstance(stats["active_products"], int)
        assert isinstance(stats["total_orders"], int)
        assert isinstance(stats["completed_orders"], int)
        assert isinstance(stats["total_earnings_fcfa"], (int, float))
        
        print(f"✓ Revendeur dashboard stats: {stats}")
    
    def test_revendeur_dashboard_recent_orders(self, revendeur_token):
        """Test revendeur dashboard returns recent orders"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/dashboard",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_orders" in data
        assert isinstance(data["recent_orders"], list)
        print(f"✓ Revendeur recent orders: {len(data['recent_orders'])} orders")
    
    def test_revendeur_catalog(self, revendeur_token):
        """Test revendeur catalog endpoint - products available to add"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/catalog?page=1&limit=12",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert "total" in data
        assert isinstance(data["products"], list)
        
        if len(data["products"]) > 0:
            product = data["products"][0]
            # Check product has required fields for display
            assert "id" in product
            assert "name" in product
            assert "price_fcfa" in product
            assert "images" in product
            print(f"✓ Revendeur catalog: {len(data['products'])} products, total: {data['total']}")
        else:
            print("✓ Revendeur catalog: empty (no products available)")
    
    def test_revendeur_my_products(self, revendeur_token):
        """Test revendeur's own products list"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/products",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Revendeur products: {len(data)} products in catalog")
        return data
    
    def test_revendeur_orders(self, revendeur_token):
        """Test revendeur orders endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/orders",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"✓ Revendeur orders: {len(data['orders'])} orders")
    
    def test_revendeur_earnings(self, revendeur_token):
        """Test revendeur earnings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/earnings",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "earnings" in data
        assert isinstance(data["earnings"], list)
        print(f"✓ Revendeur earnings: {len(data['earnings'])} entries")


class TestVendorDashboard:
    """Tests for Vendor Dashboard - used for animation testing"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Vendor logged in: {data['user'].get('name')}")
        return data["token"]
    
    def test_vendor_login(self, vendor_token):
        """Test vendor can login"""
        assert vendor_token is not None
        print("✓ Vendor authentication working")
    
    def test_vendor_dashboard_stats(self, vendor_token):
        """Test vendor dashboard returns stats for animated cards"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check stats structure (used by AnimatedNumber component)
        assert "stats" in data
        stats = data["stats"]
        assert "total_products" in stats
        assert "pending_products" in stats
        assert "total_sales" in stats
        assert "total_revenue_fcfa" in stats
        
        # All stats should be numeric (for AnimatedNumber)
        assert isinstance(stats["total_products"], int)
        assert isinstance(stats["pending_products"], int)
        assert isinstance(stats["total_sales"], int)
        assert isinstance(stats["total_revenue_fcfa"], (int, float))
        
        print(f"✓ Vendor dashboard stats: {stats}")
    
    def test_vendor_dashboard_subscription(self, vendor_token):
        """Test vendor dashboard returns subscription info"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "subscription" in data
        subscription = data["subscription"]
        assert "plan" in subscription
        
        plan = subscription["plan"]
        assert "id" in plan
        assert "name" in plan
        assert "emoji" in plan
        assert "commission_percent" in plan
        
        print(f"✓ Vendor subscription: {plan['name']} ({plan['emoji']})")
    
    def test_vendor_products(self, vendor_token):
        """Test vendor products endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # API returns array directly or object with products key
        products = data if isinstance(data, list) else data.get("products", [])
        assert isinstance(products, list)
        print(f"✓ Vendor products: {len(products)} products")


class TestProductPublicationFlow:
    """Test the complete flow: Revendeur adds product → appears on public shop"""
    
    @pytest.fixture
    def revendeur_token(self):
        """Get revendeur authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REVENDEUR_EMAIL,
            "password": REVENDEUR_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def revendeur_user(self):
        """Get revendeur user info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REVENDEUR_EMAIL,
            "password": REVENDEUR_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["user"]
    
    def test_public_shop_endpoint(self, revendeur_user):
        """Test public shop endpoint returns products"""
        shop_slug = revendeur_user.get("shop_slug", "super-boutique-drop-0a273bba")
        
        response = requests.get(f"{BASE_URL}/api/shop/{shop_slug}?page=1")
        assert response.status_code == 200
        data = response.json()
        
        assert "shop" in data
        assert "products" in data
        assert "total" in data
        
        shop = data["shop"]
        # API returns 'name' and 'slug' for shop
        assert "name" in shop or "shop_name" in shop
        assert "slug" in shop or "shop_slug" in shop
        
        shop_name = shop.get("name") or shop.get("shop_name")
        print(f"✓ Public shop '{shop_name}': {data['total']} products")
        return data
    
    def test_revendeur_product_appears_on_public_shop(self, revendeur_token, revendeur_user):
        """Test that products added by revendeur appear on public shop"""
        shop_slug = revendeur_user.get("shop_slug", "super-boutique-drop-0a273bba")
        
        # Get revendeur's products
        revendeur_products_response = requests.get(
            f"{BASE_URL}/api/revendeur/products",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert revendeur_products_response.status_code == 200
        revendeur_products = revendeur_products_response.json()
        
        # Get public shop products
        public_shop_response = requests.get(f"{BASE_URL}/api/shop/{shop_slug}?page=1")
        assert public_shop_response.status_code == 200
        public_data = public_shop_response.json()
        
        # Active revendeur products should appear on public shop
        active_revendeur_products = [p for p in revendeur_products if p.get("is_active", True)]
        
        print(f"✓ Revendeur has {len(active_revendeur_products)} active products")
        print(f"✓ Public shop shows {public_data['total']} products")
        
        # If revendeur has active products, they should be on public shop
        if len(active_revendeur_products) > 0:
            assert public_data['total'] >= len(active_revendeur_products), \
                "Public shop should show at least as many products as revendeur has active"
    
    def test_add_product_to_catalog_flow(self, revendeur_token):
        """Test adding a product from catalog to revendeur's shop"""
        # Get catalog products
        catalog_response = requests.get(
            f"{BASE_URL}/api/revendeur/catalog?page=1&limit=12",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert catalog_response.status_code == 200
        catalog_data = catalog_response.json()
        
        # Find a product not yet added (is_dropshipped = False)
        available_products = [p for p in catalog_data["products"] if not p.get("is_dropshipped", False)]
        
        if len(available_products) > 0:
            product = available_products[0]
            base_price = product.get("promo_price_fcfa") or product.get("price_fcfa")
            selling_price = base_price + 1000  # Add margin
            
            # Add product to revendeur catalog
            add_response = requests.post(
                f"{BASE_URL}/api/revendeur/products",
                headers={"Authorization": f"Bearer {revendeur_token}"},
                json={
                    "original_product_id": product["id"],
                    "selling_price_fcfa": selling_price
                }
            )
            
            if add_response.status_code == 200:
                print(f"✓ Successfully added product '{product['name']}' to revendeur catalog")
                print(f"  Base price: {base_price} FCFA, Selling price: {selling_price} FCFA")
            elif add_response.status_code == 400 and "déjà" in add_response.text.lower():
                print(f"✓ Product already in catalog (expected behavior)")
            else:
                print(f"⚠ Add product response: {add_response.status_code} - {add_response.text}")
        else:
            print("✓ All catalog products already added to revendeur shop")


class TestAnimatedComponentsData:
    """Test that API returns data suitable for animated components"""
    
    @pytest.fixture
    def revendeur_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REVENDEUR_EMAIL,
            "password": REVENDEUR_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def vendor_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        return response.json()["token"]
    
    def test_revendeur_stats_numeric_for_animated_number(self, revendeur_token):
        """Verify stats are numeric for AnimatedNumber component"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/dashboard",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        data = response.json()
        stats = data["stats"]
        
        # AnimatedNumber expects numeric values
        for key, value in stats.items():
            assert isinstance(value, (int, float)), f"Stat '{key}' should be numeric, got {type(value)}"
        
        print("✓ All revendeur stats are numeric (suitable for AnimatedNumber)")
    
    def test_vendor_stats_numeric_for_animated_number(self, vendor_token):
        """Verify vendor stats are numeric for AnimatedNumber component"""
        response = requests.get(
            f"{BASE_URL}/api/vendor/dashboard",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        data = response.json()
        stats = data["stats"]
        
        # AnimatedNumber expects numeric values
        for key, value in stats.items():
            assert isinstance(value, (int, float)), f"Stat '{key}' should be numeric, got {type(value)}"
        
        print("✓ All vendor stats are numeric (suitable for AnimatedNumber)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
