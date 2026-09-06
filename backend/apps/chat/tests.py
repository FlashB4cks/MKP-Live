from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from chat.models import DMConversation, DirectMessage

User = get_user_model()

class DirectMessageTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='alice', email='alice@example.com', password='password123')
        self.user2 = User.objects.create_user(username='bob', email='bob@example.com', password='password123')
        self.user3 = User.objects.create_user(username='charlie', email='charlie@example.com', password='password123')

    def test_create_and_list_dm_conversation(self):
        self.client.force_authenticate(user=self.user1)

        # 1. Create DM conversation with user2
        res = self.client.post('/api/chat/dms/', {'target_user_id': str(self.user2.id)})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        conv_id = res.data['id']
        self.assertIsNotNone(conv_id)

        # 2. Posting again returns the existing conversation
        res_repeat = self.client.post('/api/chat/dms/', {'target_user_id': str(self.user2.id)})
        self.assertEqual(res_repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(res_repeat.data['id'], conv_id)

        # 3. List conversations for user1
        res_list = self.client.get('/api/chat/dms/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)
        self.assertEqual(res_list.data[0]['id'], conv_id)
        self.assertEqual(res_list.data[0]['other_user']['username'], 'bob')

    def test_send_and_retrieve_dm_messages(self):
        conv = DMConversation.objects.create()
        conv.participants.add(self.user1, self.user2)

        # Alice sends a message
        self.client.force_authenticate(user=self.user1)
        send_res = self.client.post(f'/api/chat/dms/{conv.id}/messages/', {'content': 'Hola Bob!'})
        self.assertEqual(send_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(send_res.data['content'], 'Hola Bob!')
        self.assertEqual(send_res.data['sender']['username'], 'alice')

        # Bob logs in and views messages
        self.client.force_authenticate(user=self.user2)
        get_res = self.client.get(f'/api/chat/dms/{conv.id}/messages/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_res.data), 1)
        self.assertEqual(get_res.data[0]['content'], 'Hola Bob!')

        # Bob replies
        reply_res = self.client.post(f'/api/chat/dms/{conv.id}/messages/', {'content': 'Hola Alice, todo bien!'})
        self.assertEqual(reply_res.status_code, status.HTTP_201_CREATED)

        # Alice reads messages
        self.client.force_authenticate(user=self.user1)
        alice_get = self.client.get(f'/api/chat/dms/{conv.id}/messages/')
        self.assertEqual(len(alice_get.data), 2)

    def test_dm_privacy_permissions(self):
        conv = DMConversation.objects.create()
        conv.participants.add(self.user1, self.user2)

        # Charlie (user3) attempts to access Alice and Bob's private conversation
        self.client.force_authenticate(user=self.user3)
        res_get = self.client.get(f'/api/chat/dms/{conv.id}/messages/')
        self.assertEqual(res_get.status_code, status.HTTP_403_FORBIDDEN)

        res_post = self.client.post(f'/api/chat/dms/{conv.id}/messages/', {'content': 'Hacking chat'})
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_search(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.get('/api/chat/users/?q=bob')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['username'], 'bob')
