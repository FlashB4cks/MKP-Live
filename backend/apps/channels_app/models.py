import uuid
from django.db import models

class ChannelTypeChoices(models.TextChoices):
    TEXT = 'TEXT', 'Text'
    VOICE = 'VOICE', 'Voice'

class Channel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    server = models.ForeignKey(
        'servers.Server',
        on_delete=models.CASCADE,
        related_name='channels'
    )
    name = models.SlugField(max_length=100)
    channel_type = models.CharField(
        max_length=10,
        choices=ChannelTypeChoices.choices,
        default=ChannelTypeChoices.TEXT
    )
    topic = models.CharField(max_length=255, blank=True, default='')
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['server', 'name'],
                name='unique_channel_per_server'
            )
        ]
        ordering = ['position', 'created_at']

    def __str__(self):
        return f"#{self.name} ({self.server.name})"
