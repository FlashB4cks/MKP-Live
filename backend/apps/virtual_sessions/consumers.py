import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from core.vpn_security import verify_ws_vpn_access
from .models import VirtualSession, SessionParticipant, ParticipantStatusChoices

class SessionSignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Validate VPN connection
        is_vpn_ok, _, _ = verify_ws_vpn_access(self.scope)
        if not is_vpn_ok:
            await self.close(code=4008)
            return

        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.session_group_name = f"session_{self.session_id}"

        # Join session group
        await self.channel_layer.group_add(
            self.session_group_name,
            self.channel_name
        )

        await self.accept()

        # Notify participants
        await self.channel_layer.group_send(
            self.session_group_name,
            {
                'type': 'session_event',
                'event_type': 'user_joined',
                'user_id': str(self.user.id),
                'username': self.user.username,
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'session_group_name'):
            await self.channel_layer.group_discard(
                self.session_group_name,
                self.channel_name
            )

            await self.channel_layer.group_send(
                self.session_group_name,
                {
                    'type': 'session_event',
                    'event_type': 'user_left',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                }
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('type')

            if action == 'signal':
                # Relay WebRTC signaling (offer, answer, candidate)
                target_user_id = data.get('target_user_id')
                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'webrtc_signal_forward',
                        'from_user_id': str(self.user.id),
                        'from_username': self.user.username,
                        'target_user_id': target_user_id,
                        'signal_data': data.get('signal_data'),
                    }
                )

            elif action == 'media_state':
                # Broadcast mic / camera toggles
                is_audio_muted = data.get('is_audio_muted', False)
                is_video_off = data.get('is_video_off', False)

                await self.update_media_state(self.session_id, self.user.id, is_audio_muted, is_video_off)

                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'session_event',
                        'event_type': 'media_state_changed',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_audio_muted': is_audio_muted,
                        'is_video_off': is_video_off,
                    }
                )

            elif action == 'request_join':
                # Participant notifies host in waiting room
                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'session_event',
                        'event_type': 'join_requested',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                    }
                )

            elif action == 'approve_participant':
                # Host approves or rejects participant
                target_user_id = data.get('target_user_id')
                status_action = data.get('status', 'ACCEPTED')

                await self.set_participant_status(self.session_id, target_user_id, status_action)

                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'session_event',
                        'event_type': 'participant_approved' if status_action == 'ACCEPTED' else 'participant_rejected',
                        'user_id': target_user_id,
                        'status': status_action,
                    }
                )

            elif action == 'chat_message':
                content = data.get('content', '').strip()
                if content:
                    msg_data = await self.save_session_message(self.session_id, self.user, content)
                    await self.channel_layer.group_send(
                        self.session_group_name,
                        {
                            'type': 'session_event',
                            'event_type': 'chat_message',
                            'message': msg_data,
                        }
                    )

        except json.JSONDecodeError:
            pass

    # Group Event Handlers
    async def session_event(self, event):
        await self.send(text_data=json.dumps(event))

    async def webrtc_signal_forward(self, event):
        # Only send to specific target or broadcast if target is null
        target = event.get('target_user_id')
        if not target or target == str(self.user.id):
            if event.get('from_user_id') != str(self.user.id):
                await self.send(text_data=json.dumps({
                    'type': 'signal',
                    'from_user_id': event['from_user_id'],
                    'from_username': event['from_username'],
                    'signal_data': event['signal_data'],
                }))

    @database_sync_to_async
    def update_media_state(self, session_id, user_id, is_audio_muted, is_video_off):
        SessionParticipant.objects.filter(
            session_id=session_id,
            user_id=user_id
        ).update(
            is_audio_muted=is_audio_muted,
            is_video_off=is_video_off
        )

    @database_sync_to_async
    def set_participant_status(self, session_id, user_id, status_action):
        SessionParticipant.objects.filter(
            session_id=session_id,
            user_id=user_id
        ).update(status=status_action)

    @database_sync_to_async
    def save_session_message(self, session_id, user, content):
        from .models import SessionMessage
        from .serializers import SessionMessageSerializer
        msg = SessionMessage.objects.create(
            session_id=session_id,
            user=user,
            content=content
        )
        return SessionMessageSerializer(msg).data

