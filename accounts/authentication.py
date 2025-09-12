from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError

class CookieJWTAuthentication(JWTAuthentication):
    """
    Read the access token from the 'access_token' HttpOnly cookie
    instead of the Authorization header.
    """
    def authenticate(self, request):
        raw = request.COOKIES.get('access_token')
        if not raw:
            return None
        try:
            validated = self.get_validated_token(raw)
        except TokenError:
            return None
        return self.get_user(validated), validated
