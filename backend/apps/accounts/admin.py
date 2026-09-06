from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'is_online', 'is_staff', 'created_at')
    fieldsets = UserAdmin.fieldsets + (
        ('Información Discord', {'fields': ('avatar', 'bio', 'status_text', 'is_online')}),
    )
