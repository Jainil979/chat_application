# accounts/middleware.py

from django.contrib.auth.models import AnonymousUser
from django.shortcuts           import redirect
from django.urls                import reverse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions     import TokenError, InvalidToken
from rest_framework_simplejwt.tokens         import RefreshToken

class RefreshOnExpiredMiddleware:
    """
    1) Try to authenticate via 'access_token' cookie.
    2) If access missing/expired, but 'refresh_token' is valid:
         • Mint a fresh 'access_token' cookie
         • Authenticate the user
    3) Otherwise, set AnonymousUser and (for /chat/) redirect to login.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth    = JWTAuthentication()

    def __call__(self, request):
        if request.path.startswith('/admin/'):
            return self.get_response(request)

        user = None

        # --- Step 1: Validate access token ---
        raw_access = request.COOKIES.get('access_token')
        if raw_access:
            try:
                validated = self.jwt_auth.get_validated_token(raw_access)
                user, _ = self.jwt_auth.get_user(validated), validated
            except (TokenError, InvalidToken):
                user = None

        # --- Step 2: If no valid access, try refresh ---
        if user is None:
            raw_refresh = request.COOKIES.get('refresh_token')
            if raw_refresh:
                try:
                    refresh_obj = RefreshToken(raw_refresh)
                    # Generate a new access token
                    new_access = str(refresh_obj.access_token)
                    user = self.jwt_auth.get_user(refresh_obj)
                    # Flag it for setting on the outgoing response
                    request._new_access_token = new_access
                except (TokenError, InvalidToken):
                    user = None

        # --- Step 3: Assign request.user ---
        request.user = user if user else AnonymousUser()

        print(user)
        # Let the view (or next middleware) run
        response = self.get_response(request)

        # --- Step 4: If we minted a new access token, set it as a cookie ---
        if hasattr(request, "_new_access_token"):
            response.set_cookie(
                'access_token', request._new_access_token,
                httponly=True, secure=True, samesite='Lax'
            )

        # --- Step 5: If it’s a protected URL and still anonymous, redirect ---
        if request.user.is_anonymous and request.path.startswith('/chat/') and not request.path.startswith('/chat/api/'):
            return redirect(reverse('login'))

        return response
