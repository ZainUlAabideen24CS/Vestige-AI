import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM_NAME,
)


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    """
    Sends an HTML email via SMTP. Raises on failure so callers can
    decide how to handle/report the error (the caller should not let
    a broken email silently block user creation, for example).
    """

    if not SMTP_USERNAME or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP_USERNAME / SMTP_PASSWORD are not configured in .env"
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USERNAME}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, [to_email], msg.as_string())


def send_welcome_email(to_email: str, full_name: str, temp_password: str) -> None:
    subject = "Your Vestige AI account has been created"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Welcome to Vestige AI, {full_name}!</h2>
        <p>An account has been created for you. Use the credentials below to log in:</p>
        <table style="margin: 16px 0;">
            <tr><td style="padding: 4px 8px; font-weight: bold;">Email:</td><td style="padding: 4px 8px;">{to_email}</td></tr>
            <tr><td style="padding: 4px 8px; font-weight: bold;">Temporary Password:</td><td style="padding: 4px 8px;">{temp_password}</td></tr>
        </table>
        <p>You will be asked to set your own password the first time you log in.</p>
        <p style="color: #888; font-size: 12px;">If you did not expect this email, please contact your administrator.</p>
    </div>
    """
    _send_email(to_email, subject, html)


def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> None:
    subject = "Reset your Vestige AI password"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>Hi {full_name},</p>
        <p>We received a request to reset your password. Click the button below to set a new one:</p>
        <p style="margin: 24px 0;">
            <a href="{reset_link}" style="background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
                Reset Password
            </a>
        </p>
        <p>This link will expire in 30 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
    """
    _send_email(to_email, subject, html)