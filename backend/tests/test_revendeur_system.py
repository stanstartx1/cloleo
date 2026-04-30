"""
Test suite for Revendeur (formerly Dropshipper) system
Tests the renaming from 'Dropshipper' to 'Revendeur' throughout the system
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloleo-shop.preview.emergentagent.com')

# Test credentials
REVENDEUR_CREDENTIALS = {"email": "testdrop@cloleo.com", "password": "test123"}
ADMIN_CREDENTIALS = {"email": "admin@cloleo.com", "password": "admin123"}


class TestRevendeurAuth:
    """Test Revendeur authentication endpoints"""
    
    def test_revendeur_login(self):
        """Test that revendeur can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REVENDEUR_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "dropshipper"  # Internal role is still dropshipper
        print(f"✓ Revendeur login successful, role: {data['user']['role']}")
    
    def test_revendeur_registration_endpoint_exists(self):
        """Test that /api/auth/register/revendeur endpoint exists"""
        # We don't actually register, just check the endpoint responds
        response = requests.post(
            f"{BASE_URL}/api/auth/register/revendeur",
            json={
                "email": "test_nonexistent@test.com",
                "password": "test123",
                "name": "Test",
                "shop_name": "Test Shop"
            }
        )
        # Should either succeed (201) or fail with email exists (400), not 404
        assert response.status_code in [200, 201, 400, 422]
        print(f"✓ Revendeur registration endpoint exists, status: {response.status_code}")


class TestRevendeurDashboard:
    """Test Revendeur dashboard endpoints"""
    
    @pytest.fixture
    def revendeur_token(self):
        """Get revendeur auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REVENDEUR_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get revendeur token")
    
    def test_revendeur_dashboard(self, revendeur_token):
        """Test /api/revendeur/dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/dashboard",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "stats" in data
        print(f"✓ Revendeur dashboard accessible, stats: {data['stats']}")
    
    def test_revendeur_catalog(self, revendeur_token):
        """Test /api/revendeur/catalog endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/catalog?page=1&limit=5",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"✓ Revendeur catalog accessible, {len(data['products'])} products, total: {data['total']}")
    
    def test_revendeur_products(self, revendeur_token):
        """Test /api/revendeur/products endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/products",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Revendeur products accessible, {len(data)} products")
    
    def test_revendeur_orders(self, revendeur_token):
        """Test /api/revendeur/orders endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/orders",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"✓ Revendeur orders accessible, {len(data['orders'])} orders")
    
    def test_revendeur_earnings(self, revendeur_token):
        """Test /api/revendeur/earnings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/revendeur/earnings",
            headers={"Authorization": f"Bearer {revendeur_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "earnings" in data
        print(f"✓ Revendeur earnings accessible")


class TestAdminRevendeurs:
    """Test Admin Revendeurs management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get admin token")
    
    def test_admin_revendeurs_list(self, admin_token):
        """Test /api/admin/revendeurs endpoint returns correct key"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revendeurs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # CRITICAL: Should return 'revendeurs' key, not 'dropshippers'
        assert "revendeurs" in data, "API should return 'revendeurs' key for frontend compatibility"
        assert "total" in data
        
        revendeurs = data["revendeurs"]
        assert isinstance(revendeurs, list)
        print(f"✓ Admin revendeurs list accessible, {len(revendeurs)} revendeurs, total: {data['total']}")
    
    def test_admin_revendeurs_has_correct_fields(self, admin_token):
        """Test that revendeur data has expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/revendeurs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["revendeurs"]:
            revendeur = data["revendeurs"][0]
            expected_fields = ["id", "email", "name", "role", "is_active"]
            for field in expected_fields:
                assert field in revendeur, f"Missing field: {field}"
            print(f"✓ Revendeur data has all expected fields")


class TestRouteAliases:
    """Test that /api/revendeur/* routes work as aliases for /api/dropshipper/*"""
    
    @pytest.fixture
    def revendeur_token(self):
        """Get revendeur auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=REVENDEUR_CREDENTIALS
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get revendeur token")
    
    def test_revendeur_routes_exist(self, revendeur_token):
        """Test that all /api/revendeur/* routes exist and work"""
        routes = [
            "/api/revendeur/dashboard",
            "/api/revendeur/catalog",
            "/api/revendeur/products",
            "/api/revendeur/orders",
            "/api/revendeur/earnings",
        ]
        
        for route in routes:
            response = requests.get(
                f"{BASE_URL}{route}",
                headers={"Authorization": f"Bearer {revendeur_token}"}
            )
            assert response.status_code == 200, f"Route {route} failed with status {response.status_code}"
            print(f"✓ Route {route} works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
