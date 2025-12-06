from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from chat.serializers import ContactSerializer, AddUserSerializer, ProfileSerializer
from accounts.models import Profile

User = get_user_model()


class SerializerTests(TestCase):
    def setUp(self):
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
        self.factory = APIRequestFactory()

    def test_contact_serializer(self):
        """Test contact serializer"""
        from chat.models import Contact
        contact = Contact.objects.create(owner=self.user1, contact=self.user2)
        contact.is_online = True  # Simulate online status
        
        request = self.factory.get('/')
        serializer = ContactSerializer(
            contact,
            context={'request': request}
        )
        
        data = serializer.data
        self.assertEqual(data['contact_id'], self.user2.id)
        self.assertEqual(data['name'], 'User Two')

    def test_add_user_serializer_valid(self):
        """Test adding valid user"""
        request = self.factory.post('/')
        request.user = self.user1
        
        serializer = AddUserSerializer(
            data={'email': 'user2@example.com'},
            context={'request': request}
        )
        self.assertTrue(serializer.is_valid())

    def test_add_user_serializer_invalid_self(self):
        """Test adding yourself"""
        request = self.factory.post('/')
        request.user = self.user1
        
        serializer = AddUserSerializer(
            data={'email': 'user1@example.com'},
            context={'request': request}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)