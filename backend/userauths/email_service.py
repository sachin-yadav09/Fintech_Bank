from django.core.mail import send_mail
from django.conf import settings


def send_email(subject, message, recipient_list, html_message=None):
    """Send an email via Django's mail backend."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Email send failed: {e}")
        return False


def send_otp_email(email, otp_code):
    """Send an OTP code to the given email address."""
    expiry = getattr(settings, "OTP_EXPIRY_MINUTES", 10)
    subject = "Your FinanceOS OTP"
    message = f"Your OTP is {otp_code}. Valid for {expiry} minutes."
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>FinanceOS - One-Time Password</h2>
        <p>Your OTP is:</p>
        <h1 style="background: #4F46E5; color: white; padding: 15px; display: inline-block; border-radius: 8px; letter-spacing: 5px;">{otp_code}</h1>
        <p>This OTP is valid for {expiry} minutes.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
    </body>
    </html>
    """
    return send_email(subject, message, [email], html_message)


def send_welcome_email(email, username):
    """Send a welcome email after successful registration."""
    subject = "Welcome to FinanceOS"
    message = f"Hi {username},\n\nWelcome to FinanceOS! Your account has been created successfully."
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to FinanceOS!</h2>
        <p>Hi <strong>{username}</strong>,</p>
        <p>Your account has been created successfully. Start managing your finances today!</p>
        <a href="https://financeos.in/login" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Login Now</a>
    </body>
    </html>
    """
    return send_email(subject, message, [email], html_message)


def send_transaction_email(email, username, amount, transaction_type, reference):
    """Send a transaction confirmation email."""
    subject = f"FinanceOS - {transaction_type.title()} Confirmation"
    message = f"Hi {username},\n\nYour {transaction_type} of ₹{amount} has been processed. Reference: {reference}"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Transaction Confirmation</h2>
        <p>Hi <strong>{username}</strong>,</p>
        <p>Your {transaction_type} has been processed successfully.</p>
        <table style="border-collapse: collapse; margin-top: 15px;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">₹{amount}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{transaction_type.title()}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{reference}</td></tr>
        </table>
    </body>
    </html>
    """
    return send_email(subject, message, [email], html_message)

