import uuid
import secrets
from django.db import models
from django.conf import settings
from django.utils import timezone

class RoleChoices(models.TextChoices):
    OWNER = 'OWNER', 'Owner'
    ADMIN = 'ADMIN', 'Admin'
    MEMBER = 'MEMBER', 'Member'

class Server(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True, default='')
    icon = models.ImageField(upload_to='server_icons/', null=True, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_servers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def icon_url(self):
        if self.icon and hasattr(self.icon, 'url'):
            return self.icon.url
        return None

class ServerMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    server = models.ForeignKey(
        Server,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='server_memberships'
    )
    role = models.CharField(
        max_length=10,
        choices=RoleChoices.choices,
        default=RoleChoices.MEMBER
    )
    nickname = models.CharField(max_length=50, blank=True, default='')
    can_manage_messages = models.BooleanField(default=False)
    can_manage_members = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['server', 'user'],
                name='unique_server_member'
            )
        ]
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.server.name} ({self.role})"

    def has_manage_messages_permission(self):
        return self.role in [RoleChoices.OWNER, RoleChoices.ADMIN] or self.can_manage_messages

    def has_manage_members_permission(self):
        return self.role in [RoleChoices.OWNER, RoleChoices.ADMIN] or self.can_manage_members

    def is_admin_or_owner(self):
        return self.role in [RoleChoices.OWNER, RoleChoices.ADMIN]

def generate_invite_code():
    return secrets.token_urlsafe(6)

class Invite(models.Model):
    code = models.CharField(
        max_length=16,
        primary_key=True,
        default=generate_invite_code,
        editable=False
    )
    server = models.ForeignKey(
        Server,
        on_delete=models.CASCADE,
        related_name='invites'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_invites'
    )
    max_uses = models.PositiveIntegerField(default=0, help_text="0 para usos ilimitados")
    uses_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_valid(self):
        if self.max_uses > 0 and self.uses_count >= self.max_uses:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True

    def __str__(self):
        return f"Invite {self.code} -> {self.server.name}"
