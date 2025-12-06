
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class EventObserver(ABC):
    """Observer interface for chat events"""
    
    @abstractmethod
    def notify(self, event_type: str, data: Dict[str, Any]):
        pass


class DatabaseLoggerObserver(EventObserver):
    """Observer that logs events to database (NOT WebSocket)"""
    
    def notify(self, event_type: str, data: Dict[str, Any]):
        """Log events to database - NO WebSocket sending here!"""
        try:
            if event_type == 'message_created':
                self._log_message(data)
            elif event_type == 'typing_event':
                self._log_typing(data)
            elif event_type == 'user_presence':
                self._log_presence(data)
        except Exception as e:
            print(f"DatabaseLoggerObserver error: {e}")
    
    def _log_message(self, data: Dict[str, Any]):
        """Log message to database for analytics"""
        from .models import ChatMessage
        message_id = data.get('message_id')
        if message_id:
            try:
                # Just log to console for now
                print(f"DatabaseLoggerObserver: Message {message_id} logged")
            except:
                pass
    
    def _log_typing(self, data: Dict[str, Any]):
        """Log typing event to console"""
        print(f"DatabaseLoggerObserver: Typing event logged - User {data.get('user_id')}")
    
    def _log_presence(self, data: Dict[str, Any]):
        """Log presence change to console"""
        status = "online" if data.get('online') else "offline"
        print(f"DatabaseLoggerObserver: User {data.get('user_id')} is {status}")


class NotificationLoggerObserver(EventObserver):
    """Observer that logs notifications (NOT WebSocket)"""
    
    def notify(self, event_type: str, data: Dict[str, Any]):
        """Log notification events - NO WebSocket sending here!"""
        if event_type == 'message_created':
            self._log_notification(data)
    
    def _log_notification(self, data: Dict[str, Any]):
        """Log notification for analytics"""
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        message_type = data.get('message_type', 'text')
        
        print(f"NotificationLoggerObserver: Notification logged - User {sender_id} -> User {receiver_id} ({message_type})")


class EventManager:
    """Manages observers and notifies them of events"""
    
    def __init__(self):
        self._observers: List[EventObserver] = []
        # Add default observers
        self.add_observer(DatabaseLoggerObserver())
        self.add_observer(NotificationLoggerObserver())
    
    def add_observer(self, observer: EventObserver):
        """Add an observer"""
        if observer not in self._observers:
            self._observers.append(observer)
    
    def remove_observer(self, observer: EventObserver):
        """Remove an observer"""
        if observer in self._observers:
            self._observers.remove(observer)
    
    def notify_all(self, event_type: str, data: Dict[str, Any]):
        """Notify all observers of an event"""
        for observer in self._observers:
            try:
                observer.notify(event_type, data)
            except Exception as e:
                # Log error but don't break
                print(f"Observer {observer.__class__.__name__} error: {e}")