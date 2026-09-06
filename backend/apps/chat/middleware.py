from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_string):
    try:
        # Validate and decode access token
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']
        user = User.objects.get(id=user_id)
        if not user.is_active:
            return AnonymousUser()
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, Exception):
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Extract query parameters
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = None

        if 'token' in query_params:
            token = query_params['token'][0]
        else:
            # Also check headers for authorization: Bearer <token>
            for name, value in scope.get('headers', []):
                if name == b'authorization':
                    parts = value.decode('utf-8').split()
                    if len(parts) == 2 and parts[0].lower() == 'bearer':
                        token = parts[1]
                    break

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
