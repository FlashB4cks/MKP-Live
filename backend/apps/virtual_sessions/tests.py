from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from .models import VirtualSession, SessionParticipant, SessionStatusChoices, ParticipantStatusChoices
from servers.models import Server, ServerMember, RoleChoices

User = get_user_model()

class VirtualSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(username="host_user", email="host@mkp.com", password="Password123!")
        self.guest = User.objects.create_user(username="guest_user", email="guest@mkp.com", password="Password123!")
        self.server = Server.objects.create(name="Servidor Telecomunicaciones", owner=self.host)
        ServerMember.objects.create(server=self.server, user=self.host, role=RoleChoices.OWNER)
        ServerMember.objects.create(server=self.server, user=self.guest, role=RoleChoices.MEMBER)

    def test_schedule_virtual_session(self):
        self.client.force_authenticate(user=self.host)
        scheduled_time = timezone.now() + timezone.timedelta(days=1)
        response = self.client.post('/api/sessions/', {
            'server': str(self.server.id),
            'title': 'Clase Virtual de Telecomunicaciones',
            'description': 'Sesión sobre modulación y fibra óptica',
            'scheduled_at': scheduled_time.isoformat(),
            'duration_minutes': 90,
            'requires_approval': True
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session_id = response.data['id']

        session = VirtualSession.objects.get(id=session_id)
        self.assertEqual(session.status, SessionStatusChoices.SCHEDULED)
        self.assertEqual(session.host, self.host)
        self.assertTrue(session.requires_approval)

    def test_start_and_end_session_by_host(self):
        session = VirtualSession.objects.create(
            server=self.server,
            host=self.host,
            title='Sesión en vivo',
            scheduled_at=timezone.now(),
            duration_minutes=60,
            status=SessionStatusChoices.SCHEDULED
        )

        # Guest attempts to start session -> 403
        self.client.force_authenticate(user=self.guest)
        resp_guest = self.client.post(f'/api/sessions/{session.id}/start/')
        self.assertEqual(resp_guest.status_code, status.HTTP_403_FORBIDDEN)

        # Host starts session -> 200
        self.client.force_authenticate(user=self.host)
        resp_host = self.client.post(f'/api/sessions/{session.id}/start/')
        self.assertEqual(resp_host.status_code, status.HTTP_200_OK)

        session.refresh_from_db()
        self.assertEqual(session.status, SessionStatusChoices.ACTIVE)

        # Host ends session -> 200
        resp_end = self.client.post(f'/api/sessions/{session.id}/end/')
        self.assertEqual(resp_end.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, SessionStatusChoices.ENDED)

    def test_waiting_room_and_host_approval_flow(self):
        session = VirtualSession.objects.create(
            server=self.server,
            host=self.host,
            title='Sesión con Admisión',
            scheduled_at=timezone.now(),
            status=SessionStatusChoices.ACTIVE,
            requires_approval=True
        )

        # Guest requests to join -> status becomes PENDING (waiting room)
        self.client.force_authenticate(user=self.guest)
        join_resp = self.client.post(f'/api/sessions/{session.id}/join/')
        self.assertEqual(join_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(join_resp.data['participant_status'], ParticipantStatusChoices.PENDING)

        # Host accepts guest connection
        self.client.force_authenticate(user=self.host)
        approve_resp = self.client.post(
            f'/api/sessions/{session.id}/participants/{self.guest.id}/approve/',
            {'action': 'ACCEPT'}
        )
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_resp.data['status'], ParticipantStatusChoices.ACCEPTED)

        # Participant is now accepted
        participant = SessionParticipant.objects.get(session=session, user=self.guest)
        self.assertEqual(participant.status, ParticipantStatusChoices.ACCEPTED)

    @override_settings(VPN_ONLY_MODE=True, VPN_ALLOWED_SUBNETS=['10.8.0.0/24'], VPN_REQUIRED_HEADER='X-VPN-Gateway')
    def test_vpn_security_access_control(self):
        session = VirtualSession.objects.create(
            server=self.server,
            host=self.host,
            title='Sesión de Red Segura',
            scheduled_at=timezone.now(),
            status=SessionStatusChoices.ACTIVE
        )
        self.client.force_authenticate(user=self.guest)

        # 1. Non-VPN IP (e.g. public IP 203.0.113.10) without header -> 403 Forbidden
        unauth_resp = self.client.post(
            f'/api/sessions/{session.id}/join/',
            REMOTE_ADDR='203.0.113.10'
        )
        self.assertEqual(unauth_resp.status_code, status.HTTP_403_FORBIDDEN)

        # 2. VPN subnet IP (e.g. 10.8.0.45) -> 200 OK
        auth_vpn_resp = self.client.post(
            f'/api/sessions/{session.id}/join/',
            REMOTE_ADDR='10.8.0.45'
        )
        self.assertEqual(auth_vpn_resp.status_code, status.HTTP_200_OK)

        # 3. Via secure gateway header -> 200 OK
        auth_header_resp = self.client.post(
            f'/api/sessions/{session.id}/join/',
            REMOTE_ADDR='203.0.113.10',
            HTTP_X_VPN_GATEWAY='trusted-vpn-tunnel'
        )
        self.assertEqual(auth_header_resp.status_code, status.HTTP_200_OK)
