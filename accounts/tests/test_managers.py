
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


class CustomUserManagerTest(TestCase):
    def setUp(self):
        self.user_data = {
            'email': 'test@example.com',
            'name': 'Test User',
            'password': 'testpass123'
        }

    def test_create_user(self):
        """Test creating a regular user"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.name, 'Test User')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.profile_completed)

    def test_create_user_without_email(self):
        """Test creating user without email should raise error"""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email=None,
                name='Test User',
                password='testpass123'
            )

    def test_create_superuser(self):
        """Test creating a superuser"""
        admin_user = User.objects.create_superuser(
            email='admin@example.com',
            name='Admin User',
            password='adminpass123'
        )
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.is_active)

    def test_email_uniqueness(self):
        """Test email must be unique"""
        User.objects.create_user(**self.user_data)
        with self.assertRaises(Exception):
            User.objects.create_user(
                email='test@example.com',
                name='Another User',
                password='pass123'
            )

    def test_create_user_normalization(self):
        """Test email normalization"""
        email = 'Test@Example.COM'
        user = User.objects.create_user(
            email=email,
            name='Test User',
            password='testpass123'
        )
        # Note: Django's normalize_email only lowercases the domain part
        self.assertEqual(user.email, 'Test@example.com')

    def test_create_user_extra_fields(self):
        """Test creating user with extra fields"""
        user = User.objects.create_user(
            email='test2@example.com',
            name='Test User 2',
            password='testpass123',
            is_active=False
        )
        self.assertFalse(user.is_active)

    def test_create_superuser_defaults(self):
        """Test superuser creation with default permissions"""
        admin = User.objects.create_superuser(
            email='admin@example.com',
            name='Admin',
            password='adminpass123'
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_active)

    def test_create_superuser_override_defaults(self):
        """Test superuser creation overriding defaults"""
        admin = User.objects.create_superuser(
            email='admin2@example.com',
            name='Admin 2',
            password='adminpass123',
            is_staff=True,
            is_superuser=True
        )
        # Should still be True because create_superuser sets them
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)