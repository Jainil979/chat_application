from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import CustomUser, Profile
from django.core.exceptions import ValidationError

User = get_user_model()


class CustomUserModelTest(TestCase):
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

    def test_string_representation(self):
        """Test string representation of user"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(str(user), 'Test User')

    def test_get_full_name(self):
        """Test get_full_name method"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.get_full_name(), 'Test User')


class ProfileModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )
        self.profile = Profile.objects.create(
            user=self.user,
            presence='available',
            about_me='Test about me',
            show_online=True,
            show_last_seen=True,
            show_typing=True
        )

    def test_profile_creation(self):
        """Test profile creation and default values"""
        self.assertEqual(self.profile.user, self.user)
        self.assertEqual(self.profile.presence, 'available')
        self.assertEqual(self.profile.about_me, 'Test about me')
        self.assertTrue(self.profile.show_online)
        self.assertTrue(self.profile.show_last_seen)
        self.assertTrue(self.profile.show_typing)

    def test_profile_string_representation(self):
        """Test string representation of profile"""
        self.assertEqual(str(self.profile), 'Test User Profile')

    def test_name_for_display_property(self):
        """Test name_for_display property"""
        self.assertEqual(self.profile.name_for_display, 'Test User')

    def test_avatar_url_property_without_avatar(self):
        """Test avatar_url property when no avatar is set"""
        self.assertIsNone(self.profile.avatar_url)

    def test_profile_choices(self):
        """Test presence choices"""
        self.assertEqual(
            self.profile.Presence.AVAILABLE, 'available'
        )
        self.assertEqual(
            self.profile.Presence.BUSY, 'busy'
        )
        self.assertEqual(
            self.profile.Presence.DO_NOT_DISTURB, 'do_not_disturb'
        )

    def test_profile_presence_update(self):
        """Test updating profile presence"""
        self.profile.presence = 'busy'
        self.profile.save()
        self.assertEqual(self.profile.presence, 'busy')