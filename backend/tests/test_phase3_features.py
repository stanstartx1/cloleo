"""
Phase 3 Backend Tests for Cloléo Marketplace
Tests: Admin Dashboard (9 tabs), Driver System, File Upload
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cloleo-shop.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@cloleo.com"
ADMIN_PASSWORD = "admin123"
VENDOR_EMAIL = "testvendor@cloleo.com"
VENDOR_PASSWORD = "test123"

class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        print(f"✓ API version: {data.get('version')}")


class TestAdminAuthentication:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['name']}")
        return data["token"]
    
    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid admin login rejected correctly")


class TestAdminDashboard:
    """Admin dashboard and stats tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_admin_dashboard_stats(self, admin_token):
        """Test admin dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", 
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        stats = data["stats"]
        assert "total_users" in stats
        assert "total_vendors" in stats
        assert "total_products" in stats
        assert "pending_products" in stats
        print(f"✓ Admin dashboard stats: {stats['total_users']} users, {stats['total_vendors']} vendors, {stats['total_products']} products")
    
    def test_admin_vendors_list(self, admin_token):
        """Test admin vendors list endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/vendors",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "vendors" in data
        assert "total" in data
        print(f"✓ Admin vendors list: {data['total']} vendors found")
    
    def test_admin_drivers_list(self, admin_token):
        """Test admin drivers list endpoint (should be empty initially)"""
        response = requests.get(f"{BASE_URL}/api/admin/drivers",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "drivers" in data
        assert "total" in data
        print(f"✓ Admin drivers list: {data['total']} drivers found")
    
    def test_admin_products_list(self, admin_token):
        """Test admin products list endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/products",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"✓ Admin products list: {data['total']} products found")
    
    def test_admin_pending_products(self, admin_token):
        """Test admin pending products endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/products/pending",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"✓ Admin pending products: {data['total']} pending")
    
    def test_admin_transactions(self, admin_token):
        """Test admin transactions endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/transactions",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data
        print(f"✓ Admin transactions: {data['total']} transactions found")


class TestAdminSettings:
    """Admin settings tests (vendor, delivery, platform)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_vendor_settings(self, admin_token):
        """Test vendor settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/vendor",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "type" in data
        assert data["type"] == "vendor"
        assert "max_images_per_product" in data
        assert "commission_rates" in data
        print(f"✓ Vendor settings loaded: max_images={data.get('max_images_per_product')}")
    
    def test_delivery_settings(self, admin_token):
        """Test delivery/driver settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/delivery",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "type" in data
        assert data["type"] == "delivery"
        assert "base_delivery_fee" in data
        assert "vehicle_types" in data
        print(f"✓ Delivery settings loaded: base_fee={data.get('base_delivery_fee')}")
    
    def test_platform_settings(self, admin_token):
        """Test platform settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/platform",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "type" in data
        assert data["type"] == "platform"
        assert "site_name" in data
        assert "currency" in data
        print(f"✓ Platform settings loaded: site_name={data.get('site_name')}")
    
    def test_update_vendor_settings(self, admin_token):
        """Test updating vendor settings"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings/vendor",
            headers={"Authorization": f"Bearer {admin_token}"})
        current = get_response.json()
        
        # Update with same values (safe test)
        update_response = requests.put(f"{BASE_URL}/api/admin/settings/vendor",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"settings": current})
        assert update_response.status_code == 200
        print("✓ Vendor settings update successful")


class TestDriverRegistration:
    """Driver registration and management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_driver_registration(self):
        """Test driver registration endpoint"""
        unique_email = f"TEST_driver_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register/driver", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Driver",
            "phone": "+225 07 00 00 00",
            "vehicle_type": "moto",
            "license_number": f"LIC{uuid.uuid4().hex[:6].upper()}",
            "city": "Abidjan",
            "country": "Côte d'Ivoire"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "driver"
        assert data["user"]["is_active"] == False  # Requires admin approval
        assert data["user"]["is_verified"] == False
        print(f"✓ Driver registration successful: {data['user']['name']}")
        return data
    
    def test_driver_dashboard_access(self):
        """Test driver dashboard access after registration"""
        # Register a new driver
        unique_email = f"TEST_driver_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register/driver", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Dashboard Test Driver",
            "phone": "+225 07 00 00 01",
            "vehicle_type": "voiture",
            "license_number": f"LIC{uuid.uuid4().hex[:6].upper()}",
            "city": "Dakar",
            "country": "Sénégal"
        })
        assert reg_response.status_code == 200
        driver_token = reg_response.json()["token"]
        
        # Access driver dashboard
        dash_response = requests.get(f"{BASE_URL}/api/driver/dashboard",
            headers={"Authorization": f"Bearer {driver_token}"})
        assert dash_response.status_code == 200
        data = dash_response.json()
        assert "user" in data
        assert "stats" in data
        assert data["stats"]["total_deliveries"] == 0
        print(f"✓ Driver dashboard access successful")
    
    def test_driver_status_update(self):
        """Test driver status update"""
        # Register a new driver
        unique_email = f"TEST_driver_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register/driver", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Status Test Driver",
            "phone": "+225 07 00 00 02",
            "vehicle_type": "velo",
            "license_number": f"LIC{uuid.uuid4().hex[:6].upper()}",
            "city": "Lagos",
            "country": "Nigeria"
        })
        driver_token = reg_response.json()["token"]
        
        # Update status
        status_response = requests.put(f"{BASE_URL}/api/driver/status",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={"status": "available"})
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "available"
        print("✓ Driver status update successful")
    
    def test_driver_location_update(self):
        """Test driver location update"""
        # Register a new driver
        unique_email = f"TEST_driver_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register/driver", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Location Test Driver",
            "phone": "+225 07 00 00 03",
            "vehicle_type": "moto",
            "license_number": f"LIC{uuid.uuid4().hex[:6].upper()}",
            "city": "Accra",
            "country": "Ghana"
        })
        driver_token = reg_response.json()["token"]
        
        # Update location
        loc_response = requests.put(f"{BASE_URL}/api/driver/location",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={"latitude": 5.6037, "longitude": -0.1870})
        assert loc_response.status_code == 200
        assert "location" in loc_response.json()
        print("✓ Driver location update successful")
    
    def test_admin_verify_driver(self, admin_token):
        """Test admin verifying a driver"""
        # First register a driver
        unique_email = f"TEST_driver_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register/driver", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Verify Test Driver",
            "phone": "+225 07 00 00 04",
            "vehicle_type": "moto",
            "license_number": f"LIC{uuid.uuid4().hex[:6].upper()}",
            "city": "Abidjan",
            "country": "Côte d'Ivoire"
        })
        driver_id = reg_response.json()["user"]["id"]
        
        # Admin verifies driver
        verify_response = requests.put(f"{BASE_URL}/api/admin/drivers/{driver_id}/verify",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert verify_response.status_code == 200
        assert "message" in verify_response.json()
        print("✓ Admin driver verification successful")
    
    def test_admin_toggle_driver(self, admin_token):
        """Test admin toggling driver status"""
        # First register a driver
        unique_email = f"TEST_driver_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register/driver", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Toggle Test Driver",
            "phone": "+225 07 00 00 05",
            "vehicle_type": "voiture",
            "license_number": f"LIC{uuid.uuid4().hex[:6].upper()}",
            "city": "Douala",
            "country": "Cameroun"
        })
        driver_id = reg_response.json()["user"]["id"]
        
        # Admin toggles driver
        toggle_response = requests.put(f"{BASE_URL}/api/admin/drivers/{driver_id}/toggle",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert toggle_response.status_code == 200
        assert "is_active" in toggle_response.json()
        print("✓ Admin driver toggle successful")


class TestFileUpload:
    """File upload endpoint tests"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get or create vendor token"""
        # Try to login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if login_response.status_code == 200:
            return login_response.json()["token"]
        
        # Register new vendor if login fails
        unique_email = f"TEST_vendor_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Vendor",
            "role": "vendor"
        })
        if reg_response.status_code == 200:
            return reg_response.json()["token"]
        pytest.skip("Could not get vendor token")
    
    def test_upload_endpoint_requires_auth(self):
        """Test that upload endpoint requires authentication"""
        # Create a simple test file
        files = {'file': ('test.jpg', b'fake image content', 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 401
        print("✓ Upload endpoint correctly requires authentication")
    
    def test_upload_single_file(self, vendor_token):
        """Test single file upload"""
        # Create a minimal valid JPEG (1x1 pixel)
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xCD,
            0xBF, 0xFF, 0xD9
        ])
        
        files = {'file': ('test_image.jpg', jpeg_bytes, 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload", 
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "filename" in data
        assert data["url"].startswith("/api/uploads/")
        print(f"✓ Single file upload successful: {data['url']}")
    
    def test_upload_multiple_files(self, vendor_token):
        """Test multiple file upload"""
        # Create minimal JPEG bytes
        jpeg_bytes = bytes([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9])
        
        files = [
            ('files', ('test1.jpg', jpeg_bytes, 'image/jpeg')),
            ('files', ('test2.jpg', jpeg_bytes, 'image/jpeg'))
        ]
        response = requests.post(f"{BASE_URL}/api/upload/multiple", 
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert "urls" in data
        assert len(data["urls"]) >= 1  # At least one should succeed
        print(f"✓ Multiple file upload successful: {len(data['urls'])} files")
    
    def test_upload_invalid_file_type(self, vendor_token):
        """Test upload with invalid file type"""
        files = {'file': ('test.exe', b'fake executable', 'application/x-msdownload')}
        response = requests.post(f"{BASE_URL}/api/upload", 
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"})
        
        assert response.status_code == 400
        print("✓ Invalid file type correctly rejected")


class TestVendorProductWithImages:
    """Test vendor product creation with image upload"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get or create vendor token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if login_response.status_code == 200:
            return login_response.json()["token"]
        
        unique_email = f"TEST_vendor_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Vendor",
            "role": "vendor"
        })
        if reg_response.status_code == 200:
            return reg_response.json()["token"]
        pytest.skip("Could not get vendor token")
    
    def test_create_product_with_images(self, vendor_token):
        """Test creating a product with image URLs"""
        # Get categories first
        cat_response = requests.get(f"{BASE_URL}/api/categories")
        categories = cat_response.json()
        category_slug = categories[0]["slug"] if categories else "mode-textile"
        
        product_data = {
            "name": f"TEST_Product_{uuid.uuid4().hex[:8]}",
            "description": "Test product description with enough characters to pass validation requirements for the marketplace.",
            "price_fcfa": 15000,
            "promo_price_fcfa": 12000,
            "stock": 10,
            "condition": "neuf",
            "category_slug": category_slug,
            "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
            "tags": ["test", "product"]
        }
        
        response = requests.post(f"{BASE_URL}/api/vendor/products",
            json=product_data,
            headers={"Authorization": f"Bearer {vendor_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == product_data["name"]
        assert data["status"] == "pending"
        assert len(data["images"]) == 2
        print(f"✓ Product created with images: {data['name']}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_cleanup_test_drivers(self, admin_token):
        """Clean up test drivers created during testing"""
        # Get all drivers
        response = requests.get(f"{BASE_URL}/api/admin/drivers",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if response.status_code == 200:
            drivers = response.json().get("drivers", [])
            deleted = 0
            for driver in drivers:
                if driver.get("email", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/admin/drivers/{driver['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"})
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test drivers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
