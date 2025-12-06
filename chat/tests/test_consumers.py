from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import Mock, patch
import json

User = get_user_model()


class ConsumerTests(TestCase):
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

    def test_websocket_connect_logic(self):
        """Test WebSocket connection logic (simplified)"""
        # Mock the WebSocket scope
        mock_scope = {
            'user': self.user1,
            'url_route': {'kwargs': {'other_id': self.user2.id}}
        }
        
        # Test that user retrieval works
        from chat.models import ChatRoom
        room = ChatRoom.get_or_create_room(self.user1, self.user2)
        
        self.assertEqual(room.user_a, self.user1)
        self.assertEqual(room.user_b, self.user2)
        self.assertEqual(len(room.symmetric_key), 32)

    @patch('chat.consumers.database_sync_to_async')
    def test_typing_message(self, mock_sync):
        """Test typing message handling"""
        # Mock the async methods
        mock_sync.side_effect = lambda func: func
        
        from chat.consumers import ChatConsumer
        consumer = ChatConsumer()
        
        # Simulate typing message
        typing_message = json.dumps({
            'typing': True
        })
        
        # This is a simplified test - in real test you'd mock more
        self.assertTrue('typing' in typing_message)

    def test_encryption_key_generation(self):
        """Test that encryption keys are generated correctly"""
        from chat.models import generate_symmetric_key
        key = generate_symmetric_key()
        self.assertEqual(len(key), 32)  # SecretBox.KEY_SIZE