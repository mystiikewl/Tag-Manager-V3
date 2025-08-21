"""
Test script for FastAPI endpoints - Phase 1 Refactoring
"""

import asyncio
import httpx
import json
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

BASE_URL = "http://localhost:8000"

async def test_endpoint(client, method, url, description, **kwargs):
    """Test a single endpoint"""
    print(f"\nTesting {description}")
    print(f"Method: {method}, URL: {url}")

    try:
        if method == "GET":
            response = await client.get(url, **kwargs)
        elif method == "POST":
            response = await client.post(url, **kwargs)
        elif method == "DELETE":
            response = await client.delete(url, **kwargs)
        else:
            print(f"✗ Unsupported method: {method}")
            return False

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print("✓ Success")
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    print(f"Response: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print("Response: [Binary or invalid JSON]")
            return True
        else:
            print(f"✗ Failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error response: {response.text[:200]}")
            return False

    except Exception as e:
        print(f"✗ Exception: {e}")
        return False

async def run_tests():
    """Run all endpoint tests"""
    print("Testing FastAPI Endpoints")
    print("=" * 50)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        tests = [
            # Basic endpoints
            ("GET", "/", "Root endpoint"),
            ("GET", "/docs", "API Documentation"),

            # Products endpoints
            ("GET", "/api/products", "Get all products"),
            ("GET", "/api/products?hide_allocated=true", "Get products without categories"),

            # Categories endpoints
            ("GET", "/api/categories", "Get all categories"),
            ("GET", "/api/categories/level1", "Get level 1 categories"),
        ]

        passed = 0
        total = len(tests)

        for method, url, description in tests:
            if await test_endpoint(client, method, url, description):
                passed += 1

        print(f"\n" + "=" * 50)
        print(f"Test Results: {passed}/{total} passed")

        if passed == total:
            print("✓ All tests passed!")
            return 0
        else:
            print(f"✗ {total - passed} tests failed")
            return 1

def test_imports():
    """Test if all imports work correctly"""
    print("Testing imports...")
    try:
        from models import ProductSummary, CategoryBase, AssignCategoriesRequest
        from database import get_db_connection
        from app_fastapi import app
        print("✓ All imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

def main():
    """Main test function"""
    print("Starting Phase 1 Refactoring Tests")
    print("=" * 50)

    # Test imports first
    if not test_imports():
        return 1

    # Test endpoints
    try:
        return asyncio.run(run_tests())
    except Exception as e:
        print(f"✗ Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())