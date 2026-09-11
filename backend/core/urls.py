from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

admin.site.site_header = "MKP Live Administración"
admin.site.site_title = "MKP Live Portal"
admin.site.index_title = "Panel de Control MKP Live"

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok', 'app': 'MKP Live', 'version': '1.0.0'})

urlpatterns = [
    path('', health_check, name='health_check'),
    path('admin/', admin.site.urls),

    # Standard API endpoints with /api/ prefix
    path('api/auth/', include('accounts.urls')),
    path('api/servers/', include('servers.urls')),
    path('api/channels/', include('channels_app.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/sessions/', include('virtual_sessions.urls')),

    # Root aliases (allows client requests with or without /api/ prefix)
    path('auth/', include('accounts.urls')),
    path('servers/', include('servers.urls')),
    path('channels/', include('channels_app.urls')),
    path('chat/', include('chat.urls')),
    path('sessions/', include('virtual_sessions.urls')),
]

from django.urls import re_path
from django.views.static import serve

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^api/media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
