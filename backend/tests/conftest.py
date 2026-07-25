import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    from main import app
    with TestClient(app) as c:
        # Every route requires an authenticated session now — sign up a
        # fresh, isolated test user once and let TestClient persist the
        # resulting session cookie across every request in the suite.
        email = f"test-{uuid.uuid4().hex[:10]}@example.com"
        res = c.post("/api/auth/signup", json={
            "name": "Test User",
            "email": email,
            "password": "testpassword123",
        })
        assert res.status_code == 200, f"Test user signup failed: {res.text}"
        yield c
