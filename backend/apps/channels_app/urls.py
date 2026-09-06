from django.urls import path
from .views import ChannelListCreateView, ChannelDetailView

urlpatterns = [
    path('', ChannelListCreateView.as_view(), name='channel_list_create'),
    path('<uuid:pk>/', ChannelDetailView.as_view(), name='channel_detail'),
]
