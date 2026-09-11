from django.urls import path
from .views import (
    MessageListView, MessageDetailView, DMConversationListView, DirectMessageListView,
    UserSearchView, ChatFileUploadView, MessageReactionToggleView,
    DirectMessageAcceptView, DirectMessageRejectView,
    DirectMessageClearView, DirectMessageDeleteView
)

urlpatterns = [
    path('messages/', MessageListView.as_view(), name='chat_messages_list'),
    path('messages/<int:pk>/', MessageDetailView.as_view(), name='message_detail'),
    path('messages/<int:message_id>/reaction/', MessageReactionToggleView.as_view(), name='message_reaction_toggle'),
    path('dms/', DMConversationListView.as_view(), name='dm_conversations'),
    path('dms/<uuid:conversation_id>/messages/', DirectMessageListView.as_view(), name='dm_messages'),
    path('dms/<uuid:conversation_id>/accept/', DirectMessageAcceptView.as_view(), name='dm_accept'),
    path('dms/<uuid:conversation_id>/reject/', DirectMessageRejectView.as_view(), name='dm_reject'),
    path('dms/<uuid:conversation_id>/clear/', DirectMessageClearView.as_view(), name='dm_clear'),
    path('dms/<uuid:conversation_id>/delete/', DirectMessageDeleteView.as_view(), name='dm_delete'),
    path('users/', UserSearchView.as_view(), name='user_search'),
    path('upload/', ChatFileUploadView.as_view(), name='chat_file_upload'),
]
