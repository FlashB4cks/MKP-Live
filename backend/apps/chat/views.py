from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from .models import Message, DMConversation, DirectMessage
from .serializers import MessageSerializer, DMConversationSerializer, DirectMessageSerializer
from accounts.serializers import UserSerializer
from channels_app.models import Channel
from servers.models import ServerMember
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

User = get_user_model()

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        channel_id = self.request.query_params.get('channel')
        if not channel_id:
            return Message.objects.none()

        channel = get_object_or_404(Channel, id=channel_id)
        
        # Verify that the user belongs to the server of this channel
        is_member = ServerMember.objects.filter(
            server=channel.server,
            user=self.request.user
        ).exists()
        if not is_member:
            raise permissions.exceptions.PermissionDenied(
                "No tienes permiso para ver los mensajes de este servidor."
            )

        queryset = Message.objects.filter(channel=channel).select_related('author')
        
        # Optional cursor / pagination parameter
        before_id = self.request.query_params.get('before')
        if before_id:
            queryset = queryset.filter(id__lt=before_id)

        # Return latest 50 messages
        return queryset.order_by('-created_at')[:50]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Reverse to chronological order (oldest -> newest) for client chat display
        response.data = list(reversed(response.data))
        return response

class DMConversationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # List all DM conversations where request.user is a participant
        conversations = request.user.dm_conversations.all().prefetch_related(
            'participants', 'messages', 'messages__sender'
        )
        serializer = DMConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        target_user_id = request.data.get('target_user_id')
        username = request.data.get('username')

        target_user = None
        if target_user_id:
            target_user = get_object_or_404(User, id=target_user_id)
        elif username:
            target_user = get_object_or_404(User, username=username)
        else:
            return Response({'detail': 'Debes especificar target_user_id o username.'}, status=status.HTTP_400_BAD_REQUEST)

        if target_user.id == request.user.id:
            return Response({'detail': 'No puedes iniciar una conversación contigo mismo.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find existing conversation with both participants
        existing_conv = DMConversation.objects.filter(
            participants=request.user
        ).filter(
            participants=target_user
        ).first()

        if existing_conv:
            serializer = DMConversationSerializer(existing_conv, context={'request': request})
            return Response(serializer.data)

        # Create new conversation
        conv = DMConversation.objects.create()
        conv.participants.add(request.user, target_user)
        serializer = DMConversationSerializer(conv, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class DirectMessageListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        conv = get_object_or_404(DMConversation, id=conversation_id)
        if not conv.participants.filter(id=request.user.id).exists():
            raise permissions.exceptions.PermissionDenied("No tienes permiso para ver esta conversación.")

        # Mark unread messages as read
        conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        messages = conv.messages.select_related('sender').order_by('-created_at')[:50]
        serializer = DirectMessageSerializer(reversed(messages), many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, conversation_id):
        conv = get_object_or_404(DMConversation, id=conversation_id)
        if not conv.participants.filter(id=request.user.id).exists():
            raise permissions.exceptions.PermissionDenied("No tienes permiso para enviar mensajes a esta conversación.")

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'detail': 'El mensaje no puede estar vacío.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = DirectMessage.objects.create(
            conversation=conv,
            sender=request.user,
            content=content
        )
        conv.save(update_fields=['updated_at'])

        data = DirectMessageSerializer(msg, context={'request': request}).data

        # Broadcast via Channels
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"dm_{conversation_id}",
                    {
                        'type': 'dm_message_broadcast',
                        'message': data,
                    }
                )
            except Exception:
                pass

        return Response(data, status=status.HTTP_201_CREATED)

class UserSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        users = User.objects.exclude(id=request.user.id)
        if query:
            users = users.filter(
                Q(username__icontains=query) | Q(email__icontains=query)
            )
        serializer = UserSerializer(users[:30], many=True, context={'request': request})
        return Response(serializer.data)

