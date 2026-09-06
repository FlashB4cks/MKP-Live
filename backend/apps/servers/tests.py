from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from servers.models import Server, ServerMember, Invite, RoleChoices
from channels_app.models import Channel
from chat.models import Message

User = get_user_model()

class DiscordCloneAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="StrongPassword123!"
        )
        self.user2 = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="StrongPassword123!"
        )

    def test_user_login(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'alice',
            'password': 'StrongPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'alice')

    def test_create_server_creates_member_and_general_channel(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/servers/', {
            'name': 'Servidor de Alice',
            'description': 'Comunidad de prueba'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        server_id = response.data['id']

        # Verify ServerMember was created with role OWNER
        member = ServerMember.objects.get(server_id=server_id, user=self.user1)
        self.assertEqual(member.role, RoleChoices.OWNER)

        # Verify default channel #general was created
        general_channel = Channel.objects.get(server_id=server_id, name='general')
        self.assertIsNotNone(general_channel)

    def test_invite_and_join_flow(self):
        # Alice creates server
        self.client.force_authenticate(user=self.user1)
        server_resp = self.client.post('/api/servers/', {'name': 'Gaming Club'})
        server_id = server_resp.data['id']

        # Alice creates invite
        invite_resp = self.client.post(f'/api/servers/{server_id}/invites/', {
            'max_uses': 5
        })
        self.assertEqual(invite_resp.status_code, status.HTTP_201_CREATED)
        invite_code = invite_resp.data['code']

        # Bob joins via invite code
        self.client.force_authenticate(user=self.user2)
        join_resp = self.client.post('/api/servers/join/', {
            'invite_code': invite_code
        })
        self.assertEqual(join_resp.status_code, status.HTTP_201_CREATED)

        # Verify Bob is now a MEMBER
        bob_member = ServerMember.objects.get(server_id=server_id, user=self.user2)
        self.assertEqual(bob_member.role, RoleChoices.MEMBER)

        # Verify invite uses_count incremented
        invite = Invite.objects.get(code=invite_code)
        self.assertEqual(invite.uses_count, 1)

    def test_create_message_and_retrieve_history(self):
        # Alice creates server and general channel exists
        self.client.force_authenticate(user=self.user1)
        server_resp = self.client.post('/api/servers/', {'name': 'Chat Server'})
        server_id = server_resp.data['id']
        channel = Channel.objects.get(server_id=server_id, name='general')

        # Create message directly in model
        Message.objects.create(
            channel=channel,
            author=self.user1,
            content="¡Hola a todos en el canal!"
        )

        # Retrieve messages via API
        msg_resp = self.client.get(f'/api/chat/messages/?channel={channel.id}')
        self.assertEqual(msg_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(msg_resp.data), 1)
        self.assertEqual(msg_resp.data[0]['content'], "¡Hola a todos en el canal!")
        self.assertEqual(msg_resp.data[0]['author']['username'], "alice")

    def test_delete_channel_permissions(self):
        self.client.force_authenticate(user=self.user1)
        server_resp = self.client.post('/api/servers/', {'name': 'Server Test'})
        server_id = server_resp.data['id']
        server = Server.objects.get(id=server_id)

        # Alice creates a channel
        channel = Channel.objects.create(server=server, name='random')

        # Bob joins as member
        ServerMember.objects.create(server=server, user=self.user2, role=RoleChoices.MEMBER)

        # Bob attempts to delete channel -> 403
        self.client.force_authenticate(user=self.user2)
        delete_resp = self.client.delete(f'/api/channels/{channel.id}/')
        self.assertEqual(delete_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Channel.objects.filter(id=channel.id).exists())

        # Alice (owner) deletes channel -> 204
        self.client.force_authenticate(user=self.user1)
        delete_resp = self.client.delete(f'/api/channels/{channel.id}/')
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Channel.objects.filter(id=channel.id).exists())

    def test_delete_server_permissions(self):
        self.client.force_authenticate(user=self.user1)
        server_resp = self.client.post('/api/servers/', {'name': 'Server To Delete'})
        server_id = server_resp.data['id']
        server = Server.objects.get(id=server_id)

        # Bob joins
        ServerMember.objects.create(server=server, user=self.user2, role=RoleChoices.MEMBER)

        # Bob tries to delete server -> 403
        self.client.force_authenticate(user=self.user2)
        delete_resp = self.client.delete(f'/api/servers/{server_id}/')
        self.assertEqual(delete_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Server.objects.filter(id=server_id).exists())

        # Alice (owner) deletes server -> 204
        self.client.force_authenticate(user=self.user1)
        delete_resp = self.client.delete(f'/api/servers/{server_id}/')
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Server.objects.filter(id=server_id).exists())

