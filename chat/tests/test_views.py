from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from chat.models import Contact, ChatRoom

User = get_user_model()


class ChatViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            name='User One',
            password='pass123'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            name='User Two',
            password='pass123'
        )
        self.client.force_authenticate(user=self.user1)

    def test_contacts_api(self):
        """Test contacts list API"""
        Contact.objects.create(owner=self.user1, contact=self.user2)
        
        response = self.client.get('/chat/api/contacts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_add_user_api(self):
        """Test add user API"""
        response = self.client.post('/chat/api/add_user/', {
            'email': 'user2@example.com'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check contact was created
        contact_exists = Contact.objects.filter(
            owner=self.user1,
            contact=self.user2
        ).exists()
        self.assertTrue(contact_exists)

    def test_chat_history_api(self):
        """Test chat history API"""
        room = ChatRoom.get_or_create_room(self.user1, self.user2)
        
        response = self.client.get(f'/chat/api/with/{self.user2.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)