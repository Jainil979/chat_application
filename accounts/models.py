from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .modelManagers import CustomUserManager
from django.conf import settings


class CustomUser(AbstractBaseUser, PermissionsMixin):
    name         = models.CharField(max_length=150)
    email        = models.EmailField(unique=True)
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    date_joined  = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return self.name
    
    def get_full_name(self):
        return self.name



class Profile(models.Model):
    class Presence(models.TextChoices):
        AVAILABLE       = 'available', 'Available'
        BUSY            = 'busy', 'Busy'
        DO_NOT_DISTURB  = 'do_not_disturb', 'Do Not Disturb'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')

    avatar = models.ImageField(
        upload_to='avatars/%Y/%m/%d/',
        blank=True, null=True,
        help_text="User’s profile picture"
    )
    presence = models.CharField(
        max_length=16,
        choices=Presence.choices,
        default=Presence.AVAILABLE,
        help_text="Current availability status"
    )

    about_me = models.TextField(
        max_length=500,
        blank=True,
        help_text="Tell others about yourself"
    )

    show_online     = models.BooleanField(
        default=True,
        help_text="Allow others to see when you're online"
    )
    show_last_seen  = models.BooleanField(
        default=True,
        help_text="Allow others to see your last seen timestamp"
    )
    show_typing     = models.BooleanField(
        default=True,
        help_text="Allow others to see typing indicator"
    )

    def __str__(self):
        return f"{self.user.name} Profile"
    
    @property
    def name_for_display(self):
        return self.user.get_full_name()
    
    @property
    def avatar_url(self):
        """
        Return the URL path (relative) of the avatar file, or None.
        """
        if self.avatar:
            return self.avatar.url
        return None

