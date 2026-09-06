import uuid
from django.db import models
from django.conf import settings

class SessionStatusChoices(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    WAITING = 'WAITING', 'Waiting Room'
    ACTIVE = 'ACTIVE', 'Active'
    ENDED = 'ENDED', 'Ended'

class ParticipantStatusChoices(models.TextChoices):
    PENDING = 'PENDING', 'Pending Approval'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    REJECTED = 'REJECTED', 'Rejected'
    LEFT = 'LEFT', 'Left'

class VirtualSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    server = models.ForeignKey(
        'servers.Server',
        on_delete=models.CASCADE,
        related_name='virtual_sessions',
        null=True,
        blank=True
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hosted_sessions'
    )
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(
        max_length=15,
        choices=SessionStatusChoices.choices,
        default=SessionStatusChoices.SCHEDULED
    )
    requires_approval = models.BooleanField(
        default=True,
        help_text="Si es True, el anfitrión debe aceptar las conexiones en la sala de espera."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def is_live(self):
        return self.status in [SessionStatusChoices.WAITING, SessionStatusChoices.ACTIVE]

class SessionParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        VirtualSession,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='session_participations'
    )
    status = models.CharField(
        max_length=15,
        choices=ParticipantStatusChoices.choices,
        default=ParticipantStatusChoices.PENDING
    )
    is_audio_muted = models.BooleanField(default=False)
    is_video_off = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'user'],
                name='unique_participant_per_session'
            )
        ]
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.session.title} ({self.status})"

class SessionMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        VirtualSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='session_messages'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username}: {self.content[:30]}"

