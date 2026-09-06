from django.contrib import admin
from .models import Channel

@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ('name', 'server', 'channel_type', 'position', 'created_at')
    list_filter = ('channel_type', 'server')
    search_fields = ('name', 'server__name')
