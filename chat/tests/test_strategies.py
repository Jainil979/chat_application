from django.test import TestCase

from unittest.mock import Mock

from chat.strategies import (
    MessageStrategyFactory,
    TextMessageStrategy,
    TypingIndicatorStrategy,
    AttachmentMessageStrategy,
    SecretBoxEncryptionStrategy
)
import base64
import nacl.utils
from nacl.secret import SecretBox


class StrategyTests(TestCase):
    def setUp(self):
        self.encryption = SecretBoxEncryptionStrategy()
        self.key = nacl.utils.random(SecretBox.KEY_SIZE)

    def test_text_message_strategy(self):
        """Test text message strategy"""
        strategy = TextMessageStrategy()
        data = {'text': 'Hello World'}
        
        # Mock room and sender
        mock_room = Mock()
        mock_room.symmetric_key = self.key
        mock_sender = Mock()
        mock_sender.id = 1
        
        result = strategy.process(data, mock_room, mock_sender, self.encryption)
        
        self.assertEqual(result['type'], 'text')
        self.assertIn('cipher', result)

    def test_typing_strategy(self):
        """Test typing strategy"""
        strategy = TypingIndicatorStrategy()
        data = {'typing': True}
        
        mock_room = Mock()
        mock_sender = Mock()
        mock_sender.id = 1
        
        result = strategy.process(data, mock_room, mock_sender, self.encryption)
        
        self.assertEqual(result['type'], 'typing')
        self.assertTrue(result['typing'])

    def test_strategy_factory(self):
        """Test strategy factory"""
        # Test text message detection
        text_data = {'text': 'Hello'}
        strategy = MessageStrategyFactory.get_strategy(text_data)
        self.assertIsInstance(strategy, TextMessageStrategy)
        
        # Test typing detection
        typing_data = {'typing': True}
        strategy = MessageStrategyFactory.get_strategy(typing_data)
        self.assertIsInstance(strategy, TypingIndicatorStrategy)

    def test_encryption_decryption(self):
        """Test encryption and decryption"""
        plaintext = "Secret Message"
        cipher = self.encryption.encrypt(plaintext, self.key)
        decrypted = self.encryption.decrypt(cipher, self.key)
        
        self.assertEqual(decrypted, plaintext)
        self.assertNotEqual(cipher, plaintext)