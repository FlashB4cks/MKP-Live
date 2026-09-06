import os
import sys
from pathlib import Path
from django.core.asgi import get_asgi_application

# Ensure apps directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Initialize Django ASGI application early to ensure AppRegistry is populated
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from chat.middleware import JWTAuthMiddlewareStack
from chat.routing import websocket_urlpatterns as chat_ws_urls
from virtual_sessions.routing import websocket_urlpatterns as session_ws_urls

combined_ws_urls = chat_ws_urls + session_ws_urls

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(combined_ws_urls)
    ),
})
