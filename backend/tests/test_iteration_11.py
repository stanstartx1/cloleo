"""
Test Suite for Iteration 11 - Chat System, Products, Categories, Cart, Favorites
Focus: Chat fix verification, floating chat functionality, core e-commerce features
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloleo-shop.preview.emergentagent.com').rstrip('/')

# Test credentials from previous iterations
TEST_CUSTOMER_EMAIL = "testclient@cloleo.com"
TEST_CUSTOMER_PASSWORD = "test123"
ADMIN_EMAIL = "admin@cloleo.com"
ADMIN_PASSWORD = "admin123"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Cloléo" in data.get("message", "")
        print("✓ API root check passed")


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_test_customer(self):
        """Test login with test customer credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        # If user doesn't exist, create it
        if response.status_code == 401:
            # Register the test customer
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD,
                "name": "Test Client",
                "role": "customer"
            })
            if reg_response.status_code == 200:
                print("✓ Test customer created")
                response = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": TEST_CUSTOMER_EMAIL,
                    "password": TEST_CUSTOMER_PASSWORD
                })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Test customer login successful: {data['user'].get('name')}")
        return data["token"]
    
    def test_login_admin(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin"
        print("✓ Admin login successful")
        return data["token"]


class TestCategories:
    """Category listing tests"""
    
    def test_get_categories(self):
        """Test fetching categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Categories fetched: {len(data)} categories")
        
        # Verify category structure
        cat = data[0]
        assert "name" in cat
        assert "slug" in cat
        print(f"  First category: {cat['name']}")
    
    def test_get_category_by_slug(self):
        """Test fetching single category by slug"""
        # First get all categories
        response = requests.get(f"{BASE_URL}/api/categories")
        categories = response.json()
        if categories:
            slug = categories[0]["slug"]
            response = requests.get(f"{BASE_URL}/api/categories/{slug}")
            assert response.status_code == 200
            data = response.json()
            assert data["slug"] == slug
            print(f"✓ Category by slug fetched: {data['name']}")


class TestProducts:
    """Product listing and filtering tests"""
    
    def test_get_products(self):
        """Test fetching products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"✓ Products fetched: {len(data['products'])} products, total: {data['total']}")
        return data["products"]
    
    def test_get_products_with_filters(self):
        """Test product filtering"""
        # Get categories first
        cat_response = requests.get(f"{BASE_URL}/api/categories")
        categories = cat_response.json()
        if categories:
            category_slug = categories[0]["slug"]
            response = requests.get(f"{BASE_URL}/api/products", params={
                "category": category_slug,
                "limit": 5
            })
            assert response.status_code == 200
            data = response.json()
            print(f"✓ Filtered products: {len(data['products'])} in category {category_slug}")
    
    def test_get_featured_products(self):
        """Test fetching featured products"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Featured products fetched: {len(data)} products")
    
    def test_get_single_product(self):
        """Test fetching single product"""
        # First get products
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if products:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == product_id
            print(f"✓ Single product fetched: {data['name']}")
            return data
        else:
            pytest.skip("No products available")
    
    def test_search_products(self):
        """Test product search"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "Mode"})
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        print(f"✓ Search results: {len(data['products'])} products for 'Mode'")


class TestCart:
    """Cart functionality tests"""
    
    @pytest.fixture
    def session_id(self):
        return f"test_session_{uuid.uuid4().hex[:8]}"
    
    def test_add_to_cart(self, session_id):
        """Test adding item to cart"""
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        response = requests.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product_id,
            "quantity": 1,
            "session_id": session_id
        })
        assert response.status_code == 200
        print(f"✓ Added product to cart: {products[0]['name']}")
        return session_id, product_id
    
    def test_get_cart(self, session_id):
        """Test getting cart contents"""
        # First add an item
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if products:
            requests.post(f"{BASE_URL}/api/cart/add", json={
                "product_id": products[0]["id"],
                "quantity": 2,
                "session_id": session_id
            })
        
        response = requests.get(f"{BASE_URL}/api/cart/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_fcfa" in data
        print(f"✓ Cart fetched: {len(data['items'])} items, total: {data['total_fcfa']} FCFA")
    
    def test_clear_cart(self, session_id):
        """Test clearing cart"""
        response = requests.delete(f"{BASE_URL}/api/cart/{session_id}")
        assert response.status_code == 200
        print("✓ Cart cleared")


class TestFavorites:
    """Favorites functionality tests"""
    
    @pytest.fixture
    def session_id(self):
        return f"test_fav_session_{uuid.uuid4().hex[:8]}"
    
    def test_add_favorite(self, session_id):
        """Test adding product to favorites"""
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        response = requests.post(f"{BASE_URL}/api/favorites/{session_id}/{product_id}")
        assert response.status_code == 200
        print(f"✓ Added to favorites: {products[0]['name']}")
        return session_id, product_id
    
    def test_get_favorites(self, session_id):
        """Test getting favorites"""
        # First add a favorite
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if products:
            requests.post(f"{BASE_URL}/api/favorites/{session_id}/{products[0]['id']}")
        
        response = requests.get(f"{BASE_URL}/api/favorites/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Favorites fetched: {len(data)} items")
    
    def test_remove_favorite(self, session_id):
        """Test removing from favorites"""
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if products:
            product_id = products[0]["id"]
            requests.post(f"{BASE_URL}/api/favorites/{session_id}/{product_id}")
            response = requests.delete(f"{BASE_URL}/api/favorites/{session_id}/{product_id}")
            assert response.status_code == 200
            print("✓ Removed from favorites")


class TestUserFavorites:
    """Authenticated user favorites tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        if response.status_code == 401:
            # Register the test customer
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD,
                "name": "Test Client",
                "role": "customer"
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD
            })
        return response.json().get("token")
    
    def test_add_user_favorite(self, auth_token):
        """Test adding to user favorites (authenticated)"""
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        response = requests.post(
            f"{BASE_URL}/api/user/favorites/{product_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_favorite") == True
        print(f"✓ User favorite added: {products[0]['name']}")
    
    def test_get_user_favorites(self, auth_token):
        """Test getting user favorites"""
        response = requests.get(
            f"{BASE_URL}/api/user/favorites",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "favorites" in data
        print(f"✓ User favorites fetched: {len(data['favorites'])} items")


class TestChatSystem:
    """Chat system tests - CRITICAL for this iteration"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        if response.status_code == 401:
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD,
                "name": "Test Client",
                "role": "customer"
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD
            })
        return response.json().get("token")
    
    def test_get_conversations_list(self, customer_token):
        """Test fetching conversations list"""
        response = requests.get(
            f"{BASE_URL}/api/conversations",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        print(f"✓ Conversations list fetched: {len(data['conversations'])} conversations")
        return data["conversations"]
    
    def test_start_conversation_with_product(self, customer_token):
        """Test starting a conversation about a product"""
        # Get a product with a seller
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 10})
        products = products_response.json().get("products", [])
        
        # Find a product with a seller_id that's not 'system'
        product = None
        for p in products:
            if p.get("seller_id") and p.get("seller_id") != "system":
                product = p
                break
        
        if not product:
            # Use any product
            product = products[0] if products else None
        
        if not product:
            pytest.skip("No products available")
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": product["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to start conversation: {response.text}"
        data = response.json()
        assert "id" in data
        assert data.get("product_id") == product["id"]
        print(f"✓ Conversation started for product: {product['name']}")
        return data
    
    def test_send_message_in_conversation(self, customer_token):
        """Test sending a message in a conversation - CRITICAL FIX TEST"""
        # First start a conversation
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        # Start conversation
        conv_response = requests.post(
            f"{BASE_URL}/api/conversations/start",
            json={"product_id": products[0]["id"]},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert conv_response.status_code == 200
        conversation = conv_response.json()
        conversation_id = conversation["id"]
        
        # Send message using the FIXED endpoint: /api/conversations/{id}/messages
        test_message = f"Test message from iteration 11 - {uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/conversations/{conversation_id}/messages",
            json={"content": test_message},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        data = response.json()
        assert "id" in data
        assert data.get("content") == test_message
        print(f"✓ Message sent successfully: '{test_message[:30]}...'")
        return data
    
    def test_get_conversation_with_messages(self, customer_token):
        """Test fetching a conversation with its messages"""
        # Get conversations
        conv_list_response = requests.get(
            f"{BASE_URL}/api/conversations",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        conversations = conv_list_response.json().get("conversations", [])
        
        if not conversations:
            # Create one first
            products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
            products = products_response.json().get("products", [])
            if products:
                requests.post(
                    f"{BASE_URL}/api/conversations/start",
                    json={"product_id": products[0]["id"]},
                    headers={"Authorization": f"Bearer {customer_token}"}
                )
                conv_list_response = requests.get(
                    f"{BASE_URL}/api/conversations",
                    headers={"Authorization": f"Bearer {customer_token}"}
                )
                conversations = conv_list_response.json().get("conversations", [])
        
        if not conversations:
            pytest.skip("No conversations available")
        
        conversation_id = conversations[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/conversations/{conversation_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation" in data
        assert "messages" in data
        print(f"✓ Conversation fetched with {len(data['messages'])} messages")


class TestPublicStats:
    """Public statistics tests"""
    
    def test_get_public_stats(self):
        """Test fetching public stats"""
        response = requests.get(f"{BASE_URL}/api/stats/public")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "vendors" in data
        print(f"✓ Public stats: {data['products']} products, {data['vendors']} vendors")


class TestSubscriptionPlans:
    """Subscription plans tests"""
    
    def test_get_subscription_plans(self):
        """Test fetching subscription plans"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Subscription plans fetched: {len(data)} plans")
        for plan in data:
            print(f"  - {plan.get('name')}: {plan.get('price_fcfa')} FCFA")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
