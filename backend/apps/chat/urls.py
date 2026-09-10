from django.urls import path
from .views import (
    MessageListView, DMConversationListView, DirectMessageListView, UserSearchView,
    ChatFileUploadView, MessageReactionToggleView
)

urlpatterns = [
    path('messages/', MessageListView.as_view(), name='chat_messages_list'),
    path('dms/', DMConversationListView.as_view(), name='dm_conversations'),
    path('dms/<uuid:conversation_id>/messages/', DirectMessageListView.as_view(), name='dm_messages'),
    path('users/', UserSearchView.as_view(), name='user_search'),
    path('upload/', ChatFileUploadView.as_view(), name='chat_file_upload'),
    path('messages/<int:message_id>/reaction/', MessageReactionToggleView.as_view(), name='message_reaction_toggle'),
]
