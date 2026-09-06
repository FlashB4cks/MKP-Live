from rest_framework import serializers
from django.utils import timezone
from .models import VirtualSession, SessionParticipant, SessionStatusChoices, ParticipantStatusChoices, SessionMessage
from accounts.serializers import UserSerializer

class SessionMessageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = SessionMessage
        fields = ['id', 'session', 'user', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class SessionParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = SessionParticipant
        fields = [
            'id', 'user', 'status', 'is_audio_muted',
            'is_video_off', 'joined_at', 'updated_at'
        ]
        read_only_fields = ['id', 'joined_at', 'updated_at']

class VirtualSessionSerializer(serializers.ModelSerializer):
    host = UserSerializer(read_only=True)
    server_name = serializers.ReadOnlyField(source='server.name')
    participants_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    is_host = serializers.SerializerMethodField()

    class Meta:
        model = VirtualSession
        fields = [
            'id', 'server', 'server_name', 'host', 'title',
            'description', 'scheduled_at', 'duration_minutes',
            'status', 'requires_approval', 'participants_count',
            'pending_count', 'my_status', 'is_host', 'created_at'
        ]
        read_only_fields = ['id', 'host', 'status', 'created_at']

    def get_pending_count(self, obj):
        return obj.participants.filter(status=ParticipantStatusChoices.PENDING).count()

    def get_participants_count(self, obj):
        return obj.participants.filter(status=ParticipantStatusChoices.ACCEPTED).count()

    def get_my_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if obj.host == request.user:
                return 'HOST'
            p = obj.participants.filter(user=request.user).first()
            return p.status if p else 'NONE'
        return 'NONE'

    def get_is_host(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.host == request.user
        return False

class VirtualSessionDetailSerializer(VirtualSessionSerializer):
    participants = SessionParticipantSerializer(many=True, read_only=True)
    messages = SessionMessageSerializer(many=True, read_only=True)

    class Meta(VirtualSessionSerializer.Meta):
        fields = VirtualSessionSerializer.Meta.fields + ['participants', 'messages']

class ScheduleSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VirtualSession
        fields = [
            'id', 'server', 'title', 'description',
            'scheduled_at', 'duration_minutes', 'requires_approval'
        ]

    def validate_scheduled_at(self, value):
        # Allow up to 10 minutes in the past for immediate starting
        if value < timezone.now() - timezone.timedelta(minutes=10):
            raise serializers.ValidationError("La fecha y hora programada no puede estar en el pasado.")
        return value
