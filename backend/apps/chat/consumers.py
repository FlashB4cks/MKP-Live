import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.serializers.json import DjangoJSONEncoder
from channels_app.models import Channel
from servers.models import ServerMember
from .models import Message, DMConversation, DirectMessage
from accounts.serializers import UserSerializer
from .serializers import DirectMessageSerializer

def safe_json_dumps(data):
    return json.dumps(data, cls=DjangoJSONEncoder)

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')

        # Require authenticated user
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.channel_id = self.scope['url_route']['kwargs']['channel_id']
        
        # Verify permissions: channel exists and user is a member of the server
        auth_data = await self.verify_channel_membership(self.user, self.channel_id)
        if not auth_data:
            await self.close(code=4003)
            return

        self.server_id = str(auth_data['server_id'])
        self.channel_group_name = f"chat_{self.channel_id}"
        self.server_group_name = f"server_{self.server_id}_presence"

        # Join channel group
        await self.channel_layer.group_add(
            self.channel_group_name,
            self.channel_name
        )

        # Join server presence group
        await self.channel_layer.group_add(
            self.server_group_name,
            self.channel_name
        )

        await self.set_user_online_status(self.user, True)

        # Broadcast user presence (online)
        await self.channel_layer.group_send(
            self.server_group_name,
            {
                'type': 'presence_broadcast',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_online': True,
            }
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'channel_group_name'):
            await self.channel_layer.group_discard(
                self.channel_group_name,
                self.channel_name
            )

        if hasattr(self, 'server_group_name'):
            await self.channel_layer.group_discard(
                self.server_group_name,
                self.channel_name
            )

            if self.user and self.user.is_authenticated:
                await self.set_user_online_status(self.user, False)
                # Broadcast user presence (offline)
                await self.channel_layer.group_send(
                    self.server_group_name,
                    {
                        'type': 'presence_broadcast',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_online': False,
                    }
                )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action_type = data.get('type')

            if action_type == 'chat_message':
                content = data.get('content', '').strip()
                if not content:
                    return

                # Persist message to database
                message = await self.create_message(self.user, self.channel_id, content)

                # Broadcast to channel group
                await self.channel_layer.group_send(
                    self.channel_group_name,
                    {
                        'type': 'chat_message_broadcast',
                        'message': message,
                    }
                )

            elif action_type == 'typing':
                is_typing = bool(data.get('is_typing', False))
                await self.channel_layer.group_send(
                    self.channel_group_name,
                    {
                        'type': 'typing_broadcast',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_typing': is_typing,
                    }
                )

        except json.JSONDecodeError:
            pass

    # Group Event Handlers
    async def chat_message_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def reaction_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'message_reaction',
            'message_id': event['message_id'],
            'reactions': event['reactions'],
        }))

    async def message_deleted_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
        }))

    async def typing_broadcast(self, event):
        # Don't send typing to self
        if event.get('user_id') != str(self.user.id):
            await self.send(text_data=safe_json_dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def presence_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_online': event['is_online'],
        }))

    # Database helper methods
    @database_sync_to_async
    def verify_channel_membership(self, user, channel_id):
        try:
            channel = Channel.objects.select_related('server').get(id=channel_id)
            is_member = ServerMember.objects.filter(
                server=channel.server,
                user=user
            ).exists()
            if is_member:
                return {'server_id': channel.server.id}
            return None
        except (Channel.DoesNotExist, Exception):
            return None

    @database_sync_to_async
    def create_message(self, user, channel_id, content):
        channel = Channel.objects.get(id=channel_id)
        msg = Message.objects.create(
            channel=channel,
            author=user,
            content=content
        )
        return {
            'id': msg.id,
            'channel': str(channel.id),
            'author': UserSerializer(user).data,
            'content': msg.content,
            'attachment': None,
            'attachment_type': '',
            'attachment_name': '',
            'reactions': {},
            'is_edited': msg.is_edited,
            'created_at': msg.created_at.isoformat(),
        }

    @database_sync_to_async
    def set_user_online_status(self, user, is_online):
        try:
            User.objects.filter(id=user.id).update(is_online=is_online)
        except Exception:
            pass

class DirectMessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        is_participant = await self.verify_conversation_participant(self.user, self.conversation_id)
        if not is_participant:
            await self.close(code=4003)
            return

        self.dm_group_name = f"dm_{self.conversation_id}"

        await self.channel_layer.group_add(
            self.dm_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'dm_group_name'):
            await self.channel_layer.group_discard(
                self.dm_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action_type = data.get('type')

            if action_type == 'chat_message':
                content = data.get('content', '').strip()
                if not content:
                    return

                # Verify that conversation is ACCEPTED before creating message
                can_chat = await self.check_conversation_accepted(self.conversation_id)
                if not can_chat:
                    await self.send(text_data=safe_json_dumps({
                        'type': 'error',
                        'message': 'La solicitud de contacto aún no ha sido aceptada.',
                    }))
                    return

                msg_data = await self.create_direct_message(self.user, self.conversation_id, content)

                await self.channel_layer.group_send(
                    self.dm_group_name,
                    {
                        'type': 'dm_message_broadcast',
                        'message': msg_data,
                    }
                )

            elif action_type == 'typing':
                is_typing = bool(data.get('is_typing', False))
                await self.channel_layer.group_send(
                    self.dm_group_name,
                    {
                        'type': 'typing_broadcast',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_typing': is_typing,
                    }
                )

        except json.JSONDecodeError:
            pass

    async def dm_message_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def reaction_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'message_reaction',
            'message_id': event['message_id'],
            'reactions': event['reactions'],
        }))

    async def typing_broadcast(self, event):
        if event.get('user_id') != str(self.user.id):
            await self.send(text_data=safe_json_dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def dm_clear_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'clear_chat',
            'conversation_id': str(event['conversation_id']),
        }))

    async def dm_status_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'conversation_status',
            'conversation_id': str(event.get('conversation_id', self.conversation_id)),
            'status': event['status'],
        }))

    async def dm_deleted_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'conversation_deleted',
            'conversation_id': str(event['conversation_id']),
        }))

    @database_sync_to_async
    def verify_conversation_participant(self, user, conversation_id):
        try:
            from .models import DMConversation
            return DMConversation.objects.filter(
                id=conversation_id,
                participants=user
            ).exists()
        except Exception:
            return False

    @database_sync_to_async
    def check_conversation_accepted(self, conversation_id):
        try:
            from .models import DMConversation
            conv = DMConversation.objects.get(id=conversation_id)
            return conv.status == 'ACCEPTED'
        except Exception:
            return False

    @database_sync_to_async
    def create_direct_message(self, user, conversation_id, content):
        from .models import DMConversation, DirectMessage
        from .serializers import DirectMessageSerializer
        conv = DMConversation.objects.get(id=conversation_id)
        msg = DirectMessage.objects.create(
            conversation=conv,
            sender=user,
            content=content
        )
        conv.save(update_fields=['updated_at'])
        return DirectMessageSerializer(msg).data


class GatewayConsumer(AsyncWebsocketConsumer):
    """
    Persistent gateway WebSocket that connects once per authenticated user session.
    Stays connected across tab changes, DM switches, and server/channel navigation.
    Multiplexes real-time chat messages, direct messages, presence, reactions,
    typing indicators, and status updates without dropping connections.
    """
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_group = f"user_{self.user.id}"
        self.subscribed_channel_id = None
        self.subscribed_channel_group = None
        self.joined_dm_groups = set()
        self.joined_server_groups = set()

        # Join personal user notification group
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # Join all active DM conversations of this user
        dm_ids = await self.get_user_dm_ids(self.user)
        for d_id in dm_ids:
            grp = f"dm_{d_id}"
            await self.channel_layer.group_add(grp, self.channel_name)
            self.joined_dm_groups.add(grp)

        # Join all server presence groups
        server_ids = await self.get_user_server_ids(self.user)
        for s_id in server_ids:
            grp = f"server_{s_id}_presence"
            await self.channel_layer.group_add(grp, self.channel_name)
            self.joined_server_groups.add(grp)

        # Set user online status
        await self.set_user_online_status(self.user, True)

        # Broadcast online status to servers
        for grp in self.joined_server_groups:
            await self.channel_layer.group_send(
                grp,
                {
                    'type': 'presence_broadcast',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'is_online': True,
                }
            )

        await self.accept()

        # Send ready handshake
        await self.send(text_data=safe_json_dumps({
            'type': 'ready',
            'user_id': str(self.user.id),
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

        if hasattr(self, 'subscribed_channel_group') and self.subscribed_channel_group:
            await self.channel_layer.group_discard(self.subscribed_channel_group, self.channel_name)

        if hasattr(self, 'joined_dm_groups'):
            for grp in self.joined_dm_groups:
                await self.channel_layer.group_discard(grp, self.channel_name)

        if hasattr(self, 'joined_server_groups'):
            for grp in self.joined_server_groups:
                await self.channel_layer.group_discard(grp, self.channel_name)

            if self.user and self.user.is_authenticated:
                await self.set_user_online_status(self.user, False)
                for grp in self.joined_server_groups:
                    await self.channel_layer.group_send(
                        grp,
                        {
                            'type': 'presence_broadcast',
                            'user_id': str(self.user.id),
                            'username': self.user.username,
                            'is_online': False,
                        }
                    )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        action_type = data.get('type')

        # Heartbeat ping/pong
        if action_type == 'ping':
            await self.send(text_data=safe_json_dumps({'type': 'pong'}))
            return

        elif action_type == 'subscribe_channel':
            channel_id = data.get('channel_id')
            if not channel_id:
                return

            auth_data = await self.verify_channel_membership(self.user, channel_id)
            if not auth_data:
                await self.send(text_data=safe_json_dumps({
                    'type': 'error',
                    'message': 'No tienes acceso a este canal.',
                }))
                return

            # Unsubscribe from previous channel group if different
            if self.subscribed_channel_group and self.subscribed_channel_id != str(channel_id):
                await self.channel_layer.group_discard(
                    self.subscribed_channel_group,
                    self.channel_name
                )

            self.subscribed_channel_id = str(channel_id)
            self.subscribed_channel_group = f"chat_{self.subscribed_channel_id}"
            await self.channel_layer.group_add(
                self.subscribed_channel_group,
                self.channel_name
            )
            await self.send(text_data=safe_json_dumps({
                'type': 'subscribed_channel',
                'channel_id': self.subscribed_channel_id,
            }))

        elif action_type == 'unsubscribe_channel':
            if self.subscribed_channel_group:
                await self.channel_layer.group_discard(
                    self.subscribed_channel_group,
                    self.channel_name
                )
                self.subscribed_channel_group = None
                self.subscribed_channel_id = None

        elif action_type == 'subscribe_dm':
            conv_id = data.get('conversation_id')
            if not conv_id:
                return
            is_participant = await self.verify_conversation_participant(self.user, conv_id)
            if is_participant:
                grp = f"dm_{conv_id}"
                if grp not in self.joined_dm_groups:
                    await self.channel_layer.group_add(grp, self.channel_name)
                    self.joined_dm_groups.add(grp)
                await self.send(text_data=safe_json_dumps({
                    'type': 'subscribed_dm',
                    'conversation_id': str(conv_id),
                }))

        elif action_type == 'chat_message':
            channel_id = data.get('channel_id') or self.subscribed_channel_id
            content = data.get('content', '').strip()
            if not channel_id or not content:
                return

            auth_data = await self.verify_channel_membership(self.user, channel_id)
            if not auth_data:
                return

            msg_data = await self.create_channel_message(self.user, channel_id, content)
            await self.channel_layer.group_send(
                f"chat_{channel_id}",
                {
                    'type': 'chat_message_broadcast',
                    'message': msg_data,
                }
            )

        elif action_type == 'dm_message':
            conv_id = data.get('conversation_id')
            content = data.get('content', '').strip()
            if not conv_id or not content:
                return

            is_participant = await self.verify_conversation_participant(self.user, conv_id)
            if not is_participant:
                return

            can_chat = await self.check_conversation_accepted(conv_id)
            if not can_chat:
                await self.send(text_data=safe_json_dumps({
                    'type': 'error',
                    'message': 'La solicitud de contacto aún no ha sido aceptada.',
                }))
                return

            msg_data, recipient_ids = await self.create_dm_message(self.user, conv_id, content)
            # Send to DM room group
            grp = f"dm_{conv_id}"
            await self.channel_layer.group_send(
                grp,
                {
                    'type': 'dm_message_broadcast',
                    'message': msg_data,
                }
            )
            # Also notify individual recipients on their personal user channel
            for r_id in recipient_ids:
                await self.channel_layer.group_send(
                    f"user_{r_id}",
                    {
                        'type': 'dm_message_broadcast',
                        'message': msg_data,
                    }
                )

        elif action_type == 'typing':
            is_typing = bool(data.get('is_typing', False))
            channel_id = data.get('channel_id') or self.subscribed_channel_id
            conversation_id = data.get('conversation_id')

            if channel_id:
                await self.channel_layer.group_send(
                    f"chat_{channel_id}",
                    {
                        'type': 'typing_broadcast',
                        'channel_id': str(channel_id),
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_typing': is_typing,
                    }
                )
            elif conversation_id:
                await self.channel_layer.group_send(
                    f"dm_{conversation_id}",
                    {
                        'type': 'typing_broadcast',
                        'conversation_id': str(conversation_id),
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_typing': is_typing,
                    }
                )

    # Event Handlers (Called by group_send)
    async def chat_message_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def dm_message_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'dm_message',
            'message': event['message'],
        }))

    async def reaction_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'message_reaction',
            'message_id': event['message_id'],
            'reactions': event['reactions'],
            'is_dm': event.get('is_dm', False),
        }))

    async def message_deleted_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
        }))

    async def typing_broadcast(self, event):
        if event.get('user_id') != str(self.user.id):
            await self.send(text_data=safe_json_dumps({
                'type': 'typing',
                'channel_id': event.get('channel_id'),
                'conversation_id': event.get('conversation_id'),
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def presence_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_online': event['is_online'],
        }))

    async def dm_clear_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'clear_chat',
            'conversation_id': str(event['conversation_id']),
        }))

    async def dm_status_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'conversation_status',
            'conversation_id': str(event.get('conversation_id', '')),
            'status': event['status'],
        }))

    async def dm_deleted_broadcast(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'conversation_deleted',
            'conversation_id': str(event['conversation_id']),
        }))

    # Database Helpers
    @database_sync_to_async
    def get_user_dm_ids(self, user):
        return list(DMConversation.objects.filter(participants=user).values_list('id', flat=True))

    @database_sync_to_async
    def get_user_server_ids(self, user):
        return list(ServerMember.objects.filter(user=user).values_list('server_id', flat=True))

    @database_sync_to_async
    def verify_channel_membership(self, user, channel_id):
        try:
            channel = Channel.objects.select_related('server').get(id=channel_id)
            is_member = ServerMember.objects.filter(
                server=channel.server,
                user=user
            ).exists()
            if is_member:
                return {'server_id': channel.server.id}
            return None
        except Exception:
            return None

    @database_sync_to_async
    def verify_conversation_participant(self, user, conversation_id):
        try:
            return DMConversation.objects.filter(
                id=conversation_id,
                participants=user
            ).exists()
        except Exception:
            return False

    @database_sync_to_async
    def check_conversation_accepted(self, conversation_id):
        try:
            conv = DMConversation.objects.get(id=conversation_id)
            return conv.status == 'ACCEPTED'
        except Exception:
            return False

    @database_sync_to_async
    def create_channel_message(self, user, channel_id, content):
        channel = Channel.objects.get(id=channel_id)
        msg = Message.objects.create(
            channel=channel,
            author=user,
            content=content
        )
        return {
            'id': msg.id,
            'channel': str(channel.id),
            'author': UserSerializer(user).data,
            'content': msg.content,
            'attachment': None,
            'attachment_type': '',
            'attachment_name': '',
            'reactions': {},
            'is_edited': msg.is_edited,
            'created_at': msg.created_at.isoformat(),
        }

    @database_sync_to_async
    def create_dm_message(self, user, conversation_id, content):
        conv = DMConversation.objects.get(id=conversation_id)
        msg = DirectMessage.objects.create(
            conversation=conv,
            sender=user,
            content=content
        )
        conv.save(update_fields=['updated_at'])
        recipient_ids = list(conv.participants.exclude(id=user.id).values_list('id', flat=True))
        return DirectMessageSerializer(msg).data, recipient_ids

    @database_sync_to_async
    def set_user_online_status(self, user, is_online):
        try:
            User.objects.filter(id=user.id).update(is_online=is_online)
        except Exception:
            pass


