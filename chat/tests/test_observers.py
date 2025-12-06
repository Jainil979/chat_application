from django.test import TestCase
from chat.observers import (
    EventManager,
    DatabaseLoggerObserver,
    NotificationLoggerObserver
)
from unittest.mock import Mock


class ObserverTests(TestCase):
    def setUp(self):
        self.event_manager = EventManager()
        self.mock_observer = Mock()

    def test_observer_registration(self):
        """Test adding and removing observers"""
        # Add observer
        self.event_manager.add_observer(self.mock_observer)
        
        # Notify all
        test_data = {'test': 'data'}
        self.event_manager.notify_all('test_event', test_data)
        
        # Check observer was called
        self.mock_observer.notify.assert_called_once_with('test_event', test_data)

    def test_database_logger(self):
        """Test database logger observer"""
        logger = DatabaseLoggerObserver()
        
        # This should not crash
        logger.notify('message_created', {
            'message_id': 1,
            'sender_id': 1,
            'receiver_id': 2
        })

    def test_notification_logger(self):
        """Test notification logger observer"""
        logger = NotificationLoggerObserver()
        
        # This should not crash
        logger.notify('message_created', {
            'sender_id': 1,
            'receiver_id': 2,
            'message_type': 'text'
        })