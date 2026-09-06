from rest_framework import serializers
from .models import Channel

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ['id', 'server', 'name', 'channel_type', 'topic', 'position', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        # Discord channel names are lowercase, no spaces
        formatted = value.strip().lower().replace(' ', '-')
        return formatted
