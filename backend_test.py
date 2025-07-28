import requests
import sys
import json
from datetime import datetime
import time

class PeopleMonitorAPITester:
    def __init__(self, base_url="https://480e0e45-750d-4fd4-95a6-ea591199c48e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_event_id = None
        self.created_people = []
        self.token = None
        self.user_id = None
        
        # Test user credentials
        self.test_email = f"test_admin_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_password = "TestPass123!"
        self.test_name = "Test Admin"

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add authentication header if required
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if auth_required:
            print(f"   Auth: {'✓ Token provided' if self.token else '❌ No token'}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "email": self.test_email,
            "name": self.test_name,
            "password": self.test_password
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200,
            auth_required=True
        )
        
        if success and 'id' in response:
            self.user_id = response['id']
            print(f"   User ID: {self.user_id}")
            print(f"   User Email: {response.get('email')}")
            print(f"   User Name: {response.get('name')}")
            return True
        return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication"""
        # Save current token
        old_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Unauthorized Access (should fail)",
            "GET",
            "api/events",
            403,  # Should return 403 Forbidden
            auth_required=True
        )
        
        # Restore token
        self.token = old_token
        return success

    def test_create_event(self):
        """Test creating a new calamity event"""
        event_data = {
            "title": "Office Flood Emergency",
            "description": "Severe flooding in the office building. All employees need to report their safety status.",
            "calamity_type": "flood"
        }
        
        success, response = self.run_test(
            "Create Event",
            "POST",
            "api/events",
            200,
            data=event_data,
            auth_required=True
        )
        
        if success and 'event_id' in response:
            self.created_event_id = response['event_id']
            print(f"   Created event ID: {self.created_event_id}")
            return True
        return False

    def test_get_events(self):
        """Test getting list of active events"""
        success, response = self.run_test(
            "Get Events List",
            "GET",
            "api/events",
            200,
            auth_required=True
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} active events")
            return True
        return False

    def test_get_specific_event(self):
        """Test getting specific event details"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False
            
        return self.run_test(
            "Get Specific Event",
            "GET",
            f"api/events/{self.created_event_id}",
            200,
            auth_required=True
        )[0]

    def test_add_people_to_event(self):
        """Test adding multiple people to the event"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False

        people_data = [
            {"name": "John Doe", "contact": "john.doe@company.com", "tags": ["IT Team", "Floor 3"]},
            {"name": "Jane Smith", "contact": "jane.smith@company.com", "tags": ["HR Team", "Floor 2"]},
            {"name": "Mike Johnson", "contact": "mike.johnson@company.com", "tags": ["IT Team", "Floor 3"]},
            {"name": "Sarah Wilson", "contact": "sarah.wilson@company.com", "tags": ["Finance Team", "Floor 1"]},
            {"name": "David Brown", "contact": "david.brown@company.com", "tags": ["HR Team", "Floor 2"]}
        ]

        all_success = True
        for person_data in people_data:
            success, response = self.run_test(
                f"Add Person: {person_data['name']}",
                "POST",
                f"api/events/{self.created_event_id}/people",
                200,
                data=person_data,
                auth_required=True
            )
            
            if success and 'person_id' in response:
                self.created_people.append({
                    'id': response['person_id'],
                    'name': person_data['name'],
                    'contact': person_data['contact'],
                    'tags': person_data['tags']
                })
            else:
                all_success = False

        print(f"   Added {len(self.created_people)} people to event")
        return all_success

    def test_get_event_people(self):
        """Test getting people in an event"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Event People",
            "GET",
            f"api/events/{self.created_event_id}/people",
            200,
            auth_required=True
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} people in event")
            return True
        return False

    def test_generate_share_link(self):
        """Test generating shareable link"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False
            
        success, response = self.run_test(
            "Generate Share Link",
            "GET",
            f"api/events/{self.created_event_id}/share",
            200,
            auth_required=True
        )
        
        if success and 'share_url' in response:
            print(f"   Share URL: {response['share_url']}")
            return True
        return False

    def test_public_response_page(self):
        """Test public response page (HTML)"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False
            
        url = f"{self.base_url}/api/respond/{self.created_event_id}"
        print(f"\n🔍 Testing Public Response Page...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                print(f"   Content-Type: {response.headers.get('content-type', 'unknown')}")
                print(f"   Content length: {len(response.text)} characters")
                
                # Check if it contains expected HTML elements
                if 'html' in response.text.lower() and 'respond' in response.text.lower():
                    print("   ✓ Contains expected HTML content")
                    return True
                else:
                    print("   ⚠ HTML content may be incomplete")
                    return False
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False
        finally:
            self.tests_run += 1

    def test_status_responses(self):
        """Test status response submissions"""
        if not self.created_event_id or not self.created_people:
            print("❌ No event ID or people available for testing")
            return False

        # Test different status responses
        responses_data = [
            {
                "person_id": self.created_people[0]['id'],
                "person_name": self.created_people[0]['name'],
                "status": "safe",
                "message": "I'm safe at home, no issues"
            },
            {
                "person_id": self.created_people[1]['id'],
                "person_name": self.created_people[1]['name'],
                "status": "need_help",
                "message": "Stuck in the building, need assistance"
            },
            {
                "person_id": self.created_people[2]['id'],
                "person_name": self.created_people[2]['name'],
                "status": "safe",
                "message": None
            }
        ]

        all_success = True
        for response_data in responses_data:
            success, _ = self.run_test(
                f"Status Response: {response_data['person_name']} - {response_data['status']}",
                "POST",
                f"api/events/{self.created_event_id}/respond",
                200,
                data=response_data
            )
            if not success:
                all_success = False

        return all_success

    def test_get_event_responses(self):
        """Test getting event responses"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Event Responses",
            "GET",
            f"api/events/{self.created_event_id}/responses",
            200,
            auth_required=True
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} responses")
            return True
        return False

    def test_event_statistics(self):
        """Test getting event statistics"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Event Statistics",
            "GET",
            f"api/events/{self.created_event_id}/statistics",
            200,
            auth_required=True
        )
        
        if success and 'total_people' in response:
            stats = response
            print(f"   Total People: {stats['total_people']}")
            print(f"   Safe: {stats['safe_count']}")
            print(f"   Need Help: {stats['need_help_count']}")
            print(f"   No Response: {stats['no_response_count']}")
            print(f"   Response Rate: {stats['response_rate']:.1f}%")
            
            if 'tag_statistics' in stats:
                print(f"   Tag Statistics: {len(stats['tag_statistics'])} tags")
                for tag, tag_stats in stats['tag_statistics'].items():
                    print(f"     {tag}: {tag_stats}")
            
            return True
        return False

    def test_bulk_add_people_valid(self):
        """Test bulk adding people with valid data"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False

        # Test data for bulk add
        bulk_people_data = {
            "people": [
                {"name": "Alice Johnson", "contact": "alice@company.com", "tags": ["Marketing", "Floor 4"]},
                {"name": "Bob Wilson", "contact": "bob@company.com", "tags": ["Sales", "Floor 5"]},
                {"name": "Carol Davis", "contact": "carol@company.com", "tags": ["Marketing"]},
                {"name": "Dan Miller", "contact": "dan@company.com", "tags": ["Sales", "Floor 5", "Team Lead"]},
                {"name": "Eva Brown", "contact": "eva@company.com", "tags": []}
            ]
        }

        success, response = self.run_test(
            "Bulk Add People (Valid Data)",
            "POST",
            f"api/events/{self.created_event_id}/people/bulk",
            200,
            data=bulk_people_data,
            auth_required=True
        )
        
        if success:
            print(f"   Added Count: {response.get('added_count', 0)}")
            print(f"   Total Requested: {response.get('total_requested', 0)}")
            print(f"   Errors: {len(response.get('errors', []))}")
            print(f"   Message: {response.get('message', 'No message')}")
            
            # Verify all people were added successfully
            expected_count = len(bulk_people_data['people'])
            if response.get('added_count') == expected_count and len(response.get('errors', [])) == 0:
                print("   ✓ All people added successfully")
                return True
            else:
                print("   ⚠ Some people may not have been added")
                return False
        return False

    def test_bulk_add_people_mixed_data(self):
        """Test bulk adding people with mixed valid/invalid data"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False

        # Test data with some invalid entries
        bulk_people_data = {
            "people": [
                {"name": "Valid Person 1", "contact": "valid1@company.com", "tags": ["IT"]},
                {"name": "", "contact": "invalid1@company.com", "tags": ["HR"]},  # Invalid: empty name
                {"name": "Valid Person 2", "contact": "", "tags": ["Finance"]},  # Invalid: empty contact
                {"name": "Valid Person 3", "contact": "valid3@company.com", "tags": ["IT", "Senior"]},
                {"name": "", "contact": "", "tags": ["Admin"]}  # Invalid: both empty
            ]
        }

        success, response = self.run_test(
            "Bulk Add People (Mixed Valid/Invalid Data)",
            "POST",
            f"api/events/{self.created_event_id}/people/bulk",
            200,
            data=bulk_people_data,
            auth_required=True
        )
        
        if success:
            print(f"   Added Count: {response.get('added_count', 0)}")
            print(f"   Total Requested: {response.get('total_requested', 0)}")
            print(f"   Errors: {len(response.get('errors', []))}")
            print(f"   Message: {response.get('message', 'No message')}")
            
            # Should have added 2 valid people and have 3 errors
            if response.get('added_count') == 2 and len(response.get('errors', [])) == 3:
                print("   ✓ Correctly handled mixed valid/invalid data")
                return True
            else:
                print("   ⚠ Unexpected results for mixed data")
                return False
        return False

    def test_bulk_add_people_empty_data(self):
        """Test bulk adding people with empty data"""
        if not self.created_event_id:
            print("❌ No event ID available for testing")
            return False

        # Test with empty people array
        bulk_people_data = {"people": []}

        success, response = self.run_test(
            "Bulk Add People (Empty Data)",
            "POST",
            f"api/events/{self.created_event_id}/people/bulk",
            200,
            data=bulk_people_data,
            auth_required=True
        )
        
        if success:
            print(f"   Added Count: {response.get('added_count', 0)}")
            print(f"   Total Requested: {response.get('total_requested', 0)}")
            print(f"   Message: {response.get('message', 'No message')}")
            
            # Should have added 0 people
            if response.get('added_count') == 0 and response.get('total_requested') == 0:
                print("   ✓ Correctly handled empty data")
                return True
            else:
                print("   ⚠ Unexpected results for empty data")
                return False
        return False

    def test_bulk_add_people_nonexistent_event(self):
        """Test bulk adding people to non-existent event"""
        fake_event_id = "non-existent-event-id"
        
        bulk_people_data = {
            "people": [
                {"name": "Test Person", "contact": "test@company.com", "tags": ["Test"]}
            ]
        }

        success, _ = self.run_test(
            "Bulk Add People (Non-existent Event)",
            "POST",
            f"api/events/{fake_event_id}/people/bulk",
            404,
            data=bulk_people_data,
            auth_required=True
        )
        
        return success

    def test_error_cases(self):
        """Test error handling"""
        print(f"\n🔍 Testing Error Cases...")
        
        # Test non-existent event
        fake_event_id = "non-existent-event-id"
        
        error_tests = [
            ("Non-existent Event Details", "GET", f"api/events/{fake_event_id}", 404),
            ("Add Person to Non-existent Event", "POST", f"api/events/{fake_event_id}/people", 404),
            ("Get People from Non-existent Event", "GET", f"api/events/{fake_event_id}/people", 404),
            ("Respond to Non-existent Event", "POST", f"api/events/{fake_event_id}/respond", 404),
        ]
        
        all_success = True
        for test_name, method, endpoint, expected_status in error_tests:
            test_data = {"name": "Test", "contact": "test@test.com"} if method == "POST" else None
            success, _ = self.run_test(test_name, method, endpoint, expected_status, data=test_data)
            if not success:
                all_success = False
                
        return all_success

def main():
    print("🚀 Starting People Monitor API Tests with Authentication")
    print("=" * 60)
    
    tester = PeopleMonitorAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic functionality tests
    test_results.append(("Root Endpoint", tester.test_root_endpoint()))
    
    # Authentication tests
    test_results.append(("User Registration", tester.test_user_registration()))
    test_results.append(("Get Current User", tester.test_get_current_user()))
    test_results.append(("User Login", tester.test_user_login()))
    test_results.append(("Get Current User (after login)", tester.test_get_current_user()))
    test_results.append(("Unauthorized Access", tester.test_unauthorized_access()))
    
    # Protected admin functionality tests
    test_results.append(("Create Event", tester.test_create_event()))
    test_results.append(("Get Events", tester.test_get_events()))
    test_results.append(("Get Specific Event", tester.test_get_specific_event()))
    test_results.append(("Add People to Event", tester.test_add_people_to_event()))
    test_results.append(("Get Event People", tester.test_get_event_people()))
    
    # Bulk add people tests
    test_results.append(("Bulk Add People (Valid Data)", tester.test_bulk_add_people_valid()))
    test_results.append(("Bulk Add People (Mixed Data)", tester.test_bulk_add_people_mixed_data()))
    test_results.append(("Bulk Add People (Empty Data)", tester.test_bulk_add_people_empty_data()))
    test_results.append(("Bulk Add People (Non-existent Event)", tester.test_bulk_add_people_nonexistent_event()))
    
    test_results.append(("Generate Share Link", tester.test_generate_share_link()))
    
    # Public response functionality (no auth required)
    test_results.append(("Public Response Page", tester.test_public_response_page()))
    test_results.append(("Status Responses", tester.test_status_responses()))
    
    # Admin monitoring (auth required)
    test_results.append(("Get Event Responses", tester.test_get_event_responses()))
    test_results.append(("Event Statistics", tester.test_event_statistics()))
    test_results.append(("Error Cases", tester.test_error_cases()))

    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nOverall: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.created_event_id:
        print(f"\n🔗 Test Event Created: {tester.created_event_id}")
        print(f"   Public Response URL: {tester.base_url}/api/respond/{tester.created_event_id}")
    
    if tester.token:
        print(f"\n🔑 Authentication Token: {tester.token[:30]}...")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())