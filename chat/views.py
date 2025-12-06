
# Original Code

# from django.shortcuts import render
# from rest_framework.views import APIView
# from rest_framework.permissions import IsAuthenticated
# from accounts.authentication  import CookieJWTAuthentication
# from rest_framework.views      import APIView
# from rest_framework.response   import Response
# from rest_framework.permissions import IsAuthenticated
# from .models import ChatRoom , Contact
# from .serializers import ChatMessageSerializer , ContactSerializer , AddUserSerializer , ProfileSerializer , AttachmentUploadSerializer
# from django.views.generic import TemplateView
# import base64
# from rest_framework import status
# from django.core.cache import cache
# from django_redis import get_redis_connection
# from accounts.models import Profile


# ONLINE_KEY = "online_users"  # Redis set key


# class ChatUI(APIView):
#     """
#     Serve your chat page only if a valid access_token cookie is present.
#     """
#     # authentication_classes = [CookieJWTAuthentication]
#     # permission_classes     = [IsAuthenticated]

#     def get(self, request):
#         # At this point, request.user is set from the JWT cookie
#         return render(request, 'chat/chat_ui.html', {
#             'user': request.user,
#             # … any other context …
#         })



# class ProfilePageView(TemplateView):
#     template_name = "chat/profile.html"




# class ProfileAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         profile = Profile.objects.get_or_create(
#             user=request.user,
#             defaults={
#                 'presence': 'available',
#                 'show_online': True,
#                 'show_last_seen': True,
#                 'show_typing': True
#             }
#         )[0]  # get_or_create returns (object, created) tuple
#         serializer = ProfileSerializer(profile, context={"request": request})
#         return Response(serializer.data)

#     def post(self, request):
#         profile = Profile.objects.get_or_create(
#             user=request.user,
#             defaults={
#                 'presence': 'available',
#                 'show_online': True,
#                 'show_last_seen': True,
#                 'show_typing': True
#             }
#         )[0]
#         serializer = ProfileSerializer(profile, data=request.data, context={"request": request})
#         serializer.is_valid(raise_exception=True)
#         serializer.save()

#         request.user.profile_completed = True
#         request.user.save(update_fields=['profile_completed'])


#         return Response(serializer.data, status=status.HTTP_200_OK)






    
# class ContactList(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         qs = Contact.objects.filter(owner=request.user).select_related('contact__profile')
#         ser = ContactSerializer(qs, many=True, context={'request': request})

#         conn = get_redis_connection("default")     # your CACHES alias
#         online = conn.smembers(ONLINE_KEY)
#         online_ids = {int(x) for x in online}

#         # annotate each
#         for c in ser.data:
#             c["is_online"] = (c["contact_id"] in online_ids) and c["show_online"]
            
#         return Response(ser.data)



# class ChatHistory(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request, other_id):
#         other = request.user.__class__.objects.get(pk=other_id)
#         room  = ChatRoom.get_or_create_room(request.user, other)
#         msgs  = room.messages.all()
#         serialized = ChatMessageSerializer(msgs, many=True).data
#         key_b64 = base64.b64encode(room.symmetric_key).decode()
#         return Response({'key': key_b64, 'messages': serialized})
    


# class AttachmentUploadAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request, room_id):
        
#         other = request.user.__class__.objects.get(pk=room_id)
#         room  = ChatRoom.get_or_create_room(request.user, other)

#         serializer = AttachmentUploadSerializer(
#             data=request.data,
#             context={'request': request, 'room_id': room.id}
#         )
#         serializer.is_valid(raise_exception=True)
#         result = serializer.save()
#         return Response(result, status=status.HTTP_201_CREATED)



# class AddUserAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         serializer = AddUserSerializer(data=request.data, context={'request': request})
#         serializer.is_valid(raise_exception=True)
#         result = serializer.save()
#         return Response(result, status=status.HTTP_201_CREATED)



# class DeleteUserAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def delete(self, request, other_id):
#         """
#         Remove the Contact record for (owner=request.user, contact=other_id).
#         We do *not* delete the ChatRoom or any messages.
#         """
#         owner = request.user
#         try:
#             contact = Contact.objects.get(owner=owner, contact_id=other_id)
#         except Contact.DoesNotExist:
#             return Response(
#                 {"detail": "Contact not found."},
#                 status=status.HTTP_404_NOT_FOUND
#             )

#         contact.delete()
#         return Response(
#             {"detail": "Contact deleted."},
#             status=status.HTTP_200_OK
#         )
    

# # def emoji(request):
# #     return render(request , 'chat/emoji.html')










# updated with design pattern 

from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from accounts.authentication  import CookieJWTAuthentication
from rest_framework.views      import APIView
from rest_framework.response   import Response
from rest_framework.permissions import IsAuthenticated
from .models import ChatRoom , Contact
from .serializers import ChatMessageSerializer , ContactSerializer , AddUserSerializer , ProfileSerializer , AttachmentUploadSerializer
from django.views.generic import TemplateView
import base64
from rest_framework import status
from django.core.cache import cache
from django_redis import get_redis_connection
from accounts.models import Profile

# Import repositories
from .repositories import ChatRoomRepository, ChatMessageRepository, ContactRepository, PresenceRepository

ONLINE_KEY = "online_users"  # Redis set key


class ChatUI(APIView):
    """
    Serve your chat page only if a valid access_token cookie is present.
    """
    # authentication_classes = [CookieJWTAuthentication]
    # permission_classes     = [IsAuthenticated]

    def get(self, request):
        # At this point, request.user is set from the JWT cookie
        return render(request, 'chat/chat_ui.html', {
            'user': request.user,
            # … any other context …
        })



class ProfilePageView(TemplateView):
    template_name = "chat/profile.html"




class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = Profile.objects.get_or_create(
            user=request.user,
            defaults={
                'presence': 'available',
                'show_online': True,
                'show_last_seen': True,
                'show_typing': True
            }
        )[0]  # get_or_create returns (object, created) tuple
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        profile = Profile.objects.get_or_create(
            user=request.user,
            defaults={
                'presence': 'available',
                'show_online': True,
                'show_last_seen': True,
                'show_typing': True
            }
        )[0]
        serializer = ProfileSerializer(profile, data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        request.user.profile_completed = True
        request.user.save(update_fields=['profile_completed'])


        return Response(serializer.data, status=status.HTTP_200_OK)






    
class ContactList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Use ContactRepository to get contacts
        contact_repo = ContactRepository()
        contacts = contact_repo.get_user_contacts(request.user)
        
        # Use PresenceRepository to get online status
        presence_repo = PresenceRepository()
        online_ids = presence_repo.get_online_users()
        
        # Serialize data
        ser = ContactSerializer(contacts, many=True, context={'request': request})
        
        # Add online status to each contact
        for c in ser.data:
            c["is_online"] = (c["contact_id"] in online_ids) and c["show_online"]
            
        return Response(ser.data)



class ChatHistory(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, other_id):
        other = request.user.__class__.objects.get(pk=other_id)
        
        # Use ChatRoomRepository to get room
        room_repo = ChatRoomRepository()
        room = room_repo.get_or_create_room(request.user, other)
        
        # Use ChatMessageRepository to get messages
        message_repo = ChatMessageRepository()
        msgs = message_repo.get_room_messages(room.id)
        
        serialized = ChatMessageSerializer(msgs, many=True).data
        key_b64 = base64.b64encode(room.symmetric_key).decode()
        return Response({'key': key_b64, 'messages': serialized})
    


class AttachmentUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        
        other = request.user.__class__.objects.get(pk=room_id)
        
        # Use ChatRoomRepository to get room
        room_repo = ChatRoomRepository()
        room = room_repo.get_or_create_room(request.user, other)

        serializer = AttachmentUploadSerializer(
            data=request.data,
            context={'request': request, 'room_id': room.id}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(result, status=status.HTTP_201_CREATED)



class AddUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddUserSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(result, status=status.HTTP_201_CREATED)



class DeleteUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, other_id):
        """
        Remove the Contact record for (owner=request.user, contact=other_id).
        We do *not* delete the ChatRoom or any messages.
        """
        owner = request.user
        
        # Use ContactRepository to find and delete contact
        contact_repo = ContactRepository()
        contact = contact_repo.filter(owner=owner, contact_id=other_id).first()
        
        if not contact:
            return Response(
                {"detail": "Contact not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        contact.delete()
        return Response(
            {"detail": "Contact deleted."},
            status=status.HTTP_200_OK
        )
    

# def emoji(request):
#     return render(request , 'chat/emoji.html')





