from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'^ws/channels/(?P<channel_id>[0-9a-fA-F-]+)/?$',
        consumers.ChatConsumer.as_asgi()
    ),
    re_path(
        r'^ws/dms/(?P<conversation_id>[0-9a-fA-F-]+)/?$',
        consumers.DirectMessageConsumer.as_asgi()
    ),
]
