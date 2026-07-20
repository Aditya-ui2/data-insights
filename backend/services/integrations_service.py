import os
import time
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from db import Integration

def test_integration_connection(db: Session, integration_id: str, user_id: str) -> dict:
    """
    Tests the connection parameters for an external integration source using Connector SDK registry.
    """
    integration = db.query(Integration).filter(
        and_(Integration.id == integration_id, Integration.userId == user_id)
    ).first()

    if not integration:
        raise ValueError("Integration not found")

    # Set status to syncing
    integration.syncStatus = "syncing"
    db.commit()

    config = integration.config or {}
    source_type = integration.sourceType.lower()
    success = False
    message = "Connection verification failed."

    try:
        from connectors.registry import get_connector
        connector = get_connector(source_type, config)
        res = connector.test_connection()
        success = res.get("success", False)
        message = res.get("message", "Tested via Connector SDK.")

        # Save results
        integration.connectionStatus = "connected" if success else "failed"
        integration.connectionHealth = "healthy" if success else "unhealthy"
        integration.syncStatus = "synced"
        integration.lastSyncedAt = datetime.utcnow()
        integration.updatedAt = datetime.utcnow()
        db.commit()

        # Refresh
        db.refresh(integration)
        return {
            "success": success,
            "message": message,
            "connectionStatus": integration.connectionStatus,
            "connectionHealth": integration.connectionHealth,
            "syncStatus": integration.syncStatus
        }
    except Exception as e:
        db.rollback()
        integration.connectionStatus = "failed"
        integration.connectionHealth = "unhealthy"
        integration.syncStatus = "failed"
        integration.updatedAt = datetime.utcnow()
        db.commit()
        return {
            "success": False,
            "message": f"Connection test failed: {str(e)}",
            "connectionStatus": "failed",
            "connectionHealth": "unhealthy",
            "syncStatus": "failed"
        }
