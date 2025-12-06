# chat/routing.py
from django.urls import re_path , path
from .consumers  import ChatConsumer  , GlobalSignalingConsumer
websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<other_id>\d+)/$', ChatConsumer.as_asgi()),
     path("ws/signaling/", GlobalSignalingConsumer.as_asgi()),    
]


