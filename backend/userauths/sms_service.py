# # backend\userauths\sms_service.py
# from django.conf import settings

# def send_sms(mobile_number, message):
#     provider = settings.SMS_PROVIDER
    

#     if provider == 'mock':
#         print(f"[MOCK SMS] To: {mobile_number}")
#         print(f"[MOCK SMS] Message: {message}")
#         return True
    
#     elif provider == 'twilio':
#         from twilio.rest import Client
#         client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
#         client.messages.create(
#             body=message,
#             from_=settings.TWILIO_PHONE_NUMBER,
#             to=mobile_number
#         )
#         return True
    
#     elif provider == 'msg91':
#         import requests
#         url = "https://api.msg91.com/api/v5/flow/"
#         payload = {
#             "sender": settings.MSG91_SENDER_ID,
#             "mobiles": mobile_number,
#             "message": message,
#         }
#         headers = {
#             "authkey": settings.MSG91_AUTH_KEY,
#             "content-type": "application/json"
#         }
#         response = requests.post(url, json=payload, headers=headers)
#         return response.status_code == 200
    
#     else:
#         raise ValueError(f"Unknown SMS provider: {provider}")
import requests
from django.conf import settings


def send_sms(mobile_number, message):
    provider = getattr(settings, "SMS_PROVIDER", "mock")

    # ✅ MOCK (for development)
    if provider == "mock":
        print(f"[MOCK SMS] To: {mobile_number}")
        print(f"[MOCK SMS] Message: {message}")
        return True

    # ✅ FAST2SMS
    elif provider == "fast2sms":
        url = "https://www.fast2sms.com/dev/bulkV2"

        payload = {
            "variables_values": message.split()[-1],  # OTP extraction
            "route": "otp",
            "numbers": mobile_number
        }

        headers = {
            "authorization": settings.FAST2SMS_API_KEY,
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            data = response.json()

            if data.get("return") is True:
                return True
            else:
                print("Fast2SMS Error:", data)
                return False

        except Exception as e:
            print("Fast2SMS Exception:", e)
            return False

    else:
        raise ValueError(f"Unknown SMS provider: {provider}")