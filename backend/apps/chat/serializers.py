from rest_framework import serializers
from .models import Message, DMConversation, DirectMessage
from accounts.serializers import UserSerializer

class MessageSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    channel = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'channel', 'author', 'content',
            'attachment', 'attachment_type', 'attachment_name', 'reactions',
            'is_edited', 'reply_to', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'is_edited', 'created_at', 'updated_at']

    def get_channel(self, obj):
        return str(obj.channel_id)

class DirectMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    conversation = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = [
            'id', 'conversation', 'sender', 'content',
            'attachment', 'attachment_type', 'attachment_name', 'reactions',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'created_at']

    def get_conversation(self, obj):
        return str(obj.conversation_id)

class DMConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_pending = serializers.SerializerMethodField()
    can_chat = serializers.SerializerMethodField()
    awaiting_my_acceptance = serializers.SerializerMethodField()

    class Meta:
        model = DMConversation
        fields = [
            'id', 'participants', 'other_user', 'last_message',
            'unread_count', 'status', 'initiated_by',
            'is_pending', 'can_chat', 'awaiting_my_acceptance',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other = obj.participants.exclude(id=request.user.id).first()
            if other:
                return UserSerializer(other, context=self.context).data
        return None

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return DirectMessageSerializer(last, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_is_pending(self, obj):
        return obj.status == 'PENDING'

    def get_can_chat(self, obj):
        return obj.status == 'ACCEPTED'

    def get_awaiting_my_acceptance(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.status == 'PENDING' and str(obj.initiated_by_id) != str(request.user.id)
        return False

