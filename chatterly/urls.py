from django.contrib import admin
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.urls import path , include
from accounts.views import *
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.urls import re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('' , include('core.urls')),
    path('accounts/' , include('accounts.urls')),
    path('chat/' , include('chat.urls')),
    path('api/auth/signup/', SignupAPIView.as_view(), name='api_signup'),
    path('api/auth/login/',  LoginAPIView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/forgot_password/', ForgotPasswordAPIView.as_view(), name='api_forgot_password'),
    path('api/auth/password_reset_confirm/' , PasswordResetConfirmAPIView.as_view(), name='api_password_reset')
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# if settings.DEBUG:
#     # only for development: serve media files through Django
#     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
