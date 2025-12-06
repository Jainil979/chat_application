from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.authentication import CookieJWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APIRequestFactory
from unittest.mock import patch

User = get_user_model()


class CookieJWTAuthenticationTest(TestCase):
    def setUp(self):
        self.auth = CookieJWTAuthentication()
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )
        self.refresh = RefreshToken.for_user(self.user)
        self.access_token = str(self.refresh.access_token)

    def test_authenticate_with_valid_token(self):
        """Test authentication with valid access token in cookies"""
        request = self.factory.get('/')
        request.COOKIES['access_token'] = self.access_token
        
        auth_result = self.auth.authenticate(request)
        
        self.assertIsNotNone(auth_result)
        user, token = auth_result
        self.assertEqual(user, self.user)
        self.assertEqual(token['token_type'], 'access')

    def test_authenticate_without_token(self):
        """Test authentication without access token"""
        request = self.factory.get('/')
        
        auth_result = self.auth.authenticate(request)
        
        self.assertIsNone(auth_result)


    def test_authenticate_with_expired_token(self):
        """Test authentication with expired token"""
        from rest_framework_simplejwt.exceptions import TokenError
        
        # Create an expired token (mocking)
        with patch('accounts.authentication.JWTAuthentication.get_validated_token') as mock_validate:
            mock_validate.side_effect = TokenError('Token is expired')
            
            request = self.factory.get('/')
            request.COOKIES['access_token'] = 'expired-token'
            
            auth_result = self.auth.authenticate(request)
            
            self.assertIsNone(auth_result)

    def test_authenticate_token_without_cookie_key(self):
        """Test authentication when cookie key doesn't exist"""
        request = self.factory.get('/')
        # No cookies set
        
        auth_result = self.auth.authenticate(request)
        
        self.assertIsNone(auth_result)