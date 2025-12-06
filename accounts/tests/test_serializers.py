from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.serializers import (
    SignupSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    PasswordResetConfirmSerializer
)
from rest_framework.exceptions import ValidationError
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

User = get_user_model()


class SignupSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'testpass123'
        }

    def test_valid_signup_serializer(self):
        """Test valid signup data"""
        serializer = SignupSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())

    def test_signup_serializer_missing_fields(self):
        """Test signup serializer with missing fields"""
        data = {'name': 'Test User', 'email': 'test@example.com'}
        serializer = SignupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)

    def test_signup_serializer_duplicate_email(self):
        """Test signup with duplicate email"""
        User.objects.create_user(**self.valid_data)
        serializer = SignupSerializer(data=self.valid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_signup_serializer_create_user(self):
        """Test user creation through serializer"""
        serializer = SignupSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.name, 'Test User')
        self.assertTrue(user.check_password('testpass123'))

    def test_signup_serializer_password_write_only(self):
        """Test password field is write-only"""
        serializer = SignupSerializer(data=self.valid_data)
        serializer.is_valid()
        self.assertNotIn('password', serializer.data)


class LoginSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )
        self.valid_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }

    def test_valid_login_serializer(self):
        """Test valid login credentials"""
        serializer = LoginSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
        data = serializer.validated_data
        self.assertIn('access', data)
        self.assertIn('refresh', data)
        self.assertIn('user', data)
        self.assertEqual(data['user'], self.user)

    def test_invalid_login_serializer(self):
        """Test invalid login credentials"""
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        serializer = LoginSerializer(data=data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_nonexistent_user_login(self):
        """Test login with non-existent user"""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        }
        serializer = LoginSerializer(data=data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_inactive_user_login(self):
        """Test login with inactive user"""
        self.user.is_active = False
        self.user.save()
        serializer = LoginSerializer(data=self.valid_data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)


class ForgotPasswordSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )

    def test_valid_email(self):
        """Test valid email for password reset"""
        data = {'email': 'test@example.com'}
        serializer = ForgotPasswordSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_invalid_email_format(self):
        """Test invalid email format"""
        data = {'email': 'invalid-email'}
        serializer = ForgotPasswordSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_nonexistent_email(self):
        """Test non-existent email"""
        data = {'email': 'nonexistent@example.com'}
        serializer = ForgotPasswordSerializer(data=data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_inactive_user_email(self):
        """Test email of inactive user"""
        self.user.is_active = False
        self.user.save()
        data = {'email': 'test@example.com'}
        serializer = ForgotPasswordSerializer(data=data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)


class PasswordResetConfirmSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='oldpass123'
        )
        self.uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_valid_reset_data(self):
        """Test valid password reset data"""
        data = {
            'uidb64': self.uidb64,
            'token': self.token,
            'newPassword': 'newpass123',
            'confirmPassword': 'newpass123'
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_password_mismatch(self):
        """Test password mismatch"""
        data = {
            'uidb64': self.uidb64,
            'token': self.token,
            'newPassword': 'newpass123',
            'confirmPassword': 'differentpass'
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_invalid_uidb64(self):
        """Test invalid uidb64"""
        data = {
            'uidb64': 'invalid',
            'token': self.token,
            'newPassword': 'newpass123',
            'confirmPassword': 'newpass123'
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_invalid_token(self):
        """Test invalid token"""
        data = {
            'uidb64': self.uidb64,
            'token': 'invalid-token',
            'newPassword': 'newpass123',
            'confirmPassword': 'newpass123'
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_save_method(self):
        """Test serializer save method updates password"""
        old_password_hash = self.user.password
        data = {
            'uidb64': self.uidb64,
            'token': self.token,
            'newPassword': 'newpass123',
            'confirmPassword': 'newpass123'
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        
        # Refresh user from database
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.password, old_password_hash)
        self.assertTrue(self.user.check_password('newpass123'))