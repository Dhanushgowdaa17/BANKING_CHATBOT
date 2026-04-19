from flask import Blueprint, request, jsonify
from routes.auth import token_required
from database import get_db
import requests, uuid, logging
from config import Config

chat_bp = Blueprint("chat", __name__)
logger = logging.getLogger(__name__)

@chat_bp.route("/message", methods=["POST"])
@token_required
def send_message():
    data = request.get_json()
    message = data.get("message","").strip()
    session_id = data.get("session_id", str(uuid.uuid4()))
    if not message:
        return jsonify({"error": "Message required"}), 400

    user_id = request.user_id
    db = get_db()
    try:
        db.execute("INSERT INTO chat_history (user_id,session_id,role,message) VALUES (?,?,'user',?)",
                   (user_id, session_id, message))
        db.commit()

        try:
            rasa_resp = requests.post(f"{Config.RASA_URL}/webhooks/rest/webhook",
                                      json={"sender": f"user_{user_id}", "message": message}, timeout=5)
            rasa_data = rasa_resp.json()
        except:
            rasa_data = fallback_nlu(message, user_id, db)

        replies = []
        for item in rasa_data:
            text = item.get("text","")
            if text:
                replies.append(text)
                db.execute("INSERT INTO chat_history (user_id,session_id,role,message) VALUES (?,?,'bot',?)",
                           (user_id, session_id, text))
        db.commit()

        return jsonify({"replies": replies or ["How can I help you?"], "session_id": session_id})
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({"error": "Failed to process message"}), 500
    finally:
        db.close()

@chat_bp.route("/history", methods=["GET"])
@token_required
def get_history():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT role,message,created_at FROM chat_history
            WHERE user_id=? ORDER BY created_at DESC LIMIT 50
        """, (request.user_id,)).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()

@chat_bp.route("/clear", methods=["DELETE"])
@token_required
def clear_history():
    db = get_db()
    try:
        db.execute("DELETE FROM chat_history WHERE user_id=?", (request.user_id,))
        db.commit()
        return jsonify({"message": "History cleared"})
    finally:
        db.close()

def fallback_nlu(message, user_id, db):
    msg = message.lower()
    account = db.execute("SELECT * FROM accounts WHERE user_id=?", (user_id,)).fetchone()

    if any(w in msg for w in ["balance","how much","funds","money in"]):
        if account:
            return [{"text": f"💰 Your current account balance is **₹{account['balance']:,.2f}** INR."}]

    if any(w in msg for w in ["transaction","history","statement","spent","payment"]):
        txns = db.execute("""SELECT type,amount,description,created_at FROM transactions
            WHERE user_id=? ORDER BY created_at DESC LIMIT 5""", (user_id,)).fetchall()
        if txns:
            lines = ["📋 **Last 5 transactions:**\n"]
            for t in txns:
                icon = "🔴" if t["type"]=="debit" else "🟢"
                lines.append(f"{icon} {t['description']} — ₹{t['amount']:,.2f} ({t['created_at'][:10]})")
            return [{"text": "\n".join(lines)}]

    if any(w in msg for w in ["loan","emi","borrow","mortgage"]):
        loans = db.execute("SELECT * FROM loans WHERE user_id=? AND status='active'", (user_id,)).fetchall()
        if loans:
            lines = ["🏦 **Your active loans:**\n"]
            for l in loans:
                lines.append(f"• {l['loan_type'].title()} Loan — Outstanding: ₹{l['outstanding']:,.2f} | EMI: ₹{l['emi']:,.2f}/mo")
            return [{"text": "\n".join(lines)}]
        return [{"text": "You have no active loans."}]

    if any(w in msg for w in ["reward","point","cashback"]):
        total = db.execute("SELECT SUM(points) FROM rewards WHERE user_id=? AND status='active'", (user_id,)).fetchone()[0] or 0
        cash = db.execute("SELECT SUM(cashback_value) FROM rewards WHERE user_id=? AND status='active'", (user_id,)).fetchone()[0] or 0
        return [{"text": f"🎁 **Your Rewards:**\n\n⭐ Points: **{total} pts**\n💵 Cashback Value: **₹{cash:,.2f}**"}]

    if any(w in msg for w in ["card","block","freeze","stolen"]):
        return [{"text": "🔒 To block your card, go to **Cards** section in the dashboard or type **CONFIRM BLOCK**."}]

    if any(w in msg for w in ["hi","hello","hey","good morning","good evening"]):
        return [{"text": "👋 Hello! I'm your SmartBank assistant. I can help with balances, transactions, loans, rewards, and more!"}]

    if any(w in msg for w in ["human","agent","person","representative"]):
        return [{"text": "🧑‍💼 Connecting you to a live agent. Reference ID: **CHAT-" + str(user_id).zfill(5) + "**\n📞 Helpline: **1-800-SMARTBANK**"}]

    if any(w in msg for w in ["interest","rate","fd","deposit"]):
        return [{"text": "📊 **Current Rates:**\n• Savings: **3.5% p.a.**\n• FD (1yr): **6.75% p.a.**\n• Home Loan: **7.5% p.a.**\n• Personal Loan: **12.0% p.a.**"}]

    return [{"text": "I can help with balance, transactions, loans, rewards, card management and more. What would you like to know?"}]
