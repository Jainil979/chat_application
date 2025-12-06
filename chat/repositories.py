from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Set
from django.db.models import QuerySet
from .models import ChatRoom, ChatMessage, Contact
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django_redis import get_redis_connection
import json

User = get_user_model()

ONLINE_KEY = "online_users"


class BaseRepository(ABC):
    """Abstract base repository"""
    
    @abstractmethod
    def get_by_id(self, pk: int):
        pass
    
    @abstractmethod
    def filter(self, **kwargs) -> QuerySet:
        pass


class ChatRoomRepository(BaseRepository):
    """Repository for ChatRoom operations"""
    
    def __init__(self):
        self.model = ChatRoom
    
    def get_by_id(self, room_id: int) -> Optional[ChatRoom]:
        """Get room by ID"""
        try:
            return self.model.objects.select_related('user_a', 'user_b').get(id=room_id)
        except self.model.DoesNotExist:
            return None
    
    def filter(self, **kwargs) -> QuerySet:
        return self.model.objects.filter(**kwargs).select_related('user_a', 'user_b')
    
    def get_or_create_room(self, user_a: Any, user_b: Any) -> ChatRoom:
        """Get or create chat room between two users (compatible with existing code)"""
        if user_a.id > user_b.id:
            user_a, user_b = user_b, user_a
        
        room, created = self.model.objects.get_or_create(
            user_a=user_a,
            user_b=user_b
        )
        
        return room
    
    def get_room_for_users(self, user_a: Any, user_b: Any) -> Optional[ChatRoom]:
        """Get room between two users"""
        return self.model.objects.filter(
            user_a=user_a, user_b=user_b
        ).select_related('user_a', 'user_b').first()


class ChatMessageRepository(BaseRepository):
    """Repository for ChatMessage operations"""
    
    def __init__(self):
        self.model = ChatMessage
    
    def get_by_id(self, message_id: int) -> Optional[ChatMessage]:
        try:
            return self.model.objects.select_related('sender', 'room').get(id=message_id)
        except self.model.DoesNotExist:
            return None
    
    def filter(self, **kwargs) -> QuerySet:
        return self.model.objects.filter(**kwargs).select_related('sender', 'room')
    
    def get_room_messages(self, room_id: int, limit: int = 100) -> QuerySet:
        """Get messages for a room"""
        return self.model.objects.filter(
            room_id=room_id
        ).select_related('sender').order_by('timestamp')[:limit]
    
    def create_message(self, room: ChatRoom, sender: Any, cipher: str = '', 
                      attachment=None, attachment_url: str = None) -> ChatMessage:
        """Create a new message"""
        return self.model.objects.create(
            room=room,
            sender=sender,
            cipher=cipher,
            attachment=attachment,
            attachment_url=attachment_url
        )


class ContactRepository(BaseRepository):
    """Repository for Contact operations"""
    
    def __init__(self):
        self.model = Contact
    
    def get_by_id(self, contact_id: int) -> Optional[Contact]:
        try:
            return self.model.objects.select_related('owner', 'contact').get(id=contact_id)
        except self.model.DoesNotExist:
            return None
    
    def filter(self, **kwargs) -> QuerySet:
        return self.model.objects.filter(**kwargs).select_related('owner', 'contact', 'contact__profile')
    
    def get_user_contacts(self, user: Any) -> QuerySet:
        """Get all contacts for a user"""
        return self.model.objects.filter(owner=user).select_related(
            'contact', 
            'contact__profile'
        )
    
    def create_contact(self, owner: Any, contact_user: Any) -> Contact:
        """Create a new contact"""
        return self.model.objects.create(owner=owner, contact=contact_user)
    
    def get_or_create_contact(self, owner: Any, contact_user: Any) -> tuple:
        """Get or create contact"""
        return self.model.objects.get_or_create(owner=owner, contact=contact_user)


class PresenceRepository:
    """Repository for managing user presence/online status"""
    
    def __init__(self):
        self.redis = get_redis_connection("default")
        self.online_key = ONLINE_KEY
    
    def set_online(self, user_id: int):
        """Mark user as online"""
        self.redis.sadd(self.online_key, user_id)
    
    def set_offline(self, user_id: int):
        """Mark user as offline"""
        self.redis.srem(self.online_key, user_id)
    
    def is_online(self, user_id: int) -> bool:
        """Check if user is online"""
        return self.redis.sismember(self.online_key, user_id)
    
    def get_online_users(self) -> Set[int]:
        """Get all online user IDs"""
        members = self.redis.smembers(self.online_key)
        return {int(x) for x in members if x}
    
    def get_online_count(self) -> int:
        """Get count of online users"""
        return self.redis.scard(self.online_key)


