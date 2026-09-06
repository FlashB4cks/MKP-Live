from django.urls import path
from .views import (
    VPNStatusView, SessionListCreateView, SessionDetailView,
    StartSessionView, EndSessionView, RequestJoinSessionView,
    ApproveParticipantView, InstantSessionView, SessionMessagesView,
    ModerateParticipantView
)

urlpatterns = [
    path('', SessionListCreateView.as_view(), name='session_list_create'),
    path('instant/', InstantSessionView.as_view(), name='session_instant'),
    path('vpn-status/', VPNStatusView.as_view(), name='session_vpn_status'),
    path('<uuid:pk>/', SessionDetailView.as_view(), name='session_detail'),
    path('<uuid:pk>/start/', StartSessionView.as_view(), name='session_start'),
    path('<uuid:pk>/end/', EndSessionView.as_view(), name='session_end'),
    path('<uuid:pk>/join/', RequestJoinSessionView.as_view(), name='session_join'),
    path('<uuid:pk>/messages/', SessionMessagesView.as_view(), name='session_messages'),
    path('<uuid:pk>/participants/<uuid:user_id>/approve/', ApproveParticipantView.as_view(), name='session_approve_participant'),
    path('<uuid:pk>/participants/<uuid:user_id>/moderate/', ModerateParticipantView.as_view(), name='session_moderate_participant'),
]
