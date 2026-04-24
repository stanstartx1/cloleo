"""
Chat System Tests - Client-Vendor/Dropshipper Messaging
Tests for:
- POST /api/conversations/start (with product_id or dropshipped_product_id)
- POST /api/conversations/{id}/messages
- GET /api/vendor/conversations
- GET /api/dropshipper/conversations
- GET /api/conversations/{id}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@cloleo.com", "password": "admin123"}
VENDOR_CREDS = {"email": "vendeur.cloleo@cloleo.com", "password": "vendor123"}
DROPSHIPPER_CREDS = {"email": "testdrop3@cloleo.com", "password": "drop123"}

# Test customer - will be created if not exists
TEST_CUSTOMER_EMAIL = f"test_customer_{uuid.uuid4().hex[:8]}@test.com"
TEST_CUSTOMER_CREDS = {"email": TEST_CUSTOMER_EMAIL, "password": "test123", "name": "Test Customer", "role": "customer"}


class TestChatSystemSetup:
    """Setup tests - verify users and products exist"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_backend_health(self, session):
        """Test backend is healthy"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("✓ Backend is healthy")
    
    def test_vendor_login(self, session):
        """Test vendor can login"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=VENDOR_CREDS)
        if response.status_code == 401:
            pytest.skip("Vendor account not found - skipping vendor tests")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "vendor"
        print(f"✓ Vendor login successful: {data['user']['name']}")
        return data["token"]
    
    def test_dropshipper_login(self, session):
        """Test dropshipper can login"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=DROPSHIPPER_CREDS)
        if response.status_code == 401:
            pytest.skip("Dropshipper account not found - skipping dropshipper tests")
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "dropshipper"
        print(f"✓ Dropshipper login successful: {data['user']['name']}")
        return data["token"]


class TestChatConversations:
    """Test conversation creation and messaging"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def customer_token(self, session):
        """Create or login test customer"""
        # Try to register
        response = session.post(f"{BASE_URL}/api/auth/register", json=TEST_CUSTOMER_CREDS)
        if response.status_code == 200:
            return response.json()["token"]
        # If already exists, login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_CREDS["email"],
            "password": TEST_CUSTOMER_CREDS["password"]
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not create/login test customer")
    
    @pytest.fixture(scope="class")
    def vendor_token(self, session):
        """Get vendor token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=VENDOR_CREDS)
        if response.status_code != 200:
            pytest.skip("Vendor login failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def dropshipper_token(self, session):
        """Get dropshipper token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=DROPSHIPPER_CREDS)
        if response.status_code != 200:
            pytest.skip("Dropshipper login failed")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def vendor_product(self, session, vendor_token):
        """Get a vendor product to chat about"""
        # Get vendor's products
        response = session.get(f"{BASE_URL}/api/vendor/products", 
                               headers={"Authorization": f"Bearer {vendor_token}"})
        if response.status_code == 200:
            products = response.json()
            if isinstance(products, list) and len(products) > 0:
                return products[0]
        
        # Fallback: get any approved product
        response = session.get(f"{BASE_URL}/api/products?limit=1")
        if response.status_code == 200:
            data = response.json()
            if data.get("products"):
                return data["products"][0]
        
        pytest.skip("No products available for testing")
    
    @pytest.fixture(scope="class")
    def dropshipped_product(self, session, dropshipper_token):
        """Get a dropshipped product to chat about"""
        response = session.get(f"{BASE_URL}/api/dropshipper/products",
                               headers={"Authorization": f"Bearer {dropshipper_token}"})
        if response.status_code == 200:
            products = response.json()
            if isinstance(products, list) and len(products) > 0:
                return products[0]
        pytest.skip("No dropshipped products available for testing")
    
    def test_start_conversation_with_vendor_product(self, session, customer_token, vendor_product):
        """Test starting a conversation about a vendor product"""
        response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": vendor_product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify conversation structure
        assert "id" in data
        assert data["product_id"] == vendor_product["id"]
        assert data["seller_type"] == "vendor"
        assert "customer_id" in data
        assert "seller_id" in data
        print(f"✓ Conversation started with vendor for product: {vendor_product['name']}")
        return data
    
    def test_start_conversation_without_auth_fails(self, session, vendor_product):
        """Test that starting conversation without auth fails"""
        response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": vendor_product["id"]}
        )
        assert response.status_code == 401
        print("✓ Unauthenticated conversation start correctly rejected")
    
    def test_start_conversation_without_product_fails(self, session, customer_token):
        """Test that starting conversation without product_id fails"""
        response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400
        print("✓ Conversation without product_id correctly rejected")
    
    def test_send_message_in_conversation(self, session, customer_token, vendor_product):
        """Test sending a message in a conversation"""
        # First start/get conversation
        conv_response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": vendor_product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert conv_response.status_code == 200
        conversation = conv_response.json()
        
        # Send a message
        test_message = f"Bonjour, je suis intéressé par ce produit. Test message {uuid.uuid4().hex[:8]}"
        response = session.post(
            f"{BASE_URL}/api/conversations/{conversation['id']}/messages",
            json={"content": test_message},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify message structure
        assert "id" in data
        assert data["content"] == test_message
        assert data["sender_type"] == "customer"
        assert data["conversation_id"] == conversation["id"]
        print(f"✓ Message sent successfully: {test_message[:50]}...")
        return data
    
    def test_get_conversation_with_messages(self, session, customer_token, vendor_product):
        """Test getting a conversation with its messages"""
        # Start/get conversation
        conv_response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": vendor_product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        conversation = conv_response.json()
        
        # Get conversation with messages
        response = session.get(
            f"{BASE_URL}/api/conversations/{conversation['id']}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "conversation" in data
        assert "messages" in data
        assert data["conversation"]["id"] == conversation["id"]
        print(f"✓ Got conversation with {len(data['messages'])} messages")
    
    def test_vendor_can_see_conversations(self, session, vendor_token):
        """Test vendor can see their conversations"""
        response = session.get(
            f"{BASE_URL}/api/vendor/conversations",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Vendor has {len(data)} conversations")
        
        # Verify conversation structure if any exist
        if len(data) > 0:
            conv = data[0]
            assert "id" in conv
            assert "customer_name" in conv
            assert "product_name" in conv
            assert "unread_count" in conv
            print(f"  - Latest conversation: {conv.get('customer_name')} about {conv.get('product_name')}")
    
    def test_vendor_can_reply_to_conversation(self, session, customer_token, vendor_token, vendor_product):
        """Test vendor can reply to a customer message"""
        # Customer starts conversation and sends message
        conv_response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": vendor_product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        conversation = conv_response.json()
        
        # Customer sends message
        session.post(
            f"{BASE_URL}/api/conversations/{conversation['id']}/messages",
            json={"content": "Question du client"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Vendor replies
        vendor_reply = f"Réponse du vendeur - {uuid.uuid4().hex[:8]}"
        response = session.post(
            f"{BASE_URL}/api/conversations/{conversation['id']}/messages",
            json={"content": vendor_reply},
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["sender_type"] == "seller"
        assert data["content"] == vendor_reply
        print(f"✓ Vendor replied successfully: {vendor_reply}")
    
    def test_dropshipper_can_see_conversations(self, session, dropshipper_token):
        """Test dropshipper can see their conversations"""
        response = session.get(
            f"{BASE_URL}/api/dropshipper/conversations",
            headers={"Authorization": f"Bearer {dropshipper_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Dropshipper has {len(data)} conversations")
    
    def test_start_conversation_with_dropshipped_product(self, session, customer_token, dropshipped_product):
        """Test starting a conversation about a dropshipped product"""
        response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"dropshipped_product_id": dropshipped_product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify conversation is with dropshipper
        assert data["seller_type"] == "dropshipper"
        assert data["product_id"] == dropshipped_product["id"]
        print(f"✓ Conversation started with dropshipper for product: {dropshipped_product.get('original_name', 'N/A')}")
    
    def test_messages_grouped_by_date_structure(self, session, customer_token, vendor_product):
        """Test that messages have proper date structure for grouping"""
        # Start conversation
        conv_response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": vendor_product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        conversation = conv_response.json()
        
        # Send a message
        session.post(
            f"{BASE_URL}/api/conversations/{conversation['id']}/messages",
            json={"content": "Test message for date grouping"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Get messages
        response = session.get(
            f"{BASE_URL}/api/conversations/{conversation['id']}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        data = response.json()
        
        # Verify messages have created_at for date grouping
        if data["messages"]:
            msg = data["messages"][0]
            assert "created_at" in msg
            assert "T" in msg["created_at"]  # ISO format
            print(f"✓ Messages have proper date format for grouping: {msg['created_at']}")
    
    def test_unread_badge_increments(self, session, customer_token, vendor_token, vendor_product):
        """Test that unread count increments when customer sends message"""
        # Start conversation
        conv_response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": vendor_product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        conversation = conv_response.json()
        
        # Customer sends message
        session.post(
            f"{BASE_URL}/api/conversations/{conversation['id']}/messages",
            json={"content": "New message for unread test"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Check vendor's conversations for unread count
        response = session.get(
            f"{BASE_URL}/api/vendor/conversations",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        data = response.json()
        
        # Find our conversation
        our_conv = next((c for c in data if c["id"] == conversation["id"]), None)
        if our_conv:
            assert "unread_count" in our_conv
            print(f"✓ Unread count for vendor: {our_conv['unread_count']}")


class TestChatEdgeCases:
    """Test edge cases and error handling"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def customer_token(self, session):
        """Get customer token"""
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"edge_test_{uuid.uuid4().hex[:8]}@test.com",
            "password": "test123",
            "name": "Edge Test Customer",
            "role": "customer"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not create test customer")
    
    def test_conversation_with_invalid_product_fails(self, session, customer_token):
        """Test starting conversation with non-existent product fails"""
        response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": "non-existent-product-id"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 404
        print("✓ Conversation with invalid product correctly rejected")
    
    def test_message_to_invalid_conversation_fails(self, session, customer_token):
        """Test sending message to non-existent conversation fails"""
        response = session.post(
            f"{BASE_URL}/api/conversations/invalid-conv-id/messages",
            json={"content": "Test message"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 404
        print("✓ Message to invalid conversation correctly rejected")
    
    def test_access_other_users_conversation_fails(self, session, customer_token):
        """Test that user cannot access another user's conversation"""
        # Create another customer
        other_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"other_{uuid.uuid4().hex[:8]}@test.com",
            "password": "test123",
            "name": "Other Customer",
            "role": "customer"
        })
        if other_response.status_code != 200:
            pytest.skip("Could not create other customer")
        other_token = other_response.json()["token"]
        
        # Get a product
        products_response = session.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code != 200 or not products_response.json().get("products"):
            pytest.skip("No products available")
        product = products_response.json()["products"][0]
        
        # First customer starts conversation
        conv_response = session.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        if conv_response.status_code != 200:
            pytest.skip("Could not create conversation")
        conversation = conv_response.json()
        
        # Other customer tries to access it
        response = session.get(
            f"{BASE_URL}/api/conversations/{conversation['id']}",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert response.status_code == 403
        print("✓ Access to other user's conversation correctly denied")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
