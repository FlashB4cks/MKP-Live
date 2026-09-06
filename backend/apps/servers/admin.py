from django.contrib import admin
from .models import Server, ServerMember, Invite

@admin.register(Server)
class ServerAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    search_fields = ('name', 'owner__username')

@admin.register(ServerMember)
class ServerMemberAdmin(admin.ModelAdmin):
    list_display = ('server', 'user', 'role', 'joined_at')
    list_filter = ('role', 'server')

@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ('code', 'server', 'created_by', 'uses_count', 'max_uses', 'expires_at')
