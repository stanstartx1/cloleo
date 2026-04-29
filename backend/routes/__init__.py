# Routes module - exports all routers
from routes.reviews import router as reviews_router
from routes.products import router as products_router
from routes.categories import router as categories_router
from routes.cart import router as cart_router
from routes.favorites import router as favorites_router
from routes.favorites import session_favorites_router
from routes.chat import router as chat_router
from routes.chat import vendor_chat_router, dropshipper_chat_router

__all__ = [
    'reviews_router',
    'products_router',
    'categories_router',
    'cart_router',
    'favorites_router',
    'session_favorites_router',
    'chat_router',
    'vendor_chat_router',
    'dropshipper_chat_router'
]
