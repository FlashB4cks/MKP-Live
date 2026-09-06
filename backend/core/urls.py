from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

admin.site.site_header = "MKP Live Administración"
admin.site.site_title = "MKP Live Portal"
admin.site.index_title = "Panel de Control MKP Live"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/servers/', include('servers.urls')),
    path('api/channels/', include('channels_app.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/sessions/', include('virtual_sessions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
