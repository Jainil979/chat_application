# chat/auth_middleware.py
import typing
from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware

class CookieJWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for Channels that reads the 'access_token' cookie,
    validates it via SimpleJWT, and sets scope['user'] accordingly.
    """

    async def __call__(self, scope: dict, receive: typing.Callable, send: typing.Callable):
        # Default to anonymous
        

        scope["user"] = AnonymousUser()

        # Extract cookies header
        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode()
        # Parse cookies into a dict
        cookies = {}
        for pair in cookie_header.split(";"):
            if "=" in pair:
                key, val = pair.strip().split("=", 1)
                cookies[key] = val

        raw_token = cookies.get("access_token")
        if raw_token:
            jwt_auth = JWTAuthentication()
            try:
                # Validate the token
                validated_token = jwt_auth.get_validated_token(raw_token)
                # Retrieve the user
                user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                scope["user"] = user
            except (InvalidToken, TokenError):
                # Leave as AnonymousUser if invalid
                pass

        return await super().__call__(scope, receive, send)
