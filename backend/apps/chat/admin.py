from django.contrib import admin
from .models import Message

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'channel', 'author', 'content_snippet', 'created_at')
    list_filter = ('channel__server', 'channel')
    search_fields = ('content', 'author__username')

    def content_snippet(self, obj):
        return obj.content[:50]
