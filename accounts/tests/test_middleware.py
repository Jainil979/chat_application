from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from accounts.middleware import RefreshOnExpiredMiddleware
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import Mock, patch

User = get_user_model()


class RefreshOnExpiredMiddlewareTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = RefreshOnExpiredMiddleware(Mock())
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123'
        )
        self.refresh = RefreshToken.for_user(self.user)
        self.access_token = str(self.refresh.access_token)

    def get_middleware_response(self, request):
        """Helper to execute middleware and get response"""
        mock_get_response = Mock()
        mock_get_response.return_value = Mock()
        middleware = RefreshOnExpiredMiddleware(mock_get_response)
        return middleware(request)

    def test_admin_path_skipped(self):
        """Test that admin paths are skipped"""
        request = self.factory.get('/admin/')
        request.COOKIES = {}
        
        response = self.get_middleware_response(request)
        
        # Should just pass through without authentication
        self.assertFalse(hasattr(request, '_new_access_token'))

    def test_valid_access_token(self):
        """Test with valid access token"""
        request = self.factory.get('/chat/')
        request.COOKIES['access_token'] = self.access_token
        
        self.get_middleware_response(request)
        
        self.assertEqual(request.user, self.user)
        self.assertFalse(request.user.is_anonymous)

    def test_expired_access_valid_refresh(self):
        """Test with expired access token but valid refresh token"""
        request = self.factory.get('/chat/')
        request.COOKIES['access_token'] = 'expired-token'
        request.COOKIES['refresh_token'] = str(self.refresh)
        
        response = self.get_middleware_response(request)
        
        # Should set new access token
        self.assertTrue(hasattr(request, '_new_access_token'))
        self.assertEqual(request.user, self.user)
        
        # Check that cookie is set in response
        self.assertTrue(response.set_cookie.called)

    def test_invalid_refresh_token(self):
        """Test with invalid refresh token"""
        request = self.factory.get('/chat/')
        request.COOKIES['access_token'] = 'expired-token'
        request.COOKIES['refresh_token'] = 'invalid-refresh'
        
        self.get_middleware_response(request)
        
        self.assertIsInstance(request.user, AnonymousUser)
        self.assertFalse(hasattr(request, '_new_access_token'))

    def test_no_tokens_anonymous(self):
        """Test with no tokens results in anonymous user"""
        request = self.factory.get('/chat/')
        request.COOKIES = {}
        
        self.get_middleware_response(request)
        
        self.assertIsInstance(request.user, AnonymousUser)
        self.assertTrue(request.user.is_anonymous)


    @patch('accounts.middleware.redirect')
    def test_protected_path_redirect(self, mock_redirect):
        """Test that anonymous users are redirected from protected paths"""
        mock_redirect.return_value = Mock()
        
        request = self.factory.get('/chat/')
        request.COOKIES = {}
        
        response = self.get_middleware_response(request)
        
        # Should call redirect
        mock_redirect.assert_called_once()


    def test_middleware_chain_continuation(self):
        """Test that middleware continues to next middleware/view"""
        mock_response = Mock()
        mock_get_response = Mock(return_value=mock_response)
        middleware = RefreshOnExpiredMiddleware(mock_get_response)
        
        request = self.factory.get('/some-path/')
        
        response = middleware(request)
        
        # Should call the next middleware/view
        mock_get_response.assert_called_once_with(request)
        self.assertEqual(response, mock_response)