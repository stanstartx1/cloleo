#!/usr/bin/env python3
"""
Backend API Tests for Cloléo Marketplace
Tests all main API endpoints with comprehensive coverage
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class CloléoAPITester:
    def __init__(self, base_url: str = "https://cloleo-shop.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = f"test_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.results = []

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int = 200, data: Dict[Any, Any] = None, params: Dict[str, Any] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                except:
                    response_data = {"raw": response.text}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "name": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                response_data = {}

            self.results.append({
                "test": name,
                "passed": success,
                "status_code": response.status_code,
                "expected_status": expected_status
            })

            return success, response_data, response.status_code

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({
                "name": name,
                "error": str(e)
            })
            self.results.append({
                "test": name,
                "passed": False,
                "error": str(e)
            })
            return False, {}, 0

    def test_health_endpoints(self):
        """Test basic health and info endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH & INFO ENDPOINTS")
        print("="*50)
        
        # Test root endpoint
        self.run_test("API Root", "GET", "/")
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "/health")

    def test_categories_endpoints(self):
        """Test category-related endpoints"""
        print("\n" + "="*50)
        print("TESTING CATEGORIES ENDPOINTS")
        print("="*50)
        
        # Get all categories
        success, categories_data, _ = self.run_test("Get All Categories", "GET", "/categories")
        
        if success and categories_data:
            categories = categories_data if isinstance(categories_data, list) else []
            print(f"   Found {len(categories)} categories")
            
            # Test individual category endpoints
            if categories:
                first_category = categories[0]
                category_slug = first_category.get('slug', 'mode-textile')
                self.run_test(f"Get Category: {category_slug}", "GET", f"/categories/{category_slug}")
        
        return success

    def test_products_endpoints(self):
        """Test product-related endpoints"""
        print("\n" + "="*50)
        print("TESTING PRODUCTS ENDPOINTS")
        print("="*50)
        
        # Get all products
        success, products_data, _ = self.run_test("Get All Products", "GET", "/products")
        
        if success and products_data:
            products = products_data.get('products', [])
            print(f"   Found {len(products)} products")
            
            # Test products with filters
            self.run_test("Get Products with Pagination", "GET", "/products", params={"page": 1, "limit": 5})
            self.run_test("Get Products by Category", "GET", "/products", params={"category": "mode-textile"})
            self.run_test("Get Featured Products", "GET", "/products", params={"featured": "true"})
            
            # Test individual product endpoints
            if products:
                first_product = products[0]
                product_id = first_product.get('id')
                if product_id:
                    self.run_test(f"Get Product: {product_id[:8]}...", "GET", f"/products/{product_id}")
                    self.run_test(f"Get Similar Products", "GET", f"/products/{product_id}/similar")
                    self.run_test(f"Get Also Bought", "GET", f"/products/{product_id}/also-bought")
        
        return success

    def test_search_endpoints(self):
        """Test search functionality"""
        print("\n" + "="*50)
        print("TESTING SEARCH ENDPOINTS")
        print("="*50)
        
        # Search for products
        self.run_test("Search: wax", "GET", "/search", params={"q": "wax"})
        self.run_test("Search: tissu", "GET", "/search", params={"q": "tissu"})
        self.run_test("Search: empty query", "GET", "/search", params={"q": ""})

    def test_cart_endpoints(self):
        """Test cart functionality"""
        print("\n" + "="*50)
        print("TESTING CART ENDPOINTS")
        print("="*50)
        
        # First get a product to add to cart
        success, products_data, _ = self.run_test("Get Products for Cart Test", "GET", "/products", params={"limit": 1})
        
        if success and products_data:
            products = products_data.get('products', [])
            if products:
                product_id = products[0].get('id')
                
                # Add to cart
                add_success, _, _ = self.run_test("Add to Cart", "POST", "/cart/add", 
                    data={"product_id": product_id, "quantity": 2, "session_id": self.session_id})
                
                if add_success:
                    # Get cart
                    self.run_test("Get Cart", "GET", f"/cart/{self.session_id}")
                    
                    # Update cart (need item_id, assuming first in cart)
                    # This is a simplified test - in real scenario we'd get the item_id from get_cart response
                    cart_success, cart_data, _ = self.run_test("Get Cart for Update", "GET", f"/cart/{self.session_id}")
                    if cart_success and cart_data.get('items'):
                        item_id = cart_data['items'][0].get('id')
                        if item_id:
                            self.run_test("Update Cart Item", "PUT", f"/cart/{self.session_id}/{item_id}", 
                                data={"quantity": 3})
                            self.run_test("Remove Cart Item", "DELETE", f"/cart/{self.session_id}/{item_id}")
                    
                    # Clear cart
                    self.run_test("Clear Cart", "DELETE", f"/cart/{self.session_id}")

    def test_favorites_endpoints(self):
        """Test favorites functionality"""
        print("\n" + "="*50)
        print("TESTING FAVORITES ENDPOINTS")
        print("="*50)
        
        # First get a product to add to favorites
        success, products_data, _ = self.run_test("Get Products for Favorites Test", "GET", "/products", params={"limit": 1})
        
        if success and products_data:
            products = products_data.get('products', [])
            if products:
                product_id = products[0].get('id')
                
                # Add to favorites
                self.run_test("Add to Favorites", "POST", f"/favorites/{self.session_id}/{product_id}")
                
                # Get favorites
                self.run_test("Get Favorites", "GET", f"/favorites/{self.session_id}")
                
                # Remove from favorites
                self.run_test("Remove from Favorites", "DELETE", f"/favorites/{self.session_id}/{product_id}")

    def test_database_seed(self):
        """Test database seeding (optional, as it resets data)"""
        print("\n" + "="*50)
        print("TESTING DATABASE SEED (WARNING: RESETS DATA)")
        print("="*50)
        
        # Only run if explicitly requested or if no data found
        print("Skipping seed test to preserve existing data")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                if 'response' in test:
                    print(f"   Response: {test['response']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        return success_rate >= 80  # Consider successful if 80% pass

def main():
    """Run all API tests"""
    print("🚀 Starting Cloléo API Tests...")
    print(f"Backend URL: https://cloleo-shop.preview.emergentagent.com")
    
    tester = CloléoAPITester()
    
    try:
        # Run all test suites
        tester.test_health_endpoints()
        tester.test_categories_endpoints()
        tester.test_products_endpoints()
        tester.test_search_endpoints()
        tester.test_cart_endpoints()
        tester.test_favorites_endpoints()
        
        # Print summary
        success = tester.print_summary()
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"\n💥 Critical error during testing: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())