"""
Dropshipping Module Tests
Tests for:
- Dropshipper registration
- Dropshipper dashboard
- Catalog browsing
- Product customization and addition
- Public shop access
- Admin dropshipper management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@cloleo.com"
ADMIN_PASSWORD = "admin123"
TEST_DROPSHIPPER_EMAIL = f"testdrop_{uuid.uuid4().hex[:8]}@cloleo.com"
TEST_DROPSHIPPER_PASSWORD = "drop123"
TEST_SHOP_NAME = f"TEST_Shop_{uuid.uuid4().hex[:8]}"


class TestDropshipperRegistration:
    """Test dropshipper registration flow"""
    
    def test_register_dropshipper_success(self):
        """Test successful dropshipper registration"""
        response = requests.post(f"{BASE_URL}/api/auth/register/dropshipper", json={
            "email": TEST_DROPSHIPPER_EMAIL,
            "password": TEST_DROPSHIPPER_PASSWORD,
            "name": "Test Dropshipper",
            "phone": "+225 07 00 00 00",
            "shop_name": TEST_SHOP_NAME,
            "shop_description": "Test shop description"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "dropshipper", "User role should be dropshipper"
        assert data["user"]["shop_name"] == TEST_SHOP_NAME, "Shop name should match"
        assert "shop_slug" in data["user"], "User should have shop_slug"
        
        # Store for later tests
        pytest.dropshipper_token = data["token"]
        pytest.dropshipper_user = data["user"]
        pytest.shop_slug = data["user"]["shop_slug"]
        
        print(f"✓ Dropshipper registered: {data['user']['email']}")
        print(f"✓ Shop slug: {pytest.shop_slug}")
    
    def test_register_duplicate_email_fails(self):
        """Test that duplicate email registration fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register/dropshipper", json={
            "email": TEST_DROPSHIPPER_EMAIL,
            "password": "anypassword",
            "name": "Another User",
            "shop_name": "Another Shop"
        })
        
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        print("✓ Duplicate email registration correctly rejected")


class TestDropshipperLogin:
    """Test dropshipper login"""
    
    def test_login_dropshipper(self):
        """Test dropshipper can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_DROPSHIPPER_EMAIL,
            "password": TEST_DROPSHIPPER_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "dropshipper"
        
        # Update token
        pytest.dropshipper_token = data["token"]
        print(f"✓ Dropshipper logged in successfully")
    
    def test_login_existing_dropshipper(self):
        """Test login with existing test dropshipper"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testdrop3@cloleo.com",
            "password": "drop123"
        })
        
        if response.status_code == 200:
            data = response.json()
            pytest.existing_dropshipper_token = data["token"]
            pytest.existing_dropshipper_user = data["user"]
            print(f"✓ Existing dropshipper logged in: {data['user']['email']}")
        else:
            print(f"⚠ Existing dropshipper not found (status {response.status_code})")
            pytest.existing_dropshipper_token = None


class TestDropshipperDashboard:
    """Test dropshipper dashboard API"""
    
    def test_dashboard_requires_auth(self):
        """Test dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dropshipper/dashboard")
        assert response.status_code == 401, "Dashboard should require auth"
        print("✓ Dashboard correctly requires authentication")
    
    def test_dashboard_returns_data(self):
        """Test dashboard returns proper data structure"""
        token = getattr(pytest, 'dropshipper_token', None)
        if not token:
            pytest.skip("No dropshipper token available")
        
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Dashboard should contain user"
        assert "stats" in data, "Dashboard should contain stats"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_products" in stats
        assert "active_products" in stats
        assert "total_orders" in stats
        assert "completed_orders" in stats
        assert "total_earnings_fcfa" in stats
        
        print(f"✓ Dashboard data retrieved successfully")
        print(f"  - Total products: {stats['total_products']}")
        print(f"  - Total orders: {stats['total_orders']}")
        print(f"  - Total earnings: {stats['total_earnings_fcfa']} FCFA")


class TestDropshipperCatalog:
    """Test catalog browsing for dropshippers"""
    
    def test_catalog_requires_auth(self):
        """Test catalog requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dropshipper/catalog")
        assert response.status_code == 401, "Catalog should require auth"
        print("✓ Catalog correctly requires authentication")
    
    def test_catalog_returns_products(self):
        """Test catalog returns available products"""
        token = getattr(pytest, 'dropshipper_token', None)
        if not token:
            pytest.skip("No dropshipper token available")
        
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/catalog",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Response should contain products"
        assert "total" in data, "Response should contain total"
        
        if len(data["products"]) > 0:
            product = data["products"][0]
            assert "id" in product
            assert "name" in product
            assert "price_fcfa" in product
            pytest.catalog_product = product
            print(f"✓ Catalog returned {len(data['products'])} products")
            print(f"  - First product: {product['name']} at {product['price_fcfa']} FCFA")
        else:
            print("⚠ Catalog is empty - no products available")
    
    def test_catalog_search(self):
        """Test catalog search functionality"""
        token = getattr(pytest, 'dropshipper_token', None)
        if not token:
            pytest.skip("No dropshipper token available")
        
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/catalog?search=Mode",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Catalog search returned {len(data['products'])} products")


class TestDropshipperProducts:
    """Test adding and managing dropshipped products"""
    
    def test_add_product_to_catalog(self):
        """Test adding a product to dropshipper's catalog"""
        token = getattr(pytest, 'dropshipper_token', None)
        catalog_product = getattr(pytest, 'catalog_product', None)
        
        if not token:
            pytest.skip("No dropshipper token available")
        if not catalog_product:
            pytest.skip("No catalog product available")
        
        original_price = catalog_product['price_fcfa']
        selling_price = int(original_price * 1.5)  # 50% markup
        
        response = requests.post(
            f"{BASE_URL}/api/dropshipper/products",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "original_product_id": catalog_product['id'],
                "selling_price_fcfa": selling_price,
                "custom_description": "Custom description for my shop"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["original_product_id"] == catalog_product['id']
        assert data["selling_price_fcfa"] == selling_price
        assert data["original_price_fcfa"] == original_price
        
        # Verify margin calculation (50/50 split)
        margin = selling_price - original_price
        expected_share = margin // 2
        assert data["dropshipper_share_fcfa"] == expected_share, f"Expected dropshipper share {expected_share}, got {data['dropshipper_share_fcfa']}"
        assert data["admin_share_fcfa"] == expected_share, f"Expected admin share {expected_share}, got {data['admin_share_fcfa']}"
        
        pytest.dropshipped_product = data
        print(f"✓ Product added to catalog")
        print(f"  - Original price: {original_price} FCFA")
        print(f"  - Selling price: {selling_price} FCFA")
        print(f"  - Margin: {margin} FCFA (50/50 split: {expected_share} each)")
    
    def test_get_my_products(self):
        """Test getting dropshipper's products"""
        token = getattr(pytest, 'dropshipper_token', None)
        if not token:
            pytest.skip("No dropshipper token available")
        
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/products",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"✓ Retrieved {len(products)} dropshipped products")
    
    def test_update_product_price(self):
        """Test updating dropshipped product price"""
        token = getattr(pytest, 'dropshipper_token', None)
        product = getattr(pytest, 'dropshipped_product', None)
        
        if not token or not product:
            pytest.skip("No dropshipper token or product available")
        
        new_price = product['selling_price_fcfa'] + 1000
        
        response = requests.put(
            f"{BASE_URL}/api/dropshipper/products/{product['id']}",
            headers={"Authorization": f"Bearer {token}"},
            json={"selling_price_fcfa": new_price}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["selling_price_fcfa"] == new_price
        print(f"✓ Product price updated to {new_price} FCFA")
    
    def test_toggle_product_status(self):
        """Test toggling product active status"""
        token = getattr(pytest, 'dropshipper_token', None)
        product = getattr(pytest, 'dropshipped_product', None)
        
        if not token or not product:
            pytest.skip("No dropshipper token or product available")
        
        # Deactivate
        response = requests.put(
            f"{BASE_URL}/api/dropshipper/products/{product['id']}",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_active": False}
        )
        
        assert response.status_code == 200
        assert response.json()["is_active"] == False
        print("✓ Product deactivated")
        
        # Reactivate
        response = requests.put(
            f"{BASE_URL}/api/dropshipper/products/{product['id']}",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_active": True}
        )
        
        assert response.status_code == 200
        assert response.json()["is_active"] == True
        print("✓ Product reactivated")


class TestPublicShop:
    """Test public dropshipper shop access"""
    
    def test_shop_access_by_slug(self):
        """Test accessing shop by slug"""
        shop_slug = getattr(pytest, 'shop_slug', None)
        if not shop_slug:
            pytest.skip("No shop slug available")
        
        response = requests.get(f"{BASE_URL}/api/shop/{shop_slug}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "shop" in data
        assert "products" in data
        assert data["shop"]["slug"] == shop_slug
        
        print(f"✓ Shop accessible at /shop/{shop_slug}")
        print(f"  - Shop name: {data['shop']['name']}")
        print(f"  - Products: {len(data['products'])}")
    
    def test_existing_shop_access(self):
        """Test accessing existing test shop"""
        # Try the known test shop slug
        response = requests.get(f"{BASE_URL}/api/shop/super-boutique-drop-0a273bba")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Existing shop accessible")
            print(f"  - Shop name: {data['shop']['name']}")
            print(f"  - Products: {len(data['products'])}")
            pytest.existing_shop_data = data
        else:
            print(f"⚠ Existing shop not found (status {response.status_code})")
    
    def test_invalid_shop_returns_404(self):
        """Test that invalid shop slug returns 404"""
        response = requests.get(f"{BASE_URL}/api/shop/invalid-shop-slug-12345")
        assert response.status_code == 404
        print("✓ Invalid shop correctly returns 404")


class TestAdminDropshippers:
    """Test admin dropshipper management"""
    
    @pytest.fixture(autouse=True)
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            pytest.admin_token = response.json()["token"]
        else:
            pytest.admin_token = None
    
    def test_admin_get_dropshippers(self):
        """Test admin can get all dropshippers"""
        token = getattr(pytest, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/dropshippers",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "dropshippers" in data
        
        print(f"✓ Admin retrieved {len(data['dropshippers'])} dropshippers")
        
        if len(data['dropshippers']) > 0:
            d = data['dropshippers'][0]
            print(f"  - First: {d.get('name')} ({d.get('shop_name')})")
            print(f"    Products: {d.get('product_count', 0)}, Orders: {d.get('order_count', 0)}")
    
    def test_admin_get_dropshipping_stats(self):
        """Test admin can get dropshipping stats"""
        token = getattr(pytest, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/dropshipping/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "stats" in data
        
        stats = data["stats"]
        print(f"✓ Admin dropshipping stats retrieved")
        print(f"  - Active dropshippers: {stats.get('active_dropshippers', 0)}")
        print(f"  - Total products: {stats.get('total_products', 0)}")
        print(f"  - Admin earnings: {stats.get('admin_earnings_fcfa', 0)} FCFA")


class TestDropshipperOrders:
    """Test dropshipper orders"""
    
    def test_get_orders(self):
        """Test getting dropshipper orders"""
        token = getattr(pytest, 'dropshipper_token', None)
        if not token:
            pytest.skip("No dropshipper token available")
        
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✓ Retrieved {len(data['orders'])} orders")
    
    def test_get_earnings(self):
        """Test getting dropshipper earnings"""
        token = getattr(pytest, 'dropshipper_token', None)
        if not token:
            pytest.skip("No dropshipper token available")
        
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/earnings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "earnings" in data
        assert "total_earned_fcfa" in data
        print(f"✓ Retrieved earnings: {data['total_earned_fcfa']} FCFA total")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_product(self):
        """Delete test dropshipped product"""
        token = getattr(pytest, 'dropshipper_token', None)
        product = getattr(pytest, 'dropshipped_product', None)
        
        if not token or not product:
            pytest.skip("No token or product to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/dropshipper/products/{product['id']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        print("✓ Test product deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
