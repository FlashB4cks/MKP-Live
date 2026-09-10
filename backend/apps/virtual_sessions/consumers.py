import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from core.vpn_security import verify_ws_vpn_access
from .models import VirtualSession, SessionParticipant, ParticipantStatusChoices

class SessionSignalingConsumer(AsyncWebsocketConsumer):
    active_screen_shares = {}  # session_id -> { user_id, username, has_audio, stream_id }

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
        self.user_group_name = f"session_{self.session_id}_user_{self.user.id}"

        # Check if this connection is only for waiting room
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        self.is_waiting = 'waiting=true' in query_string

        # Join session group
        await self.channel_layer.group_add(
            self.session_group_name,
            self.channel_name
        )

        # Join targeted user group for fast 1-on-1 WebRTC signaling
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

        # If a screen share is already active in this session, inform the connecting user
        session_key = str(self.session_id)
        if session_key in self.active_screen_shares and not self.is_waiting:
            share_info = self.active_screen_shares[session_key]
            await self.send(text_data=json.dumps({
                'type': 'session_event',
                'event_type': 'screen_share_status',
                'user_id': share_info['user_id'],
                'username': share_info['username'],
                'is_sharing': True,
                'has_audio': share_info['has_audio'],
                'stream_id': share_info['stream_id'],
            }))

        # Only notify user_joined if entering active room (not waiting room)
        if not self.is_waiting:
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

        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

            # Only notify user_left if participant was in active room
            if not getattr(self, 'is_waiting', False) and hasattr(self, 'user') and self.user:
                await self.mark_participant_left(self.session_id, self.user)
                session_key = str(getattr(self, 'session_id', ''))
                current_share = self.active_screen_shares.get(session_key)
                if current_share and current_share.get('user_id') == str(self.user.id):
                    self.active_screen_shares.pop(session_key, None)
                    await self.channel_layer.group_send(
                        self.session_group_name,
                        {
                            'type': 'session_event',
                            'event_type': 'screen_share_status',
                            'user_id': str(self.user.id),
                            'username': self.user.username,
                            'is_sharing': False,
                            'has_audio': False,
                            'stream_id': '',
                        }
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
                if target_user_id is not None:
                    target_user_id = str(target_user_id)
                    dest_group = f"session_{self.session_id}_user_{target_user_id}"
                else:
                    dest_group = self.session_group_name

                await self.channel_layer.group_send(
                    dest_group,
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

                target_username = await self.set_participant_status(self.session_id, target_user_id, status_action)

                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'session_event',
                        'event_type': 'participant_approved' if status_action == 'ACCEPTED' else 'participant_rejected',
                        'user_id': str(target_user_id),
                        'username': target_username or 'Participante',
                        'status': status_action,
                    }
                )

            elif action == 'host_mute_participant':
                target_user_id = data.get('target_user_id')
                is_host = await self.verify_is_host(self.session_id, self.user)
                if is_host and target_user_id:
                    target_username = await self.moderate_participant_db(self.session_id, target_user_id, 'MUTE')
                    await self.channel_layer.group_send(
                        self.session_group_name,
                        {
                            'type': 'session_event',
                            'event_type': 'host_forced_mute',
                            'target_user_id': str(target_user_id),
                            'username': target_username or 'Participante',
                            'by_host': self.user.username,
                        }
                    )

            elif action == 'host_disable_video_participant':
                target_user_id = data.get('target_user_id')
                is_host = await self.verify_is_host(self.session_id, self.user)
                if is_host and target_user_id:
                    target_username = await self.moderate_participant_db(self.session_id, target_user_id, 'DISABLE_VIDEO')
                    await self.channel_layer.group_send(
                        self.session_group_name,
                        {
                            'type': 'session_event',
                            'event_type': 'host_forced_video_off',
                            'target_user_id': str(target_user_id),
                            'username': target_username or 'Participante',
                            'by_host': self.user.username,
                        }
                    )

            elif action == 'host_kick_participant':
                target_user_id = data.get('target_user_id')
                is_host = await self.verify_is_host(self.session_id, self.user)
                if is_host and target_user_id:
                    target_username = await self.moderate_participant_db(self.session_id, target_user_id, 'KICK')
                    await self.channel_layer.group_send(
                        self.session_group_name,
                        {
                            'type': 'session_event',
                            'event_type': 'host_forced_kick',
                            'target_user_id': str(target_user_id),
                            'username': target_username or 'Participante',
                            'by_host': self.user.username,
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

            elif action == 'screen_share_status':
                is_sharing = bool(data.get('is_sharing', False))
                has_audio = bool(data.get('has_audio', False))
                stream_id = str(data.get('stream_id', ''))

                session_key = str(self.session_id)
                if is_sharing:
                    self.active_screen_shares[session_key] = {
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'has_audio': has_audio,
                        'stream_id': stream_id,
                    }
                else:
                    current_share = self.active_screen_shares.get(session_key)
                    if current_share and current_share.get('user_id') == str(self.user.id):
                        self.active_screen_shares.pop(session_key, None)

                await self.channel_layer.group_send(
                    self.session_group_name,
                    {
                        'type': 'session_event',
                        'event_type': 'screen_share_status',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_sharing': is_sharing,
                        'has_audio': has_audio,
                        'stream_id': stream_id,
                    }
                )

            elif action == 'participant_leave':
                await self.mark_participant_left(self.session_id, self.user)
                session_key = str(self.session_id)
                current_share = self.active_screen_shares.get(session_key)
                if current_share and current_share.get('user_id') == str(self.user.id):
                    self.active_screen_shares.pop(session_key, None)
                    await self.channel_layer.group_send(
                        self.session_group_name,
                        {
                            'type': 'session_event',
                            'event_type': 'screen_share_status',
                            'user_id': str(self.user.id),
                            'username': self.user.username,
                            'is_sharing': False,
                            'has_audio': False,
                            'stream_id': '',
                        }
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

        except json.JSONDecodeError:
            pass

    # Group Event Handlers
    async def session_event(self, event):
        await self.send(text_data=json.dumps(event))

    async def webrtc_signal_forward(self, event):
        # Only send to specific target or broadcast if target is null
        target = event.get('target_user_id')
        my_id = str(self.user.id)
        from_id = str(event.get('from_user_id', ''))

        # Never send signal back to the sender
        if from_id == my_id:
            return

        if not target or str(target) == my_id:
            await self.send(text_data=json.dumps({
                'type': 'signal',
                'from_user_id': from_id,
                'from_username': event.get('from_username', ''),
                'signal_data': event.get('signal_data'),
            }))

    @database_sync_to_async
    def verify_is_host(self, session_id, user):
        return VirtualSession.objects.filter(id=session_id, host=user).exists()

    @database_sync_to_async
    def moderate_participant_db(self, session_id, target_user_id, action):
        p = SessionParticipant.objects.filter(
            session_id=session_id,
            user_id=target_user_id
        ).select_related('user').first()
        if not p:
            return None
        if action == 'MUTE':
            p.is_audio_muted = True
            p.save(update_fields=['is_audio_muted', 'updated_at'])
        elif action == 'DISABLE_VIDEO':
            p.is_video_off = True
            p.save(update_fields=['is_video_off', 'updated_at'])
        elif action == 'KICK':
            p.status = ParticipantStatusChoices.REJECTED
            p.save(update_fields=['status', 'updated_at'])
        return p.user.username

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
        p = SessionParticipant.objects.filter(
            session_id=session_id,
            user_id=user_id
        ).select_related('user').first()
        if p:
            p.status = status_action
            p.save(update_fields=['status', 'updated_at'])
            return p.user.username
        return None

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

    @database_sync_to_async
    def mark_participant_left(self, session_id, user):
        try:
            session = VirtualSession.objects.filter(id=session_id).first()
            if session and session.host_id != user.id:
                SessionParticipant.objects.filter(
                    session_id=session_id,
                    user=user
                ).update(
                    status=ParticipantStatusChoices.LEFT
                )
        except Exception:
            pass

