from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import json

User = get_user_model()


class AuthenticationIntegrationTest(TestCase):
    """Integration tests covering complete authentication flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.signup_url = reverse('api_signup')
        self.login_url = reverse('token_obtain_pair')
        self.logout_url = reverse('logout')
        self.chat_url = '/chat/'  # Assuming this is a protected URL

    def test_complete_auth_flow(self):
        """Test complete authentication flow: signup → login → access protected resource → logout"""
        
        # 1. Sign up
        signup_data = {
            'name': 'Integration User',
            'email': 'integration@example.com',
            'password': 'integration123'
        }
        
        signup_response = self.client.post(
            self.signup_url,
            data=json.dumps(signup_data),
            content_type='application/json'
        )
        self.assertEqual(signup_response.status_code, status.HTTP_201_CREATED)
        
        # 2. Login
        login_data = {
            'email': 'integration@example.com',
            'password': 'integration123'
        }
        
        login_response = self.client.post(
            self.login_url,
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        # Extract cookies from login response
        cookies = login_response.cookies
        
        # 3. Access protected resource with cookies
        self.client.cookies['access_token'] = cookies['access_token'].value
        self.client.cookies['refresh_token'] = cookies['refresh_token'].value
        
        # Try to access protected chat page
        chat_response = self.client.get(self.chat_url)
        # Should not redirect (user is authenticated)
        self.assertNotEqual(chat_response.status_code, status.HTTP_302_FOUND)
        
        # 4. Logout
        logout_response = self.client.post(self.logout_url)
        self.assertEqual(logout_response.status_code, status.HTTP_302_FOUND)
        
        # 5. Try to access protected resource after logout
        post_logout_response = self.client.get(self.chat_url)
        # Should redirect to login
        self.assertEqual(post_logout_response.status_code, status.HTTP_302_FOUND)

    def test_password_reset_flow(self):
        """Test complete password reset flow"""
        
        # Create a user
        user = User.objects.create_user(
            email='reset@example.com',
            name='Reset User',
            password='oldpassword123'
        )
        
        # 1. Request password reset
        forgot_url = reverse('api_forgot_password')
        forgot_data = {'email': 'reset@example.com'}
        
        forgot_response = self.client.post(
            forgot_url,
            data=json.dumps(forgot_data),
            content_type='application/json'
        )
        self.assertEqual(forgot_response.status_code, status.HTTP_200_OK)
        
        # Note: In a real test, you would extract the reset link from the email
        # For this integration test, we'll simulate the reset process
        
        # 2. Login with old password (should work)
        old_login_data = {
            'email': 'reset@example.com',
            'password': 'oldpassword123'
        }
        
        old_login_response = self.client.post(
            self.login_url,
            data=json.dumps(old_login_data),
            content_type='application/json'
        )
        self.assertEqual(old_login_response.status_code, status.HTTP_200_OK)
        
        # 3. Change password (simulating reset)
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.contrib.auth.tokens import default_token_generator
        
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        
        # 4. Login with new password
        user.set_password('newpassword123')
        user.save()
        
        new_login_data = {
            'email': 'reset@example.com',
            'password': 'newpassword123'
        }
        
        new_login_response = self.client.post(
            self.login_url,
            data=json.dumps(new_login_data),
            content_type='application/json'
        )
        self.assertEqual(new_login_response.status_code, status.HTTP_200_OK)

    def test_token_refresh_flow(self):
        """Test token refresh flow when access token expires"""
        
        # Create user and login
        user = User.objects.create_user(
            email='refresh@example.com',
            name='Refresh User',
            password='refresh123'
        )
        
        login_data = {
            'email': 'refresh@example.com',
            'password': 'refresh123'
        }
        
        login_response = self.client.post(
            self.login_url,
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        # Simulate expired access token but valid refresh token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        # Clear access token, keep refresh token
        self.client.cookies.pop('access_token', None)
        self.client.cookies['refresh_token'] = str(refresh)
        
        # Access protected resource - middleware should refresh token
        chat_response = self.client.get(self.chat_url)
        
        # Check that we got a new access token in cookies
        self.assertIn('access_token', self.client.cookies)

    def test_concurrent_sessions(self):
        """Test multiple concurrent login sessions"""
        
        # Create user
        user = User.objects.create_user(
            email='multi@example.com',
            name='Multi User',
            password='multi123'
        )
        
        # Create two different clients (simulating different browsers/devices)
        client1 = APIClient()
        client2 = APIClient()
        
        login_data = {
            'email': 'multi@example.com',
            'password': 'multi123'
        }
        
        # Login with first client
        response1 = client1.post(
            self.login_url,
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Login with second client
        response2 = client2.post(
            self.login_url,
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Both should have valid tokens
        self.assertIn('access_token', response1.cookies)
        self.assertIn('access_token', response2.cookies)
        
        # Logout from first client
        logout1 = client1.post(self.logout_url)
        self.assertEqual(logout1.status_code, status.HTTP_302_FOUND)
        
        # Second client should still work
        client2.cookies['access_token'] = response2.cookies['access_token'].value
        protected_response = client2.get(self.chat_url)
        self.assertNotEqual(protected_response.status_code, status.HTTP_302_FOUND)


class ErrorHandlingIntegrationTest(TestCase):
    """Integration tests for error handling scenarios"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_rate_limiting(self):
        """Test multiple failed login attempts"""
        # Note: This assumes rate limiting is implemented
        
        login_url = reverse('token_obtain_pair')
        for i in range(5):  # Simulate multiple failed attempts
            response = self.client.post(
                login_url,
                data=json.dumps({
                    'email': f'attempt{i}@example.com',
                    'password': 'wrongpassword'
                }),
                content_type='application/json'
            )
        
        # After multiple attempts, should still handle gracefully
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_429_TOO_MANY_REQUESTS])

    def test_csrf_protection(self):
        """Test CSRF protection on form submissions"""
        client = Client(enforce_csrf_checks=True)
        
        # Try to submit login without CSRF token
        response = client.post(reverse('login'), {
            'email': 'test@example.com',
            'password': 'test123'
        })
        
        # Should either fail or redirect (depends on Django settings)
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])

 

    def test_xss_prevention(self):
        """Test XSS prevention in user inputs"""
        xss_payload = '<script>alert("XSS")</script>'
        
        # Create user with potentially malicious input
        user = User.objects.create_user(
            email='xss@example.com',
            name=xss_payload,  # Try XSS in name field
            password='test123'
        )
        
        # Try to render in a template (simulated)
        from django.template import Template, Context
        template = Template('{{ user.name }}')
        context = Context({'user': user})
        rendered = template.render(context)
        
        # The script tags should be escaped
        self.assertIn('&lt;script&gt;', rendered)
        self.assertNotIn('<script>', rendered)