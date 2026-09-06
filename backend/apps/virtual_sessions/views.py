from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from .models import (
    VirtualSession, SessionParticipant, SessionStatusChoices,
    ParticipantStatusChoices, SessionMessage
)
from .serializers import (
    VirtualSessionSerializer, VirtualSessionDetailSerializer,
    ScheduleSessionSerializer, SessionParticipantSerializer,
    SessionMessageSerializer
)
from core.vpn_security import verify_vpn_access, IsVPNAuthorized
from servers.models import Server, ServerMember
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class VPNStatusView(APIView):
    """Check if the client's current connection is recognized as authorized VPN."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        is_allowed, client_ip, reason = verify_vpn_access(request)
        return Response({
            'is_vpn_authorized': is_allowed,
            'client_ip': client_ip,
            'reason': reason,
        })

class SessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ScheduleSessionSerializer
        return VirtualSessionSerializer

    def get_queryset(self):
        server_id = self.request.query_params.get('server')
        if server_id:
            # Check user membership in server
            if not ServerMember.objects.filter(server_id=server_id, user=self.request.user).exists():
                return VirtualSession.objects.none()
            return VirtualSession.objects.filter(
                server_id=server_id,
                status__in=[
                    SessionStatusChoices.SCHEDULED,
                    SessionStatusChoices.WAITING,
                    SessionStatusChoices.ACTIVE
                ]
            )
        # Otherwise return all sessions where user is host or participant
        return VirtualSession.objects.filter(
            host=self.request.user
        ).exclude(status=SessionStatusChoices.ENDED)

    def perform_create(self, serializer):
        with transaction.atomic():
            session = serializer.save(host=self.request.user)
            # Create host participant entry
            SessionParticipant.objects.create(
                session=session,
                user=self.request.user,
                status=ParticipantStatusChoices.ACCEPTED
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output_serializer = VirtualSessionSerializer(
            serializer.instance,
            context={'request': request}
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

class InstantSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVPNAuthorized]

    def post(self, request):
        server_id = request.data.get('server')
        server = None
        if server_id:
            server = get_object_or_404(Server, id=server_id)
            if not ServerMember.objects.filter(server=server, user=request.user).exists():
                raise permissions.exceptions.PermissionDenied("No eres miembro de este servidor.")

        title = request.data.get('title', '').strip()
        if not title:
            title = f"Reunión en vivo de @{request.user.username}"

        with transaction.atomic():
            session = VirtualSession.objects.create(
                server=server,
                host=request.user,
                title=title,
                description="Sesión virtual iniciada en vivo",
                scheduled_at=timezone.now(),
                duration_minutes=60,
                status=SessionStatusChoices.ACTIVE,
                requires_approval=request.data.get('requires_approval', True)
            )
            SessionParticipant.objects.create(
                session=session,
                user=request.user,
                status=ParticipantStatusChoices.ACCEPTED
            )

        return Response(
            VirtualSessionDetailSerializer(session, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

class SessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = VirtualSession.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return VirtualSessionDetailSerializer
        return ScheduleSessionSerializer

    def perform_destroy(self, instance):
        if instance.host != self.request.user:
            raise permissions.exceptions.PermissionDenied("Solo el anfitrión puede cancelar esta sesión.")
        instance.delete()

class StartSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVPNAuthorized]

    def post(self, request, pk):
        session = get_object_or_404(VirtualSession, pk=pk)
        if session.host != request.user:
            return Response(
                {"detail": "Solo el anfitrión puede iniciar la sesión virtual."},
                status=status.HTTP_403_FORBIDDEN
            )
        session.status = SessionStatusChoices.ACTIVE
        session.save(update_fields=['status', 'updated_at'])
        return Response(VirtualSessionDetailSerializer(session, context={'request': request}).data)

class EndSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        session = get_object_or_404(VirtualSession, pk=pk)
        if session.host != request.user:
            return Response(
                {"detail": "Solo el anfitrión puede finalizar la sesión virtual."},
                status=status.HTTP_403_FORBIDDEN
            )
        session.status = SessionStatusChoices.ENDED
        session.save(update_fields=['status', 'updated_at'])
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"session_{session.id}",
                    {
                        'type': 'session_event',
                        'event_type': 'session_ended',
                    }
                )
            except Exception:
                pass
        return Response({"detail": "Sesión finalizada correctamente."})

class RequestJoinSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVPNAuthorized]

    def post(self, request, pk):
        session = get_object_or_404(VirtualSession, pk=pk)

        if session.status == SessionStatusChoices.ENDED:
            return Response(
                {"detail": "Esta sesión ya ha finalizado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If user is host or approval is not required, admit immediately
        initial_status = ParticipantStatusChoices.ACCEPTED
        if session.host != request.user and session.requires_approval:
            initial_status = ParticipantStatusChoices.PENDING

        participant, created = SessionParticipant.objects.get_or_create(
            session=session,
            user=request.user,
            defaults={'status': initial_status}
        )

        if not created and participant.status in [ParticipantStatusChoices.REJECTED, ParticipantStatusChoices.LEFT]:
            participant.status = initial_status
            participant.save(update_fields=['status', 'updated_at'])

        # Notify host and participants in real-time via WebSocket
        channel_layer = get_channel_layer()
        if channel_layer and initial_status == ParticipantStatusChoices.PENDING:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"session_{session.id}",
                    {
                        'type': 'session_event',
                        'event_type': 'join_requested',
                        'user_id': str(request.user.id),
                        'username': request.user.username,
                    }
                )
            except Exception as e:
                pass

        return Response({
            'participant_status': participant.status,
            'session': VirtualSessionDetailSerializer(session, context={'request': request}).data
        })

class ApproveParticipantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, user_id):
        session = get_object_or_404(VirtualSession, pk=pk)
        if session.host != request.user:
            return Response(
                {"detail": "Solo el anfitrión puede aceptar o rechazar conexiones."},
                status=status.HTTP_403_FORBIDDEN
            )

        participant = get_object_or_404(SessionParticipant, session=session, user_id=user_id)
        action = request.data.get('action', 'ACCEPT').upper()

        if action == 'ACCEPT':
            participant.status = ParticipantStatusChoices.ACCEPTED
        elif action == 'REJECT':
            participant.status = ParticipantStatusChoices.REJECTED
        else:
            return Response({"detail": "Acción inválida. Usa ACCEPT o REJECT."}, status=status.HTTP_400_BAD_REQUEST)

        participant.save(update_fields=['status', 'updated_at'])

        # Broadcast approval/rejection event to session group
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                event_type = 'participant_approved' if action == 'ACCEPT' else 'participant_rejected'
                async_to_sync(channel_layer.group_send)(
                    f"session_{session.id}",
                    {
                        'type': 'session_event',
                        'event_type': event_type,
                        'user_id': str(user_id),
                        'username': participant.user.username,
                        'status': participant.status,
                    }
                )
            except Exception as e:
                pass

        return Response(SessionParticipantSerializer(participant).data)

class SessionMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVPNAuthorized]

    def get(self, request, pk):
        session = get_object_or_404(VirtualSession, pk=pk)
        messages = session.messages.select_related('user').all()
        return Response(SessionMessageSerializer(messages, many=True).data)

    def post(self, request, pk):
        session = get_object_or_404(VirtualSession, pk=pk)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'detail': 'El mensaje no puede estar vacío.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = SessionMessage.objects.create(
            session=session,
            user=request.user,
            content=content
        )
        data = SessionMessageSerializer(msg).data

        # Broadcast over WebSocket to all participants in session
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"session_{session.id}",
                    {
                        'type': 'session_event',
                        'event_type': 'chat_message',
                        'message': data,
                    }
                )
            except Exception:
                pass

        return Response(data, status=status.HTTP_201_CREATED)

class ModerateParticipantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, user_id):
        session = get_object_or_404(VirtualSession, pk=pk)
        if session.host != request.user:
            return Response(
                {"detail": "Solo el anfitrión puede moderar a los participantes."},
                status=status.HTTP_403_FORBIDDEN
            )

        participant = get_object_or_404(SessionParticipant, session=session, user_id=user_id)
        action = request.data.get('action', '').upper()

        channel_layer = get_channel_layer()

        if action == 'MUTE':
            participant.is_audio_muted = True
            participant.save(update_fields=['is_audio_muted', 'updated_at'])
            event_type = 'host_forced_mute'
        elif action == 'DISABLE_VIDEO':
            participant.is_video_off = True
            participant.save(update_fields=['is_video_off', 'updated_at'])
            event_type = 'host_forced_video_off'
        elif action == 'KICK':
            participant.status = ParticipantStatusChoices.REJECTED
            participant.save(update_fields=['status', 'updated_at'])
            event_type = 'host_forced_kick'
        else:
            return Response({"detail": "Acción inválida. Usa MUTE, DISABLE_VIDEO o KICK."}, status=status.HTTP_400_BAD_REQUEST)

        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"session_{session.id}",
                    {
                        'type': 'session_event',
                        'event_type': event_type,
                        'target_user_id': str(user_id),
                        'username': participant.user.username,
                        'by_host': request.user.username,
                    }
                )
            except Exception:
                pass

        return Response({
            'status': 'success',
            'action': action,
            'target_user_id': str(user_id),
            'participant': SessionParticipantSerializer(participant).data
        })


