from django.shortcuts import render

def home(request):
    return render(request , 'core/new.html')

# def sign(request):
#     return render(request , 'core/sign.html')

# def log(request):
#     return render(request , 'core/log.html')

def chat(request):
    return render(request , 'core/final_chat.html')