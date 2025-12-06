
# Originnal Code

# # chat/serializers.py
# from rest_framework import serializers
# from .models import ChatMessage , Contact , ChatRoom 
# from accounts.models import Profile
# from django.contrib.auth import get_user_model

# User = get_user_model()


# class ChatMessageSerializer(serializers.ModelSerializer):
#     class Meta:
#         model  = ChatMessage
#         fields = (
#             'sender',
#             'timestamp',
#             'cipher',
#             'attachment',
#             'attachment_url',
#         )



# class AttachmentUploadSerializer(serializers.Serializer):
#     file = serializers.FileField()

#     # for audio file(recorded file by user)
#     def validate_file(self, f):
#         if not f.content_type.startswith('audio/'):
#             return f  # or skip this check if you want images/docs too
#         return f

#     def create(self, validated_data):
#         # Simply wrap into a ChatMessage with no text nor cipher
#         # and return its URL for client to broadcast
#         msg = ChatMessage.objects.create(
#             room_id=self.context['room_id'],
#             sender=self.context['request'].user,
#             cipher='',          # no text
#             attachment=validated_data['file']
#         )
#         return {
#             'message_id': msg.pk,
#             'url': msg.attachment.url,
#             'timestamp': msg.timestamp
#         }




# class ContactSerializer(serializers.ModelSerializer):
#     contact_id = serializers.IntegerField(source='contact.id', read_only=True)
#     name       = serializers.CharField(source='contact.name', read_only=True)
#     avatar     = serializers.SerializerMethodField()
#     show_online = serializers.BooleanField(source='contact.profile.show_online')

#     class Meta:
#         model  = Contact
#         fields = ('contact_id', 'name', 'avatar', 'show_online')

#     def get_avatar(self, obj):
#         """
#         Look up the related Profile.avatar_url and build an absolute URI.
#         """
#         request = self.context.get('request', None)
#         profile = getattr(obj.contact, 'profile', None)
#         if not profile:
#             return None
#         url = profile.avatar_url
#         if url and request:
#             return request.build_absolute_uri(url)
#         return url



# class AddUserSerializer(serializers.Serializer):
#     email = serializers.EmailField()

#     def validate_email(self, value):
#         try:
#             user = User.objects.get(email__iexact=value)
#         except User.DoesNotExist:
#             raise serializers.ValidationError("No user with that email.")
#         if self.context['request'].user == user:
#             raise serializers.ValidationError("You can’t add yourself.")
#         if Contact.objects.filter(owner=self.context['request'].user, contact=user).exists():
#             raise serializers.ValidationError("User is already in your contacts.")
#         return value

#     def save(self):
#         me    = self.context['request'].user
#         other = User.objects.get(email__iexact=self.validated_data['email'])
#         # 1) Create contact (idempotent)
#         Contact.objects.get_or_create(owner=me, contact=other)
#         # 2) Create chat room (idempotent)
#         room = ChatRoom.get_or_create_room(me, other)
#         return {'contact_id': other.pk, 'name': other.get_full_name(), 'room_id': room.pk}



# class ProfileSerializer(serializers.ModelSerializer):
#     # expose a “name” field that actually writes into user.name
#     name   = serializers.CharField(source="user.name", required=True)
#     avatar = serializers.ImageField(required=False, allow_null=True)

#     class Meta:
#         model  = Profile
#         fields = (
#             "name",           # ← writes to CustomUser.name
#             "avatar",         # ImageField on Profile
#             "presence",
#             "about_me",
#             "show_online",
#             "show_last_seen",
#             "show_typing",
#         )

#     def update(self, instance, validated_data):
#         # 1) pull out user data
#         user_data = validated_data.pop("user", {})
#         if "name" in user_data:
#             instance.user.name = user_data["name"]
#             instance.user.save(update_fields=["name"])
#         # 2) let ModelSerializer handle the rest
#         return super().update(instance, validated_data)











# updated with design pattern

# chat/serializers.py
from rest_framework import serializers
from .models import ChatMessage , Contact , ChatRoom 
from accounts.models import Profile
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ChatMessage
        fields = (
            'sender',
            'timestamp',
            'cipher',
            'attachment',
            'attachment_url',
        )



class AttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    # for audio file(recorded file by user)
    def validate_file(self, f):
        if not f.content_type.startswith('audio/'):
            return f  # or skip this check if you want images/docs too
        return f

    def create(self, validated_data):
        # Simply wrap into a ChatMessage with no text nor cipher
        # and return its URL for client to broadcast
        msg = ChatMessage.objects.create(
            room_id=self.context['room_id'],
            sender=self.context['request'].user,
            cipher='',          # no text
            attachment=validated_data['file']
        )
        return {
            'message_id': msg.pk,
            'url': msg.attachment.url,
            'timestamp': msg.timestamp
        }




class ContactSerializer(serializers.ModelSerializer):
    contact_id = serializers.IntegerField(source='contact.id', read_only=True)
    name       = serializers.CharField(source='contact.name', read_only=True)
    avatar     = serializers.SerializerMethodField()
    show_online = serializers.BooleanField(source='contact.profile.show_online')
    is_online  = serializers.SerializerMethodField()  # NEW: Added is_online field

    class Meta:
        model  = Contact
        fields = ('contact_id', 'name', 'avatar', 'show_online', 'is_online')  # Added is_online

    def get_avatar(self, obj):
        """
        Look up the related Profile.avatar_url and build an absolute URI.
        """
        request = self.context.get('request', None)
        profile = getattr(obj.contact, 'profile', None)
        if not profile:
            return None
        url = profile.avatar_url
        if url and request:
            return request.build_absolute_uri(url)
        return url
    
    def get_is_online(self, obj):
        """Get online status from contact object (set by repository)"""
        return getattr(obj, 'is_online', False)



class AddUserSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user with that email.")
        if self.context['request'].user == user:
            raise serializers.ValidationError("You can't add yourself.")
        
        # Use Contact model directly (compatible with existing code)
        if Contact.objects.filter(owner=self.context['request'].user, contact=user).exists():
            raise serializers.ValidationError("User is already in your contacts.")
        return value

    def save(self):
        me    = self.context['request'].user
        other = User.objects.get(email__iexact=self.validated_data['email'])
        
        # 1) Create contact (idempotent) - using Contact model directly
        Contact.objects.get_or_create(owner=me, contact=other)
        
        # 2) Create chat room (idempotent) - using ChatRoom model directly
        room = ChatRoom.get_or_create_room(me, other)
        
        return {'contact_id': other.pk, 'name': other.get_full_name(), 'room_id': room.pk}



class ProfileSerializer(serializers.ModelSerializer):
    # expose a "name" field that actually writes into user.name
    name   = serializers.CharField(source="user.name", required=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model  = Profile
        fields = (
            "name",           # ← writes to CustomUser.name
            "avatar",         # ImageField on Profile
            "presence",
            "about_me",
            "show_online",
            "show_last_seen",
            "show_typing",
        )

    def update(self, instance, validated_data):
        # 1) pull out user data
        user_data = validated_data.pop("user", {})
        if "name" in user_data:
            instance.user.name = user_data["name"]
            instance.user.save(update_fields=["name"])
        # 2) let ModelSerializer handle the rest
        return super().update(instance, validated_data)


