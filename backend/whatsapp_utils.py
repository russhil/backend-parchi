"""
WhatsApp Integration for Parchi.ai via Official WhatsApp Business Cloud API
Uses the Meta Graph API for sending messages.
https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages

Required environment variables:
  WHATSAPP_ACCESS_TOKEN       - Permanent / system-user access token
  WHATSAPP_PHONE_NUMBER_ID    - Phone-number ID registered in Meta Business
  WHATSAPP_GRAPH_API_VERSION  - Graph API version (e.g. v19.0)
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)


def _get_config() -> dict | None:
    """Return WhatsApp Business API config, or None if not configured."""
    token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    version = os.getenv("WHATSAPP_GRAPH_API_VERSION", "v19.0").strip()

    if not token or not phone_id:
        return None

    return {
        "token": token,
        "phone_id": phone_id,
        "url": f"https://graph.facebook.com/{version}/{phone_id}/messages",
    }


def send_whatsapp_text(phone: str, message: str) -> dict:
    """
    Send a plain WhatsApp text message via the official Business Cloud API.

    Args:
        phone: Recipient phone in international format (e.g. +919876543210)
        message: Plain text message body
    Returns:
        dict with 'success' bool and 'data' or 'error'
    """
    config = _get_config()
    if not config:
        logger.warning("WhatsApp Business API not configured — skipping send")
        return {
            "success": False,
            "error": "WhatsApp not configured (missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)",
        }

    # The Graph API expects phone numbers WITHOUT the '+' prefix
    clean_phone = phone.replace(" ", "").replace("-", "").lstrip("+")

    headers = {
        "Authorization": f"Bearer {config['token']}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": "text",
        "text": {"body": message},
    }

    try:
        resp = requests.post(config["url"], json=payload, headers=headers, timeout=30)
        resp_data = resp.json()

        if resp.ok:
            messages = resp_data.get("messages", [])
            msg_id = messages[0]["id"] if messages else None
            logger.info("WhatsApp sent to %s — msgId: %s", clean_phone, msg_id)
            return {"success": True, "data": {"message_id": msg_id}}
        else:
            error_obj = resp_data.get("error", {})
            error_msg = error_obj.get("message", resp.text)
            logger.error("WhatsApp send failed for %s: %s", clean_phone, error_msg)
            return {"success": False, "error": str(error_msg)}
    except Exception as e:
        logger.error("WhatsApp send failed for %s: %s", clean_phone, e)
        return {"success": False, "error": str(e)}


def send_whatsapp_template(
    phone: str,
    customer_name: str,
    appointment_date: str,
    appointment_time: str,
    intake_url_slug: str,
    image_id: str = "1997514164526776",
) -> dict:
    """
    Send the 'appointment_confirmed' WhatsApp template message.

    Args:
        phone: Recipient phone in international format
        customer_name: Patient's name (body param)
        appointment_date: e.g. "February 26, 2026" (body param)
        appointment_time: e.g. "3:00 PM" (body param)
        intake_url_slug: Dynamic suffix for the button URL (the intake token UUID + trailing slash)
        image_id: WhatsApp media ID for the header image
    Returns:
        dict with 'success' bool and 'data' or 'error'
    """
    config = _get_config()
    if not config:
        logger.warning("WhatsApp Business API not configured — skipping send")
        return {
            "success": False,
            "error": "WhatsApp not configured (missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)",
        }

    clean_phone = phone.replace(" ", "").replace("-", "").lstrip("+")

    headers = {
        "Authorization": f"Bearer {config['token']}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": "template",
        "template": {
            "name": "appointment_confirmed",
            "language": {"code": "en"},
            "components": [
                {
                    "type": "header",
                    "parameters": [
                        {"type": "image", "image": {"id": image_id}}
                    ],
                },
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "parameter_name": "customer_name", "text": customer_name},
                        {"type": "text", "parameter_name": "appointment_date", "text": appointment_date},
                        {"type": "text", "parameter_name": "appointment_time", "text": appointment_time},
                    ],
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [
                        {"type": "text", "text": intake_url_slug}
                    ],
                },
            ],
        },
    }

    try:
        resp = requests.post(config["url"], json=payload, headers=headers, timeout=30)
        resp_data = resp.json()

        if resp.ok:
            messages = resp_data.get("messages", [])
            msg_id = messages[0]["id"] if messages else None
            logger.info("WhatsApp template sent to %s — msgId: %s", clean_phone, msg_id)
            return {"success": True, "data": {"message_id": msg_id}}
        else:
            error_obj = resp_data.get("error", {})
            error_msg = error_obj.get("message", resp.text)
            logger.error("WhatsApp template send failed for %s: %s", clean_phone, error_msg)
            return {"success": False, "error": str(error_msg)}
    except Exception as e:
        logger.error("WhatsApp template send failed for %s: %s", clean_phone, e)
        return {"success": False, "error": str(e)}


def send_intake_whatsapp(
    phone: str,
    patient_name: str,
    appointment_time: str,
    intake_link: str,
) -> dict:
    """
    Send an appointment confirmation + intake link to a patient via WhatsApp
    using the 'appointment_confirmed' template.

    Args:
        phone: Patient phone number
        patient_name: Patient's name
        appointment_time: Human-readable appointment time (e.g. "February 26, 2026 at 03:00 PM")
        intake_link: The unique intake form URL
    Returns:
        dict with 'success' and details
    """
    # Parse "February 26, 2026 at 03:00 PM" into separate date and time
    if " at " in appointment_time:
        date_part, time_part = appointment_time.rsplit(" at ", 1)
    else:
        date_part = appointment_time
        time_part = ""

    # Extract the intake token slug from the full URL
    # e.g. "https://frontend-parchi.vercel.app/intake/2d570b49-..." → "2d570b49-.../"
    slug = intake_link.rstrip("/").split("/")[-1]
    if not slug.endswith("/"):
        slug += "/"

    return send_whatsapp_template(
        phone=phone,
        customer_name=patient_name,
        appointment_date=date_part,
        appointment_time=time_part,
        intake_url_slug=slug,
    )
