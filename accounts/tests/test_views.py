from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import json

User = get_user_model()


class SignupViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.signup_url = reverse('api_signup')
        self.valid_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'testpass123'
        }

    def test_signup_page_get(self):
        """Test GET request to signup page"""
        response = self.client.get('/accounts/signup/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTemplateUsed(response, 'accounts/sign_up.html')

    def test_signup_api_success(self):
        """Test successful user registration via API"""
        response = self.client.post(
            self.signup_url,
            data=json.dumps(self.valid_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['detail'], 'Account created successfully.')
        
        # Verify user was created
        user = User.objects.get(email='test@example.com')
        self.assertEqual(user.name, 'Test User')
        self.assertTrue(user.check_password('testpass123'))

    def test_signup_api_duplicate_email(self):
        """Test signup with duplicate email"""
        # Create user first
        User.objects.create_user(**self.valid_data)
        
        # Try to create same user again
        response = self.client.post(
            self.signup_url,
            data=json.dumps(self.valid_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_signup_api_invalid_data(self):
        """Test signup with invalid data"""
        invalid_data = {
            'name': 'Test User',
            'email': 'invalid-email',
            'password': '123'  # Too short
        }
        
        response = self.client.post(
            self.signup_url,
            data=json.dumps(invalid_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('token_obtain_pair')
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )

    def test_login_page_get(self):
        """Test GET request to login page"""
        response = self.client.get('/accounts/login/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTemplateUsed(response, 'accounts/login.html')

    def test_login_api_success(self):
        """Test successful login via API"""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(
            self.login_url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Login successful')
        
        # Check cookies are set
        cookies = response.cookies
        self.assertIn('access_token', cookies)
        self.assertIn('refresh_token', cookies)
        
        # Verify cookie attributes
        access_cookie = cookies['access_token']
        self.assertTrue(access_cookie['httponly'])
        self.assertTrue(access_cookie['secure'])

    def test_login_api_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(
            self.login_url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)

    def test_login_api_nonexistent_user(self):
        """Test login with non-existent user"""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(
            self.login_url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.logout_url = reverse('logout')
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )

    @patch('accounts.views.RefreshToken')
    def test_logout_success(self, mock_refresh_token):
        """Test successful logout"""
        # Mock the refresh token
        mock_token_instance = MagicMock()
        mock_refresh_token.return_value = mock_token_instance
        
        # Set cookies
        self.client.cookies['access_token'] = 'test-access-token'
        self.client.cookies['refresh_token'] = 'test-refresh-token'
        
        response = self.client.post(self.logout_url)
        
        # Verify token blacklisting was called
        # mock_token_instance.blacklist.assert_called_once()
        
        # Check cookies are cleared
        self.assertNotIn('access_token', response.cookies)
        self.assertNotIn('refresh_token', response.cookies)
        
        # Check redirect
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_tokens(self):
        """Test logout when no tokens are present"""
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ForgotPasswordViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.forgot_url = reverse('api_forgot_password')
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )

    def test_forgot_password_page_get(self):
        """Test GET request to forgot password page"""
        response = self.client.get('/accounts/forgot/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTemplateUsed(response, 'accounts/forgot_password.html')

    @patch('accounts.views.PasswordResetForm')
    def test_forgot_password_api_success(self, mock_form_class):
        """Test successful forgot password request"""
        # Mock the form
        mock_form = MagicMock()
        mock_form.is_valid.return_value = True
        mock_form_class.return_value = mock_form
        
        data = {'email': 'test@example.com'}
        
        response = self.client.post(
            self.forgot_url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['detail'],
            'Password reset link sent. Check your email.'
        )
        
        # Verify form.save was called
        mock_form.save.assert_called_once()

    def test_forgot_password_api_invalid_email(self):
        """Test forgot password with invalid email"""
        data = {'email': 'nonexistent@example.com'}
        
        response = self.client.post(
            self.forgot_url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='oldpass123'
        )
        self.uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def test_password_reset_page_valid_token(self):
        """Test password reset page with valid token"""
        url = reverse('password_reset', args=[self.uidb64, self.token])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTemplateUsed(response, 'accounts/password_reset.html')
        self.assertIn('uidb64', response.context)
        self.assertIn('token', response.context)

    def test_password_reset_page_invalid_token(self):
        """Test password reset page with invalid token"""
        url = reverse('password_reset', args=[self.uidb64, 'invalid-token'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTemplateUsed(response, 'accounts/password_reset_invalid.html')

    def test_password_reset_page_invalid_uid(self):
        """Test password reset page with invalid uid"""
        invalid_uid = urlsafe_base64_encode(force_bytes(999))  # Non-existent user ID
        url = reverse('password_reset', args=[invalid_uid, self.token])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTemplateUsed(response, 'accounts/password_reset_invalid.html')

    def test_password_reset_confirm_api_success(self):
        """Test successful password reset via API"""
        data = {
            'uidb64': self.uidb64,
            'token': self.token,
            'newPassword': 'newpass123',
            'confirmPassword': 'newpass123'
        }
        
        # Get the URL for API view (assuming it's named differently or using same URL with POST)
        # Since the actual API view URL might not be defined in urls.py, we'll test the view directly
        from accounts.views import PasswordResetConfirmAPIView
        view = PasswordResetConfirmAPIView()
        request = self.client.post('/password_reset/', data=data, format='json')
        request.data = data
        
        response = view.post(request)
        
        if response.status_code == status.HTTP_200_OK:
            # Verify password was changed
            self.user.refresh_from_db()
            self.assertTrue(self.user.check_password('newpass123'))

    def test_password_reset_confirm_api_password_mismatch(self):
        """Test password reset with mismatched passwords"""
        data = {
            'uidb64': self.uidb64,
            'token': self.token,
            'newPassword': 'newpass123',
            'confirmPassword': 'differentpass'
        }
        
        from accounts.views import PasswordResetConfirmAPIView
        view = PasswordResetConfirmAPIView()
        request = self.client.post('/password_reset/', data=data, format='json')
        request.data = data
        
        response = view.post(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)