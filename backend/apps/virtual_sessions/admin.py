from django.contrib import admin
from .models import VirtualSession, SessionParticipant

@admin.register(VirtualSession)
class VirtualSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'server', 'host', 'scheduled_at', 'status', 'requires_approval')
    list_filter = ('status', 'server', 'requires_approval')
    search_fields = ('title', 'host__username')

@admin.register(SessionParticipant)
class SessionParticipantAdmin(admin.ModelAdmin):
    list_display = ('session', 'user', 'status', 'is_audio_muted', 'is_video_off', 'joined_at')
    list_filter = ('status', 'is_audio_muted', 'is_video_off')
