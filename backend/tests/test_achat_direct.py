"""
Test suite for Achat Direct (Direct Purchase / Buy Now) feature
Tests the /api/orders endpoint with direct purchase flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloleo-shop.preview.emergentagent.com')

# Test product ID (HY510 Pâte thermique with promo price)
TEST_PRODUCT_ID = "c2aa4bfb-26e1-4afd-98f3-e073ebbf7f41"

# Test credentials
TEST_CUSTOMER = {
    "email": "testclient@cloleo.com",
    "password": "test123"
}


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for test customer"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestProductEndpoint:
    """Test product retrieval for direct purchase"""
    
    def test_get_product_details(self, api_client):
        """Verify product exists and has correct pricing"""
        response = api_client.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        assert response.status_code == 200, f"Product not found: {response.text}"
        
        product = response.json()
        assert product["id"] == TEST_PRODUCT_ID
        assert "name" in product
        assert "price_fcfa" in product
        assert "promo_price_fcfa" in product
        
        # Verify promo price is set (1000 FCFA)
        assert product["promo_price_fcfa"] == 1000, f"Expected promo price 1000, got {product['promo_price_fcfa']}"
        assert product["price_fcfa"] == 2500, f"Expected original price 2500, got {product['price_fcfa']}"
        
        print(f"Product: {product['name']}")
        print(f"Original price: {product['price_fcfa']} FCFA")
        print(f"Promo price: {product['promo_price_fcfa']} FCFA")


class TestDirectPurchaseOrder:
    """Test direct purchase order creation via /api/orders"""
    
    def test_create_direct_purchase_order_authenticated(self, authenticated_client):
        """Test creating order with authenticated user"""
        order_data = {
            "items": [{"product_id": TEST_PRODUCT_ID, "quantity": 1}],
            "delivery_address": {
                "name": "Test Direct Purchase",
                "phone": "+225 07 99 88 77",
                "street": "Cocody Riviera, Abidjan",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3599,
                "longitude": -4.0083
            },
            "payment_method": "cash",
            "notes": "Test direct purchase order"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        order = response.json()
        
        # Verify order structure
        assert "id" in order
        assert "order_number" in order
        assert order["order_number"].startswith("CLO-")
        
        # Verify customer info
        assert order["customer_name"] == "Test Direct Purchase"
        assert order["customer_phone"] == "+225 07 99 88 77"
        
        # Verify items
        assert len(order["items"]) == 1
        item = order["items"][0]
        assert item["product_id"] == TEST_PRODUCT_ID
        assert item["quantity"] == 1
        assert item["unit_price_fcfa"] == 1000  # Promo price
        assert item["subtotal_fcfa"] == 1000
        
        # Verify totals
        assert order["subtotal_fcfa"] == 1000
        assert order["delivery_fee_fcfa"] > 0  # Should have delivery fee
        assert order["total_fcfa"] == order["subtotal_fcfa"] + order["delivery_fee_fcfa"]
        
        # Verify status
        assert order["status"] == "pending"
        assert order["payment_status"] == "pending"
        assert order["payment_method"] == "cash"
        
        print(f"Order created: {order['order_number']}")
        print(f"Total: {order['total_fcfa']} FCFA")
        
        return order["id"]
    
    def test_create_order_with_multiple_quantity(self, authenticated_client):
        """Test creating order with quantity > 1"""
        order_data = {
            "items": [{"product_id": TEST_PRODUCT_ID, "quantity": 3}],
            "delivery_address": {
                "name": "Test Multiple Qty",
                "phone": "+225 07 11 22 33",
                "street": "Plateau, Abidjan",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3167,
                "longitude": -4.0167
            },
            "payment_method": "mobile_money",
            "notes": "Test order with 3 items"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        order = response.json()
        
        # Verify quantity and subtotal
        item = order["items"][0]
        assert item["quantity"] == 3
        assert item["subtotal_fcfa"] == 3000  # 1000 * 3
        assert order["subtotal_fcfa"] == 3000
        
        # Verify payment method
        assert order["payment_method"] == "mobile_money"
        
        print(f"Order with qty 3: {order['order_number']}")
        print(f"Subtotal: {order['subtotal_fcfa']} FCFA")
    
    def test_create_order_invalid_product(self, authenticated_client):
        """Test creating order with non-existent product"""
        order_data = {
            "items": [{"product_id": "invalid-product-id", "quantity": 1}],
            "delivery_address": {
                "name": "Test Invalid",
                "phone": "+225 07 00 00 00",
                "street": "Test Street",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3599,
                "longitude": -4.0083
            },
            "payment_method": "cash"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 400, f"Expected 400 for invalid product, got {response.status_code}"
        
        error = response.json()
        assert "detail" in error
        print(f"Error for invalid product: {error['detail']}")
    
    def test_get_order_after_creation(self, authenticated_client):
        """Test retrieving order after creation"""
        # First create an order
        order_data = {
            "items": [{"product_id": TEST_PRODUCT_ID, "quantity": 1}],
            "delivery_address": {
                "name": "Test Get Order",
                "phone": "+225 07 55 66 77",
                "street": "Yopougon, Abidjan",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3167,
                "longitude": -4.0833
            },
            "payment_method": "cash"
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        
        # Now retrieve the order
        get_response = authenticated_client.get(f"{BASE_URL}/api/orders/{order_id}")
        assert get_response.status_code == 200, f"Failed to get order: {get_response.text}"
        
        order = get_response.json()
        assert order["id"] == order_id
        assert order["customer_name"] == "Test Get Order"
        
        print(f"Retrieved order: {order['order_number']}")


class TestOrderTracking:
    """Test order tracking endpoint"""
    
    def test_track_order_public(self, api_client, authenticated_client):
        """Test public order tracking endpoint"""
        # First create an order
        order_data = {
            "items": [{"product_id": TEST_PRODUCT_ID, "quantity": 1}],
            "delivery_address": {
                "name": "Test Track Order",
                "phone": "+225 07 88 99 00",
                "street": "Marcory, Abidjan",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3000,
                "longitude": -3.9833
            },
            "payment_method": "cash"
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["id"]
        
        # Track order (public endpoint - no auth required)
        track_response = api_client.get(f"{BASE_URL}/api/orders/track/{order_id}")
        assert track_response.status_code == 200, f"Failed to track order: {track_response.text}"
        
        tracking = track_response.json()
        assert tracking["id"] == order_id
        assert "status" in tracking
        assert "status_history" in tracking
        
        print(f"Order status: {tracking['status']}")
        print(f"Status history: {len(tracking['status_history'])} entries")


class TestDeliveryFee:
    """Test delivery fee calculation"""
    
    def test_delivery_fee_applied(self, authenticated_client):
        """Verify delivery fee is correctly applied"""
        order_data = {
            "items": [{"product_id": TEST_PRODUCT_ID, "quantity": 1}],
            "delivery_address": {
                "name": "Test Delivery Fee",
                "phone": "+225 07 12 34 56",
                "street": "Test Address",
                "city": "Abidjan",
                "country": "Côte d'Ivoire",
                "latitude": 5.3599,
                "longitude": -4.0083
            },
            "payment_method": "cash"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200
        
        order = response.json()
        
        # Verify delivery fee is present and positive
        assert order["delivery_fee_fcfa"] > 0, "Delivery fee should be positive"
        
        # Verify total calculation
        expected_total = order["subtotal_fcfa"] + order["delivery_fee_fcfa"]
        assert order["total_fcfa"] == expected_total, f"Total mismatch: {order['total_fcfa']} != {expected_total}"
        
        print(f"Subtotal: {order['subtotal_fcfa']} FCFA")
        print(f"Delivery fee: {order['delivery_fee_fcfa']} FCFA")
        print(f"Total: {order['total_fcfa']} FCFA")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
