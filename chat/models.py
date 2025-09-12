from django.db import models
from django.conf import settings
import nacl.utils
from nacl.secret import SecretBox

def generate_symmetric_key():
    # Returns exactly 32 random bytes for SecretBox
    return nacl.utils.random(SecretBox.KEY_SIZE)

class Contact(models.Model):
    """Represents that user A has added user B as a chat contact."""
    owner   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contacts')
    contact = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reverse_contacts')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('owner','contact')

class ChatRoom(models.Model):
    """One-to-one chat room between two users."""
    user_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rooms_as_a')
    user_b = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rooms_as_b')
    symmetric_key = models.BinaryField(default=generate_symmetric_key, editable=False)

    class Meta:
        unique_together = (('user_a','user_b'),)

    @classmethod
    def get_or_create_room(cls, a, b):
        if a.id > b.id: a,b = b,a
        room, _ = cls.objects.get_or_create(
            user_a=a, user_b=b,
        )
        return room

class ChatMessage(models.Model):
    """Encrypted messages in a room."""
    room      = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    cipher    = models.TextField()  # base64(nonce+ciphertext)

    attachment     = models.FileField(
        upload_to='chat_attachments/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Optional file attachment"
    )
    attachment_url = models.URLField(blank=True, null=True,
        help_text="If the message contains only a link or externally hosted file")

    class Meta:
        ordering = ('timestamp',)

 




# from django.db import models
# from django.conf import settings
# import nacl.utils

# class Contact(models.Model):
#     """Represents that a user has added another user as a chat contact."""
#     owner    = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.CASCADE,
#         related_name='chat_contacts'
#     )
#     contact  = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.CASCADE,
#         related_name='chat_reverse_contacts'
#     )
#     added_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         db_table = 'chat_contacts'
#         unique_together = ('owner', 'contact')
#         verbose_name = 'Chat Contact'
#         verbose_name_plural = 'Chat Contacts'

# class ChatRoom(models.Model):
#     """One-to-one chat room between two users."""
#     user_a        = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.CASCADE,
#         related_name='chat_rooms_as_a'
#     )
#     user_b        = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.CASCADE,
#         related_name='chat_rooms_as_b'
#     )
#     symmetric_key = models.BinaryField()

#     class Meta:
#         db_table = 'chat_rooms'
#         unique_together = (('user_a','user_b'),)
#         verbose_name = 'Chat Room'
#         verbose_name_plural = 'Chat Rooms'

#     @classmethod
#     def get_or_create_room(cls, a, b):
#         if a.id > b.id:
#             a, b = b, a
#         room, _ = cls.objects.get_or_create(
#             user_a=a, user_b=b,
#             defaults={'symmetric_key': nacl.utils.random(32)}
#         )
#         return room

# class ChatMessage(models.Model):
#     """Encrypted messages in a chat room."""
#     room      = models.ForeignKey(
#         ChatRoom,
#         on_delete=models.CASCADE,
#         related_name='chat_messages'
#     )
#     sender    = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.CASCADE,
#         related_name='sent_chat_messages'
#     )
#     timestamp = models.DateTimeField(auto_now_add=True)
#     cipher    = models.TextField()  # base64(nonce + ciphertext)

#     class Meta:
#         db_table = 'chat_messages'
#         ordering = ('timestamp',)
#         verbose_name = 'Chat Message'
#         verbose_name_plural = 'Chat Messages'
