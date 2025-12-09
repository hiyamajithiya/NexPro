"""
Custom JWT Authentication for NexPro
Ensures organization relationship is loaded with the user
"""
from rest_framework_simplejwt.authentication import JWTAuthentication as BaseJWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings


class JWTAuthentication(BaseJWTAuthentication):
    """
    Custom JWT Authentication that ensures the organization relationship
    is loaded with the user object.
    """

    def get_user(self, validated_token):
        """
        Override to select_related organization when fetching user
        """
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken('Token contained no recognizable user identification')

        from core.models import User

        try:
            # Use select_related to load the organization in the same query
            user = User.objects.select_related('organization').get(**{api_settings.USER_ID_FIELD: user_id})
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found', code='user_not_found')

        if not user.is_active:
            raise AuthenticationFailed('User is inactive', code='user_inactive')

        return user
