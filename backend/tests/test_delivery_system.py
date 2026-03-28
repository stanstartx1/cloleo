"""
Test suite for Cloléo Delivery System
Tests: Orders API, Driver actions, Admin tracking, Order stats
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloleo-shop.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@cloleo.com"
ADMIN_PASSWORD = "admin123"
DRIVER_EMAIL = "testdriver@cloleo.com"
DRIVER_PASSWORD = "driver123"


class TestDeliverySystemSetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        return response.json()["token"]
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_admin_login(self, admin_token):
        """Test admin authentication"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print("✓ Admin login successful")
    
    def test_driver_login(self, driver_token):
        """Test driver authentication"""
        assert driver_token is not None
        assert len(driver_token) > 0
        print("✓ Driver login successful")


class TestOrderCreation:
    """Test order creation API - POST /api/orders"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def test_product_id(self, session):
        """Get a valid product ID for testing"""
        response = session.get(f"{BASE_URL}/api/products?limit=1")
        assert response.status_code == 200
        products = response.json().get("products", [])
        if products:
            return products[0]["id"]
        pytest.skip("No products available for testing")
    
    def test_create_order_success(self, session, test_product_id):
        """Test creating a new order - POST /api/orders"""
        order_data = {
            "items": [{"product_id": test_product_id, "quantity": 1}],
            "delivery_address": {
                "name": "TEST_Client Test",
                "phone": "+225 07 00 00 00",
                "street": "123 Rue Test, Cocody",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3599,
                "longitude": -4.0083
            },
            "payment_method": "cash",
            "notes": "Test order - please ignore"
        }
        
        response = session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "order_number" in data
        assert data["status"] == "pending"
        assert data["delivery_address"]["name"] == "TEST_Client Test"
        assert data["total_fcfa"] > 0
        print(f"✓ Order created successfully: {data['order_number']}")
        return data["id"]
    
    def test_create_order_invalid_product(self, session):
        """Test order creation with invalid product"""
        order_data = {
            "items": [{"product_id": "invalid-product-id", "quantity": 1}],
            "delivery_address": {
                "name": "Test",
                "phone": "+225 07 00 00 00",
                "street": "Test Street",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3599,
                "longitude": -4.0083
            },
            "payment_method": "cash"
        }
        
        response = session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 400
        print("✓ Invalid product order rejected correctly")


class TestOrderTracking:
    """Test public order tracking - GET /api/orders/track/{id}"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def test_order_id(self, session):
        """Create a test order and return its ID"""
        # Get a product first
        products_response = session.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        order_data = {
            "items": [{"product_id": products[0]["id"], "quantity": 1}],
            "delivery_address": {
                "name": "TEST_Tracking Test",
                "phone": "+225 07 00 00 00",
                "street": "456 Rue Tracking",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3599,
                "longitude": -4.0083
            },
            "payment_method": "cash"
        }
        
        response = session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_track_order_public(self, session, test_order_id):
        """Test public order tracking endpoint"""
        response = session.get(f"{BASE_URL}/api/orders/track/{test_order_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "status" in data
        assert "delivery_address" in data
        assert "items" in data
        assert "status_history" in data
        print(f"✓ Order tracking works: status={data['status']}")
    
    def test_track_order_not_found(self, session):
        """Test tracking non-existent order"""
        response = session.get(f"{BASE_URL}/api/orders/track/non-existent-id")
        assert response.status_code == 404
        print("✓ Non-existent order returns 404")


class TestDriverActions:
    """Test driver order actions - accept, pickup, deliver"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def driver_token(self, session):
        """Get driver authentication token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def driver_headers(self, driver_token):
        return {"Authorization": f"Bearer {driver_token}"}
    
    @pytest.fixture(scope="class")
    def pending_order_id(self, session):
        """Create a pending order for driver tests"""
        products_response = session.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        order_data = {
            "items": [{"product_id": products[0]["id"], "quantity": 1}],
            "delivery_address": {
                "name": "TEST_Driver Test",
                "phone": "+225 07 00 00 00",
                "street": "789 Rue Driver Test",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3599,
                "longitude": -4.0083
            },
            "payment_method": "cash"
        }
        
        response = session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_driver_dashboard(self, session, driver_headers):
        """Test driver dashboard endpoint"""
        response = session.get(f"{BASE_URL}/api/driver/dashboard", headers=driver_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert "stats" in data
        assert data["user"]["role"] == "driver"
        print(f"✓ Driver dashboard: {data['stats']['total_deliveries']} deliveries")
    
    def test_driver_accept_order(self, session, driver_headers, pending_order_id):
        """Test driver accepting an order - PUT /api/orders/{id}/accept"""
        response = session.put(
            f"{BASE_URL}/api/orders/{pending_order_id}/accept",
            headers=driver_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "assigned"
        print("✓ Driver accepted order successfully")
        
        # Verify order status changed
        track_response = session.get(f"{BASE_URL}/api/orders/track/{pending_order_id}")
        assert track_response.json()["status"] == "assigned"
    
    def test_driver_pickup_order(self, session, driver_headers, pending_order_id):
        """Test driver picking up order - PUT /api/orders/{id}/pickup"""
        response = session.put(
            f"{BASE_URL}/api/orders/{pending_order_id}/pickup",
            headers=driver_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "picked_up"
        print("✓ Driver picked up order successfully")
    
    def test_driver_deliver_order(self, session, driver_headers, pending_order_id):
        """Test driver delivering order - PUT /api/orders/{id}/deliver"""
        response = session.put(
            f"{BASE_URL}/api/orders/{pending_order_id}/deliver",
            headers=driver_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "delivered"
        print("✓ Driver delivered order successfully")
        
        # Verify final status
        track_response = session.get(f"{BASE_URL}/api/orders/track/{pending_order_id}")
        assert track_response.json()["status"] == "delivered"


class TestDriverLocationUpdate:
    """Test driver location update - POST /api/driver/location/update"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def driver_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_update_driver_location(self, session, driver_headers):
        """Test driver location update endpoint"""
        location_data = {
            "latitude": 5.3600,
            "longitude": -4.0084
        }
        
        response = session.post(
            f"{BASE_URL}/api/driver/location/update",
            json=location_data,
            headers=driver_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "location" in data
        assert data["location"]["latitude"] == 5.3600
        assert data["location"]["longitude"] == -4.0084
        print("✓ Driver location updated successfully")
    
    def test_update_driver_status(self, session, driver_headers):
        """Test driver status update"""
        response = session.put(
            f"{BASE_URL}/api/driver/status",
            json={"status": "available"},
            headers=driver_headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == "available"
        print("✓ Driver status updated to available")


class TestAdminOrderStats:
    """Test admin order statistics - GET /api/admin/orders/stats"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_get_order_stats(self, session, admin_headers):
        """Test admin order statistics endpoint"""
        response = session.get(f"{BASE_URL}/api/admin/orders/stats", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "pending" in data
        assert "assigned" in data
        assert "in_transit" in data
        assert "delivered" in data
        assert "cancelled" in data
        assert "total_revenue_fcfa" in data
        
        # Verify data types
        assert isinstance(data["total"], int)
        assert isinstance(data["pending"], int)
        assert isinstance(data["total_revenue_fcfa"], (int, float))
        
        print(f"✓ Order stats: total={data['total']}, delivered={data['delivered']}, revenue={data['total_revenue_fcfa']} FCFA")
    
    def test_get_admin_orders(self, session, admin_headers):
        """Test admin orders list endpoint"""
        response = session.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        print(f"✓ Admin orders list: {data['total']} orders")
    
    def test_get_admin_driver_locations(self, session, admin_headers):
        """Test admin driver locations endpoint"""
        response = session.get(f"{BASE_URL}/api/admin/drivers/locations", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "drivers" in data
        assert isinstance(data["drivers"], list)
        print(f"✓ Admin driver locations: {len(data['drivers'])} active drivers")


class TestOrderWorkflow:
    """Test complete order workflow from creation to delivery"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def driver_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_complete_order_workflow(self, session, driver_headers):
        """Test complete order workflow: create -> accept -> pickup -> deliver"""
        # Step 1: Get a product
        products_response = session.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        # Step 2: Create order
        order_data = {
            "items": [{"product_id": products[0]["id"], "quantity": 2}],
            "delivery_address": {
                "name": "TEST_Workflow Test",
                "phone": "+225 07 99 99 99",
                "street": "Complete Workflow Street",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3610,
                "longitude": -4.0090
            },
            "payment_method": "cash",
            "notes": "Complete workflow test"
        }
        
        create_response = session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        print(f"✓ Step 1: Order created - {order_id[:8]}")
        
        # Step 3: Driver accepts
        accept_response = session.put(
            f"{BASE_URL}/api/orders/{order_id}/accept",
            headers=driver_headers
        )
        assert accept_response.status_code == 200
        assert accept_response.json()["status"] == "assigned"
        print("✓ Step 2: Driver accepted order")
        
        # Step 4: Driver picks up
        pickup_response = session.put(
            f"{BASE_URL}/api/orders/{order_id}/pickup",
            headers=driver_headers
        )
        assert pickup_response.status_code == 200
        assert pickup_response.json()["status"] == "picked_up"
        print("✓ Step 3: Driver picked up package")
        
        # Step 5: Driver delivers
        deliver_response = session.put(
            f"{BASE_URL}/api/orders/{order_id}/deliver",
            headers=driver_headers
        )
        assert deliver_response.status_code == 200
        assert deliver_response.json()["status"] == "delivered"
        print("✓ Step 4: Order delivered successfully")
        
        # Verify final state
        track_response = session.get(f"{BASE_URL}/api/orders/track/{order_id}")
        final_order = track_response.json()
        assert final_order["status"] == "delivered"
        assert len(final_order["status_history"]) >= 4  # pending, assigned, picked_up, delivered
        print(f"✓ Complete workflow verified - {len(final_order['status_history'])} status changes")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_cleanup_test_orders(self, session, admin_headers):
        """Note: Test orders with TEST_ prefix created during testing"""
        # In a real scenario, we would delete test orders here
        # For now, just verify we can list orders
        response = session.get(f"{BASE_URL}/api/admin/orders?limit=100", headers=admin_headers)
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        test_orders = [o for o in orders if o.get("customer_name", "").startswith("TEST_")]
        print(f"✓ Cleanup note: {len(test_orders)} test orders created during testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
