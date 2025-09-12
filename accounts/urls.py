from django.urls import path
from accounts.views import *

urlpatterns = [
    path('signup/' , SignupPageView.as_view() , name='signup'),
    path('login/' , LoginPageView.as_view() , name="login"),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('forgot/' , ForgotPasswordPageView.as_view() , name='forgot'),
    path('password_reset/<uidb64>/<token>/', PasswordResetPageView.as_view() ,name='password_reset'),
]
