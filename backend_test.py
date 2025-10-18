import requests
import sys
import json
from datetime import datetime, timedelta

class SemiDeusAPITester:
    def __init__(self, base_url="https://semideus-finance.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_customer_id = None
        self.test_debt_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"testuser_{timestamp}",
            "email": f"test_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_user_id = response.get('user', {}).get('id')
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing user"""
        # First create a user
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"loginuser_{timestamp}",
            "email": f"login_{timestamp}@example.com",
            "password": "LoginPass123!"
        }
        
        # Register user
        success, _ = self.run_test(
            "User Registration for Login Test",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if not success:
            return False
        
        # Now test login
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            # Update token for subsequent tests
            self.token = response['access_token']
            print(f"   Login successful, token updated")
            return True
        return False

    def test_create_customer(self):
        """Test customer creation"""
        customer_data = {
            "name": "Juan Pérez",
            "phone": "555-0123",
            "address": "Calle Principal 123",
            "email": "juan.perez@example.com",
            "notes": "Cliente frecuente"
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            self.test_customer_id = response['id']
            print(f"   Customer created with ID: {self.test_customer_id}")
            return True
        return False

    def test_get_customers(self):
        """Test getting customers list"""
        success, response = self.run_test(
            "Get Customers",
            "GET",
            "customers",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} customers")
            return True
        return False

    def test_search_customers(self):
        """Test customer search"""
        success, response = self.run_test(
            "Search Customers",
            "GET",
            "customers",
            200,
            data={"search": "Juan"}
        )
        
        if success and isinstance(response, list):
            print(f"   Search returned {len(response)} customers")
            return True
        return False

    def test_get_customer_by_id(self):
        """Test getting specific customer"""
        if not self.test_customer_id:
            print("❌ No customer ID available for test")
            return False
            
        success, response = self.run_test(
            "Get Customer by ID",
            "GET",
            f"customers/{self.test_customer_id}",
            200
        )
        
        if success and response.get('id') == self.test_customer_id:
            print(f"   Customer retrieved: {response.get('name')}")
            return True
        return False

    def test_update_customer(self):
        """Test customer update"""
        if not self.test_customer_id:
            print("❌ No customer ID available for test")
            return False
            
        update_data = {
            "notes": "Cliente VIP actualizado"
        }
        
        success, response = self.run_test(
            "Update Customer",
            "PUT",
            f"customers/{self.test_customer_id}",
            200,
            data=update_data
        )
        
        if success and response.get('notes') == update_data['notes']:
            print(f"   Customer updated successfully")
            return True
        return False

    def test_create_debt(self):
        """Test debt creation"""
        if not self.test_customer_id:
            print("❌ No customer ID available for test")
            return False
            
        debt_data = {
            "customer_id": self.test_customer_id,
            "description": "Camisas polo x3",
            "total_amount": 150.00,
            "due_date": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        success, response = self.run_test(
            "Create Debt",
            "POST",
            "debts",
            200,
            data=debt_data
        )
        
        if success and 'id' in response:
            self.test_debt_id = response['id']
            print(f"   Debt created with ID: {self.test_debt_id}")
            return True
        return False

    def test_get_debts(self):
        """Test getting debts list"""
        success, response = self.run_test(
            "Get Debts",
            "GET",
            "debts",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} debts")
            return True
        return False

    def test_filter_debts_by_status(self):
        """Test filtering debts by status"""
        success, response = self.run_test(
            "Filter Debts by Status",
            "GET",
            "debts",
            200,
            data={"status": "pending"}
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} pending debts")
            return True
        return False

    def test_get_overdue_debts(self):
        """Test getting overdue debts"""
        success, response = self.run_test(
            "Get Overdue Debts",
            "GET",
            "debts/overdue",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} overdue debts")
            return True
        return False

    def test_create_payment(self):
        """Test payment creation"""
        if not self.test_debt_id:
            print("❌ No debt ID available for test")
            return False
            
        payment_data = {
            "debt_id": self.test_debt_id,
            "amount": 50.00,
            "payment_method": "cash",
            "notes": "Pago parcial"
        }
        
        success, response = self.run_test(
            "Create Payment",
            "POST",
            "payments",
            200,
            data=payment_data
        )
        
        if success and 'id' in response:
            print(f"   Payment created with ID: {response['id']}")
            return True
        return False

    def test_get_payments(self):
        """Test getting payments list"""
        success, response = self.run_test(
            "Get Payments",
            "GET",
            "payments",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} payments")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success and 'total_customers' in response:
            print(f"   Stats: {response['total_customers']} customers, ${response.get('total_debts', 0)} total debts")
            return True
        return False

    def test_export_report(self):
        """Test report export"""
        success, response = self.run_test(
            "Export Report",
            "GET",
            "reports/export",
            200
        )
        
        if success and 'customers' in response and 'debts' in response and 'payments' in response:
            print(f"   Export contains: {len(response['customers'])} customers, {len(response['debts'])} debts, {len(response['payments'])} payments")
            return True
        return False

    def test_delete_debt(self):
        """Test debt deletion"""
        if not self.test_debt_id:
            print("❌ No debt ID available for test")
            return False
            
        success, response = self.run_test(
            "Delete Debt",
            "DELETE",
            f"debts/{self.test_debt_id}",
            200
        )
        
        if success:
            print(f"   Debt deleted successfully")
            return True
        return False

    def test_delete_customer(self):
        """Test customer deletion"""
        if not self.test_customer_id:
            print("❌ No customer ID available for test")
            return False
            
        success, response = self.run_test(
            "Delete Customer",
            "DELETE",
            f"customers/{self.test_customer_id}",
            200
        )
        
        if success:
            print(f"   Customer deleted successfully")
            return True
        return False

def main():
    print("🚀 Starting SEMI DEUS ART API Testing...")
    print("=" * 60)
    
    tester = SemiDeusAPITester()
    
    # Test sequence
    tests = [
        tester.test_user_registration,
        tester.test_user_login,
        tester.test_create_customer,
        tester.test_get_customers,
        tester.test_search_customers,
        tester.test_get_customer_by_id,
        tester.test_update_customer,
        tester.test_create_debt,
        tester.test_get_debts,
        tester.test_filter_debts_by_status,
        tester.test_get_overdue_debts,
        tester.test_create_payment,
        tester.test_get_payments,
        tester.test_dashboard_stats,
        tester.test_export_report,
        tester.test_delete_debt,
        tester.test_delete_customer,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())