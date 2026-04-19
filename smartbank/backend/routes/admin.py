from flask import Blueprint, request, jsonify
from database import get_db, hash_password
from routes.auth import admin_required
import logging

admin_bp = Blueprint("admin", __name__)
logger = logging.getLogger(__name__)

@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users():
    db = get_db()
    try:
        users = db.execute("""
            SELECT u.id, u.username, u.email, u.full_name, u.account_number,
                   u.phone, u.is_admin, u.is_active, u.created_at, u.last_login,
                   a.balance, a.account_type,
                   (SELECT COUNT(*) FROM transactions WHERE user_id=u.id) as txn_count,
                   (SELECT COUNT(*) FROM loans WHERE user_id=u.id AND status='active') as loan_count
            FROM users u
            LEFT JOIN accounts a ON a.user_id=u.id
            ORDER BY u.created_at DESC
        """).fetchall()
        return jsonify([dict(u) for u in users])
    finally:
        db.close()

@admin_bp.route("/users/<int:uid>", methods=["GET"])
@admin_required
def get_user(uid):
    db = get_db()
    try:
        user = db.execute("""
            SELECT u.*, a.balance, a.account_type, a.currency
            FROM users u LEFT JOIN accounts a ON a.user_id=u.id
            WHERE u.id=?
        """, (uid,)).fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(dict(user))
    finally:
        db.close()

@admin_bp.route("/users/<int:uid>/toggle", methods=["POST"])
@admin_required
def toggle_user(uid):
    db = get_db()
    try:
        user = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        new_status = 0 if user["is_active"] else 1
        db.execute("UPDATE users SET is_active=? WHERE id=?", (new_status, uid))
        db.commit()
        status_str = "activated" if new_status else "disabled"
        return jsonify({"message": f"User {status_str} successfully", "is_active": bool(new_status)})
    finally:
        db.close()

@admin_bp.route("/users/<int:uid>/reset-password", methods=["POST"])
@admin_required
def reset_password(uid):
    data = request.get_json()
    new_password = data.get("password","")
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    db = get_db()
    try:
        db.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(new_password), uid))
        db.commit()
        return jsonify({"message": "Password reset successfully"})
    finally:
        db.close()

@admin_bp.route("/users/<int:uid>", methods=["DELETE"])
@admin_required
def delete_user(uid):
    db = get_db()
    try:
        db.execute("DELETE FROM transactions WHERE user_id=?", (uid,))
        db.execute("DELETE FROM loans WHERE user_id=?", (uid,))
        db.execute("DELETE FROM rewards WHERE user_id=?", (uid,))
        db.execute("DELETE FROM cards WHERE user_id=?", (uid,))
        db.execute("DELETE FROM chat_history WHERE user_id=?", (uid,))
        db.execute("DELETE FROM accounts WHERE user_id=?", (uid,))
        db.execute("DELETE FROM users WHERE id=?", (uid,))
        db.commit()
        return jsonify({"message": "User deleted"})
    finally:
        db.close()

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    db = get_db()
    try:
        total_users = db.execute("SELECT COUNT(*) FROM users WHERE is_admin=0").fetchone()[0]
        active_users = db.execute("SELECT COUNT(*) FROM users WHERE is_active=1 AND is_admin=0").fetchone()[0]
        total_txns = db.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        total_loans = db.execute("SELECT COUNT(*) FROM loans WHERE status='active'").fetchone()[0]
        total_balance = db.execute("SELECT SUM(balance) FROM accounts").fetchone()[0] or 0
        recent_users = db.execute("""
            SELECT username, email, full_name, created_at FROM users
            WHERE is_admin=0 ORDER BY created_at DESC LIMIT 5
        """).fetchall()
        return jsonify({
            "total_users": total_users,
            "active_users": active_users,
            "total_transactions": total_txns,
            "active_loans": total_loans,
            "total_balance": round(total_balance, 2),
            "recent_users": [dict(u) for u in recent_users]
        })
    finally:
        db.close()
