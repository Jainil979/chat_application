from django.shortcuts import render, redirect
from django.conf import settings
from django.urls import reverse , reverse_lazy
from django.contrib import messages
from django.views import View
from .serializers import SignupSerializer  # DRF serializer reuse for validation
from rest_framework.permissions import AllowAny
from rest_framework.views   import APIView
from .serializers import LoginSerializer
from django.shortcuts import render, redirect
from django.contrib import messages
from django.urls import reverse
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .authentication import CookieJWTAuthentication
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.response import Response
from django.views.generic import TemplateView
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework.renderers import JSONRenderer
from django.contrib.auth.forms import PasswordResetForm
from .serializers import ForgotPasswordSerializer , PasswordResetConfirmSerializer
from django.contrib.auth.views import PasswordResetConfirmView
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

User = get_user_model()


class SignupAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    renderer_classes   = [JSONRenderer]

    def post(self, request, *args, **kwargs):
        print(request.data)
        serializer = SignupSerializer(data=request.data)
        print(serializer.is_valid())
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Account created successfully."},
                status=status.HTTP_201_CREATED
            )
        
        print(serializer.errors)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



class SignupPageView(TemplateView):
    template_name = "accounts/sign_up.html"



@method_decorator(never_cache, name='dispatch')
class LoginPageView(TemplateView):
    template_name = 'accounts/login.html'


class LoginAPIView(APIView):
    """
    POST /api/auth/login/
    {
      "email": "you@example.com",
      "password": "secret"
    }
    —> sets HttpOnly access_token + refresh_token cookies on success,
       returns 400 + {"detail":"Invalid credentials"} on failure.
    """
    print("yes")
    permission_classes = [AllowAny]
    renderer_classes   = [JSONRenderer]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        # if creds bad → DRF will return a 400 + {"non_field_errors":["Invalid credentials"]}
        serializer.is_valid(raise_exception=True)

        # pull out our JWT strings
        data    = serializer.validated_data
        access  = data['access']
        refresh = data['refresh']
        user = data['user']

        # build a simple response
        resp = Response({"detail":"Login successful" , "profile_completed": user.profile_completed}, status=status.HTTP_200_OK)

        # set them in secure HttpOnly cookies
        resp.set_cookie(
          key='access_token',
          value=access,
          httponly=True,
          secure=True,
          samesite='Lax',
        )
        resp.set_cookie(
          key='refresh_token',
          value=refresh,
          httponly=True,
          secure=True,
          samesite='Lax',
        )
        print('hello here')
        return resp




class LogoutView(APIView):
    """
    Logout purely via JWT:
      - Requires a valid access_token cookie (IsAuthenticated via CookieJWTAuthentication)
      - Blacklists the refresh_token
      - Deletes both JWT cookies
      - Redirects to home
    """
    # authentication_classes = [CookieJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # 1) Blacklist the refresh token (if present)
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass  # already invalid/blacklisted


        messages.success(request, "You have successfully logged out.")
        # 2) Build a redirect response clearing JWT cookies
        response = redirect(reverse('home'))
        # Match the same cookie settings you used when setting them:
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        return response



class ForgotPasswordPageView(TemplateView):
    template_name = 'accounts/forgot_password.html'


class ForgotPasswordAPIView(APIView):
    permission_classes = []  # allow any

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        form = PasswordResetForm(data=serializer.validated_data)
        if not form.is_valid():
            return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

        # send the email
        form.save(
            request=request,
            use_https=request.is_secure(),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            subject_template_name='accounts/password_reset_subject.txt',
            email_template_name='accounts/password_reset_email.html',
            html_email_template_name='accounts/password_reset_email.html',
        )

        return Response(
            {"detail": "Password reset link sent. Check your email."},
            status=status.HTTP_200_OK
        )



class PasswordResetPageView(TemplateView):
    """
    GET  /reset/<uidb64>/<token>/
      – if token is valid: renders 'accounts/password_reset.html'
      – otherwise: renders 'accounts/password_reset_invalid.html'
    """
    template_name = 'accounts/password_reset.html'
    invalid_template_name = 'accounts/password_reset_invalid.html'

    def get(self, request, uidb64, token, *args, **kwargs):
        try:
            uid  = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            context = self.get_context_data(**kwargs)
            context.update({
                'uidb64': uidb64,
                'token': token,
            })
            return self.render_to_response(context)

        return render(request, self.invalid_template_name, status=400)



class PasswordResetConfirmAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        Expects JSON:
        {
          "uidb64": "...",
          "token":  "...",
          "new_password1": "...",
          "new_password2": "..."
        }
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {"detail": "Password has been reset successfully."},
            status=status.HTTP_200_OK
        )
    

