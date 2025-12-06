from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import nacl.utils
from nacl.secret import SecretBox
import base64


class MessageEncryptionStrategy(ABC):
    """Strategy interface for message encryption/decryption"""
    
    @abstractmethod
    def encrypt(self, plaintext: str, key: bytes) -> str:
        pass
    
    @abstractmethod
    def decrypt(self, ciphertext: str, key: bytes) -> str:
        pass


class SecretBoxEncryptionStrategy(MessageEncryptionStrategy):
    """NaCl SecretBox encryption strategy"""
    
    def encrypt(self, plaintext: str, key: bytes) -> str:
        """Encrypt plaintext using SecretBox"""
        box = SecretBox(key)
        nonce = nacl.utils.random(SecretBox.NONCE_SIZE)
        cipher = box.encrypt(plaintext.encode(), nonce)
        return base64.b64encode(cipher).decode()
    
    def decrypt(self, ciphertext: str, key: bytes) -> str:
        """Decrypt ciphertext using SecretBox"""
        box = SecretBox(key)
        cipher = base64.b64decode(ciphertext.encode())
        plaintext = box.decrypt(cipher)
        return plaintext.decode()


class MessageProcessingStrategy(ABC):
    """Strategy interface for different message processing"""
    
    @abstractmethod
    def process(self, data: Dict[str, Any], room, sender, 
                encryption_strategy: MessageEncryptionStrategy) -> Dict[str, Any]:
        pass


class TextMessageStrategy(MessageProcessingStrategy):
    """Strategy for text messages"""
    
    def process(self, data: Dict[str, Any], room, sender, 
                encryption_strategy: MessageEncryptionStrategy) -> Dict[str, Any]:
        """Process text message - encrypt it"""
        plaintext = data.get('text', '')
        cipher = encryption_strategy.encrypt(plaintext, bytes(room.symmetric_key))
        
        return {
            'type': 'text',
            'cipher': cipher,
            'plaintext': plaintext,
            'sender_id': sender.id
        }


class AttachmentMessageStrategy(MessageProcessingStrategy):
    """Strategy for attachment messages"""
    
    def process(self, data: Dict[str, Any], room, sender, 
                encryption_strategy: MessageEncryptionStrategy) -> Dict[str, Any]:
        """Process attachment message"""
        attachment_url = data.get('attachment_url', '')
        
        # Check if it's audio
        url_lower = attachment_url.lower()
        is_audio = any(url_lower.endswith(ext) for ext in ['.webm', '.ogg', '.mp3', '.wav'])
        
        return {
            'type': 'attachment',
            'attachment_url': attachment_url,
            'sender_id': sender.id,
            'audio': is_audio
        }


class TypingIndicatorStrategy(MessageProcessingStrategy):
    """Strategy for typing indicators"""
    
    def process(self, data: Dict[str, Any], room, sender, 
                encryption_strategy: MessageEncryptionStrategy) -> Dict[str, Any]:
        """Process typing indicator"""
        return {
            'type': 'typing',
            'typing': data.get('typing', False),
            'sender_id': sender.id
        }


class MessageStrategyFactory:
    """Factory to get appropriate message strategy"""
    
    @staticmethod
    def get_strategy(data: Dict[str, Any]) -> Optional[MessageProcessingStrategy]:
        """Get appropriate strategy based on message data"""
        if 'typing' in data:
            return TypingIndicatorStrategy()
        elif 'attachment_url' in data:
            return AttachmentMessageStrategy()
        elif 'text' in data:
            return TextMessageStrategy()
        return None


