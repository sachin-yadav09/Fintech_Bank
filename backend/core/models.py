# backend\core\models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

import uuid
from decimal import Decimal

class Beneficiary(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="beneficiaries")
    beneficiary_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="benefactors")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "beneficiary_user")
        ordering = ['-created_at']


class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default="0.00")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    wallet_id = models.CharField(max_length=10, unique=True, editable=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s wallet {self.wallet_id}"
    
    def save(self, *args, **kwargs):
        if not self.wallet_id:
            self.wallet_id = str(uuid.uuid4().int)[:10]
        super().save(*args, **kwargs)

class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', 'Deposit'
        TRANSFER = 'TRANSFER', 'Transfer'
        WITHDRAWAL = 'WITHDRAWAL', 'Withdrawal'
        SAVINGS = 'SAVINGS', 'Savings'

    class TransactionStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESSFUL = 'SUCCESSFUL', 'Successful'
        FAILED = 'FAILED', 'Failed'

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default="0.00")
    reference = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    external_reference = models.CharField(max_length=20, blank=True, null=True)
    
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="sent_transactions", blank=True, null=True)
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="received_transactions", blank=True, null=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.transaction_type} of {self.amount} for {self.wallet.user.username} - {self.status}"
    

class Notification(models.Model):
    class TransactionType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', 'Deposit'
        TRANSFER = 'TRANSFER', 'Transfer'
        WITHDRAWAL = 'WITHDRAWAL', 'Withdrawal'
        SAVINGS = 'SAVINGS', 'Savings'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, null=True, blank=True)
    notification_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        default=None,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=100)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"
    
class SavingsGoal(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='savings_goals')
    name = models.CharField(max_length=100)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    target_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=True, unique=True)

    def __str__(self):
        return f"'{self.name}' goal for {self.wallet.user.username}"

    @property
    def progress_percentage(self):
        if self.target_amount > 0:
            return (self.current_amount / self.target_amount) * 100
        return 0

class Loan(models.Model):
    class LoanType(models.TextChoices):
        PERSONAL = 'PERSONAL', 'Personal Loan'
        HOME = 'HOME', 'Home Loan'
        AUTO = 'AUTO', 'Auto Loan'
        EDUCATION = 'EDUCATION', 'Education Loan'

    class LoanStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        ACTIVE = 'ACTIVE', 'Active'
        CLOSED = 'CLOSED', 'Closed'
        REJECTED = 'REJECTED', 'Rejected'

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    loan_type = models.CharField(max_length=20, choices=LoanType.choices, default=LoanType.PERSONAL)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('12.00'))  # annual %
    tenure_months = models.IntegerField()
    emi_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    outstanding_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=LoanStatus.choices, default=LoanStatus.PENDING)
    applied_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    next_emi_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.loan_type} loan of {self.principal_amount} for {self.user.email}"

    @staticmethod
    def calculate_emi(principal, annual_rate, tenure_months):
        """EMI = P * r * (1+r)^n / ((1+r)^n - 1)"""
        if annual_rate == 0:
            return Decimal(str(round(float(principal) / tenure_months, 2)))
        r = float(annual_rate) / 12 / 100
        n = tenure_months
        emi = float(principal) * r * (1 + r)**n / ((1 + r)**n - 1)
        return Decimal(str(round(emi, 2)))


class EMIPayment(models.Model):
    class EMIStatus(models.TextChoices):
        DUE = 'DUE', 'Due'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'

    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='emi_payments')
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='emi_records')
    emi_number = models.IntegerField()
    principal_component = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    interest_component = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    paid_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=EMIStatus.choices, default=EMIStatus.DUE)

    class Meta:
        ordering = ['emi_number']

    def __str__(self):
        return f"EMI #{self.emi_number} for {self.loan} - {self.status}"
