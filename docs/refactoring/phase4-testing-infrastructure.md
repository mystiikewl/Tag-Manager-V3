# Phase 4: Testing Infrastructure

## Goal

Establish comprehensive testing framework with unit tests, integration tests, and automated testing workflows.

## Current Issues

- No test framework configured
- No existing test coverage
- No automated testing pipeline
- Missing test utilities and fixtures

## Implementation Steps

### 4.1 Testing Framework Setup

**Configure Jest and testing utilities:**

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/dom @testing-library/jest-dom jest-environment-jsdom
```

**Jest configuration:**

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/static/js/test/setup.js"],
  testMatch: ["<rootDir>/static/js/test/**/*.test.js"],
  collectCoverageFrom: [
    "static/js/**/*.js",
    "!static/js/test/**",
    "!static/js/**/index.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
```

### 4.2 Test Utilities and Helpers

**Create testing utilities:**

```javascript
// static/js/test/setup.js
import "@testing-library/jest-dom";

// Mock fetch globally
global.fetch = jest.fn();

// Mock DOM elements
global.document.body.innerHTML = `
  <div id="app">
    <div id="product-list"></div>
    <div id="category-tree"></div>
    <div id="notifications"></div>
  </div>
`;

// Test utilities
export const createMockElement = (id, tag = "div") => {
  const element = document.createElement(tag);
  element.id = id;
  document.body.appendChild(element);
  return element;
};

export const mockApiResponse = (data, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};
```

### 4.3 Unit Tests Implementation

**Create comprehensive unit test coverage:**

```javascript
// static/js/test/services/ApiService.test.js
import { ApiService } from "../../services/ApiService.js";
import { mockApiResponse } from "../setup.js";

describe("ApiService", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe("request method", () => {
    it("should handle successful requests", async () => {
      const mockData = { message: "Success" };
      fetch.mockResolvedValue(mockApiResponse(mockData));

      const result = await ApiService.request("/api/test");

      expect(fetch).toHaveBeenCalledWith("/api/test", expect.any(Object));
      expect(result).toEqual(mockData);
    });

    it("should handle error responses", async () => {
      const errorMessage = "Not Found";
      fetch.mockResolvedValue(mockApiResponse({ error: errorMessage }, 404));

      await expect(ApiService.request("/api/test")).rejects.toThrow(
        errorMessage
      );
    });

    it("should retry on network failures", async () => {
      const mockData = { message: "Success" };
      fetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(mockApiResponse(mockData));

      const result = await ApiService.request("/api/test");

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockData);
    });
  });
});
```

### 4.4 Integration Tests

**Test complete workflows:**

```javascript
// static/js/test/integration/CategoryAssignment.test.js
import { CategoryService } from "../../services/CategoryService.js";
import { stateManager } from "../../core/stateManager.js";
import { createMockElement } from "../setup.js";

describe("Category Assignment Integration", () => {
  beforeEach(() => {
    // Setup mock DOM
    createMockElement("product-list");
    createMockElement("category-tree");

    // Reset state
    stateManager.setState({
      selectedProducts: new Set(["product-1"]),
      selectedCategories: new Set(["category-1"]),
    });
  });

  it("should assign categories to selected products", async () => {
    const mockResponse = {
      message: "Categories assigned successfully",
      added_categories: ["category-1"],
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    // Execute workflow
    await CategoryService.assignCategoriesToProducts();

    // Verify API call
    expect(fetch).toHaveBeenCalledWith(
      "/api/products/product-1/categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ category_ids: ["category-1"] }),
      })
    );
  });

  it("should handle assignment errors gracefully", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid category" }),
    });

    await expect(CategoryService.assignCategoriesToProducts()).rejects.toThrow(
      "Invalid category"
    );
  });
});
```

### 4.5 Backend Testing Setup

**Configure FastAPI testing:**

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app import app
import sqlite3

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_connection():
    conn = sqlite3.connect(':memory:')
    # Setup test database
    yield conn
    conn.close()

# tests/test_products.py
def test_get_products(client):
    response = client.get('/api/products')
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert all('product_id' in product for product in data)

def test_assign_categories_validation(client):
    # Test invalid request
    response = client.post('/api/products/123/categories', json={})
    assert response.status_code == 422
    assert 'error' in response.json()
```

### 4.6 Test Automation Pipeline

**Setup CI/CD testing:**

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "16"

      - name: Install dependencies
        run: npm ci

      - name: Run frontend tests
        run: npm test

      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: "3.9"

      - name: Install Python dependencies
        run: pip install -r requirements.txt

      - name: Run backend tests
        run: python -m pytest

      - name: Upload coverage reports
        uses: codecov/codecov-action@v2
```

## Success Criteria

- [ ] Jest configured and running frontend tests
- [ ] Pytest configured for backend testing
- [ ] 80%+ code coverage achieved
- [ ] All critical workflows have integration tests
- [ ] CI/CD pipeline running automated tests
- [ ] Test utilities and fixtures established

## Files to Create

- `jest.config.js` - Jest configuration
- `static/js/test/setup.js` - Test setup and utilities
- `static/js/test/services/ApiService.test.js` - Service tests
- `static/js/test/integration/CategoryAssignment.test.js` - Integration tests
- `tests/conftest.py` - Pytest fixtures
- `tests/test_products.py` - Backend API tests
- `tests/test_categories.py` - Category API tests
- `.github/workflows/test.yml` - CI/CD configuration

## Risk Mitigation

1. **Gradual Implementation**: Start with critical path tests
2. **Test-First Approach**: Write tests before refactoring code
3. **Mock External Dependencies**: Isolate tests from external services
4. **Maintainable Tests**: Focus on testing behavior, not implementation details

## Timeline

- Week 1: Framework setup and basic unit tests
- Week 2: Service layer and integration tests
- Week 3: Backend API tests and CI/CD setup
- Week 4: Coverage goals and test optimization
