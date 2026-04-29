from django.contrib.auth.hashers import make_password, check_password
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from userauths import serializers as userauths_serializers
from userauths import models as userauths_models
from userauths.bank_service import verify_bank_account
from userauths.otp_service import create_otp, verify_otp
from userauths.email_service import send_welcome_email
from core import models as core_models

import requests as http_requests
import re


# ─────────────────────────── helpers ────────────────────────────────────────

def _set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        key="refresh",
        value=str(refresh_token),
        httponly=True,
        max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
        secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
    )


def _send_sms_otp(phone_number: str, otp_code: str) -> bool:
    """Dev fallback — prints OTP to console."""
    print(f"[DEV OTP] {phone_number} → {otp_code}")
    return True


def _normalize_phone(phone: str) -> str:
    """Strip spaces; add +91 prefix for bare 10-digit Indian numbers."""
    phone = phone.strip().replace(' ', '')
    if re.match(r'^\d{10}$', phone):
        phone = '+91' + phone
    return phone


def _user_payload(user) -> dict:
    """Consistent user dict returned to frontend on every auth response."""
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email or '',
        'phone_number': user.phone_number or '',
        'phone_verified': user.phone_verified,
        'has_pin': bool(user.transaction_pin),
    }


# ─────────────────────────── OTP send ───────────────────────────────────────

class SendOTPView(APIView):
    """
    POST {
        "phone_number": "9876543210",   # required for SMS / BOTH
        "email": "user@example.com",     # required for EMAIL / BOTH
        "purpose": "LOGIN" | "REGISTER",
        "delivery_method": "SMS" | "EMAIL" | "BOTH"   # default: SMS
    }
    Returns { "otp_id": <int>, "message": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get('phone_number', ''))
        email = (request.data.get('email') or '').strip().lower()
        purpose_raw = (request.data.get('purpose') or 'LOGIN').upper()
        delivery_method = (request.data.get('delivery_method') or 'SMS').upper()

        if delivery_method not in ('SMS', 'EMAIL', 'BOTH'):
            return Response(
                {'error': 'delivery_method must be SMS, EMAIL, or BOTH.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate contact info based on delivery method
        if delivery_method in ('SMS', 'BOTH'):
            if not re.match(r'^\+?\d{10,15}$', phone):
                return Response(
                    {'error': 'Enter a valid phone number.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if delivery_method in ('EMAIL', 'BOTH'):
            if not email:
                return Response(
                    {'error': 'Email is required for EMAIL delivery.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                validate_email(email)
            except ValidationError:
                return Response(
                    {'error': 'Enter a valid email address.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if purpose_raw == 'LOGIN':
            # Find user by phone or email
            user = None
            if delivery_method in ('SMS', 'BOTH') and phone:
                try:
                    user = userauths_models.User.objects.get(phone_number=phone)
                except userauths_models.User.DoesNotExist:
                    pass
            if delivery_method in ('EMAIL', 'BOTH') and email and not user:
                try:
                    user = userauths_models.User.objects.get(email=email)
                except userauths_models.User.DoesNotExist:
                    pass

            if not user:
                return Response(
                    {'error': 'No account found. Please register.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Invalidate old login OTPs for this user
            userauths_models.OTP.objects.filter(
                user=user, purpose=userauths_models.OTP.Purpose.LOGIN, is_used=False
            ).update(is_used=True)

            otp = userauths_models.OTP.objects.create(
                user=user,
                code=userauths_models.OTP.generate_code(),
                purpose=userauths_models.OTP.Purpose.LOGIN,
                delivery_method=getattr(
                    userauths_models.OTP.DeliveryMethod, delivery_method
                ),
            )

            # Send via SMS
            if delivery_method in ('SMS', 'BOTH'):
                sent = _send_sms_otp(phone, otp.code)
                if not sent and delivery_method == 'SMS':
                    otp.delete()
                    return Response(
                        {'error': 'Failed to send OTP. Try again later.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

            # Send via Email
            if delivery_method in ('EMAIL', 'BOTH'):
                target_email = email if delivery_method == 'EMAIL' else (user.email or email)
                if target_email:
                    from userauths.email_service import send_otp_email
                    sent = send_otp_email(target_email, otp.code)
                    if not sent and delivery_method == 'EMAIL':
                        otp.delete()
                        return Response(
                            {'error': 'Failed to send OTP via email. Try again later.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE,
                        )

            contact_display = phone if delivery_method in ('SMS', 'BOTH') else email
            return Response(
                {
                    'otp_id': otp.id,
                    'message': f'OTP sent to {contact_display}. Valid for 10 minutes.',
                    'delivery_method': delivery_method,
                },
                status=status.HTTP_200_OK,
            )

        elif purpose_raw == 'REGISTER':
            # Check if contact already registered
            if delivery_method in ('SMS', 'BOTH') and phone:
                if userauths_models.User.objects.filter(phone_number=phone).exists():
                    return Response(
                        {'error': 'An account already exists with this number. Please login.'},
                        status=status.HTTP_409_CONFLICT,
                    )
            if delivery_method in ('EMAIL', 'BOTH') and email:
                if userauths_models.User.objects.filter(email=email).exists():
                    return Response(
                        {'error': 'An account already exists with this email. Please login.'},
                        status=status.HTTP_409_CONFLICT,
                    )

            # Invalidate old pending OTPs for this contact
            if phone:
                userauths_models.PendingOTP.objects.filter(
                    phone_number=phone, is_used=False
                ).update(is_used=True)
            if email:
                userauths_models.PendingOTP.objects.filter(
                    email=email, is_used=False
                ).update(is_used=True)

            otp = userauths_models.PendingOTP.objects.create(
                phone_number=phone or None,
                email=email or None,
                code=userauths_models.OTP.generate_code(),
            )

            # Send via SMS
            if delivery_method in ('SMS', 'BOTH') and phone:
                sent = _send_sms_otp(phone, otp.code)
                if not sent and delivery_method == 'SMS':
                    otp.delete()
                    return Response(
                        {'error': 'Failed to send OTP. Try again later.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

            # Send via Email
            if delivery_method in ('EMAIL', 'BOTH') and email:
                from userauths.email_service import send_otp_email
                sent = send_otp_email(email, otp.code)
                if not sent and delivery_method == 'EMAIL':
                    otp.delete()
                    return Response(
                        {'error': 'Failed to send OTP via email. Try again later.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

            contact_display = phone if delivery_method in ('SMS', 'BOTH') else email
            return Response(
                {
                    'otp_id': otp.id,
                    'message': f'OTP sent to {contact_display}. Valid for 10 minutes.',
                    'delivery_method': delivery_method,
                },
                status=status.HTTP_200_OK,
            )

        else:
            return Response(
                {'error': 'purpose must be LOGIN or REGISTER.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ─────────────────────────── Register ───────────────────────────────────────

class RegisterView(APIView):
    """
    POST {
        phone_number, email, otp_id, otp_code,
        full_name, password, delivery_method?
    }
    Verifies PendingOTP → creates User + Wallet → returns access + user.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get('phone_number', ''))
        email = (request.data.get('email') or '').strip().lower()
        otp_id = request.data.get('otp_id')
        otp_code = (request.data.get('otp_code') or '').strip()
        full_name = (request.data.get('full_name') or '').strip()
        password = request.data.get('password', '')
        delivery_method = (request.data.get('delivery_method') or 'SMS').upper()

        if not all([otp_id, otp_code, full_name, password]):
            return Response(
                {'error': 'otp_id, otp_code, full_name and password are all required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(full_name) < 2:
            return Response({'error': 'Full name is too short.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        # At least one contact method must be provided
        if not phone and not email:
            return Response(
                {'error': 'Either phone_number or email is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for existing accounts
        if phone and userauths_models.User.objects.filter(phone_number=phone).exists():
            return Response({'error': 'An account already exists with this number.'}, status=status.HTTP_409_CONFLICT)
        if email and userauths_models.User.objects.filter(email=email).exists():
            return Response({'error': 'An account already exists with this email.'}, status=status.HTTP_409_CONFLICT)

        # Verify pending OTP — flexible lookup by id + code, then validate contact
        try:
            pending = userauths_models.PendingOTP.objects.get(
                id=otp_id, code=otp_code, is_used=False
            )
        except userauths_models.PendingOTP.DoesNotExist:
            return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        if not pending.is_valid():
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate that the OTP matches the contact being registered
        if pending.phone_number and phone and pending.phone_number != phone:
            return Response({'error': 'OTP does not match the provided phone number.'}, status=status.HTTP_400_BAD_REQUEST)
        if pending.email and email and pending.email != email:
            return Response({'error': 'OTP does not match the provided email.'}, status=status.HTTP_400_BAD_REQUEST)

        pending.is_used = True
        pending.save(update_fields=['is_used'])

        # Build unique username from full name
        base = re.sub(r'[^a-z0-9]', '_', full_name.lower())
        username = base
        counter = 1
        while userauths_models.User.objects.filter(username=username).exists():
            username = f"{base}_{counter}"
            counter += 1

        # Use provided email or a placeholder so Django's unique constraint is satisfied
        user_email = email if email else f"{phone.lstrip('+')}@wallet.local"

        user = userauths_models.User.objects.create_user(
            username=username,
            email=user_email,
            password=password,
            phone_number=phone or None,
            phone_verified=bool(phone),
        )
        parts = full_name.split(maxsplit=1)
        user.first_name = parts[0]
        user.last_name = parts[1] if len(parts) > 1 else ''
        user.save(update_fields=['first_name', 'last_name'])

        core_models.Wallet.objects.get_or_create(user=user)

        # Send welcome email if we have a real email address
        if email and '@wallet.local' not in user_email:
            try:
                send_welcome_email(user_email, username)
            except Exception as e:
                print(f"[WELCOME EMAIL ERROR] {e}")

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                'access': str(refresh.access_token),
                'user': _user_payload(user),
                'message': 'Account created successfully.',
            },
            status=status.HTTP_201_CREATED,
        )
        _set_refresh_cookie(response, refresh)
        return response


# ─────────────────────────── Login (OTP-based) ──────────────────────────────

class LoginView(APIView):
    """
    POST {
        phone_number?, email?, otp_id, otp_code,
        delivery_method?: "SMS" | "EMAIL" | "BOTH"
    }
    Returns { access, user }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get('phone_number', ''))
        email = (request.data.get('email') or '').strip().lower()
        otp_id = request.data.get('otp_id')
        otp_code = (request.data.get('otp_code') or '').strip()
        delivery_method = (request.data.get('delivery_method') or 'SMS').upper()

        if not otp_id or not otp_code:
            return Response(
                {'error': 'otp_id and otp_code are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find user by phone or email
        user = None
        if phone:
            try:
                user = userauths_models.User.objects.get(phone_number=phone)
            except userauths_models.User.DoesNotExist:
                pass
        if email and not user:
            try:
                user = userauths_models.User.objects.get(email=email)
            except userauths_models.User.DoesNotExist:
                pass

        if not user:
            return Response(
                {'error': 'No account found with this contact.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        otp = userauths_models.OTP.objects.filter(
            id=otp_id,
            user=user,
            code=otp_code,
            purpose=userauths_models.OTP.Purpose.LOGIN,
            is_used=False,
        ).first()

        if not otp or not otp.is_valid():
            return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        refresh = RefreshToken.for_user(user)
        response = Response(
            {'access': str(refresh.access_token), 'user': _user_payload(user)},
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, refresh)
        return response


# ─────────────────────────── Logout ─────────────────────────────────────────

class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token not found."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
            response = Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
            response.delete_cookie("refresh")
            return response
        except (TokenError, InvalidToken):
            return Response({"error": "Invalid or expired refresh token."}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────── Profile ────────────────────────────────────────

class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_user_payload(request.user), status=status.HTTP_200_OK)


class UserUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        data = request.data
        errors = {}

        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip()
        current_password = (data.get("current_password") or "").strip()
        new_password = (data.get("new_password") or "").strip()

        if username:
            if userauths_models.User.objects.exclude(pk=user.pk).filter(username=username).exists():
                errors["username"] = "This username is already taken."
            else:
                user.username = username

        if email:
            if userauths_models.User.objects.exclude(pk=user.pk).filter(email=email).exists():
                errors["email"] = "This email is already in use."
            else:
                user.email = email

        if new_password:
            if not current_password:
                errors["current_password"] = "Current password is required."
            elif not user.check_password(current_password):
                errors["current_password"] = "Current password is incorrect."
            else:
                user.set_password(new_password)

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user.save()
        return Response({"message": "Profile updated.", "user": _user_payload(user)}, status=status.HTTP_200_OK)


# ─────────────────────────── KYC ────────────────────────────────────────────

class KYCView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        kyc = get_object_or_404(userauths_models.KYC, user=request.user)
        serializer = userauths_serializers.KYCSerializer(kyc)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KYCCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = userauths_serializers.KYCCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            kyc = serializer.save()
            return Response({
                "message": "KYC created successfully.",
                "kyc": {
                    "full_name": kyc.full_name,
                    "date_of_birth": kyc.date_of_birth,
                    "id_type": kyc.id_type,
                    "id_image": kyc.id_image,
                    "verification_status": kyc.verification_status,
                    "created_at": kyc.created_at,
                    "updated_at": kyc.updated_at,
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────── JWT cookie refresh ──────────────────────────────

class CookieTokenRefreshSerializer(TokenRefreshSerializer):
    refresh = None

    def validate(self, attrs):
        attrs['refresh'] = self.context['request'].COOKIES.get('refresh')
        if not attrs['refresh']:
            raise InvalidToken('No valid refresh token found in cookie.')
        return super().validate(attrs)


class CookieTokenRefreshView(SimpleJWTTokenRefreshView):
    serializer_class = CookieTokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop('refresh', None)
            if refresh_token:
                _set_refresh_cookie(response, refresh_token)
        return response


# ─────────────────────────── Transaction PIN ────────────────────────────────

class SetTransactionPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        pin = (request.data.get("pin") or "").strip()
        confirm_pin = (request.data.get("confirm_pin") or "").strip()
        current_pin = (request.data.get("current_pin") or "").strip()

        if not pin or not confirm_pin:
            return Response({"detail": "pin and confirm_pin are required."}, status=status.HTTP_400_BAD_REQUEST)
        if not pin.isdigit() or len(pin) != 4:
            return Response({"detail": "PIN must be exactly 4 digits."}, status=status.HTTP_400_BAD_REQUEST)
        if pin != confirm_pin:
            return Response({"detail": "PINs do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if user.transaction_pin:
            if not current_pin:
                return Response({"detail": "current_pin is required to change an existing PIN."}, status=status.HTTP_400_BAD_REQUEST)
            if not check_password(current_pin, user.transaction_pin):
                return Response({"detail": "Current PIN is incorrect."}, status=status.HTTP_403_FORBIDDEN)

        user.transaction_pin = make_password(pin)
        user.save(update_fields=["transaction_pin"])
        return Response({"message": "Transaction PIN set successfully."}, status=status.HTTP_200_OK)


# ─────────────────────────── Bank Account ───────────────────────────────────

class SendBankOTPView(APIView):
    """
    POST { "mobile_number": "9876543210", "email"?: "user@example.com" }
    Returns { "otp_id": <str>, "message": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mobile = request.data.get("mobile_number", "").strip()
        email = (request.data.get("email") or "").strip().lower()

        if not re.match(r"^\+?\d{10,15}$", mobile):
            return Response({"error": "Enter a valid mobile number."}, status=status.HTTP_400_BAD_REQUEST)

        otp_id, otp_code = create_otp(
            mobile,
            purpose="BANK_VERIFY",
            email=email if email else None,
            delivery_method="BOTH" if email else "SMS",
        )

        msg = f"OTP sent to {mobile}."
        if email:
            msg += f" A copy was also sent to {email}."
        msg += " Valid for 5 minutes."

        return Response(
            {"otp_id": otp_id, "message": msg},
            status=status.HTTP_200_OK,
        )


class LinkBankAccountView(APIView):
    """
    POST {
        bank_name, account_number, ifsc_code,
        account_holder_name, registered_mobile,
        otp_id, otp_code
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        bank_name = (data.get("bank_name") or "").strip().upper()
        account_number = (data.get("account_number") or "").strip()
        ifsc_code = (data.get("ifsc_code") or "").strip().upper()
        account_holder_name = (data.get("account_holder_name") or "").strip()
        registered_mobile = (data.get("registered_mobile") or "").strip()
        otp_id = data.get("otp_id")
        otp_code = (data.get("otp_code") or "").strip()

        if not all([bank_name, account_number, ifsc_code, account_holder_name, registered_mobile, otp_id, otp_code]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP
        valid, msg = verify_otp(otp_id, otp_code)
        if not valid:
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

        # Verify bank account via mock service
        user_mobile = user.phone_number or ""
        result = verify_bank_account(
            account_number=account_number,
            ifsc_code=ifsc_code,
            account_holder_name=account_holder_name,
            registered_mobile=registered_mobile,
            user_mobile=user_mobile,
        )

        if not result["verified"]:
            return Response({"error": result["error"]}, status=status.HTTP_400_BAD_REQUEST)

        # Check uniqueness
        if userauths_models.BankAccount.objects.filter(user=user, account_number=account_number).exists():
            return Response({"error": "This account is already linked."}, status=status.HTTP_409_CONFLICT)

        # Create bank account
        bank_account = userauths_models.BankAccount.objects.create(
            user=user,
            bank_name=bank_name,
            account_number=account_number,
            ifsc_code=ifsc_code,
            account_holder_name=account_holder_name,
            registered_mobile=registered_mobile,
            verification_status=userauths_models.BankAccount.VerificationStatus.VERIFIED,
            verification_ref=result.get("reference"),
            is_primary=not user.bank_accounts.exists(),
        )

        serializer = userauths_serializers.BankAccountSerializer(bank_account)
        return Response(
            {"message": "Bank account linked successfully.", "account": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class BankAccountListView(APIView):
    """GET — list authenticated user's bank accounts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accounts = userauths_models.BankAccount.objects.filter(user=request.user)
        serializer = userauths_serializers.BankAccountSerializer(accounts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BankAccountDetailView(APIView):
    """DELETE — remove account. PATCH — set as primary."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            account = userauths_models.BankAccount.objects.get(pk=pk, user=request.user)
        except userauths_models.BankAccount.DoesNotExist:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

        account.delete()
        return Response({"message": "Account removed successfully."}, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        try:
            account = userauths_models.BankAccount.objects.get(pk=pk, user=request.user)
        except userauths_models.BankAccount.DoesNotExist:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.data.get("set_as_primary"):
            # Unset all other primary accounts
            userauths_models.BankAccount.objects.filter(user=request.user).update(is_primary=False)
            account.is_primary = True
            account.save(update_fields=["is_primary"])

        serializer = userauths_serializers.BankAccountSerializer(account)
        return Response(serializer.data, status=status.HTTP_200_OK)

