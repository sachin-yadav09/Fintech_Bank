# userauths\otp_service.py
import random
import string
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

from .sms_service import send_sms
from .email_service import send_otp_email


def generate_otp(length=6):
    """Generate numeric OTP"""
    return ''.join(random.choices(string.digits, k=length))


def _log_otp(otp_code, contact, method):
    """Debug log for development environments."""
    print(f"[MOCK OTP] {method} -> {contact} : {otp_code}")


def create_otp(mobile_number, purpose="LOGIN", email=None, delivery_method="SMS"):
    """
    Create and send OTP.
    Returns: (otp_id, otp_code)
    """
    otp_code = generate_otp(getattr(settings, "OTP_LENGTH", 6))

    otp_id = f"otp_{mobile_number or email}_{purpose}_{int(timezone.now().timestamp())}"
    cache_key = f"otp:{otp_id}"

    otp_data = {
        "code": otp_code,
        "mobile_number": mobile_number,
        "email": email,
        "purpose": purpose,
        "delivery_method": delivery_method,
        "created_at": timezone.now().isoformat(),
    }

    # Store in cache
    cache.set(
        cache_key,
        otp_data,
        timeout=getattr(settings, "OTP_EXPIRY_MINUTES", 5) * 60
    )

    message = (
        f"Your FinanceOS OTP is {otp_code}. "
        f"Valid for {getattr(settings, 'OTP_EXPIRY_MINUTES', 5)} minutes. "
        f"Do not share it."
    )

    # Send via SMS
    if delivery_method in ("SMS", "BOTH") and mobile_number:
        try:
            send_sms(mobile_number, message)
        except Exception as e:
            print(f"[OTP ERROR] SMS failed: {e}")
            if getattr(settings, "SMS_PROVIDER", "mock") == "mock":
                _log_otp(otp_code, mobile_number, "SMS")

    # Send via Email
    if delivery_method in ("EMAIL", "BOTH") and email:
        try:
            sent = send_otp_email(email, otp_code)
            if not sent:
                raise Exception("Email backend returned False")
        except Exception as e:
            print(f"[OTP ERROR] Email failed: {e}")
            if settings.DEBUG:
                _log_otp(otp_code, email, "EMAIL")

    return otp_id, otp_code


def verify_otp(otp_id, otp_code):
    """
    Verify OTP
    Returns: (bool, message)
    """
    cache_key = f"otp:{otp_id}"
    stored_data = cache.get(cache_key)

    if not stored_data:
        return False, "OTP expired or invalid"

    if stored_data["code"] != otp_code:
        return False, "Incorrect OTP"

    # Delete after successful verification
    cache.delete(cache_key)

    return True, "OTP verified successfully"


def resend_otp(otp_id):
    """
    Resend OTP using same data
    """
    cache_key = f"otp:{otp_id}"
    stored_data = cache.get(cache_key)

    if not stored_data:
        return False, "OTP expired"

    mobile_number = stored_data.get("mobile_number")
    email = stored_data.get("email")
    otp_code = stored_data["code"]
    delivery_method = stored_data.get("delivery_method", "SMS")

    message = f"Your FinanceOS OTP is {otp_code}. Valid for {getattr(settings, 'OTP_EXPIRY_MINUTES', 5)} minutes."

    # Resend SMS
    if delivery_method in ("SMS", "BOTH") and mobile_number:
        try:
            send_sms(mobile_number, message)
        except Exception as e:
            print(f"[RESEND ERROR] SMS: {e}")
            return False, "Failed to resend OTP via SMS"

    # Resend Email
    if delivery_method in ("EMAIL", "BOTH") and email:
        try:
            sent = send_otp_email(email, otp_code)
            if not sent:
                raise Exception("Email backend returned False")
        except Exception as e:
            print(f"[RESEND ERROR] Email: {e}")
            return False, "Failed to resend OTP via email"

    return True, "OTP resent successfully"


def invalidate_otp(otp_id):
    """Delete OTP manually"""
    cache.delete(f"otp:{otp_id}")

