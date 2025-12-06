from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser , Profile

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('name', 'email')
    list_filter  = ('is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password',)}),
        ('Personal Info', {'fields': ('name','profile_completed')}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('last_login',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('name', 'email', 'password1', 'profile_completed' ,'password2', 'is_staff', 'is_active'),
        }),
    )
    search_fields   = ('email', 'name')
    ordering        = ('name', 'email')



@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'presence',
        'show_online',
        'show_last_seen',
        'show_typing',
    )
    list_filter = (
        'presence',
        'show_online',
        'show_last_seen',
        'show_typing',
    )
    search_fields = (
        'user__email',
    )
    ordering = ('user__email',)
