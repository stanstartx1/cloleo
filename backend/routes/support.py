from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

from core.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/support", tags=["Support"])

# SMTP Configuration
SMTP_SERVER = "mail.cloleo.com"
SMTP_PORT = 465
SMTP_USE_SSL = True
SUPPORT_EMAIL = "support@cloleo.com"
SUPPORT_PASSWORD = "L87413001@"

class SupportRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    category: str
    message: str
    order_id: Optional[str] = None

@router.post("/contact")
async def send_support_email(
    request: SupportRequest,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Send a support email to the support team
    Authentication is optional - works for both logged in and guest users
    """
    try:
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['From'] = SUPPORT_EMAIL
        msg['To'] = SUPPORT_EMAIL
        msg['Subject'] = f"[{request.category.upper()}] {request.subject} - {request.name}"

        # Get user info if authenticated
        user_id = user.get('id') if user else 'Guest'
        user_role = user.get('role') if user else 'Guest'

        # Create HTML email body
        html_content = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .field {{
                    margin-bottom: 15px;
                }}
                .label {{
                    font-weight: bold;
                    color: #667eea;
                    margin-bottom: 5px;
                }}
                .value {{
                    color: #333;
                    padding: 10px;
                    background-color: #f5f5f5;
                    border-radius: 5px;
                }}
                .category {{
                    display: inline-block;
                    padding: 5px 15px;
                    background-color: #667eea;
                    color: white;
                    border-radius: 20px;
                    font-size: 12px;
                    margin-bottom: 15px;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📧 Nouvelle demande de support</h1>
                </div>
                <div class="content">
                    <div class="category">{request.category}</div>
                    
                    <div class="field">
                        <div class="label">Nom du client</div>
                        <div class="value">{request.name}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Email du client</div>
                        <div class="value">{request.email}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">ID Utilisateur</div>
                        <div class="value">{user_id}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Rôle</div>
                        <div class="value">{user_role}</div>
                    </div>
                    
                    {request.order_id and f"""
                    <div class="field">
                        <div class="label">ID de commande</div>
                        <div class="value">{request.order_id}</div>
                    </div>
                    """}
                    
                    <div class="field">
                        <div class="label">Sujet</div>
                        <div class="value">{request.subject}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Message</div>
                        <div class="value">{request.message}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Date et heure</div>
                        <div class="value">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
                    </div>
                </div>
                <div class="footer">
                    <p>Ce message a été envoyé depuis le formulaire de support Cloleo</p>
                    <p>© 2024 Cloleo - Tous droits réservés</p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_content, 'html'))

        # Send email via SMTP
        if SMTP_USE_SSL:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                server.login(SUPPORT_EMAIL, SUPPORT_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SUPPORT_EMAIL, SUPPORT_PASSWORD)
                server.send_message(msg)

        print(f"✅ [SUPPORT] Email sent successfully to {SUPPORT_EMAIL}")
        print(f"   From: {request.email}")
        print(f"   Subject: {request.subject}")
        print(f"   Category: {request.category}")
        print(f"   User ID: {user_id}")
        print(f"   User Role: {user_role}")

        return {
            "success": True,
            "message": "Votre message a été envoyé avec succès. Notre équipe vous répondra dans les plus brefs délais."
        }

    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ [SUPPORT] SMTP Authentication Error: {e}")
        raise HTTPException(status_code=500, detail="Erreur d'authentification SMTP. Veuillez contacter l'administrateur.")
    except smtplib.SMTPException as e:
        print(f"❌ [SUPPORT] SMTP Error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email. Veuillez réessayer.")
    except Exception as e:
        print(f"❌ [SUPPORT] Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Une erreur est survenue. Veuillez réessayer.")
