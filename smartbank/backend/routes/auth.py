from flask import Blueprint, request, jsonify
from database import get_db, hash_password, generate_user_data
import jwt, datetime, random, string, logging
from config import Config
from functools import wraps

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)

def generate_token(user_id, username, is_admin=False):
    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": datetime.datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES,
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            request.user_id = data["user_id"]
            request.username = data["username"]
            request.is_admin = data.get("is_admin", False)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if not request.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username","").strip()
    email = data.get("email","").strip()
    password = data.get("password","")
    full_name = data.get("full_name","").strip()
    phone = data.get("phone","").strip()

    if not all([username, email, password]):
        return jsonify({"error": "Username, email and password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    db = get_db()
    try:
        acc = "ACC-" + "".join(random.choices(string.digits, k=6))
        db.execute("""
            INSERT INTO users (username,email,password_hash,full_name,account_number,phone)
            VALUES (?,?,?,?,?,?)
        """, (username, email, hash_password(password), full_name, acc, phone))
        user_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.execute("INSERT INTO accounts (user_id,account_type,balance) VALUES (?,?,?)",
                   (user_id, 'savings', 0))
        account_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        generate_user_data(db, user_id, account_id, seed=user_id)
        db.commit()
        token = generate_token(user_id, username)
        logger.info(f"New user: {username}")
        return jsonify({"token": token, "username": username, "full_name": full_name,
                        "account_number": acc, "is_admin": False}), 201
    except Exception as e:
        db.rollback()
        if "UNIQUE" in str(e):
            return jsonify({"error": "Username or email already exists"}), 409
        logger.error(f"Signup error: {e}")
        return jsonify({"error": "Registration failed"}), 500
    finally:
        db.close()

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username","").strip()
    password = data.get("password","")
    if not all([username, password]):
        return jsonify({"error": "Username and password required"}), 400
    db = get_db()
    try:
        user = db.execute(
            "SELECT * FROM users WHERE username=? AND password_hash=? AND is_active=1",
            (username, hash_password(password))
        ).fetchone()
        if not user:
            return jsonify({"error": "Invalid credentials or account disabled"}), 401
        db.execute("UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?", (user["id"],))
        db.commit()
        token = generate_token(user["id"], user["username"], bool(user["is_admin"]))
        return jsonify({
            "token": token,
            "username": user["username"],
            "full_name": user["full_name"],
            "account_number": user["account_number"],
            "is_admin": bool(user["is_admin"])
        })
    finally:
        db.close()

@auth_bp.route("/verify", methods=["GET"])
@token_required
def verify():
    return jsonify({"valid": True, "username": request.username, "is_admin": request.is_admin})
