"""Basic integration test for FastAPI app using the live MongoDB instance.

Before running this test, ensure the MongoDB server specified by MONGODB_URI
is up and reachable; the app relies on a real database connection.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.app import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_register_and_create_agent(client: TestClient) -> None:
    email = f"test_{uuid.uuid4().hex}@example.com"
    password = "test-password"

    register_resp = client.post("/auth/register", json={"email": email, "password": password})
    assert register_resp.status_code == 201, register_resp.text

    token_resp = client.post(
        "/auth/token",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert token_resp.status_code == 200, token_resp.text
    token = token_resp.json()["access_token"]

    agent_payload = {
        "name": "test",
        "prompt": "test prompt",
        "tools": ["test_tool"],
        "need_mcp": True,
    }
    create_resp = client.post("/agents", json=agent_payload, headers={"Authorization": f"Bearer {token}"})
    assert create_resp.status_code == 201, create_resp.text
    created_agent = create_resp.json()
    assert created_agent["name"] == agent_payload["name"]
    assert created_agent["prompt"] == agent_payload["prompt"]
    assert created_agent["tools"] == agent_payload["tools"]
    assert created_agent["need_mcp"] == agent_payload["need_mcp"]
