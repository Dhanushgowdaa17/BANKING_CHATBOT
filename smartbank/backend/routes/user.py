from flask import Blueprint, request, jsonify
from routes.auth import token_required
from database import get_db

user_bp = Blueprint("user", __name__)

@user_bp.route("/profile", methods=["GET"])
@token_required
def get_profile():
    db = get_db()
    try:
        user = db.execute(
            "SELECT id,username,email,full_name,account_number,phone,created_at FROM users WHERE id=?",
            (request.user_id,)
        ).fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(dict(user))
    finally:
        db.close()

@user_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json()
    db = get_db()
    try:
        db.execute(
            "UPDATE users SET full_name=?, phone=? WHERE id=?",
            (data.get("full_name"), data.get("phone"), request.user_id)
        )
        db.commit()
        return jsonify({"message": "Profile updated"})
    finally:
        db.close()

@user_bp.route("/balance", methods=["GET"])
@token_required
def get_balance():
    db = get_db()
    try:
        accounts = db.execute("SELECT * FROM accounts WHERE user_id=?", (request.user_id,)).fetchall()
        return jsonify([dict(a) for a in accounts])
    finally:
        db.close()

@user_bp.route("/transactions", methods=["GET"])
@token_required
def get_transactions():
    limit = min(int(request.args.get("limit", 20)), 200)
    offset = int(request.args.get("offset", 0))
    category = request.args.get("category")
    txn_type = request.args.get("type")
    search = request.args.get("search","")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    db = get_db()
    try:
        query = "SELECT * FROM transactions WHERE user_id=?"
        params = [request.user_id]
        if category:
            query += " AND category=?"; params.append(category)
        if txn_type:
            query += " AND type=?"; params.append(txn_type)
        if search:
            query += " AND description LIKE ?"; params.append(f"%{search}%")
        if date_from:
            query += " AND created_at>=?"; params.append(date_from)
        if date_to:
            query += " AND created_at<=?"; params.append(date_to + " 23:59:59")
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        rows = db.execute(query, params).fetchall()
        total = db.execute(
            "SELECT COUNT(*) FROM transactions WHERE user_id=?", (request.user_id,)
        ).fetchone()[0]
        return jsonify({"transactions": [dict(r) for r in rows], "total": total})
    finally:
        db.close()

@user_bp.route("/transactions/summary", methods=["GET"])
@token_required
def get_summary():
    db = get_db()
    try:
        by_category = db.execute("""
            SELECT category, SUM(amount) as total, COUNT(*) as count
            FROM transactions WHERE user_id=? AND type='debit'
            GROUP BY category ORDER BY total DESC
        """, (request.user_id,)).fetchall()
        monthly = db.execute("""
            SELECT strftime('%Y-%m', created_at) as month,
                   SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as income,
                   SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) as expense
            FROM transactions WHERE user_id=?
            GROUP BY month ORDER BY month DESC LIMIT 6
        """, (request.user_id,)).fetchall()
        return jsonify({
            "by_category": [dict(r) for r in by_category],
            "monthly": [dict(r) for r in monthly]
        })
    finally:
        db.close()

@user_bp.route("/cards", methods=["GET"])
@token_required
def get_cards():
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM cards WHERE user_id=?", (request.user_id,)).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()

@user_bp.route("/cards/<int:card_id>/block", methods=["POST"])
@token_required
def block_card(card_id):
    db = get_db()
    try:
        card = db.execute("SELECT * FROM cards WHERE id=? AND user_id=?", (card_id, request.user_id)).fetchone()
        if not card:
            return jsonify({"error": "Card not found"}), 404
        db.execute("UPDATE cards SET status='blocked' WHERE id=?", (card_id,))
        db.commit()
        return jsonify({"message": f"Card {card['card_number_masked']} blocked."})
    finally:
        db.close()

@user_bp.route("/cards/<int:card_id>/unblock", methods=["POST"])
@token_required
def unblock_card(card_id):
    db = get_db()
    try:
        db.execute("UPDATE cards SET status='active' WHERE id=?", (card_id,))
        db.commit()
        return jsonify({"message": "Card unblocked successfully."})
    finally:
        db.close()

@user_bp.route("/loans", methods=["GET"])
@token_required
def get_loans():
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM loans WHERE user_id=?", (request.user_id,)).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()

@user_bp.route("/rewards", methods=["GET"])
@token_required
def get_rewards():
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM rewards WHERE user_id=? ORDER BY date DESC", (request.user_id,)).fetchall()
        total_points = db.execute("SELECT SUM(points) FROM rewards WHERE user_id=? AND status='active'", (request.user_id,)).fetchone()[0] or 0
        total_cashback = db.execute("SELECT SUM(cashback_value) FROM rewards WHERE user_id=? AND status='active'", (request.user_id,)).fetchone()[0] or 0
        return jsonify({"rewards": [dict(r) for r in rows], "total_points": total_points, "total_cashback": round(total_cashback,2)})
    finally:
        db.close()
