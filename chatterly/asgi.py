# chatterly/asgi.py
import os
from django.core.asgi       import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatterly.settings")

django_asgi_app = get_asgi_application()

from channels.routing  import ProtocolTypeRouter, URLRouter
from chat.ws_middleware  import CookieJWTAuthMiddleware
import chat.routing



application = ProtocolTypeRouter({
    # Handles traditional HTTP requests
    "http": django_asgi_app,

    # Handles WebSocket connections, running them through our JWT middleware
    "websocket": CookieJWTAuthMiddleware(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
