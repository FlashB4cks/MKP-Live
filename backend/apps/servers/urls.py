from django.urls import path
from .views import (
    ServerListCreateView, ServerDetailView,
    ServerMembersListView, ServerMemberDetailView,
    CreateInviteView, InviteDetailView, JoinServerView
)

urlpatterns = [
    path('', ServerListCreateView.as_view(), name='server_list_create'),
    path('<uuid:pk>/', ServerDetailView.as_view(), name='server_detail'),
    path('<uuid:server_id>/members/', ServerMembersListView.as_view(), name='server_members_list'),
    path('<uuid:server_id>/members/<uuid:pk>/', ServerMemberDetailView.as_view(), name='server_member_detail'),
    path('<uuid:server_id>/invites/', CreateInviteView.as_view(), name='server_create_invite'),
    path('invites/<str:code>/', InviteDetailView.as_view(), name='invite_detail'),
    path('join/', JoinServerView.as_view(), name='server_join'),
]
