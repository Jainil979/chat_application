# chat/consumers.py
import json, base64, nacl.utils
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from nacl.secret import SecretBox
from .models import ChatRoom, ChatMessage , Contact
from django.utils import timezone
from django.core.files.base import ContentFile
from channels.db import database_sync_to_async
from django.core.cache import cache
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django_redis import get_redis_connection
from channels.generic.websocket import AsyncJsonWebsocketConsumer


ONLINE_KEY = "online_users"


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user     = self.scope['user']
        print(user)
        other    = await database_sync_to_async(self.get_user)(self.scope['url_route']['kwargs']['other_id'])
        self.room= await database_sync_to_async(ChatRoom.get_or_create_room)(user, other)
        self.group = f"chat_{self.room.id}"
        print(self.room , self.group)

        raw_key = self.room.symmetric_key  # BinaryField result
        key     = bytes(raw_key)           # ensure a Python bytes object
        if len(key) != SecretBox.KEY_SIZE:
            # Should never happen once models are backfilled
            await self.close(code=4001)
            return

        # 4) Prepare SecretBox and group name
        self.box   = SecretBox(key)

        print(self.box)

        conn = get_redis_connection("default")
        # wrap the .sadd call in sync-to-async
        await database_sync_to_async(conn.sadd)(ONLINE_KEY, self.scope["user"].id)

        await self.channel_layer.group_add(self.group, self.channel_name)

        await self.accept()


    async def disconnect(self, close_code):
        conn = get_redis_connection("default")
        await database_sync_to_async(conn.srem)(ONLINE_KEY, self.scope["user"].id)
        await self.channel_layer.group_discard(self.group, self.channel_name)


    async def receive(self, text_data=None, bytes_data=None):
        """
        Handle only plaintext sends over WS.  Attachments are uploaded
        via the REST endpoint and the front‑end will broadcast their URL
        itself over the same socket; we simply rebroadcast it here.
        """
    
        data = json.loads(text_data)

        # ─── 1) TYPING INDICATOR ────────────────────────────
        if 'typing' in data:
            # broadcast a lightweight typing event
            await self.channel_layer.group_send(
                self.group,
                {
                    "type":   "chat.typing",
                    "sender": self.scope["user"].id,
                    "typing": data["typing"],
                }
            )
            return
        

        plaintext = data.get("text")
        attachment_url = data.get("attachment_url")  # front‑end will include this
        timestamp = data.get("time")


        user = self.scope["user"]

        payload = {
            "type":      "chat.message",
            "sender":    self.scope["user"].id,
            "timestamp": None,
            "cipher":    None,
            "attachment_url": attachment_url,
        }

        # 1) If there's plaintext, encrypt & save a ChatMessage
        if plaintext:
            nonce = nacl.utils.random(SecretBox.NONCE_SIZE)
            cipher = self.box.encrypt(plaintext.encode(), nonce)
            cipher_b64 = base64.b64encode(cipher).decode()

            msg = await self._create_message(self.room, self.scope["user"], cipher_b64)

            payload["cipher"]    = cipher_b64
            payload["timestamp"] = msg.timestamp.isoformat()

            # also ensure reverse contact
            a_id, b_id = self.room.user_a_id, self.room.user_b_id
            other_id   = b_id if user.id == a_id else a_id
            other      = await database_sync_to_async(self.get_user)(other_id)

            await self._ensure_contact(owner=other, contact=user)

        else:
            # 2) No plaintext → must be an attachment broadcast
            #    front‑end already called your AttachmentUploadAPIView,
            #    so DB is up‑to‑date and we just rebroadcast the URL.
            #    We need a timestamp as well; use now()
            from django.utils import timezone
            payload["timestamp"] = timestamp
            # mark audio if the uploaded URL ends in a known audio extension
            url = attachment_url or ""
            payload["audio"] = url.lower().endswith(('.webm', '.ogg', '.mp3', '.wav'))

        # 3) Finally, broadcast to the group
        await self.channel_layer.group_send(self.group, payload)



    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def chat_typing(self, event):
        """
        Received from .group_send whenever someone starts/stops typing.
        We forward the bare typing flag plus sender ID straight to the client.
        """
        await self.send(text_data=json.dumps({
            "typing": event["typing"],
            "sender": event["sender"],
        }))


    def get_user(self, pk):
        from django.contrib.auth import get_user_model
        return get_user_model().objects.get(pk=pk)
    
    @database_sync_to_async
    def _ensure_contact(self, owner, contact):
        # only create if it doesn’t already exist
        Contact.objects.get_or_create(owner=owner, contact=contact)

    @database_sync_to_async
    def _create_message(self, room, sender, cipher):
        return ChatMessage.objects.create(room=room, sender=sender, cipher=cipher)








# class SignalingConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         me = self.scope['user'].id
#         other = int(self.scope['url_route']['kwargs']['other_id'])

#         print(me , other)

#         # build a stable group name
#         a, b = sorted([me, other])
#         self.room_group = f"signaling_{a}_{b}"
#         await self.channel_layer.group_add(self.room_group, self.channel_name)
#         await self.accept()

#     async def disconnect(self, close_code):
#         await self.channel_layer.group_discard(self.room_group, self.channel_name)

#     async def receive(self, text_data):
#         # simply broadcast incoming JSON to group
#         await self.channel_layer.group_send(
#             self.room_group,
#             {'type': 'signal.message', 'payload': text_data}
#         )

#     async def signal_message(self, event):
#         # forward to WebSocket
#         await self.send(text_data=event['payload'])



# class SignalingConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.user_id = self.scope['user'].id
#         other = int(self.scope['url_route']['kwargs']['other_id'])
#         print(self.user_id , other)
#         # build a stable group name
#         a, b = sorted([self.user_id, other])
#         print(a,b)
#         self.room_group = f"signaling_{a}_{b}"
#         print(self.room_group , self.channel_name)
#         await self.channel_layer.group_add(self.room_group, self.channel_name)
#         await self.accept()
#         await self.send(text_data = json.dumps({
#             'type' : 'connection',
#             'data' : {
#                 'message' : "Connected"
#             }
#         }))

#     async def disconnect(self, close_code):
#         await self.channel_layer.group_discard(self.room_group, self.channel_name)

#     async def receive(self, text_data):
#         # Parse and add sender_id before broadcasting
#         data = json.loads(text_data)
#         data['sender_id'] = self.user_id
        
#         await self.channel_layer.group_send(
#             self.room_group,
#             {'type': 'signal.message', 'payload': json.dumps(data)}
#         )

#     async def signal_message(self, event):
#         # forward to WebSocket
#         await self.send(text_data=event['payload'])





# class SignalingConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         """
#         Called when the websocket is handshaking as part of connection.
#         """
#         # Get the user IDs from the URL route.
#         # self.user_id will be the current user's ID, managed by Django's authentication.
#         # For this example, we'll assume the user is authenticated.
#         self.user = self.scope["user"]
#         if not self.user or not self.user.is_authenticated:
#             await self.close()
#             return

#         self.other_user_id = self.scope['url_route']['kwargs']['other_id']
        
#         # Create a unique channel group name for the two users.
#         # The order of user IDs is important to create a consistent group name.
#         user_ids = sorted([self.user.id, self.other_user_id])
#         self.room_group_name = f'call_{user_ids[0]}_{user_ids[1]}'

#         # Join room group
#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         await self.accept()
#         print(f"WebSocket connected for user {self.user.id}. Room: {self.room_group_name}")

#     async def disconnect(self, close_code):
#         """
#         Called when the WebSocket closes for any reason.
#         """
#         print(f"WebSocket disconnected for user {self.user.id}. Close code: {close_code}")
#         # Leave room group
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#     async def receive(self, text_data):
#         """
#         Receive message from WebSocket.
#         This function will process signaling messages from the client.
#         """
#         try:
#             data = json.loads(text_data)
#             message_type = data.get('type')
#             print(f"Received message from {self.user.id}: {message_type}")

#             # The message needs to be sent to the other user in the group.
#             # We add the sender's ID to the message so the recipient knows who it's from.
#             data['from_user_id'] = self.user.id

#             # Send message to room group
#             await self.channel_layer.group_send(
#                 self.room_group_name,
#                 {
#                     'type': 'webrtc_message',
#                     'message': data
#                 }
#             )
#         except json.JSONDecodeError:
#             print("Error: Received invalid JSON")
#         except Exception as e:
#             print(f"An error occurred in receive: {e}")


#     async def webrtc_message(self, event):
#         """
#         Receive message from room group and forward it to the WebSocket.
#         This function is triggered by group_send.
#         """
#         message = event['message']
#         sender_id = message.get('from_user_id')

#         # We only send the message to the *other* user in the channel, not back to the sender.
#         if self.user.id != sender_id:
#             print(f"Sending message from {sender_id} to {self.user.id}: {message.get('type')}")
#             await self.send(text_data=json.dumps(message))







# class SignalingConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         """
#         Called when the websocket is handshaking as part of connection.
#         """
#         # Get the user IDs from the URL route.
#         # self.user_id will be the current user's ID, managed by Django's authentication.
#         # For this example, we'll assume the user is authenticated.
#         self.user = self.scope["user"]
#         if not self.user or not self.user.is_authenticated:
#             await self.close()
#             return

#         self.other_user_id = self.scope['url_route']['kwargs']['other_id']
        
#         # Create a unique channel group name for the two users.
#         # The order of user IDs is important to create a consistent group name.
#         user_ids = sorted([self.user.id, self.other_user_id])
#         self.room_group_name = f'call_{user_ids[0]}_{user_ids[1]}'

#         # Join room group
#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         await self.accept()
#         print(f"WebSocket connected for user {self.user.id}. Room: {self.room_group_name}")

#     async def disconnect(self, close_code):
#         """
#         Called when the WebSocket closes for any reason.
#         """
#         print(f"WebSocket disconnected for user {self.user.id}. Close code: {close_code}")
#         # Leave room group
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#     async def receive(self, text_data):
#         """
#         Receive message from WebSocket.
#         This function will process signaling messages from the client.
#         """
#         try:
#             data = json.loads(text_data)
#             message_type = data.get('type')
#             print(f"Received message from {self.user.id}: {message_type}")

#             # The message needs to be sent to the other user in the group.
#             # We add the sender's ID to the message so the recipient knows who it's from.
#             data['from_user_id'] = self.user.id

#             # Send message to room group
#             await self.channel_layer.group_send(
#                 self.room_group_name,
#                 {
#                     'type': 'webrtc_message',
#                     'message': data
#                 }
#             )
#         except json.JSONDecodeError:
#             print("Error: Received invalid JSON")
#         except Exception as e:
#             print(f"An error occurred in receive: {e}")


#     async def webrtc_message(self, event):
#         """
#         Receive message from room group and forward it to the WebSocket.
#         This function is triggered by group_send.
#         """
#         message = event['message']
#         sender_id = message.get('from_user_id')

#         # We only send the message to the *other* user in the channel, not back to the sender.
#         if self.user.id != sender_id:
#             print(f"Sending message from {sender_id} to {self.user.id}: {message.get('type')}")
#             await self.send(text_data=json.dumps(message))





# class CallConsumer(AsyncWebsocketConsumer):
#         async def connect(self):
#             self.accept()

#             # response to client, that we are connected.
#             self.send(text_data=json.dumps({
#                 'type': 'connection',
#                 'data': {
#                     'message': "Connected"
#                 }
#             }))





# class VideoCallConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         """
#         Called when a user tries to connect to the WebSocket.
#         """
#         # The currently authenticated user.
#         # Assumes you have AuthMiddlewareStack in your asgi.py
#         self.user = self.scope["user"]
#         if not self.user or not self.user.is_authenticated:
#             await self.close()
#             return

#         # Get the other user's ID from the URL.
#         self.other_user_id = self.scope['url_route']['kwargs']['other_user_id']

#         # Create a unique, consistent room name for the two users.
#         # We sort the user IDs to ensure that no matter who initiates the call,
#         # the room name is always the same.
#         user_ids = sorted([self.user.id, self.other_user_id])
#         self.room_group_name = f'call_{user_ids[0]}_{user_ids[1]}'

#         # Join the room group
#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         await self.accept()
#         print(f"User {self.user.id} connected to call group {self.room_group_name}")

#     async def disconnect(self, close_code):
#         """
#         Called when the WebSocket closes.
#         """
#         # Leave the room group
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )
#         print(f"User {self.user.id} disconnected from call group {self.room_group_name}")


#     async def receive(self, text_data):
#         """
#         Receives a message from the WebSocket (from a user's browser).
#         """
#         data = json.loads(text_data)
        
#         # Add the sender's ID to the message payload.
#         # This helps the frontend identify who the message is from.
#         data['from_user_id'] = self.user.id
        
#         # Send the message to the entire room group.
#         # The `type` key corresponds to the method that will be called on consumers in the group.
#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 'type': 'call_message', # This will invoke the `call_message` method
#                 'message': data
#             }
#         )

#     async def call_message(self, event):
#         """
#         This method is called when a message is received from the group.
#         It then forwards the message to the client's WebSocket.
#         """
#         message = event['message']

#         # We only send the message if the recipient is NOT the original sender.
#         # This prevents a user from receiving their own signaling messages.
#         if self.user.id != message.get('from_user_id'):
#             await self.send(text_data=json.dumps(message))
#             print(f"Sent message from {message.get('from_user_id')} to {self.user.id}")




# class VideoCallConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         # identify this user’s personal group
#         self.user = self.scope["user"]
#         # if not self.user.is_authenticated:
#         #     return await self.close()

#         self.group_name = f"user_{self.user.username}"
#         # join personal group
#         await self.channel_layer.group_add(self.group_name, self.channel_name)
#         await self.accept()

#     async def disconnect(self, close_code):
#         # leave personal group
#         await self.channel_layer.group_discard(self.group_name, self.channel_name)

#     async def receive(self, text_data):
#         """
#         Expect JSON with:
#           - type: chat/webrtc.offer/webrtc.answer/webrtc.ice
#           - to:  target username
#           - payload: sdp or candidate
#           - (optional) message: chat text
#         """
#         data = json.loads(text_data)
#         msg_type = data.get("type")
#         target = data.get("to")

#         # forward only signalling and chat messages
#         if msg_type and target:
#             await self.channel_layer.group_send(
#                 f"user_{target}",
#                 {
#                     "type": "forward.message",
#                     "data": data
#                 }
#             )

#     async def forward_message(self, event):
#         """Push forwarded payload to WebSocket"""
#         await self.send(text_data=json.dumps(event["data"]))






# class VideoCallConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         user = self.scope["user"]
#         # only allow logged‑in users
#         # if not user.is_authenticated:
#         #     return await self.close()

#         # group name: e.g. "user_alice"
#         self.group_name = f"user_{user.name}"
#         await self.channel_layer.group_add(self.group_name, self.channel_name)
#         await self.accept()

#     async def disconnect(self, close_code):
#         await self.channel_layer.group_discard(self.group_name, self.channel_name)

#     async def receive(self, text_data):
#         """
#         Handle incoming JSON messages of types:
#           - video.call_request / video.call_accept / video.call_reject
#           - webrtc.offer / webrtc.answer / webrtc.ice
#         Expect payload:
#           { type, to, [from], [sdp], [candidate] }
#         """
#         data = json.loads(text_data)
#         msg_type = data.get("type")
#         target   = data.get("to")
#         sender   = self.scope["user"].name

#         # enforce a “from” field
#         data["from"] = data.get("from", sender)

#         valid_types = {
#             "video.call_request",
#             "video.call_accept",
#             "video.call_reject",
#             "webrtc.offer",
#             "webrtc.answer",
#             "webrtc.ice",
#         }

#         if msg_type in valid_types and target:
#             # forward the message to the target’s group
#             await self.channel_layer.group_send(
#                 f"user_{target}",
#                 {
#                     "type": "signaling.message",
#                     "data": data
#                 }
#             )

#     async def signaling_message(self, event):
#         """
#         Push forwarded signaling payload back down the WebSocket.
#         """
#         await self.send(text_data=json.dumps(event["data"]))




# class VideoCallConsumer(AsyncJsonWebsocketConsumer):
#     async def connect(self):
#         await self.accept()

#     async def recieve_json(self , content):
#         if(content['command'] == 'join_room'):
#             await self.channel_layer.group_add(content['room'] , self.channel_name)
#         elif(content['command'] == 'join'):
#             await self.channel_layer.group_send(content['room'] , {
#                 'type' : 'join.message',
#             })
#         elif(content['command'] == 'offer'):
#             await self.channel_layer.group_send(content['room'] , {
#                 'type' : 'offer.message',
#                 'offer' : content['offer']
#             })
#         elif(content['command'] == 'answer'):
#             await self.channel_layer.group_send(content['room'] , {
#                 'type' : 'answer.message',
#                 'answer' : content['answer']
#             })
#         elif(content['command'] == 'candidate'):
#             await self.channel_layer.group_send(content['room'] , {
#                 'type' : 'candidate.message',
#                 'candidate' : content['candidate']
#             })

#     async def join_message(self , event):
#         await self.send_json({
#             'command' : 'join'
#         })

#     async def offer_message(self , event):
#         await self.send_json({
#             'command':'offer' ,
#             'offer' : event['offer']
#         })

#     async def answer_message(self , event):
#         await self.send_json({
#             'command' : 'answer',
#             'answer' : event['answer']
#         })

#     async def candidate_message(self , event):
#         await self.send_json({
#             'command' : 'candidate',
#             'answer' : event['candidate']
#         })






# class VideoCallConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.room_group_name = 'Test-Room'

#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )

#         await self.accept()
    
#     async def disconnect(self , close_code):
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )

#         print('Disconnected!')

    
#     async def receive(self , text_data):
#         receive_dict = json.loads(text_data)
#         message = receive_dict['message']

#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 'type' : 'send.message',
#                 'message' : message
#             }
#         )

#     async def send_message(self , event):
#         message = event['message']

#         await self.send(text_data = json.dumps({
#             'message' : message
#         }))





# class SignalingConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.user_id = self.scope['user'].id
#         other = int(self.scope['url_route']['kwargs']['other_id'])
#         # build a stable group name
#         a, b = sorted([self.user_id, other])
#         self.room_group = f"signaling_{a}_{b}"
#         await self.channel_layer.group_add(self.room_group, self.channel_name)
#         await self.accept()

#     async def disconnect(self, close_code):
#         await self.channel_layer.group_discard(self.room_group, self.channel_name)

#     async def receive(self, text_data):
#         # Parse and add sender_id before broadcasting
#         data = json.loads(text_data)
#         data['sender_id'] = self.user_id

#         print('step 7')
        
#         await self.channel_layer.group_send(
#             self.room_group,
#             {'type': 'signal.message', 'payload': json.dumps(data)}
#         )

#     async def signal_message(self, event):
#         # forward to WebSocket
#         await self.send(text_data=event['payload'])






# chat/consumers.py (excerpt)
class GlobalSignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            return await self.close()
        self.group_name = f"signaling_user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        msg = json.loads(text_data)
        target = msg.get("target_user_id")
        if not target:
            return
        # forward to the target’s personal group
        await self.channel_layer.group_send(
            f"signaling_user_{target}",
            {"type": "signal.message", "payload": text_data}
        )

    async def signal_message(self, event):
        await self.send(text_data=event["payload"])
