# chat/admin.py
from django.contrib import admin
from .models import Contact, ChatRoom, ChatMessage


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display    = ('owner', 'contact', 'added_at')
    list_filter     = ('owner',)
    search_fields   = ('owner__email', 'contact__email')
    readonly_fields = ('added_at',)


class ChatMessageInline(admin.TabularInline):
    model            = ChatMessage
    extra            = 0
    readonly_fields  = ('timestamp', 'sender', 'cipher')
    fields           = ('timestamp', 'sender', 'cipher')
    can_delete       = False
    show_change_link = True


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display   = ('id', 'user_a', 'user_b')
    list_filter    = ('user_a', 'user_b')
    search_fields  = ('user_a__email', 'user_b__email')
    readonly_fields = ('symmetric_key',)
    inlines        = (ChatMessageInline,)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display    = ('id', 'room', 'sender', 'timestamp')
    list_filter     = ('room', 'sender')
    search_fields   = ('room__id', 'sender__email')
    readonly_fields = ('timestamp', 'sender', 'cipher')
    
    def has_add_permission(self, request, obj=None):
        # Messages are created through the WebSocket consumer only
        return False
