# backend\userauths\models.py
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
import random
import uuid


class User(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(unique=True, max_length=50)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    phone_verified = models.BooleanField(default=False)
    transaction_pin = models.CharField(max_length=128, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class OTP(models.Model):
    """OTP tied to an existing User (used for LOGIN and post-registration PHONE_VERIFY)."""

    class Purpose(models.TextChoices):
        PHONE_VERIFY = 'PHONE_VERIFY', 'Phone Verification'
        LOGIN = 'LOGIN', 'Login'
        TRANSACTION = 'TRANSACTION', 'Transaction Auth'

    class DeliveryMethod(models.TextChoices):
        SMS = 'SMS', 'SMS'
        EMAIL = 'EMAIL', 'Email'
        BOTH = 'BOTH', 'Both'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.LOGIN)
    delivery_method = models.CharField(max_length=10, choices=DeliveryMethod.choices, default=DeliveryMethod.SMS)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.pk:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=10)
        super().save(*args, **kwargs)

    @staticmethod
    def generate_code() -> str:
        return str(random.randint(100000, 999999))

    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP({self.user.email}, {self.purpose}, used={self.is_used})"


class PendingOTP(models.Model):
    """
    OTP for contacts that do not yet have a User account.
    Created during REGISTER flow; consumed when the account is actually created.
    Supports both SMS (phone_number) and EMAIL delivery.
    """
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.pk:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=10)
        super().save(*args, **kwargs)

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.phone_number and not self.email:
            raise ValidationError("Either phone_number or email must be provided.")

    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        contact = self.phone_number or self.email
        return f"PendingOTP({contact}, used={self.is_used})"


class KYC(models.Model):
    class VerificationStatus(models.TextChoices):
        UNVERIFIED = 'UNVERIFIED', 'Unverified'
        PENDING = 'PENDING', 'Pending Review'
        VERIFIED = 'VERIFIED', 'Verified'
        REJECTED = 'REJECTED', 'Rejected'

    class IDType(models.TextChoices):
        NATIONAL_ID = 'NATIONAL_ID', 'National ID Card'
        DRIVERS_LICENSE = 'DRIVERS_LICENSE', "Driver's License"
        PASSPORT = 'PASSPORT', 'International Passport'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="kyc_profile")
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.UNVERIFIED
    )
    id_type = models.CharField(max_length=28, choices=IDType.choices, default=IDType.NATIONAL_ID)
    id_image = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KYC for {self.user.email}"

    class Meta:
        verbose_name = "KYC Record"
        verbose_name_plural = "KYC Records"
        ordering = ['-created_at']


class BankAccount(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Verification'
        VERIFIED = 'VERIFIED', 'Verified'
        FAILED = 'FAILED', 'Verification Failed'

    class BankName(models.TextChoices):
        SBI = 'SBI', 'State Bank of India'
        HDFC = 'HDFC', 'HDFC Bank'
        ICICI = 'ICICI', 'ICICI Bank'
        AXIS = 'AXIS', 'Axis Bank'
        KOTAK = 'KOTAK', 'Kotak Mahindra Bank'
        YES = 'YES', 'Yes Bank'
        PNB = 'PNB', 'Punjab National Bank'
        BOB = 'BOB', 'Bank of Baroda'
        CANARA = 'CANARA', 'Canara Bank'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bank_accounts')
    bank_name = models.CharField(max_length=20, choices=BankName.choices)
    account_number = models.CharField(max_length=18)
    ifsc_code = models.CharField(max_length=11)
    account_holder_name = models.CharField(max_length=255)
    registered_mobile = models.CharField(max_length=15)
    verification_status = models.CharField(max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING)
    verification_ref = models.CharField(max_length=100, blank=True, null=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('user', 'account_number')

    def __str__(self):
        return f"{self.bank_name} - {self.account_number[-4:]} ({self.user.username})"
