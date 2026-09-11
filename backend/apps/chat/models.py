import uuid
from django.db import models
from django.conf import settings

class Message(models.Model):
    id = models.BigAutoField(primary_key=True)
    channel = models.ForeignKey(
        'channels_app.Channel',
        on_delete=models.CASCADE,
        related_name='messages'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='messages'
    )
    content = models.TextField(blank=True, default='')
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/', null=True, blank=True)
    attachment_type = models.CharField(max_length=20, blank=True, default='') # 'image', 'audio', 'file'
    attachment_name = models.CharField(max_length=255, blank=True, default='')
    reactions = models.JSONField(default=dict, blank=True)
    is_edited = models.BooleanField(default=False)
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['channel', '-created_at']),
        ]

    def __str__(self):
        author_name = self.author.username if self.author else "Deleted User"
        return f"[{self.channel.name}] {author_name}: {self.content[:30]}"

class DMConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='dm_conversations'
    )
    status = models.CharField(
        max_length=20,
        default='ACCEPTED',
        choices=[
            ('PENDING', 'Pending'),
            ('ACCEPTED', 'Accepted'),
            ('REJECTED', 'Rejected'),
        ]
    )
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='initiated_dm_conversations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        usernames = ", ".join([u.username for u in self.participants.all()[:2]])
        return f"DM [{usernames}]"

class DirectMessage(models.Model):
    id = models.BigAutoField(primary_key=True)
    conversation = models.ForeignKey(
        DMConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_direct_messages'
    )
    content = models.TextField(blank=True, default='')
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/', null=True, blank=True)
    attachment_type = models.CharField(max_length=20, blank=True, default='') # 'image', 'audio', 'file'
    attachment_name = models.CharField(max_length=255, blank=True, default='')
    reactions = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
        ]

    def __str__(self):
        return f"DM {self.sender.username}: {self.content[:30]}"

