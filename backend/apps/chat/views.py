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

        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(content__icontains=search_query)
        
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

        # Create new conversation with PENDING status and initiated_by
        conv = DMConversation.objects.create(
            status='PENDING',
            initiated_by=request.user
        )
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

        # Ensure conversation is accepted before allowing messages
        if conv.status != 'ACCEPTED':
            return Response(
                {'detail': 'Debes esperar a que el usuario acepte tu solicitud de contacto para chatear.'},
                status=status.HTTP_403_FORBIDDEN
            )

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
        # Ocultar directorio global: no listar usuarios si la búsqueda está vacía o es muy corta
        if len(query) < 2:
            return Response([])

        clean_q = query.lstrip('@').strip()
        if not clean_q:
            return Response([])

        users = User.objects.exclude(id=request.user.id).filter(
            username__icontains=clean_q
        )[:20]
        serializer = UserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)


from rest_framework.parsers import MultiPartParser, FormParser

class ChatFileUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No se proporcionó ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        channel_id = request.data.get('channel_id')
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content', '').strip()

        # Determine file type
        mime = getattr(file_obj, 'content_type', '') or ''
        name = file_obj.name.lower()
        if mime.startswith('image/') or name.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')):
            attachment_type = 'image'
        elif mime.startswith('audio/') or name.endswith(('.webm', '.ogg', '.mp3', '.wav', '.m4a', '.aac')):
            attachment_type = 'audio'
        else:
            attachment_type = 'file'

        channel_layer = get_channel_layer()

        if channel_id:
            channel = get_object_or_404(Channel, id=channel_id)
            is_member = ServerMember.objects.filter(server=channel.server, user=request.user).exists()
            if not is_member:
                raise permissions.exceptions.PermissionDenied("No tienes permiso en este servidor.")

            msg = Message.objects.create(
                channel=channel,
                author=request.user,
                content=content,
                attachment=file_obj,
                attachment_name=file_obj.name,
                attachment_type=attachment_type
            )
            data = MessageSerializer(msg, context={'request': request}).data

            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"chat_{channel_id}",
                        {
                            'type': 'chat_message_broadcast',
                            'message': data,
                        }
                    )
                except Exception:
                    pass

            return Response(data, status=status.HTTP_201_CREATED)

        elif conversation_id:
            conv = get_object_or_404(DMConversation, id=conversation_id)
            if not conv.participants.filter(id=request.user.id).exists():
                raise permissions.exceptions.PermissionDenied("No perteneces a esta conversación.")

            msg = DirectMessage.objects.create(
                conversation=conv,
                sender=request.user,
                content=content,
                attachment=file_obj,
                attachment_name=file_obj.name,
                attachment_type=attachment_type
            )
            conv.save(update_fields=['updated_at'])
            data = DirectMessageSerializer(msg, context={'request': request}).data

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

        return Response({'detail': 'Debes especificar channel_id o conversation_id.'}, status=status.HTTP_400_BAD_REQUEST)


class MessageReactionToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        emoji = request.data.get('emoji', '').strip()
        is_dm = request.data.get('is_dm', False)
        if not emoji:
            return Response({'detail': 'Emoji requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        channel_layer = get_channel_layer()
        user_id = str(request.user.id)

        if is_dm:
            msg = get_object_or_404(DirectMessage, id=message_id)
            if not msg.conversation.participants.filter(id=request.user.id).exists():
                raise permissions.exceptions.PermissionDenied("No tienes permiso en este mensaje.")

            reactions = dict(msg.reactions or {})
            users = [str(u) for u in reactions.get(emoji, [])]
            if user_id in users:
                users.remove(user_id)
                if not users:
                    reactions.pop(emoji, None)
                else:
                    reactions[emoji] = users
            else:
                users.append(user_id)
                reactions[emoji] = users

            msg.reactions = reactions
            msg.save(update_fields=['reactions'])

            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"dm_{msg.conversation.id}",
                        {
                            'type': 'reaction_broadcast',
                            'message_id': msg.id,
                            'reactions': msg.reactions,
                            'is_dm': True,
                        }
                    )
                except Exception:
                    pass

            return Response({'status': 'ok', 'message_id': msg.id, 'reactions': msg.reactions})

        else:
            msg = get_object_or_404(Message, id=message_id)
            is_member = ServerMember.objects.filter(server=msg.channel.server, user=request.user).exists()
            if not is_member:
                raise permissions.exceptions.PermissionDenied("No tienes permiso en este mensaje.")

            reactions = dict(msg.reactions or {})
            users = [str(u) for u in reactions.get(emoji, [])]
            if user_id in users:
                users.remove(user_id)
                if not users:
                    reactions.pop(emoji, None)
                else:
                    reactions[emoji] = users
            else:
                users.append(user_id)
                reactions[emoji] = users

            msg.reactions = reactions
            msg.save(update_fields=['reactions'])

            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"chat_{msg.channel.id}",
                        {
                            'type': 'reaction_broadcast',
                            'message_id': msg.id,
                            'reactions': msg.reactions,
                            'is_dm': False,
                        }
                    )
                except Exception:
                    pass

            return Response({'status': 'ok', 'message_id': msg.id, 'reactions': msg.reactions})


class DirectMessageAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conv = get_object_or_404(DMConversation, id=conversation_id)
        if not conv.participants.filter(id=request.user.id).exists():
            raise permissions.exceptions.PermissionDenied("No eres participante de esta conversación.")

        # Only the recipient can accept
        if conv.initiated_by_id and str(conv.initiated_by_id) == str(request.user.id):
            return Response({'detail': 'No puedes aceptar tu propia solicitud.'}, status=status.HTTP_400_BAD_REQUEST)

        conv.status = 'ACCEPTED'
        conv.save(update_fields=['status', 'updated_at'])

        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"dm_{conversation_id}",
                    {
                        'type': 'dm_status_broadcast',
                        'status': 'ACCEPTED',
                    }
                )
            except Exception:
                pass

        serializer = DMConversationSerializer(conv, context={'request': request})
        return Response(serializer.data)


class DirectMessageRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conv = get_object_or_404(DMConversation, id=conversation_id)
        if not conv.participants.filter(id=request.user.id).exists():
            raise permissions.exceptions.PermissionDenied("No eres participante de esta conversación.")

        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"dm_{conversation_id}",
                    {
                        'type': 'dm_status_broadcast',
                        'status': 'REJECTED',
                    }
                )
            except Exception:
                pass

        conv.delete()
        return Response({'status': 'ok', 'detail': 'Solicitud rechazada.'})


class DirectMessageClearView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conv = get_object_or_404(DMConversation, id=conversation_id)
        if not conv.participants.filter(id=request.user.id).exists():
            raise permissions.exceptions.PermissionDenied("No eres participante de esta conversación.")

        conv.messages.all().delete()
        conv.save(update_fields=['updated_at'])

        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"dm_{conversation_id}",
                    {
                        'type': 'dm_clear_broadcast',
                        'conversation_id': str(conversation_id),
                    }
                )
            except Exception:
                pass

        return Response({'status': 'ok', 'detail': 'Historial vaciado exitosamente.'})


class DirectMessageDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, conversation_id):
        conv = get_object_or_404(DMConversation, id=conversation_id)
        if not conv.participants.filter(id=request.user.id).exists():
            raise permissions.exceptions.PermissionDenied("No eres participante de esta conversación.")

        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"dm_{conversation_id}",
                    {
                        'type': 'dm_deleted_broadcast',
                        'conversation_id': str(conversation_id),
                    }
                )
            except Exception:
                pass

        conv.delete()
        return Response({'status': 'ok', 'detail': 'Conversación eliminada.'})


class MessageDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        msg = get_object_or_404(Message, pk=pk)
        member = ServerMember.objects.filter(server=msg.channel.server, user=request.user).first()

        is_author = msg.author_id == request.user.id
        can_moderate = member and member.has_manage_messages_permission()

        if not (is_author or can_moderate):
            raise permissions.exceptions.PermissionDenied("No tienes permisos para eliminar este mensaje.")

        channel_id = msg.channel.id
        message_id = msg.id
        msg.delete()

        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{channel_id}",
                    {
                        'type': 'message_deleted_broadcast',
                        'message_id': message_id,
                    }
                )
            except Exception:
                pass

        return Response({'status': 'ok', 'message_id': message_id})

