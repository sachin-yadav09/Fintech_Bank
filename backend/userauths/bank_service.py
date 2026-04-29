"""
userauths/bank_service.py
"""

import re
import uuid
import logging
import time

logger = logging.getLogger(__name__)

IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")

# ── Mock "bank database" — pretend these accounts exist ──────────────────────
# In production, this entire dict is replaced by a real API call.
MOCK_BANK_DB = {
    # account_number: {mobile, holder_name}
    "1234567890": {"mobile": "+919876543210", "holder": "Test User One"},
    "9876543210": {"mobile": "+918765432109", "holder": "Test User Two"},
    "1111222233": {"mobile": "+917654321098", "holder": "Demo Account"},
}


def validate_ifsc(ifsc_code: str) -> bool:
    return bool(IFSC_REGEX.match(ifsc_code.upper()))


def validate_account_number(account_number: str) -> bool:
    return account_number.isdigit() and 9 <= len(account_number) <= 18


def verify_bank_account(
    account_number: str,
    ifsc_code: str,
    account_holder_name: str,
    registered_mobile: str,
    user_mobile: str,
) -> dict:
    """
    Simulate bank account penny-drop verification.

    Returns:
        {
            "verified": True/False,
            "reference": str,
            "holder_name": str,    # name returned by bank
            "error": str | None,
        }

    Steps simulated:
      1. Format validation (IFSC, account number length).
      2. Mobile-to-account linkage check (mobile must match bank records).
      3. User mobile must match registered_mobile to prevent account hijack.
      4. Penny-drop simulation (always succeeds in mock unless account unknown).
    """

    # ── Step 1: Format checks ────────────────────────────────────────────────
    if not validate_account_number(account_number):
        return {"verified": False, "reference": None, "holder_name": None,
                "error": "Invalid account number format (must be 9-18 digits)."}

    if not validate_ifsc(ifsc_code.upper()):
        return {"verified": False, "reference": None, "holder_name": None,
                "error": "Invalid IFSC code format (e.g. SBIN0001234)."}

    # ── Step 2: User's registered mobile must match ───────────────────────────
    # Normalize both numbers for comparison
    def normalize(mobile):
        mobile = mobile.replace(" ", "").replace("-", "")
        # Strip +91 or 91 prefix for consistent comparison
        if mobile.startswith("+91"):
            mobile = mobile[3:]
        elif mobile.startswith("91") and len(mobile) == 12:
            mobile = mobile[2:]
        return mobile

    if normalize(registered_mobile) != normalize(user_mobile):
        return {
            "verified": False,
            "reference": None,
            "holder_name": None,
            "error": "The mobile number linked to this bank account must match your registered mobile number."
        }

    # ── Step 3: Simulate bank API call (mock penny-drop) ─────────────────────
    # Artificial small delay to simulate real API latency
    time.sleep(0.3)

    ref_id = f"MOCK-{uuid.uuid4().hex[:12].upper()}"

    if account_number in MOCK_BANK_DB:
        bank_record = MOCK_BANK_DB[account_number]
        # Check if the bank-registered mobile matches
        if normalize(bank_record["mobile"]) != normalize(registered_mobile):
            return {
                "verified": False,
                "reference": ref_id,
                "holder_name": None,
                "error": "Mobile number does not match bank records for this account."
            }
        bank_holder = bank_record["holder"]
    else:
        # Unknown account — in mock mode, we accept any well-formatted account
        # and return the submitted holder name (penny-drop passes)
        bank_holder = account_holder_name.strip().upper()

    logger.info(f"[MOCK BANK VERIFY] Account {account_number} verified. Ref: {ref_id}")

    return {
        "verified": True,
        "reference": ref_id,
        "holder_name": bank_holder,
        "error": None,
    }
