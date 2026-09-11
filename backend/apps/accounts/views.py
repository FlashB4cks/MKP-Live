import random
import logging
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, PasswordResetCode
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    DeleteAccountSerializer,
    RequestPasswordResetSerializer,
    ConfirmPasswordResetSerializer,
    RecoverUsernameSerializer,
)

logger = logging.getLogger(__name__)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Support logging in with username OR email
        username_or_email = attrs.get('username', '').strip()
        if username_or_email and '@' in username_or_email:
            user_obj = User.objects.filter(email__iexact=username_or_email).first()
            if user_obj:
                attrs['username'] = user_obj.username

        data = super().validate(attrs)
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data
        return Response({
            'user': user_data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        # Handle avatar removal if requested
        if self.request.data.get('remove_avatar') in ('true', True, '1'):
            if self.request.user.avatar:
                self.request.user.avatar.delete(save=False)
            serializer.save(avatar=None)
        else:
            serializer.save()

class ChangePasswordView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ChangePasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not user.check_password(old_password):
            return Response(
                {"old_password": ["La contraseña actual es incorrecta."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Contraseña actualizada exitosamente."}, status=status.HTTP_200_OK)

class DeleteAccountView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DeleteAccountSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        password = serializer.validated_data['password']

        if not user.check_password(password):
            return Response(
                {"password": ["La contraseña proporcionada es incorrecta."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.delete()
        return Response({"detail": "Cuenta eliminada permanentemente."}, status=status.HTTP_200_OK)

class RequestPasswordResetView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = RequestPasswordResetSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()

        user = User.objects.filter(email__iexact=email).first()
        dev_code = None

        if user:
            # Invalidate any pending codes
            PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)
            code = f"{random.randint(100000, 999999)}"
            PasswordResetCode.objects.create(user=user, code=code)
            dev_code = code

            subject = "Código de recuperación de contraseña - MKP Live"
            message = (
                f"Hola {user.username},\n\n"
                f"Has solicitado restablecer tu contraseña en MKP Live.\n\n"
                f"Tu código de recuperación es: {code}\n\n"
                f"Este código es válido durante 15 minutos.\n"
                f"Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\n"
                f"El equipo de MKP Live"
            )
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False
                )
            except Exception as e:
                logger.warning(f"Could not send password reset email: {e}")

        resp_data = {
            "detail": "Si el correo está registrado, se ha enviado un código de 6 dígitos para restablecer tu contraseña."
        }
        if settings.DEBUG or not getattr(settings, 'EMAIL_HOST_USER', None):
            resp_data["dev_code"] = dev_code

        return Response(resp_data, status=status.HTTP_200_OK)

class ConfirmPasswordResetView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = ConfirmPasswordResetSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()
        code = serializer.validated_data['code'].strip()
        new_password = serializer.validated_data['new_password']

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"code": ["El código o el correo electrónico no son válidos."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        reset_code = PasswordResetCode.objects.filter(
            user=user,
            code=code,
            is_used=False
        ).order_by('-created_at').first()

        if not reset_code or not reset_code.is_valid():
            return Response(
                {"code": ["El código de recuperación es incorrecto o ha expirado (15 minutos). Por favor solicita uno nuevo."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        reset_code.is_used = True
        reset_code.save(update_fields=['is_used'])

        return Response(
            {"detail": "Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña."},
            status=status.HTTP_200_OK
        )

class RecoverUsernameView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = RecoverUsernameSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()

        user = User.objects.filter(email__iexact=email).first()
        found_username = None

        if user:
            found_username = user.username
            subject = "Recordatorio de tu nombre de usuario - MKP Live"
            message = (
                f"Hola,\n\n"
                f"Recibimos una solicitud para recordarte tu nombre de usuario en MKP Live.\n\n"
                f"Tu nombre de usuario es: {user.username}\n\n"
                f"Recuerda que también puedes iniciar sesión directamente usando tu correo ({user.email}) y tu contraseña.\n\n"
                f"El equipo de MKP Live"
            )
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False
                )
            except Exception as e:
                logger.warning(f"Could not send recover username email: {e}")

        resp_data = {
            "detail": "Si el correo está registrado en nuestro sistema, hemos procesado el recordatorio de tu nombre de usuario."
        }
        if found_username:
            resp_data["username"] = found_username

        return Response(resp_data, status=status.HTTP_200_OK)

