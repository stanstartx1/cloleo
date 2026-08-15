"""Create MongoDB indexes for delivery features."""
import asyncio
from core.database import db


async def init_indexes():
    indexes = [
        (db.delivery_messages, [("order_id", 1), ("created_at", 1)]),
        (db.delivery_conversations, [("order_id", 1)]),
        (db.notifications, [("user_id", 1), ("read", 1), ("created_at", -1)]),
        (db.push_subscriptions, [("user_id", 1)]),
        (db.driver_position_history, [("driver_id", 1), ("timestamp", -1)]),
        (db.delivery_ratings, [("recipient_id", 1), ("order_id", 1)]),
        (db.scheduled_deliveries, [("scheduled_date", 1), ("scheduled_slot", 1)]),
        (db.gamification_profiles, [("user_id", 1)]),
        (db.conflicts, [("status", 1), ("created_at", -1)]),
        (db.audit_logs, [("user_id", 1), ("created_at", -1)]),
        (db.orders, [("driver_id", 1), ("status", 1)]),
        (db.orders, [("customer_id", 1), ("created_at", -1)]),
    ]
    for collection, keys in indexes:
        try:
            await collection.create_index(keys)
        except Exception as e:
            print(f"Index warning {collection.name}: {e}")
    print("Delivery indexes initialized")


if __name__ == "__main__":
    asyncio.run(init_indexes())
