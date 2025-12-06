import factory
from django.contrib.auth import get_user_model
from accounts.models import Profile

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    
    name = factory.Faker('name')
    email = factory.Faker('email')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True
    profile_completed = False


class AdminUserFactory(UserFactory):
    is_staff = True
    is_superuser = True


class ProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Profile
    
    user = factory.SubFactory(UserFactory)
    presence = 'available'
    about_me = factory.Faker('text', max_nb_chars=200)
    show_online = True
    show_last_seen = True
    show_typing = True