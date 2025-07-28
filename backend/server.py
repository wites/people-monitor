from fastapi import FastAPI, HTTPException, status, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
import uuid
from datetime import datetime, timedelta
from pymongo import MongoClient
import json
from bson import ObjectId
import jwt
import bcrypt
from passlib.context import CryptContext

app = FastAPI()

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client['people_monitor']
events_collection = db['events']
people_collection = db['people']
responses_collection = db['responses']
users_collection = db['users']

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class Person(BaseModel):
    id: str
    name: str
    contact: str
    tags: List[str] = []

class Event(BaseModel):
    id: str
    title: str
    description: str
    calamity_type: str
    created_at: datetime
    created_by: str
    people: List[Person] = []
    is_active: bool = True

class StatusResponse(BaseModel):
    person_id: str
    person_name: str
    status: str  # "safe", "need_help", "no_response"
    response_time: datetime
    message: Optional[str] = None

class CreateEventRequest(BaseModel):
    title: str
    description: str
    calamity_type: str

class AddPersonRequest(BaseModel):
    name: str
    contact: str
    tags: List[str] = []

class BulkAddPeopleRequest(BaseModel):
    people: List[AddPersonRequest]

class UpdateStatusRequest(BaseModel):
    person_id: str
    person_name: str
    status: str
    message: Optional[str] = None

# Helper functions
def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, dict):
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                doc[key] = str(value)
    return doc

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = serialize_doc(user)
    return user

# Authentication routes
@app.post("/api/auth/register", response_model=Token)
async def register(user: UserRegister):
    # Check if user already exists
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "created_at": current_user["created_at"]
    }

# Public routes (no authentication required)
@app.get("/")
async def root():
    return {"message": "People Monitor API", "status": "running"}

# Public response page (for people to respond)
@app.get("/api/respond/{event_id}", response_class=HTMLResponse)
async def response_page(event_id: str):
    event = events_collection.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Simple HTML response form
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Respond to {event['title']}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 class="text-2xl font-bold text-center mb-4 text-gray-800">{event['title']}</h1>
                <p class="text-gray-600 mb-6 text-center">{event['description']}</p>
                
                <div id="personSelect" class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Your Name:</label>
                    <select id="personId" class="w-full p-2 border border-gray-300 rounded-md">
                        <option value="">Choose your name...</option>
                    </select>
                </div>
                
                <div id="statusForm" class="hidden">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Your Status:</label>
                    <div class="space-y-2 mb-4">
                        <label class="flex items-center">
                            <input type="radio" name="status" value="safe" class="mr-2">
                            <span class="text-green-600">✓ I am Safe</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="status" value="need_help" class="mr-2">
                            <span class="text-red-600">⚠ I Need Help</span>
                        </label>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Additional Message (Optional):</label>
                        <textarea id="message" rows="3" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Any additional information..."></textarea>
                    </div>
                    
                    <button onclick="submitResponse()" class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">
                        Submit Response
                    </button>
                </div>
                
                <div id="success" class="hidden text-center text-green-600 font-medium">
                    Thank you for your response!
                </div>
            </div>
        </div>
        
        <script>
            const eventId = '{event_id}';
            const people = {json.dumps(event.get('people', []))};
            
            // Populate person select
            const personSelect = document.getElementById('personId');
            people.forEach(person => {{
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                personSelect.appendChild(option);
            }});
            
            personSelect.addEventListener('change', function() {{
                const statusForm = document.getElementById('statusForm');
                if (this.value) {{
                    statusForm.classList.remove('hidden');
                }} else {{
                    statusForm.classList.add('hidden');
                }}
            }});
            
            async function submitResponse() {{
                const personId = document.getElementById('personId').value;
                const selectedStatus = document.querySelector('input[name="status"]:checked');
                const message = document.getElementById('message').value;
                
                if (!personId || !selectedStatus) {{
                    alert('Please select your name and status');
                    return;
                }}
                
                const personName = people.find(p => p.id === personId).name;
                
                try {{
                    const response = await fetch(`/api/events/${{eventId}}/respond`, {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json',
                        }},
                        body: JSON.stringify({{
                            person_id: personId,
                            person_name: personName,
                            status: selectedStatus.value,
                            message: message
                        }})
                    }});
                    
                    if (response.ok) {{
                        document.getElementById('personSelect').classList.add('hidden');
                        document.getElementById('statusForm').classList.add('hidden');
                        document.getElementById('success').classList.remove('hidden');
                    }} else {{
                        alert('Error submitting response');
                    }}
                }} catch (error) {{
                    alert('Error submitting response');
                }}
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/api/events/{event_id}/respond")
async def update_person_status(event_id: str, request: UpdateStatusRequest):
    event = events_collection.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if person exists in event
    person_exists = any(p["id"] == request.person_id for p in event.get("people", []))
    if not person_exists:
        raise HTTPException(status_code=404, detail="Person not found in event")
    
    # Store or update response
    response = {
        "event_id": event_id,
        "person_id": request.person_id,
        "person_name": request.person_name,
        "status": request.status,
        "response_time": datetime.now(),
        "message": request.message
    }
    
    # Update existing response or insert new one
    responses_collection.update_one(
        {"event_id": event_id, "person_id": request.person_id},
        {"$set": response},
        upsert=True
    )
    
    return {"message": "Status updated successfully"}

# Protected routes (require authentication)
@app.post("/api/events")
async def create_event(request: CreateEventRequest, current_user: dict = Depends(get_current_user)):
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        "title": request.title,
        "description": request.description,
        "calamity_type": request.calamity_type,
        "created_at": datetime.now(),
        "created_by": current_user["id"],
        "people": [],
        "is_active": True
    }
    
    events_collection.insert_one(event)
    return {"event_id": event_id, "message": "Event created successfully"}

@app.get("/api/events")
async def get_events(current_user: dict = Depends(get_current_user)):
    events = []
    for event in events_collection.find({"is_active": True, "created_by": current_user["id"]}):
        event = serialize_doc(event)
        events.append(event)
    return events

@app.get("/api/events/{event_id}")
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = events_collection.find_one({"id": event_id, "created_by": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event = serialize_doc(event)
    return event

@app.post("/api/events/{event_id}/people")
async def add_person_to_event(event_id: str, request: AddPersonRequest, current_user: dict = Depends(get_current_user)):
    event = events_collection.find_one({"id": event_id, "created_by": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    person_id = str(uuid.uuid4())
    person = {
        "id": person_id,
        "name": request.name,
        "contact": request.contact,
        "tags": request.tags
    }
    
    events_collection.update_one(
        {"id": event_id},
        {"$push": {"people": person}}
    )
    
    return {"person_id": person_id, "message": "Person added successfully"}

@app.get("/api/events/{event_id}/people")
async def get_event_people(event_id: str, current_user: dict = Depends(get_current_user)):
    event = events_collection.find_one({"id": event_id, "created_by": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return event.get("people", [])

@app.get("/api/events/{event_id}/responses")
async def get_event_responses(event_id: str, current_user: dict = Depends(get_current_user)):
    event = events_collection.find_one({"id": event_id, "created_by": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    responses = []
    for response in responses_collection.find({"event_id": event_id}):
        response = serialize_doc(response)
        responses.append(response)
    return responses

@app.get("/api/events/{event_id}/statistics")
async def get_event_statistics(event_id: str, current_user: dict = Depends(get_current_user)):
    event = events_collection.find_one({"id": event_id, "created_by": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    total_people = len(event.get("people", []))
    responses = list(responses_collection.find({"event_id": event_id}))
    
    safe_count = len([r for r in responses if r["status"] == "safe"])
    need_help_count = len([r for r in responses if r["status"] == "need_help"])
    no_response_count = total_people - len(responses)
    
    # Group by tags
    tag_stats = {}
    for person in event.get("people", []):
        for tag in person.get("tags", []):
            if tag not in tag_stats:
                tag_stats[tag] = {"total": 0, "safe": 0, "need_help": 0, "no_response": 0}
            tag_stats[tag]["total"] += 1
            
            # Find response for this person
            person_response = next((r for r in responses if r["person_id"] == person["id"]), None)
            if person_response:
                tag_stats[tag][person_response["status"]] += 1
            else:
                tag_stats[tag]["no_response"] += 1
    
    return {
        "total_people": total_people,
        "safe_count": safe_count,
        "need_help_count": need_help_count,
        "no_response_count": no_response_count,
        "response_rate": (len(responses) / total_people * 100) if total_people > 0 else 0,
        "tag_statistics": tag_stats,
        "last_updated": datetime.now()
    }

@app.get("/api/events/{event_id}/share")
async def get_share_link(event_id: str, current_user: dict = Depends(get_current_user)):
    event = events_collection.find_one({"id": event_id, "created_by": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Use the API path for the share URL
    share_url = f"/api/respond/{event_id}"
    return {"share_url": share_url, "event_title": event["title"]}

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    result = events_collection.update_one(
        {"id": event_id, "created_by": current_user["id"]},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)