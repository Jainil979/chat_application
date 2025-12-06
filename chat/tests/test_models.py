from django.test import TestCase
from django.contrib.auth import get_user_model
from chat.models import ChatRoom, Contact, ChatMessage

User = get_user_model()


class ChatModelTests(TestCase):
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

    def test_contact_creation(self):
        """Test creating a contact"""
        contact = Contact.objects.create(
            owner=self.user1,
            contact=self.user2
        )
        self.assertEqual(contact.owner, self.user1)
        self.assertEqual(contact.contact, self.user2)

    def test_chatroom_get_or_create(self):
        """Test get_or_create_room method"""
        room = ChatRoom.get_or_create_room(self.user1, self.user2)
        self.assertEqual(room.user_a, self.user1)
        self.assertEqual(room.user_b, self.user2)
        self.assertEqual(len(room.symmetric_key), 32)

    def test_chatmessage_creation(self):
        """Test creating a chat message"""
        room = ChatRoom.get_or_create_room(self.user1, self.user2)
        message = ChatMessage.objects.create(
            room=room,
            sender=self.user1,
            cipher='test-cipher'
        )
        self.assertEqual(message.sender, self.user1)
        self.assertEqual(message.room, room)
        self.assertEqual(message.cipher, 'test-cipher')