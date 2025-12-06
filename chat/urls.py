from django.urls import path
from django.views.generic import TemplateView
from chat.views import *

urlpatterns = [
    path('dashboard/' , ChatUI.as_view() , name='chat_ui'),
    path('profile/' , ProfilePageView.as_view() , name='profile_page'),
    # path('emoji/' , emoji , name='emoji'),
    path('ws-test/', TemplateView.as_view(template_name='chat/ws_test.html'), name='ws_test'),
    path('api/contacts/', ContactList.as_view(), name='chat_contacts'),
    path("api/profile/", ProfileAPIView.as_view(), name="api_profile"),
    path('api/with/<int:other_id>/', ChatHistory.as_view(), name='chat_history'),   
    path('api/add_user/', AddUserAPIView.as_view(), name='chat_add_user'),
    path('api/delete_user/<int:other_id>/', DeleteUserAPIView.as_view(), name='chat_delete_user'),
    path('api/rooms/<int:room_id>/upload/', AttachmentUploadAPIView.as_view()),
]