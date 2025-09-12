from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http     import urlsafe_base64_decode

User = get_user_model()


class SignupSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for front‑end‑validated signups.
    Expects name, email, phone_number, password.
    """
    class Meta:
        model = User
        # no password_confirm here—front end did that
        fields = ("name", "email", "password")
        extra_kwargs = {
            "password": {"write_only": True},
            'email': {'validators': [UniqueValidator(queryset = User.objects.all(), message="This email is already exist.")]},
        }

    def create(self, validated_data):
        # create_user will handle password hashing
        return User.objects.create_user(**validated_data)



class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    access  = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)

    def validate(self, data):
        email = data.get('email')
        pwd   = data.get('password')

        # Authenticate against Django’s auth backends
        user = authenticate(username=email, password=pwd)

        if not user or not user.is_active:
            raise serializers.ValidationError("Invalid credentials")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        data['user'] = user
        data['refresh'] = str(refresh)
        data['access']  = str(refresh.access_token)

        return data



class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email__iexact=value, is_active=True).exists():
            raise serializers.ValidationError("Invalid email address.")
        return value



class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64  = serializers.CharField()
    token = serializers.CharField()
    newPassword = serializers.CharField(min_length=8, write_only=True)
    confirmPassword = serializers.CharField(min_length=8, write_only=True)

    def validate(self, data):
        if data['newPassword'] != data['confirmPassword']:
            raise serializers.ValidationError("Passwords do not match.")

        try:
            uid = force_str(urlsafe_base64_decode(data['uidb64']))
            user = User.objects.get(pk=uid)
        except Exception:
            raise serializers.ValidationError("Invalid reset link.")

        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError("Reset link is invalid or expired.")

        data['user'] = user
        return data

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['newPassword'])
        user.save(update_fields=['password'])
        return user
