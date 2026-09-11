from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    CurrentUserView,
    ChangePasswordView,
    DeleteAccountView,
    RequestPasswordResetView,
    ConfirmPasswordResetView,
    RecoverUsernameView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='auth_me'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('delete-account/', DeleteAccountView.as_view(), name='auth_delete_account'),
    path('password-reset/request/', RequestPasswordResetView.as_view(), name='auth_password_reset_request'),
    path('password-reset/confirm/', ConfirmPasswordResetView.as_view(), name='auth_password_reset_confirm'),
    path('recover-username/', RecoverUsernameView.as_view(), name='auth_recover_username'),
]
