from django.urls import path
from core.views import *

urlpatterns = [
    path('' , home , name='home'),
    # path('sign/' , sign , name='sign'),
    # path('log/' , log , name='log'),
    path('chats/' , chat , name='chat')
]