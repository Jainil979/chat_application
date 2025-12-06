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

 


