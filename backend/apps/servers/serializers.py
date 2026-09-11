from rest_framework import serializers
from .models import Server, ServerMember, Invite, RoleChoices
from accounts.serializers import UserSerializer
from channels_app.serializers import ChannelSerializer

class ServerMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = ServerMember
        fields = [
            'id', 'user', 'role', 'nickname',
            'can_manage_messages', 'can_manage_members',
            'permissions', 'joined_at'
        ]
        read_only_fields = ['id', 'joined_at']

    def get_permissions(self, obj):
        return {
            'manage_messages': obj.has_manage_messages_permission(),
            'manage_members': obj.has_manage_members_permission(),
            'is_admin': obj.is_admin_or_owner(),
        }

class ServerSerializer(serializers.ModelSerializer):
    icon_url = serializers.ReadOnlyField()
    owner = UserSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    channels_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    my_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Server
        fields = [
            'id', 'name', 'description', 'icon', 'icon_url',
            'owner', 'members_count', 'channels_count',
            'my_role', 'my_permissions', 'created_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at']

    def get_members_count(self, obj):
        return obj.members.count()

    def get_channels_count(self, obj):
        return obj.channels.count()

    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            member = obj.members.filter(user=request.user).first()
            return member.role if member else None
        return None

    def get_my_permissions(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            member = obj.members.filter(user=request.user).first()
            if member:
                return {
                    'manage_messages': member.has_manage_messages_permission(),
                    'manage_members': member.has_manage_members_permission(),
                    'is_admin': member.is_admin_or_owner(),
                }
        return {
            'manage_messages': False,
            'manage_members': False,
            'is_admin': False,
        }

class ServerDetailSerializer(ServerSerializer):
    channels = ChannelSerializer(many=True, read_only=True)
    members = ServerMemberSerializer(many=True, read_only=True)

    class Meta(ServerSerializer.Meta):
        fields = ServerSerializer.Meta.fields + ['channels', 'members']

class InviteSerializer(serializers.ModelSerializer):
    server_name = serializers.ReadOnlyField(source='server.name')
    server_icon = serializers.ReadOnlyField(source='server.icon_url')
    created_by_username = serializers.ReadOnlyField(source='created_by.username')
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = Invite
        fields = [
            'code', 'server', 'server_name', 'server_icon',
            'created_by', 'created_by_username', 'max_uses',
            'uses_count', 'expires_at', 'is_valid', 'created_at'
        ]
        read_only_fields = ['code', 'server', 'created_by', 'uses_count', 'created_at']

class JoinServerSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=16, required=True)
