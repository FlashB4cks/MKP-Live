from django.urls import path
from .views import (
    MessageListView, DMConversationListView, DirectMessageListView, UserSearchView
)

urlpatterns = [
    path('messages/', MessageListView.as_view(), name='chat_messages_list'),
    path('dms/', DMConversationListView.as_view(), name='dm_conversations'),
    path('dms/<uuid:conversation_id>/messages/', DirectMessageListView.as_view(), name='dm_messages'),
    path('users/', UserSearchView.as_view(), name='user_search'),
]
