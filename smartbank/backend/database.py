import sqlite3
import hashlib
import random
from config import Config
from datetime import datetime, timedelta

def get_db():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()

def generate_user_data(cur, user_id, account_id, seed=None):
    if seed:
        random.seed(seed)

    categories = {
        'debit': ['Shopping','Food','Utilities','Transport','Entertainment','Healthcare','Housing','Education'],
        'credit': ['Salary','Transfer','Cashback','Refund','Interest','Bonus']
    }
    descriptions = {
        'Shopping':['Amazon Purchase','Flipkart Order','Myntra Shopping','BigBasket','DMart','Meesho Order'],
        'Food':['Swiggy Order','Zomato Delivery','Restaurant Bill','Cafe Coffee Day','Dominos'],
        'Utilities':['Electricity Bill','Water Bill','Gas Bill','Internet Bill','Mobile Recharge'],
        'Transport':['Uber Ride','Ola Cab','Metro Card','Petrol','Rapido Bike'],
        'Entertainment':['Netflix Subscription','Hotstar Premium','Spotify','BookMyShow','Amazon Prime'],
        'Healthcare':['Apollo Pharmacy','Hospital Bill','Lab Test','Medicine Purchase','Health Insurance'],
        'Housing':['Rent Payment','Society Maintenance','Property Tax','Home Repair'],
        'Education':['School Fees','Online Course','Book Purchase','Exam Fee'],
        'Salary':['Monthly Salary','Salary Credit','Payroll Credit'],
        'Transfer':['NEFT Transfer','IMPS Credit','UPI Credit','Money Received'],
        'Cashback':['Cashback Reward','Credit Card Cashback','Offer Cashback'],
        'Refund':['Order Refund','Insurance Refund','Tax Refund'],
        'Interest':['Savings Interest','FD Interest Credit'],
        'Bonus':['Performance Bonus','Festival Bonus','Annual Bonus']
    }

    balance = round(random.uniform(50000, 500000), 2)
    cur.execute("UPDATE accounts SET balance=? WHERE id=?", (balance, account_id))

    base = datetime.now()
    for i in range(60):
        txn_type = random.choices(['debit','credit'], weights=[0.65,0.35])[0]
        cat = random.choice(categories[txn_type])
        desc = random.choice(descriptions[cat])
        amount = round(random.uniform(100,15000) if txn_type=='debit' else random.uniform(500,60000), 2)
        balance = round(balance - amount if txn_type=='debit' else balance + amount, 2)
        ts = (base - timedelta(days=i, hours=random.randint(0,23))).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute("""
            INSERT INTO transactions (user_id,account_id,type,amount,description,category,balance_after,created_at)
            VALUES (?,?,?,?,?,?,?,?)
        """, (user_id, account_id, txn_type, amount, desc, cat, balance, ts))

    loan_types = [('home',2500000,7.5),('personal',150000,12.0),('car',800000,9.0),('education',500000,8.5)]
    num_loans = random.randint(1,3)
    for lt, max_p, rate in random.sample(loan_types, num_loans):
        principal = round(random.uniform(max_p*0.3, max_p), 2)
        outstanding = round(principal * random.uniform(0.3, 0.9), 2)
        emi = round(outstanding * rate/1200 / (1-(1+rate/1200)**-60), 2)
        due = (base + timedelta(days=random.randint(1,30))).strftime("%Y-%m-%d")
        cur.execute("""
            INSERT INTO loans (user_id,loan_type,principal,outstanding,interest_rate,emi,next_due_date,status)
            VALUES (?,?,?,?,?,?,?,?)
        """, (user_id, lt, principal, outstanding, rate, emi, due, 'active'))

    sources = ['Shopping Cashback','Salary Bonus','Credit Card Reward','Referral Bonus','UPI Cashback','Festival Offer']
    total_points = 0
    for i in range(random.randint(10,30)):
        pts = random.randint(50,500)
        total_points += pts
        date = (base - timedelta(days=i*3)).strftime("%Y-%m-%d")
        cur.execute("""
            INSERT INTO rewards (user_id,source,points,cashback_value,date,status)
            VALUES (?,?,?,?,?,?)
        """, (user_id, random.choice(sources), pts, round(pts*0.25,2), date, 'active'))

    cur.execute("""
        INSERT INTO cards (user_id,card_number_masked,card_type,status,expiry)
        VALUES (?,?,?,?,?)
    """, (user_id, f"**** **** **** {random.randint(1000,9999)}", 'debit', 'active',
          f"{random.randint(1,12):02d}/{random.randint(26,30)}"))
    cur.execute("""
        INSERT INTO cards (user_id,card_number_masked,card_type,status,expiry)
        VALUES (?,?,?,?,?)
    """, (user_id, f"**** **** **** {random.randint(1000,9999)}", 'credit', 'active',
          f"{random.randint(1,12):02d}/{random.randint(26,30)}"))

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            account_number TEXT UNIQUE,
            phone TEXT,
            is_admin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_type TEXT NOT NULL DEFAULT 'savings',
            balance REAL NOT NULL DEFAULT 0.0,
            currency TEXT NOT NULL DEFAULT 'INR',
            status TEXT NOT NULL DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            category TEXT,
            balance_after REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            intent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            card_number_masked TEXT NOT NULL,
            card_type TEXT NOT NULL DEFAULT 'debit',
            status TEXT NOT NULL DEFAULT 'active',
            expiry TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            loan_type TEXT NOT NULL,
            principal REAL NOT NULL,
            outstanding REAL NOT NULL,
            interest_rate REAL NOT NULL,
            emi REAL NOT NULL,
            next_due_date TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            source TEXT,
            points INTEGER DEFAULT 0,
            cashback_value REAL DEFAULT 0,
            date TEXT,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    conn.commit()

    # Seed admin
    try:
        import string
        acc = "ACC-" + "".join(random.choices(string.digits, k=6))
        cur.execute("""
            INSERT INTO users (username,email,password_hash,full_name,account_number,is_admin)
            VALUES (?,?,?,?,?,?)
        """, ("admin", "admin@smartbank.com", hash_password("admin123"), "Admin User", acc, 1))
        admin_id = cur.lastrowid
        cur.execute("INSERT INTO accounts (user_id,account_type,balance) VALUES (?,?,?)", (admin_id,'savings',0))
        conn.commit()
    except:
        pass

    conn.close()
