# backend\core\views.py
# Import default Django storage system (handles saving files)
from django.core.files.storage import default_storage
# Utility to safely fetch a model instance or raise a 404 if not found
from django.shortcuts import get_object_or_404
# Built-in helper to check hashed passwords (compares raw vs. hashed)
from django.contrib.auth.hashers import check_password
# Database transaction helper (ensures atomic operations, rollback on errors)
from django.db import transaction
# Advanced query helpers: F allows field references, Q allows OR/AND filters
from django.db.models import F, Q
# Import Django project settings (for configs like Stripe API keys)
from django.conf import settings
# SPA serving helper
from django.http import HttpResponse

# Django REST Framework core tools
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework import permissions
from rest_framework.pagination import PageNumberPagination

# Extra imports
from decimal import Decimal
import os
import uuid
import stripe
from datetime import date

# Import local serializers and models
from core import serializers as core_serializers
from userauths import serializers as userauths_serializers
from core import models as core_models
from userauths import models as userauths_models

# Set Stripe secret key from settings
stripe.api_key = settings.STRIPE_SECRET_KEY


def serve_react(request):
    """Serve the built React SPA's index.html for all non-API routes."""
    index_path = os.path.join(settings.BASE_DIR, 'staticfiles', 'index.html')
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    except FileNotFoundError:
        return HttpResponse(
            "<h1>Frontend Build Not Found</h1>"
            "<p>The React frontend has not been built yet. "
            "Run <code>cd frontend && npm run build</code> first.</p>",
            content_type='text/html',
            status=404
        )


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _verify_transaction_pin(user, pin):
    """
    Helper to verify transaction PIN. 
    Returns (is_valid, error_message, status_code).
    """
    if not pin:
        return False, "Transaction PIN is required", status.HTTP_400_BAD_REQUEST

    stored_pin = user.transaction_pin
    if not stored_pin:
        return False, "You have not set a transaction PIN yet. Please set one in your Profile.", status.HTTP_403_FORBIDDEN

    if stored_pin.startswith(("pbkdf2_", "bcrypt", "argon2")):
        if check_password(pin, stored_pin):
            return True, None, None
    elif stored_pin == pin:
        # Legacy plain-text PIN — compare directly and re-hash on success
        from django.contrib.auth.hashers import make_password as _make_password
        user.transaction_pin = _make_password(pin)
        user.save(update_fields=["transaction_pin"])
        return True, None, None

    return False, "Invalid transaction PIN.", status.HTTP_403_FORBIDDEN


class FileUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    # FIX #11: Require authentication for file uploads (was AllowAny)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = core_serializers.FileUploadSerializer(data=request.data)
        if serializer.is_valid():
            uploaded_file = serializer.validated_data['file']
            file_name = default_storage.save(uploaded_file.name, uploaded_file)
            file_url = request.build_absolute_uri(default_storage.url(file_name))
            return Response(file_url, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerificationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        payment_id = request.data.get("paymentId")
        raw_amount = request.data.get("amount")
        pin = request.data.get("transaction_pin")
        user = request.user

        if not all([payment_id, raw_amount]):
            return Response(
                {"error": "Missing required payment data"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify PIN
        pin_valid, pin_error, pin_status = _verify_transaction_pin(user, pin)
        if not pin_valid:
            return Response({"error": pin_error}, status=pin_status)

        # FIX: Cast amount to Decimal immediately to avoid float precision errors
        try:
            amount = Decimal(str(raw_amount))
        except Exception:
            return Response({"error": "Amount must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)

        # ── Dev mode: bypass Stripe if no secret key is configured ───────────
        if not settings.STRIPE_SECRET_KEY:
            print(f"[DEV MODE] Mock wallet funding: ₹{amount} for {user.username}")
            transaction_id = f"dev-{uuid.uuid4().hex[:12]}"
        else:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                intent = stripe.PaymentIntent.create(
                    amount=int(amount * 100),
                    currency="inr",
                    payment_method=payment_id,
                    confirm=True,
                    automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
                    description=f"Wallet funding for {user.username}"
                )

                if intent.status != "succeeded":
                    return Response({"error": "Stripe payment not successful"}, status=status.HTTP_400_BAD_REQUEST)

                transaction_id = intent.id
            except stripe.error.CardError as e:
                return Response({"error": f"Stripe card error: {e.user_message}"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"error": f"Stripe verification error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # ── Update wallet & create transaction ────────────────────────────────
        wallet, created = core_models.Wallet.objects.get_or_create(user=user)
        wallet.balance = (wallet.balance + amount).quantize(Decimal("0.01"))
        wallet.save()

        txn = core_models.Transaction.objects.create(
            wallet=wallet,
            transaction_type=core_models.Transaction.TransactionType.DEPOSIT,
            amount=amount,
            status=core_models.Transaction.TransactionStatus.SUCCESSFUL,
            receiver=user,
            external_reference=transaction_id,
        )

        core_models.Notification.objects.create(
            user=user,
            transaction=txn,
            notification_type=core_models.Notification.TransactionType.DEPOSIT,
            title="New Deposit From Stripe",
            message=f"You funded your wallet with ₹{amount} from Stripe",
        )

        return Response(
            {"message": "Wallet funding successful", "wallet_balance": str(wallet.balance)},
            status=status.HTTP_200_OK
        )


class TransferFundsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}

        wallet_id = (data.get("wallet_id") or "").strip()
        raw_amount = str(data.get("amount") or "").strip()
        pin = (data.get("transaction_pin") or "").strip()
        save_beneficiary = data.get("save_beneficiary")

        if not wallet_id or not raw_amount or not pin:
            return Response({"detail": "wallet_id, amount, transaction_pin are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(raw_amount)
        except Exception:
            return Response({"detail": "amount must be a valid decimal string"}, status=400)

        if amount <= Decimal("0.00"):
            return Response({"detail": "amount must be greater than 0"}, status=400)

        sender_user = request.user
        # Auto-create wallet if it doesn't exist yet (e.g. legacy users pre-dating auto-creation)
        sender_wallet, _ = core_models.Wallet.objects.get_or_create(user=sender_user)

        # PIN verification
        pin_valid, pin_error, pin_status = _verify_transaction_pin(sender_user, pin)
        if not pin_valid:
            return Response({"detail": pin_error}, status=pin_status)

        # KYC check: only soft-block if KYC was explicitly REJECTED.
        # UNVERIFIED or PENDING users can still transfer — KYC is for compliance
        # review, not a hard transfer gate for this application.
        kyc = getattr(sender_user, "kyc_profile", None)
        if kyc and kyc.verification_status == userauths_models.KYC.VerificationStatus.REJECTED:
            return Response({"detail": "Your KYC was rejected. Please resubmit to continue transferring."}, status=403)

        try:
            receiver_wallet = core_models.Wallet.objects.select_related("user").get(wallet_id=wallet_id)
        except core_models.Wallet.DoesNotExist:
            return Response({"detail": "Destination wallet not found"}, status=404)

        if receiver_wallet.user_id == sender_user.id:
            return Response({"detail": "You cannot transfer to your own wallet"}, status=400)

        wallet_ids = sorted([sender_wallet.id, receiver_wallet.id])
        # FIX #1: uuid.uuid4 was missing () — it was a reference, not a call
        transfer_group_id = uuid.uuid4()

        with transaction.atomic():
            locked = core_models.Wallet.objects.select_for_update().filter(id__in=wallet_ids).in_bulk(field_name="id")
            s_wallet = locked[sender_wallet.id]
            r_wallet = locked[receiver_wallet.id]

            if s_wallet.balance < amount:
                return Response({"detail": "Insufficient funds"}, status=400)

            s_wallet.balance = (s_wallet.balance - amount).quantize(Decimal("0.01"))
            r_wallet.balance = (r_wallet.balance + amount).quantize(Decimal("0.01"))

            s_wallet.save(update_fields=["balance", "updated_at"])
            r_wallet.save(update_fields=["balance", "updated_at"])

            sender_tx = core_models.Transaction.objects.create(
                wallet=s_wallet,
                transaction_type=core_models.Transaction.TransactionType.TRANSFER,
                amount=amount,
                status=core_models.Transaction.TransactionStatus.SUCCESSFUL,
                sender=sender_user,
                receiver=receiver_wallet.user,
                external_reference=str(transfer_group_id),
            )
            receiver_tx = core_models.Transaction.objects.create(
                wallet=r_wallet,
                transaction_type=core_models.Transaction.TransactionType.TRANSFER,
                amount=amount,
                status=core_models.Transaction.TransactionStatus.SUCCESSFUL,
                sender=sender_user,
                receiver=receiver_wallet.user,
                external_reference=str(transfer_group_id),
            )

            if save_beneficiary:
                core_models.Beneficiary.objects.get_or_create(user=sender_user, beneficiary_user=receiver_wallet.user)

            core_models.Notification.objects.create(
                user=sender_user,
                transaction=sender_tx,
                notification_type=core_models.Notification.TransactionType.TRANSFER,
                title="Transfer Sent",
                message=f"You sent \u20b9{amount} to {receiver_wallet.user.username} ({receiver_wallet.wallet_id}).",  # FIX: INR symbol
            )
            core_models.Notification.objects.create(
                user=receiver_wallet.user,
                transaction=receiver_tx,
                notification_type=core_models.Notification.TransactionType.TRANSFER,
                title="Transfer Received",
                message=f"You received \u20b9{amount} from {sender_user.username}.",  # FIX: INR symbol
            )

            return Response(
                {
                    "transfer_id": str(sender_tx.reference),
                    "amount": f"\u20b9{amount}",
                    "from": {
                        "user": sender_user.username,
                        "wallet_id": sender_wallet.wallet_id,
                        "new_balance": f"\u20b9{s_wallet.balance}",
                    },
                    "to": {
                        "user": receiver_wallet.user.username,
                        "wallet_id": receiver_wallet.wallet_id,
                    },
                    "status": "SUCCESSFUL",
                },
                status=status.HTTP_201_CREATED,
            )


class WalletDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, wallet_id):
        wallet = get_object_or_404(core_models.Wallet, wallet_id=wallet_id)
        kyc = userauths_models.KYC.objects.filter(user=wallet.user).first()

        if not kyc:
            return Response({"detail": "KYC not found for this wallet"}, status=status.HTTP_400_BAD_REQUEST)

        data = {
            "wallet_id": wallet.wallet_id,
            "full_name": kyc.full_name,
            "verification_status": kyc.verification_status,
        }
        return Response(data, status=status.HTTP_200_OK)


class BeneficiariesList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        beneficiaries = core_models.Beneficiary.objects.filter(user=request.user)
        serializer = core_serializers.BeneficiarySerializer(beneficiaries, many=True)
        return Response(serializer.data)


class CreateSavingsGoalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}

        name = (data.get("name") or "").strip()
        raw_target_amount = (data.get("target_amount") or "").strip()
        raw_target_date = (data.get("target_date") or "").strip()

        if not name or not raw_target_amount:
            return Response({"detail": "name and target_amount are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_amount = Decimal(raw_target_amount)
        except Exception:
            return Response({"detail": "Target amount must be a valid decimal string"}, status=400)

        if target_amount <= Decimal("0"):
            return Response({"detail": "Target amount must be greater than 0"}, status=400)

        target_date = None
        if raw_target_date:
            try:
                target_date = date.fromisoformat(raw_target_date)
            except ValueError:
                return Response({"detail": "Target date must be in YYYY-MM-DD format"}, status=400)

        try:
            wallet = request.user.wallet
        except Exception:
            return Response({"detail": "Wallet not found for user"}, status=400)

        goal = core_models.SavingsGoal.objects.create(
            wallet=wallet,
            name=name,
            target_amount=target_amount,
            target_date=target_date
        )

        core_models.Notification.objects.create(
            user=request.user,
            notification_type=core_models.Notification.TransactionType.SAVINGS,
            title="Saving Goal Created",
            message="You created a new saving goal.",
        )

        return Response(
            {
                "uuid": str(goal.uuid),
                "name": goal.name,
                "target_amount": f"\u20b9{goal.target_amount}",   # FIX: INR symbol
                "current_amount": f"\u20b9{goal.current_amount}", # FIX: INR symbol
                "target_date": goal.target_date.isoformat() if goal.target_date else None,
            },
            status=status.HTTP_201_CREATED,
        )


class OverviewAPIVIew(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Auto-create wallet for users who registered before wallet auto-creation was added
        core_models.Wallet.objects.get_or_create(user=request.user)
        user = request.user

        # FIX #6: Guard against missing wallet instead of crashing
        try:
            wallet = user.wallet
        except Exception:
            return Response({"detail": "Wallet not found"}, status=status.HTTP_404_NOT_FOUND)

        beneficiaries_count = core_models.Beneficiary.objects.filter(user=user).count()
        unread_notifications = core_models.Notification.objects.filter(user=user, is_read=False).count()

        recent_tx = core_models.Transaction.objects.filter(
            wallet__user=user
        ).order_by("-timestamp")[:5]

        tx_serializer = core_serializers.TransactionSerializer(recent_tx, many=True)

        goals = core_models.SavingsGoal.objects.filter(wallet=wallet)
        goals_data = [
            {
                "uuid": str(g.uuid),
                "name": g.name,
                "target": float(g.target_amount),
                "current": float(g.current_amount),
                "progress": float(g.progress_percentage),
            }
            for g in goals
        ]

        return Response(
            {
                "wallet": {"balance": float(wallet.balance), "wallet_id": wallet.wallet_id},
                "beneficiaries": beneficiaries_count,
                "unread_notifications": unread_notifications,
                "recent_transactions": tx_serializer.data,
                "savings_goals": goals_data,
            },
            status=200,
        )


class TransactionListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = core_models.Transaction.objects.select_related("wallet", "sender", "receiver").filter(
            wallet__user=user
        )
        serializer = core_serializers.TransactionSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TransactionDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        tx = get_object_or_404(core_models.Transaction, reference=reference)
        serializer = core_serializers.TransactionSerializer(tx)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DepositToSavingsGoalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}

        raw_uuid = data.get("uuid")
        raw_amount = data.get("amount")

        # FIX #4: Proper dict with colon (was set literal with comma)
        if not raw_uuid or not raw_amount:
            return Response({"detail": "uuid and amount are required"}, status=400)

        try:
            amount = Decimal(str(raw_amount))
        except Exception:
            return Response({"detail": "amount must be a valid number"}, status=400)

        try:
            wallet = request.user.wallet
        except Exception:
            return Response({"detail": "Wallet not found"}, status=400)

        with transaction.atomic():
            # FIX #7: Use get_object_or_404 for safe lookup
            goal = get_object_or_404(core_models.SavingsGoal, uuid=raw_uuid, wallet=wallet)

            # FIX #4: Proper dict with colon (was set literal with comma)
            if wallet.balance < amount:
                return Response({"detail": "Insufficient wallet funds"}, status=400)

            wallet.balance = (wallet.balance - amount).quantize(Decimal("0.01"))
            goal.current_amount = (goal.current_amount + amount).quantize(Decimal("0.01"))

            wallet.save(update_fields=["balance", "updated_at"])
            goal.save(update_fields=["current_amount"])

            tx = core_models.Transaction.objects.create(
                wallet=wallet,
                transaction_type=core_models.Transaction.TransactionType.SAVINGS,
                amount=amount,
                status=core_models.Transaction.TransactionStatus.SUCCESSFUL,
                sender=request.user,
                receiver=request.user,
                external_reference=str(goal.uuid),
            )

            core_models.Notification.objects.create(
                user=request.user,
                transaction=tx,
                notification_type=core_models.Notification.TransactionType.SAVINGS,
                title="Savings Deposit",
                message=f"\u20b9{amount} moved from wallet to savings goal '{goal.name}'.",  # FIX: INR symbol
            )

        return Response(
            {
                "goal_uuid": str(goal.uuid),
                "goal_name": goal.name,
                "wallet_new_balance": f"\u20b9{wallet.balance}",          # FIX: INR symbol
                "goal_new_current_amount": f"\u20b9{goal.current_amount}", # FIX: INR symbol
                "status": "SUCCESSFUL",
            },
            status=status.HTTP_201_CREATED,
        )


class WithdrawFromSavingsGoalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        raw_uuid = data.get("uuid")

        try:
            wallet = request.user.wallet
        except Exception:
            return Response({"detail": "Wallet not found"}, status=400)

        # FIX #4: Proper dict with colon (was set literal with comma)
        if not raw_uuid:
            return Response({"detail": "uuid is required"}, status=400)

        with transaction.atomic():
            # FIX #7: Use get_object_or_404 for safe lookup
            goal = get_object_or_404(core_models.SavingsGoal, uuid=raw_uuid, wallet=wallet)

            if goal.current_amount < goal.target_amount:
                return Response({"detail": "Cannot withdraw, goal not yet reached"}, status=400)

            amount = goal.current_amount

            # FIX #4: Proper dict with colon (was set literal with comma)
            if amount <= Decimal("0.00"):
                return Response({"detail": "Nothing to withdraw"}, status=400)

            wallet.balance = (wallet.balance + amount).quantize(Decimal("0.01"))
            goal.current_amount = Decimal("0.00")

            wallet.save()
            goal.save()

            tx = core_models.Transaction.objects.create(
                wallet=wallet,
                transaction_type=core_models.Transaction.TransactionType.SAVINGS,
                amount=amount,
                status=core_models.Transaction.TransactionStatus.SUCCESSFUL,
                sender=request.user,
                receiver=request.user,
                external_reference=str(goal.uuid),
            )

            core_models.Notification.objects.create(
                user=request.user,
                transaction=tx,
                notification_type=core_models.Notification.TransactionType.SAVINGS,
                title="Savings Withdrawal",
                message=f"\u20b9{amount} withdrawn from savings goal '{goal.name}' to your wallet.",  # FIX: INR symbol
            )

        return Response(
            {
                "goal_uuid": str(goal.uuid),
                "goal_name": goal.name,
                "withdrawn_amount": f"\u20b9{amount}",           # FIX: INR symbol
                "wallet_new_balance": f"\u20b9{wallet.balance}",  # FIX: INR symbol
                "goal_new_current_amount": f"\u20b9{goal.current_amount}",
                "status": "SUCCESSFUL",
            },
            status=status.HTTP_201_CREATED,
        )


class SavingsGoalListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            wallet = user.wallet
        except Exception:
            return Response({"detail": "Wallet not found"}, status=400)

        goals = core_models.SavingsGoal.objects.filter(wallet=wallet).order_by("-created_at")
        data = [
            {
                "uuid": str(g.uuid),
                "name": g.name,
                "target_amount": float(g.target_amount),
                "current_amount": float(g.current_amount),
                "target_date": g.target_date.isoformat() if g.target_date else None,
                "progress_percentage": float(g.progress_percentage),
                "created_at": g.created_at.isoformat()
            }
            for g in goals
        ]
        return Response(data, status=200)


class SavingsGoalDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, uuid):
        user = request.user
        try:
            wallet = user.wallet
        except Exception:
            return Response({"detail": "Wallet not found"}, status=400)

        # FIX #7: Use get_object_or_404 instead of bare .get() which raises unhandled 500
        goal = get_object_or_404(core_models.SavingsGoal, wallet=wallet, uuid=uuid)

        txs = core_models.Transaction.objects.filter(
            wallet=wallet,
            transaction_type=core_models.Transaction.TransactionType.SAVINGS,
            external_reference=str(goal.uuid)
        ).order_by("-timestamp")

        items = []
        for tx in txs:
            notif = core_models.Notification.objects.filter(transaction=tx).order_by("-timestamp").first()
            kind = "SAVINGS"
            if notif:
                title = (notif.title or "").lower()
                if "deposit" in title:
                    kind = "DEPOSIT"
                elif "withdraw" in title:
                    kind = "WITHDRAWAL"
            items.append({
                "reference": str(tx.reference),
                "amount": float(tx.amount),
                "status": tx.status,
                "timestamp": tx.timestamp.isoformat(),
                "kind": kind,
            })

        data = {
            "goal": {
                "uuid": str(goal.uuid),
                "name": goal.name,
                "target_amount": float(goal.target_amount),
                "current_amount": float(goal.current_amount),
                "target_date": goal.target_date.isoformat() if goal.target_date else None,
                "progress_percentage": float(goal.progress_percentage),
                "created_at": goal.created_at.isoformat(),
            },
            "wallet": {
                "wallet_id": wallet.wallet_id,
                "balance": float(wallet.balance),
            },
            "transactions": items,
        }
        return Response(data, status=200)


class BeneficiariesListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = core_models.Beneficiary.objects.filter(user=request.user).order_by("-created_at")
        serializer = core_serializers.BeneficiarySerializer(qs, many=True)
        return Response(serializer.data, status=200)


class BeneficiaryDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        b = get_object_or_404(core_models.Beneficiary, pk=pk, user=request.user)
        b.delete()
        return Response({"detail": "Beneficiary deleted"}, status=204)


class BeneficiaryCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        wallet_id = request.data.get("wallet_id")
        target_wallet = get_object_or_404(core_models.Wallet, wallet_id=wallet_id)

        obj, created = core_models.Beneficiary.objects.get_or_create(
            user=request.user,
            beneficiary_user=target_wallet.user
        )

        kyc = getattr(target_wallet.user, "kyc_profile", None)
        name = getattr(kyc, "full_name", None) or target_wallet.user.username or target_wallet.user.email

        data = {
            "id": obj.id,
            "email": target_wallet.user.email,
            "name": name,
            "wallet_id": target_wallet.wallet_id,
            "created_at": obj.created_at.isoformat()
        }
        return Response(data, status=status.HTTP_201_CREATED)


class NotificationListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = core_models.Notification.objects.filter(user=user, is_read=False).order_by("-timestamp")
        data = []
        for n in qs:
            tx = n.transaction
            data.append({
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "is_read": n.is_read,
                "timestamp": n.timestamp.isoformat(),
                "tx_reference": str(tx.reference) if tx else None,
                "tx_status": tx.status if tx else None,
            })
        return Response(data, status=200)


class NotificationMarkReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        n = get_object_or_404(core_models.Notification, id=pk, user=user)
        n.is_read = True
        n.save()
        return Response({"id": n.id, "is_read": n.is_read})


class NotificationMarkAllReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        core_models.Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read"}, status=200)


# ─── LOAN / EMI VIEWS ────────────────────────────────────────────

class LoanEMICalculatorView(APIView):
    """Preview EMI before applying — no auth required."""
    permission_classes = []

    def post(self, request):
        data = request.data
        try:
            principal = Decimal(str(data.get("principal_amount", 0)))
            rate = Decimal(str(data.get("interest_rate", 12)))
            tenure = int(data.get("tenure_months", 12))
        except Exception:
            return Response({"detail": "Invalid values provided."}, status=400)

        if principal <= 0 or tenure <= 0:
            return Response({"detail": "Principal and tenure must be positive."}, status=400)

        emi = core_models.Loan.calculate_emi(principal, rate, tenure)
        total_payment = emi * tenure
        total_interest = total_payment - principal

        return Response({
            "emi_amount": str(emi),
            "total_payment": str(round(total_payment, 2)),
            "total_interest": str(round(total_interest, 2)),
            "principal_amount": str(principal),
            "interest_rate": str(rate),
            "tenure_months": tenure,
        })


class LoanApplyView(APIView):
    """User submits a loan application."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user

        try:
            principal = Decimal(str(data.get("principal_amount", 0)))
            rate = Decimal(str(data.get("interest_rate", 12)))
            tenure = int(data.get("tenure_months", 12))
            loan_type = data.get("loan_type", "PERSONAL")
        except Exception:
            return Response({"detail": "Invalid loan parameters."}, status=400)

        if principal <= 0 or tenure <= 0:
            return Response({"detail": "Principal and tenure must be positive."}, status=400)
        if principal > Decimal("5000000"):
            return Response({"detail": "Maximum loan amount is ₹50,00,000."}, status=400)
        if tenure > 360:
            return Response({"detail": "Maximum tenure is 360 months (30 years)."}, status=400)
        if loan_type not in [c[0] for c in core_models.Loan.LoanType.choices]:
            return Response({"detail": "Invalid loan type."}, status=400)

        emi = core_models.Loan.calculate_emi(principal, rate, tenure)

        loan = core_models.Loan.objects.create(
            user=user,
            loan_type=loan_type,
            principal_amount=principal,
            interest_rate=rate,
            tenure_months=tenure,
            emi_amount=emi,
            outstanding_balance=principal,
            status=core_models.Loan.LoanStatus.PENDING,
        )

        return Response({
            "message": "Loan application submitted successfully. Pending review.",
            "loan_id": str(loan.uuid),
            "emi_amount": str(emi),
            "status": loan.status,
        }, status=201)


class LoanListView(APIView):
    """List all loans for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        loans = core_models.Loan.objects.filter(user=request.user)
        data = [{
            "uuid": str(l.uuid),
            "loan_type": l.loan_type,
            "principal_amount": str(l.principal_amount),
            "interest_rate": str(l.interest_rate),
            "tenure_months": l.tenure_months,
            "emi_amount": str(l.emi_amount),
            "outstanding_balance": str(l.outstanding_balance),
            "status": l.status,
            "applied_at": l.applied_at.isoformat(),
            "next_emi_date": l.next_emi_date.isoformat() if l.next_emi_date else None,
        } for l in loans]
        return Response(data)


class LoanDetailView(APIView):
    """Detail of a single loan including EMI schedule."""
    permission_classes = [IsAuthenticated]

    def get(self, request, uuid):
        loan = get_object_or_404(core_models.Loan, uuid=uuid, user=request.user)
        emis = loan.emi_payments.all()
        emi_data = [{
            "emi_number": e.emi_number,
            "amount_due": str(e.amount_due),
            "principal_component": str(e.principal_component),
            "interest_component": str(e.interest_component),
            "due_date": e.due_date.isoformat(),
            "paid_date": e.paid_date.isoformat() if e.paid_date else None,
            "status": e.status,
        } for e in emis]

        return Response({
            "uuid": str(loan.uuid),
            "loan_type": loan.loan_type,
            "principal_amount": str(loan.principal_amount),
            "interest_rate": str(loan.interest_rate),
            "tenure_months": loan.tenure_months,
            "emi_amount": str(loan.emi_amount),
            "outstanding_balance": str(loan.outstanding_balance),
            "status": loan.status,
            "applied_at": loan.applied_at.isoformat(),
            "approved_at": loan.approved_at.isoformat() if loan.approved_at else None,
            "next_emi_date": loan.next_emi_date.isoformat() if loan.next_emi_date else None,
            "emi_schedule": emi_data,
        })


class EMIPayView(APIView):
    """Pay the next due EMI from the user's wallet."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        user = request.user
        loan_uuid = data.get("loan_id")
        pin = (data.get("transaction_pin") or "").strip()

        if not loan_uuid or not pin:
            return Response({"detail": "loan_id and transaction_pin are required."}, status=400)

        # Verify PIN (same logic as transfer)
        stored_pin = user.transaction_pin
        if not stored_pin:
            return Response({"detail": "You have not set a transaction PIN. Set one in Profile."}, status=403)
        pin_valid = False
        if stored_pin.startswith("pbkdf2_") or stored_pin.startswith("bcrypt") or stored_pin.startswith("argon2"):
            pin_valid = check_password(pin, stored_pin)
        else:
            pin_valid = (stored_pin == pin)
        if not pin_valid:
            return Response({"detail": "Invalid transaction PIN."}, status=403)

        loan = get_object_or_404(core_models.Loan, uuid=loan_uuid, user=user)
        if loan.status != core_models.Loan.LoanStatus.ACTIVE:
            return Response({"detail": f"Loan is not active (status: {loan.status})."}, status=400)

        # Find next due EMI
        next_emi = loan.emi_payments.filter(status=core_models.EMIPayment.EMIStatus.DUE).order_by("emi_number").first()
        if not next_emi:
            return Response({"detail": "No pending EMI payments found."}, status=400)

        # Wallet check
        wallet, _ = core_models.Wallet.objects.get_or_create(user=user)
        if wallet.balance < next_emi.amount_due:
            return Response({"detail": f"Insufficient balance. Need ₹{next_emi.amount_due}, have ₹{wallet.balance}."}, status=400)

        # Atomic EMI payment
        with transaction.atomic():
            wallet.balance = (wallet.balance - next_emi.amount_due).quantize(Decimal("0.01"))
            wallet.save(update_fields=["balance"])

            txn = core_models.Transaction.objects.create(
                wallet=wallet,
                transaction_type=core_models.Transaction.TransactionType.TRANSFER,
                status=core_models.Transaction.TransactionStatus.SUCCESSFUL,
                amount=next_emi.amount_due,
                sender=user,
                external_reference=f"EMI-{loan.uuid.hex[:8].upper()}-{next_emi.emi_number:02d}",
            )

            import django.utils.timezone as tz
            next_emi.transaction = txn
            next_emi.paid_date = tz.now()
            next_emi.status = core_models.EMIPayment.EMIStatus.PAID
            next_emi.save()

            loan.outstanding_balance -= next_emi.principal_component

            # Set next EMI date
            upcoming = loan.emi_payments.filter(status=core_models.EMIPayment.EMIStatus.DUE).order_by("emi_number").first()
            loan.next_emi_date = upcoming.due_date if upcoming else None
            if not upcoming:
                loan.status = core_models.Loan.LoanStatus.CLOSED
            loan.save()

            core_models.Notification.objects.create(
                user=user,
                transaction=txn,
                notification_type=core_models.Notification.TransactionType.TRANSFER,
                title=f"EMI #{next_emi.emi_number} Paid",
                message=f"EMI #{next_emi.emi_number} of ₹{next_emi.amount_due} paid successfully. Outstanding: ₹{loan.outstanding_balance}.",
            )

        return Response({
            "message": f"EMI #{next_emi.emi_number} paid successfully.",
            "amount_paid": str(next_emi.amount_due),
            "outstanding_balance": str(loan.outstanding_balance),
            "loan_status": loan.status,
            "transaction_reference": str(txn.reference),
        })
