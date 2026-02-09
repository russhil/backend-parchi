"""
Telegram Patient Intake Bot for Parchi.ai.
Simple step-by-step form to collect patient demographics, medical history,
documents (with OCR), and book an appointment.
"""

import io
import logging
import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
)
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from database import (
    create_appointment,
    create_document,
    create_patient,
    create_telegram_session,
    get_active_telegram_session,
    update_telegram_session,
)
from slot_availability import get_available_dates, get_available_slots
from supabase_storage import upload_file

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Session model
# ---------------------------------------------------------------------------

class IntakeSession(BaseModel):
    """Tracks form state for a single Telegram intake."""
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: str | None = None  # Free text
    medications: str | None = None  # Free text
    allergies: str | None = None  # Free text
    reason: str | None = None
    uploaded_files: list[dict] = Field(default_factory=list)
    selected_date: str | None = None
    selected_slot: str | None = None
    current_field: str = "name"  # name | age | gender | phone | height | weight | conditions | medications | allergies | reason | files | done
    state: str = "collecting_info"  # collecting_info | uploading_files | choosing_slot | confirming | done


# ---------------------------------------------------------------------------
# OCR helper
# ---------------------------------------------------------------------------

def extract_text_from_file(content: bytes, filename: str, content_type: str = "") -> str:
    """Extract text from a file using OCR (images) or pdfplumber (PDFs)."""
    try:
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                parts = [page.extract_text() or "" for page in pdf.pages]
                return "\n\n".join(p for p in parts if p)

        if content_type.startswith("image/") or any(
            filename.lower().endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff")
        ):
            import pytesseract
            from PIL import Image
            image = Image.open(io.BytesIO(content))
            return pytesseract.image_to_string(image)

        return content.decode("utf-8", errors="ignore")
    except Exception as e:
        return f"[extraction error: {e}]"


# ---------------------------------------------------------------------------
# Bot class
# ---------------------------------------------------------------------------

class TelegramIntakeBot:
    def __init__(self, token: str):
        self.token = token
        self.app = Application.builder().token(token).build()
        self._register_handlers()

    # -- handler registration -----------------------------------------------

    def _register_handlers(self) -> None:
        self.app.add_handler(CommandHandler("start", self._handle_start))
        self.app.add_handler(CommandHandler("cancel", self._handle_cancel))
        self.app.add_handler(CallbackQueryHandler(self._handle_callback))
        self.app.add_handler(
            MessageHandler(filters.PHOTO | filters.Document.ALL, self._handle_file)
        )
        self.app.add_handler(
            MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_text)
        )

    # -- helpers ------------------------------------------------------------

    def _load_session(self, chat_id: int) -> tuple[str | None, IntakeSession | None]:
        """Load the active session for a chat, returning (db_id, session)."""
        row = get_active_telegram_session(chat_id)
        if not row:
            return None, None
        data = row.get("session_data") or {}

        # Backward compatibility: convert old list format to string format
        if isinstance(data.get("conditions"), list):
            data["conditions"] = ", ".join(data["conditions"]) if data["conditions"] else None
        if isinstance(data.get("medications"), list):
            data["medications"] = ", ".join(data["medications"]) if data["medications"] else None
        if isinstance(data.get("allergies"), list):
            data["allergies"] = ", ".join(data["allergies"]) if data["allergies"] else None

        return row["id"], IntakeSession(**data)

    def _save_session(self, db_id: str, session: IntakeSession) -> None:
        update_telegram_session(db_id, {"session_data": session.model_dump(mode="json")})

    def _get_next_field(self, current: str) -> str:
        """Return the next field to collect."""
        fields = ["name", "age", "gender", "phone", "height", "weight", "conditions", "medications", "allergies", "reason", "files", "done"]
        try:
            idx = fields.index(current)
            if idx + 1 < len(fields):
                return fields[idx + 1]
        except ValueError:
            pass
        return "done"

    def _get_question_for_field(self, field: str) -> str:
        """Return the question text for a given field."""
        questions = {
            "name": "What is your full name?",
            "age": "What is your age?",
            "gender": "What is your gender? (male/female/other)",
            "phone": "What is your phone number?",
            "height": "What is your height in centimeters (cm)?\nType 'skip' if you don't know.",
            "weight": "What is your weight in kilograms (kg)?\nType 'skip' if you don't know.",
            "conditions": "Do you have any known medical conditions? (e.g., diabetes, hypertension)\nType 'none' if you don't have any.",
            "medications": "Are you currently taking any medications?\nType 'none' if you're not taking any.",
            "allergies": "Do you have any allergies (medications, food, environmental)?\nType 'none' if you don't have any.",
            "reason": "What is the reason for your visit?",
            "files": "Do you have any medical reports, prescriptions, or documents to share?\nSend them as photos or files, or type 'done' to skip.",
        }
        return questions.get(field, "Please provide the requested information.")

    # -- /start -------------------------------------------------------------

    async def _handle_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        chat_id = update.effective_chat.id
        db_id, existing = self._load_session(chat_id)

        if existing and existing.state != "done":
            await update.message.reply_text(
                "You already have a registration in progress!\n"
                "Type /cancel to start over, or continue from where you left off."
            )
            # Resume from current field
            question = self._get_question_for_field(existing.current_field)
            await update.message.reply_text(question)
            return

        # Create new session
        session = IntakeSession()
        new_id = f"tis-{uuid.uuid4().hex[:8]}"
        create_telegram_session({
            "id": new_id,
            "telegram_chat_id": chat_id,
            "session_data": session.model_dump(mode="json"),
            "status": "in_progress",
        })

        await update.message.reply_text(
            "Welcome to Parchi.ai! I'll help you register as a new patient and book an appointment.\n\n"
            "Let's start with a few questions."
        )
        await update.message.reply_text(self._get_question_for_field("name"))

    # -- /cancel ------------------------------------------------------------

    async def _handle_cancel(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        chat_id = update.effective_chat.id
        db_id, session = self._load_session(chat_id)
        if db_id:
            update_telegram_session(db_id, {"status": "abandoned"})
        await update.message.reply_text(
            "Registration cancelled. You can start again anytime with /start."
        )

    # -- text messages ------------------------------------------------------

    async def _handle_text(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        chat_id = update.effective_chat.id
        text = update.message.text.strip()
        db_id, session = self._load_session(chat_id)

        if not db_id or not session:
            await update.message.reply_text("No active registration. Send /start to begin.")
            return

        # Route based on state
        if session.state == "collecting_info":
            await self._handle_form_input(update, db_id, session, text)
        elif session.state == "uploading_files":
            await self._handle_file_text(update, db_id, session, text)
        elif session.state == "confirming":
            await update.message.reply_text("Please use the Confirm / Start Over buttons above.")
        else:
            await update.message.reply_text("Please use the buttons to continue.")

    # -- form input handler -------------------------------------------------

    async def _handle_form_input(
        self, update: Update, db_id: str, session: IntakeSession, text: str
    ) -> None:
        field = session.current_field

        # Store the value
        if field == "name":
            session.name = text
        elif field == "age":
            try:
                session.age = int(text)
            except ValueError:
                await update.message.reply_text("Please enter a valid age (number).")
                return
        elif field == "gender":
            session.gender = text.lower()
        elif field == "phone":
            session.phone = text
        elif field == "height":
            if text.lower() not in ("skip", "na", "n/a"):
                try:
                    session.height_cm = float(text)
                except ValueError:
                    await update.message.reply_text("Please enter a valid number for height (in cm), or type 'skip'.")
                    return
        elif field == "weight":
            if text.lower() not in ("skip", "na", "n/a"):
                try:
                    session.weight_kg = float(text)
                except ValueError:
                    await update.message.reply_text("Please enter a valid number for weight (in kg), or type 'skip'.")
                    return
        elif field == "conditions":
            session.conditions = text if text.lower() != "none" else None
        elif field == "medications":
            session.medications = text if text.lower() != "none" else None
        elif field == "allergies":
            session.allergies = text if text.lower() != "none" else None
        elif field == "reason":
            session.reason = text

        # Move to next field
        next_field = self._get_next_field(field)
        session.current_field = next_field

        if next_field == "files":
            session.state = "uploading_files"
            self._save_session(db_id, session)
            await update.message.reply_text(self._get_question_for_field("files"))
        elif next_field == "done":
            session.state = "choosing_slot"
            self._save_session(db_id, session)
            await self._show_date_picker(update, session)
        else:
            self._save_session(db_id, session)
            await update.message.reply_text(self._get_question_for_field(next_field))

    # -- file upload --------------------------------------------------------

    async def _handle_file_text(
        self, update: Update, db_id: str, session: IntakeSession, text: str
    ) -> None:
        lower = text.lower().strip()
        if lower in ("done", "no", "skip", "nahi"):
            session.state = "choosing_slot"
            self._save_session(db_id, session)
            await self._show_date_picker(update, session)
        else:
            await update.message.reply_text(
                "Please send a photo or file, or type 'done' to skip."
            )

    async def _handle_file(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        chat_id = update.effective_chat.id
        db_id, session = self._load_session(chat_id)

        if not db_id or not session:
            await update.message.reply_text("No active registration. Send /start to begin.")
            return

        if session.state != "uploading_files":
            await update.message.reply_text("I'm not expecting files right now. Please follow the current step.")
            return

        await update.message.reply_text("Received! Processing your document...")

        # Download file from Telegram
        if update.message.photo:
            photo = update.message.photo[-1]  # highest resolution
            tg_file = await photo.get_file()
            filename = f"{photo.file_unique_id}.jpg"
            content_type = "image/jpeg"
        elif update.message.document:
            doc = update.message.document
            tg_file = await doc.get_file()
            filename = doc.file_name or f"{doc.file_unique_id}"
            content_type = doc.mime_type or "application/octet-stream"
        else:
            await update.message.reply_text("Unsupported file type.")
            return

        file_bytes = await tg_file.download_as_bytearray()
        file_bytes = bytes(file_bytes)

        # Upload to Supabase Storage
        storage_path = f"telegram-intake/{db_id}/{filename}"
        try:
            file_url = upload_file(file_bytes, storage_path, content_type)
        except Exception as e:
            logger.error("Storage upload failed: %s", e)
            file_url = ""

        # OCR
        extracted_text = extract_text_from_file(file_bytes, filename, content_type)
        extracted_text = extracted_text[:10000]

        session.uploaded_files.append({
            "filename": filename,
            "file_url": file_url,
            "title": filename,
            "doc_type": "other",
            "extracted_text": extracted_text,
        })
        self._save_session(db_id, session)

        await update.message.reply_text(
            f"Document saved: {filename}\n"
            "Send another file, or type 'done' when finished."
        )

    # -- slot picker --------------------------------------------------------

    async def _show_date_picker(self, update: Update, session: IntakeSession) -> None:
        dates = get_available_dates()
        if not dates:
            await update.message.reply_text(
                "Sorry, no appointment slots are available in the next week. "
                "Please contact the clinic directly."
            )
            return

        buttons = []
        for d in dates:
            from datetime import date as _date
            dt = _date.fromisoformat(d)
            label = dt.strftime("%a %d %b")  # e.g. "Mon 10 Feb"
            buttons.append([InlineKeyboardButton(label, callback_data=f"date:{d}")])

        await update.message.reply_text(
            "Great! Let's book your appointment.\nPick a date:",
            reply_markup=InlineKeyboardMarkup(buttons),
        )

    async def _handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        query = update.callback_query
        await query.answer()
        chat_id = query.message.chat_id
        data = query.data

        db_id, session = self._load_session(chat_id)
        if not db_id or not session:
            await query.edit_message_text("Session expired. Send /start to begin again.")
            return

        if data.startswith("date:"):
            date_val = data.split(":", 1)[1]
            session.selected_date = date_val
            self._save_session(db_id, session)
            await self._show_time_picker(query, date_val)

        elif data.startswith("slot:"):
            time_val = data.split(":", 1)[1]
            session.selected_slot = time_val
            session.state = "confirming"
            self._save_session(db_id, session)
            await self._show_confirmation(query, db_id, session)

        elif data == "confirm":
            await query.edit_message_text("Registering you now...")
            await self._finalize_intake(query, db_id, session)

        elif data == "restart":
            update_telegram_session(db_id, {"status": "abandoned"})
            await query.edit_message_text("Cancelled. Send /start to begin fresh.")

    async def _show_time_picker(self, query, date_val: str) -> None:
        slots = get_available_slots(date_val)
        if not slots:
            await query.edit_message_text("No slots available on that date. Please pick another.")
            return

        buttons = []
        row: list[InlineKeyboardButton] = []
        for s in slots:
            row.append(InlineKeyboardButton(s, callback_data=f"slot:{s}"))
            if len(row) == 3:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)

        from datetime import date as _date
        dt = _date.fromisoformat(date_val)
        await query.edit_message_text(
            f"Available slots for {dt.strftime('%A, %d %b %Y')}:",
            reply_markup=InlineKeyboardMarkup(buttons),
        )

    # -- confirmation -------------------------------------------------------

    async def _show_confirmation(self, query, db_id: str, session: IntakeSession) -> None:
        from datetime import date as _date
        dt = _date.fromisoformat(session.selected_date)

        summary = f"📋 *Registration Summary*\n\n"
        summary += f"👤 Name: {session.name}\n"
        summary += f"🎂 Age: {session.age}\n"
        summary += f"⚧ Gender: {session.gender}\n"
        summary += f"📞 Phone: {session.phone}\n"
        if session.height_cm:
            summary += f"📏 Height: {session.height_cm} cm\n"
        if session.weight_kg:
            summary += f"⚖️ Weight: {session.weight_kg} kg\n"
        summary += f"🏥 Conditions: {session.conditions or 'None'}\n"
        summary += f"💊 Medications: {session.medications or 'None'}\n"
        summary += f"⚠️ Allergies: {session.allergies or 'None'}\n"
        summary += f"📝 Reason: {session.reason}\n"
        summary += f"📄 Documents: {len(session.uploaded_files)} uploaded\n"
        summary += f"\n📅 Appointment: {dt.strftime('%A, %d %b %Y')} at {session.selected_slot}\n"

        buttons = [
            [
                InlineKeyboardButton("✅ Confirm", callback_data="confirm"),
                InlineKeyboardButton("🔄 Start Over", callback_data="restart"),
            ]
        ]
        await query.edit_message_text(
            summary,
            reply_markup=InlineKeyboardMarkup(buttons),
            parse_mode="Markdown",
        )

    # -- finalize -----------------------------------------------------------

    async def _finalize_intake(self, query, db_id: str, session: IntakeSession) -> None:
        try:
            # 1. Create patient
            patient_id = f"p-{uuid.uuid4().hex[:8]}"
            patient_data: dict = {
                "id": patient_id,
                "name": session.name or "Unknown",
            }
            if session.age is not None:
                patient_data["age"] = session.age
            if session.gender:
                patient_data["gender"] = session.gender
            if session.phone:
                patient_data["phone"] = session.phone
            if session.height_cm is not None:
                patient_data["height_cm"] = session.height_cm
            if session.weight_kg is not None:
                patient_data["weight_kg"] = session.weight_kg
            if session.conditions:
                patient_data["conditions"] = [session.conditions]
            if session.medications:
                patient_data["medications"] = [session.medications]
            if session.allergies:
                patient_data["allergies"] = [session.allergies]

            create_patient(patient_data)
            logger.info("Created patient %s via Telegram intake", patient_id)

            # 2. Create appointment
            appointment_id = f"a-{uuid.uuid4().hex[:8]}"
            start_time = f"{session.selected_date}T{session.selected_slot}:00"
            create_appointment({
                "id": appointment_id,
                "patient_id": patient_id,
                "start_time": start_time,
                "status": "scheduled",
                "reason": session.reason or "General consultation",
            })
            logger.info("Created appointment %s via Telegram intake", appointment_id)

            # 3. Create documents
            for f in session.uploaded_files:
                doc_id = f"d-{uuid.uuid4().hex[:8]}"
                doc_data: dict = {
                    "id": doc_id,
                    "patient_id": patient_id,
                    "title": f.get("title", f.get("filename", "Uploaded document")),
                    "doc_type": f.get("doc_type", "other"),
                    "extracted_text": f.get("extracted_text", ""),
                }
                if f.get("file_url"):
                    doc_data["file_url"] = f["file_url"]
                try:
                    create_document(doc_data)
                except Exception as doc_err:
                    # If file_url column doesn't exist, retry without it
                    if "file_url" in str(doc_err):
                        doc_data.pop("file_url", None)
                        create_document(doc_data)
                    else:
                        raise

            # 4. Update telegram session
            session.state = "done"
            update_telegram_session(db_id, {
                "patient_id": patient_id,
                "appointment_id": appointment_id,
                "session_data": session.model_dump(mode="json"),
                "status": "completed",
            })

            from datetime import date as _date
            dt = _date.fromisoformat(session.selected_date)
            await query.message.reply_text(
                f"✅ *You're all set!*\n\n"
                f"🆔 Patient ID: `{patient_id}`\n"
                f"📅 Appointment: {dt.strftime('%A, %d %b %Y')} at {session.selected_slot}\n"
                f"📝 Reason: {session.reason}\n\n"
                "⏰ Please arrive 10 minutes early. See you soon!",
                parse_mode="Markdown",
            )

        except Exception as e:
            logger.error("Finalize intake failed: %s", e, exc_info=True)
            await query.message.reply_text(
                "❌ Something went wrong while saving your registration. "
                "Please contact the clinic directly. We apologise for the inconvenience."
            )

    # -- startup / shutdown -------------------------------------------------

    async def _set_bot_commands(self) -> None:
        """Set the bot command menu."""
        from telegram import BotCommand
        commands = [
            BotCommand("start", "Start new patient registration"),
            BotCommand("cancel", "Cancel current registration"),
        ]
        await self.app.bot.set_my_commands(commands)
        logger.info("Bot commands menu set")

    async def setup_webhook(self, webhook_url: str) -> None:
        """Set the Telegram webhook URL (for production)."""
        await self.app.bot.set_webhook(url=webhook_url)
        try:
            await self._set_bot_commands()
        except Exception as e:
            logger.warning("Failed to set bot commands: %s", e)
        logger.info("Telegram webhook set to %s", webhook_url)

    async def start_polling(self) -> None:
        """Start long-polling (for local dev)."""
        await self.app.initialize()
        await self.app.start()
        try:
            await self._set_bot_commands()
        except Exception as e:
            logger.warning("Failed to set bot commands: %s", e)
        await self.app.updater.start_polling()
        logger.info("Telegram bot polling started")

    async def stop(self) -> None:
        """Gracefully stop the bot."""
        try:
            if self.app.updater and self.app.updater.running:
                await self.app.updater.stop()
            await self.app.stop()
            await self.app.shutdown()
        except Exception as e:
            logger.warning("Error stopping Telegram bot: %s", e)

    async def process_update(self, update_data: dict) -> None:
        """Process a single update from webhook."""
        update = Update.de_json(update_data, self.app.bot)
        await self.app.process_update(update)
