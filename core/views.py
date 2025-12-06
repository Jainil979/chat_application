from django.shortcuts import render

def home(request):
    return render(request , 'core/new.html')


def chat(request):
    return render(request , 'core/final_chat1.html')