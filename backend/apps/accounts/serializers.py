from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User

class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'avatar', 'avatar_url',
            'bio', 'status_text', 'is_online', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_online']

    def get_avatar_url(self, obj):
        if obj.avatar and hasattr(obj.avatar, 'url'):
            url = obj.avatar.url
            request = self.context.get('request')
            if request and not (url.startswith('http://') or url.startswith('https://')):
                return request.build_absolute_uri(url)
            return url
        return None

    def validate_username(self, value):
        user = self.instance
        if user and User.objects.exclude(pk=user.pk).filter(username__iexact=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return value

    def validate_email(self, value):
        user = self.instance
        if user and User.objects.exclude(pk=user.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este correo electrónico ya está registrado.")
        return value

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Las nuevas contraseñas no coinciden."})
        return attrs

class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, required=True)

class RequestPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class ConfirmPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Las nuevas contraseñas no coinciden."})
        return attrs

class RecoverUsernameSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

