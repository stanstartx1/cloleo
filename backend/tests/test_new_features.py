"""
Test suite for new features:
1. Profile settings endpoints (PUT /api/users/profile, PUT /api/users/password, POST /api/users/profile/photo)
2. Share/Copy link functionality (frontend only - no backend endpoints)
3. Revendeur catalog with promo prices
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloleo-shop.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_CUSTOMER = {"email": "testclient@cloleo.com", "password": "test123"}
TEST_REVENDEUR = {"email": "testdrop@cloleo.com", "password": "test123"}


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestAuthentication:
    """Authentication tests"""
    
    def test_customer_login(self):
        """Test customer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_CUSTOMER["email"]
        assert data["user"]["role"] == "customer"
        print(f"✓ Customer login successful: {data['user']['name']}")
        return data["token"]
    
    def test_revendeur_login(self):
        """Test revendeur/dropshipper login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_REVENDEUR)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_REVENDEUR["email"]
        assert data["user"]["role"] == "dropshipper"
        print(f"✓ Revendeur login successful: {data['user']['name']}")
        return data["token"]


class TestProfileSettings:
    """Profile settings endpoint tests"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Customer authentication failed")
    
    @pytest.fixture
    def revendeur_token(self):
        """Get revendeur auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_REVENDEUR)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Revendeur authentication failed")
    
    def test_get_current_user_profile(self, customer_token):
        """Test GET /api/users/me endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "name" in data
        assert "password" not in data  # Password should not be returned
        print(f"✓ GET /api/users/me works - User: {data['name']}")
    
    def test_update_profile_name(self, customer_token):
        """Test PUT /api/users/profile - update name"""
        # First get current profile
        response = requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        original_name = response.json().get("name", "Test Client")
        
        # Update name
        new_name = f"Test Client Updated {uuid.uuid4().hex[:4]}"
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            json={"name": new_name},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        print(f"✓ PUT /api/users/profile - name updated to: {new_name}")
        
        # Restore original name
        requests.put(
            f"{BASE_URL}/api/users/profile",
            json={"name": original_name},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
    
    def test_update_profile_phone(self, customer_token):
        """Test PUT /api/users/profile - update phone"""
        test_phone = "+225 07 12 34 56"
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            json={"phone": test_phone},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == test_phone
        print(f"✓ PUT /api/users/profile - phone updated to: {test_phone}")
    
    def test_update_profile_city(self, customer_token):
        """Test PUT /api/users/profile - update city"""
        test_city = "Abidjan"
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            json={"city": test_city},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["city"] == test_city
        print(f"✓ PUT /api/users/profile - city updated to: {test_city}")
    
    def test_update_profile_multiple_fields(self, customer_token):
        """Test PUT /api/users/profile - update multiple fields"""
        update_data = {
            "name": "Test Client",
            "phone": "+225 07 00 00 00",
            "city": "Yamoussoukro",
            "location": "Centre-ville"
        }
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["phone"] == update_data["phone"]
        assert data["city"] == update_data["city"]
        print("✓ PUT /api/users/profile - multiple fields updated successfully")
    
    def test_update_profile_empty_data(self, customer_token):
        """Test PUT /api/users/profile - empty data should fail"""
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            json={},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400
        print("✓ PUT /api/users/profile - correctly rejects empty data")
    
    def test_update_profile_unauthorized(self):
        """Test PUT /api/users/profile - without auth should fail"""
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            json={"name": "Hacker"}
        )
        assert response.status_code == 401
        print("✓ PUT /api/users/profile - correctly rejects unauthorized request")
    
    def test_revendeur_update_shop_info(self, revendeur_token):
        """Test PUT /api/users/profile - revendeur can update shop info"""
        update_data = {
            "shop_name": "Ma Boutique Test",
            "shop_description": "Description de test pour ma boutique"
        }
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["shop_name"] == update_data["shop_name"]
        assert data["shop_description"] == update_data["shop_description"]
        print("✓ PUT /api/users/profile - revendeur shop info updated")


class TestPasswordChange:
    """Password change endpoint tests"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Customer authentication failed")
    
    def test_change_password_success(self, customer_token):
        """Test PUT /api/users/password - successful password change"""
        # Change password
        response = requests.put(
            f"{BASE_URL}/api/users/password",
            json={
                "current_password": TEST_CUSTOMER["password"],
                "new_password": "newtest123"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ PUT /api/users/password - password changed successfully")
        
        # Verify new password works
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CUSTOMER["email"], "password": "newtest123"}
        )
        assert login_response.status_code == 200
        print("✓ Login with new password successful")
        
        # Restore original password
        new_token = login_response.json()["token"]
        restore_response = requests.put(
            f"{BASE_URL}/api/users/password",
            json={
                "current_password": "newtest123",
                "new_password": TEST_CUSTOMER["password"]
            },
            headers={"Authorization": f"Bearer {new_token}"}
        )
        assert restore_response.status_code == 200
        print("✓ Original password restored")
    
    def test_change_password_wrong_current(self, customer_token):
        """Test PUT /api/users/password - wrong current password"""
        response = requests.put(
            f"{BASE_URL}/api/users/password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newtest123"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400
        print("✓ PUT /api/users/password - correctly rejects wrong current password")
    
    def test_change_password_too_short(self, customer_token):
        """Test PUT /api/users/password - new password too short"""
        response = requests.put(
            f"{BASE_URL}/api/users/password",
            json={
                "current_password": TEST_CUSTOMER["password"],
                "new_password": "abc"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400
        print("✓ PUT /api/users/password - correctly rejects short password")
    
    def test_change_password_missing_fields(self, customer_token):
        """Test PUT /api/users/password - missing fields"""
        response = requests.put(
            f"{BASE_URL}/api/users/password",
            json={"current_password": TEST_CUSTOMER["password"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400
        print("✓ PUT /api/users/password - correctly rejects missing new_password")
    
    def test_change_password_unauthorized(self):
        """Test PUT /api/users/password - without auth should fail"""
        response = requests.put(
            f"{BASE_URL}/api/users/password",
            json={
                "current_password": "test123",
                "new_password": "newtest123"
            }
        )
        assert response.status_code == 401
        print("✓ PUT /api/users/password - correctly rejects unauthorized request")


class TestProfilePhotoUpload:
    """Profile photo upload endpoint tests"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Customer authentication failed")
    
    def test_upload_photo_endpoint_exists(self, customer_token):
        """Test POST /api/users/profile/photo endpoint exists"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/users/profile/photo",
            files=files,
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Should return 200 with URL or 400 for validation error
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            print(f"✓ POST /api/users/profile/photo - photo uploaded: {data['url']}")
        else:
            print("✓ POST /api/users/profile/photo - endpoint exists (validation may have failed)")
    
    def test_upload_photo_unauthorized(self):
        """Test POST /api/users/profile/photo - without auth should fail"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/users/profile/photo",
            files=files
        )
        assert response.status_code == 401
        print("✓ POST /api/users/profile/photo - correctly rejects unauthorized request")


class TestProductsWithPromo:
    """Test products with promo prices for revendeur catalog"""
    
    def test_get_products_with_promo(self):
        """Test GET /api/products returns products with promo prices"""
        response = requests.get(f"{BASE_URL}/api/products?limit=50")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        
        # Check for products with promo prices
        promo_products = [p for p in data["products"] if p.get("promo_price_fcfa")]
        print(f"✓ Found {len(promo_products)} products with promo prices out of {len(data['products'])}")
        
        if promo_products:
            product = promo_products[0]
            assert product["promo_price_fcfa"] < product["price_fcfa"]
            discount = round((1 - product["promo_price_fcfa"] / product["price_fcfa"]) * 100)
            print(f"  Example: {product['name']} - {product['price_fcfa']} FCFA → {product['promo_price_fcfa']} FCFA (-{discount}%)")
    
    def test_get_single_product_with_promo(self):
        """Test GET /api/products/{id} returns promo price"""
        # First get a product with promo
        response = requests.get(f"{BASE_URL}/api/products?limit=50")
        products = response.json()["products"]
        promo_product = next((p for p in products if p.get("promo_price_fcfa")), None)
        
        if promo_product:
            response = requests.get(f"{BASE_URL}/api/products/{promo_product['id']}")
            assert response.status_code == 200
            data = response.json()
            assert "promo_price_fcfa" in data
            assert data["promo_price_fcfa"] == promo_product["promo_price_fcfa"]
            print(f"✓ GET /api/products/{promo_product['id']} returns promo price correctly")
        else:
            print("⚠ No products with promo prices found to test")


class TestDropshippedProducts:
    """Test dropshipped products for revendeur"""
    
    @pytest.fixture
    def revendeur_token(self):
        """Get revendeur auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_REVENDEUR)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Revendeur authentication failed")
    
    def test_get_dropshipped_products(self, revendeur_token):
        """Test GET /api/dropshipper/products"""
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/products",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/dropshipper/products - found {len(data)} dropshipped products")
    
    def test_get_dropshipper_dashboard(self, revendeur_token):
        """Test GET /api/dropshipper/dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/dropshipper/dashboard",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "stats" in data
        print(f"✓ GET /api/dropshipper/dashboard - stats: {data['stats']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
