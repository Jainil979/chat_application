# chat/routing.py
from django.urls import re_path , path
from .consumers  import ChatConsumer  , GlobalSignalingConsumer
websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<other_id>\d+)/$', ChatConsumer.as_asgi()),
    # path('/ws/signaling/<int:other_user_id>/', SignalingConsumer.as_asgi()),
    # re_path(r"ws/call/(?P<username>\w+)/$", VideoCallConsumer.as_asgi()),
    # re_path(r"ws/videocall/(?P<username>\w+)/$", VideoCallConsumer.as_asgi()),
    # re_path(r'ws/videocall/', VideoCallConsumer.as_asgi()),
    # path('ws/signaling/<int:other_id>/', SignalingConsumer.as_asgi()),
     path("ws/signaling/", GlobalSignalingConsumer.as_asgi()),    
]


