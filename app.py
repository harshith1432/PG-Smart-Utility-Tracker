from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Use the database URL from .env file
DATABASE_URL = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Utility(db.Model):
    __tablename__ = 'utilities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.String(50), nullable=False)
    free_at = db.Column(db.DateTime, nullable=True)
    updated_by = db.Column(db.String(100), nullable=True)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        # Auto-reset Washing Machine if time passed
        if self.name == "Washing Machine" and self.status == "In Use" and self.free_at:
            if datetime.utcnow() > self.free_at:
                self.status = "Free"
                self.free_at = None
                self.updated_by = "System"
                db.session.commit()

        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "free_at": self.free_at.isoformat() if self.free_at else None,
            "updated_by": self.updated_by,
            "last_updated": self.last_updated.isoformat()
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/status')
def get_status():
    utilities = Utility.query.all()
    return jsonify([u.to_dict() for u in utilities])

@app.route('/update', methods=['POST'])
def update_status():
    data = request.get_json()
    name = data.get('name')
    status = data.get('status')
    duration = data.get('duration') # in minutes
    updated_by = data.get('updated_by')

    utility = Utility.query.filter_by(name=name).first()
    if not utility:
        return jsonify({"error": "Utility not found"}), 404

    utility.status = status
    utility.updated_by = updated_by
    utility.last_updated = datetime.utcnow()

    if name == "Washing Machine" and status == "In Use" and duration:
        utility.free_at = datetime.utcnow() + timedelta(minutes=int(duration))
    elif name == "Washing Machine" and status == "Free":
        utility.free_at = None
    
    db.session.commit()
    return jsonify(utility.to_dict())

def init_db():
    with app.app_context():
        db.create_all()
        # Seed initial data if empty
        if not Utility.query.first():
            initial_utilities = [
                {"name": "Washing Machine", "status": "Free"},
                {"name": "Bathroom", "status": "Free"},
                {"name": "Geyser", "status": "OFF"},
                {"name": "Food", "status": "Available"},
                {"name": "Water Can", "status": "Full"}
            ]
            for u in initial_utilities:
                db.session.add(Utility(name=u['name'], status=u['status']))
            db.session.commit()

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
