from fastapi import FastAPI, APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_debt: float = 0.0
    total_paid: float = 0.0

class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None

class Debt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: Optional[str] = None
    customer_name: str
    description: str
    product_type: str = "camisetas"  # camisetas, etc
    installment_type: str = "mensual"  # semanal, mensual
    total_amount: float
    paid_amount: float = 0.0
    remaining_amount: float
    due_date: Optional[datetime] = None
    status: str = "pending"  # pending, partial, paid, overdue
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DebtCreate(BaseModel):
    customer_name: str
    description: str
    product_type: str = "camisetas"
    installment_type: str = "mensual"
    total_amount: float
    due_date: Optional[str] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    debt_id: str
    customer_id: str
    customer_name: Optional[str] = None
    amount: float
    payment_method: str = "cash"  # cash, card, transfer
    notes: Optional[str] = None
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    debt_id: str
    amount: float
    payment_method: str = "cash"
    notes: Optional[str] = None

class DashboardStats(BaseModel):
    total_customers: int
    total_debts: float
    total_paid: float
    total_pending: float
    overdue_debts: int
    recent_payments: List[Payment]

# ============= HELPER FUNCTIONS =============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def serialize_doc(doc):
    """Convert datetime objects to ISO strings for MongoDB"""
    if doc:
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.isoformat()
    return doc

def deserialize_doc(doc):
    """Convert ISO strings back to datetime objects"""
    if doc:
        datetime_fields = ['created_at', 'payment_date', 'due_date']
        for field in datetime_fields:
            if field in doc and isinstance(doc[field], str):
                dt = datetime.fromisoformat(doc[field])
                # Ensure timezone awareness
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                doc[field] = dt
    return doc

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Usuario ya existe")
    
    # Check email
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    # Create user
    user = User(username=user_data.username, email=user_data.email)
    user_dict = user.model_dump()
    user_dict['password_hash'] = get_password_hash(user_data.password)
    user_dict = serialize_doc(user_dict)
    
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user.username, "id": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"username": user_data.username})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    # Verify password
    if not verify_password(user_data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    deserialize_doc(user_doc)
    user = User(**user_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user.username, "id": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

# ============= CUSTOMER ROUTES =============

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate):
    customer = Customer(**customer_data.model_dump())
    doc = serialize_doc(customer.model_dump())
    await db.customers.insert_one(doc)
    return customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(search: Optional[str] = None):
    query = {}
    if search:
        query = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]}
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    for customer in customers:
        deserialize_doc(customer)
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    deserialize_doc(customer)
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerUpdate):
    update_data = {k: v for k, v in customer_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    deserialize_doc(customer)
    return customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": "Cliente eliminado"}

@api_router.delete("/customers/{customer_id}/paid-debts")
async def delete_paid_debts_for_customer(customer_id: str):
    # Delete all paid debts for this customer
    result = await db.debts.delete_many({
        "customer_id": customer_id,
        "status": "paid"
    })
    
    return {
        "message": f"{result.deleted_count} deudas pagadas eliminadas",
        "deleted_count": result.deleted_count
    }

# ============= DEBT ROUTES =============

@api_router.post("/debts", response_model=Debt)
async def create_debt(debt_data: DebtCreate):
    # Verify customer exists
    customer = await db.customers.find_one({"id": debt_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    due_date = None
    if debt_data.due_date:
        due_date = datetime.fromisoformat(debt_data.due_date)
    
    debt = Debt(
        customer_id=debt_data.customer_id,
        customer_name=customer['name'],
        description=debt_data.description,
        product_type=debt_data.product_type,
        installment_type=debt_data.installment_type,
        total_amount=debt_data.total_amount,
        remaining_amount=debt_data.total_amount,
        due_date=due_date
    )
    
    doc = serialize_doc(debt.model_dump())
    await db.debts.insert_one(doc)
    
    # Update customer total debt
    await db.customers.update_one(
        {"id": debt_data.customer_id},
        {"$inc": {"total_debt": debt_data.total_amount}}
    )
    
    return debt

@api_router.get("/debts", response_model=List[Debt])
async def get_debts(status: Optional[str] = None, customer_id: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    
    debts = await db.debts.find(query, {"_id": 0}).to_list(1000)
    
    # Check for overdue debts
    now = datetime.now(timezone.utc)
    for debt in debts:
        deserialize_doc(debt)
        if debt.get('due_date') and debt['due_date'] < now and debt['status'] == 'pending':
            debt['status'] = 'overdue'
            await db.debts.update_one({"id": debt['id']}, {"$set": {"status": "overdue"}})
    
    return debts

@api_router.get("/debts/overdue", response_model=List[Debt])
async def get_overdue_debts():
    now = datetime.now(timezone.utc).isoformat()
    debts = await db.debts.find({
        "due_date": {"$lt": now},
        "status": {"$in": ["pending", "partial", "overdue"]}
    }, {"_id": 0}).to_list(1000)
    
    for debt in debts:
        deserialize_doc(debt)
        if debt['status'] != 'overdue':
            await db.debts.update_one({"id": debt['id']}, {"$set": {"status": "overdue"}})
            debt['status'] = 'overdue'
    
    return debts

@api_router.get("/debts/{debt_id}", response_model=Debt)
async def get_debt(debt_id: str):
    debt = await db.debts.find_one({"id": debt_id}, {"_id": 0})
    if not debt:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    deserialize_doc(debt)
    return debt

@api_router.delete("/debts/{debt_id}")
async def delete_debt(debt_id: str):
    debt = await db.debts.find_one({"id": debt_id})
    if not debt:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    
    # Update customer total debt
    await db.customers.update_one(
        {"id": debt['customer_id']},
        {"$inc": {"total_debt": -debt['remaining_amount']}}
    )
    
    await db.debts.delete_one({"id": debt_id})
    return {"message": "Deuda eliminada"}

# ============= PAYMENT ROUTES =============

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate):
    # Get debt
    debt = await db.debts.find_one({"id": payment_data.debt_id})
    if not debt:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    
    if debt['status'] == 'paid':
        raise HTTPException(status_code=400, detail="Esta deuda ya está pagada")
    
    # Verify amount
    if payment_data.amount > debt['remaining_amount']:
        raise HTTPException(status_code=400, detail="El monto excede la deuda pendiente")
    
    # Get customer
    customer = await db.customers.find_one({"id": debt['customer_id']})
    
    # Create payment
    payment = Payment(
        debt_id=payment_data.debt_id,
        customer_id=debt['customer_id'],
        customer_name=customer['name'] if customer else None,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        notes=payment_data.notes
    )
    
    doc = serialize_doc(payment.model_dump())
    await db.payments.insert_one(doc)
    
    # Update debt
    new_paid_amount = debt['paid_amount'] + payment_data.amount
    new_remaining = debt['remaining_amount'] - payment_data.amount
    new_status = 'paid' if new_remaining == 0 else 'partial'
    
    await db.debts.update_one(
        {"id": payment_data.debt_id},
        {"$set": {
            "paid_amount": new_paid_amount,
            "remaining_amount": new_remaining,
            "status": new_status
        }}
    )
    
    # Update customer
    await db.customers.update_one(
        {"id": debt['customer_id']},
        {"$inc": {"total_paid": payment_data.amount, "total_debt": -payment_data.amount}}
    )
    
    return payment

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(customer_id: Optional[str] = None):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    
    payments = await db.payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    for payment in payments:
        deserialize_doc(payment)
    return payments

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str):
    # Get payment details before deleting
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    # Get the debt
    debt = await db.debts.find_one({"id": payment['debt_id']})
    if debt:
        # Revert the payment from debt
        new_paid_amount = debt['paid_amount'] - payment['amount']
        new_remaining = debt['remaining_amount'] + payment['amount']
        
        # Update debt status
        if new_paid_amount == 0:
            new_status = 'pending'
        elif new_remaining > 0:
            new_status = 'partial'
        else:
            new_status = 'paid'
        
        await db.debts.update_one(
            {"id": payment['debt_id']},
            {"$set": {
                "paid_amount": new_paid_amount,
                "remaining_amount": new_remaining,
                "status": new_status
            }}
        )
        
        # Update customer totals
        await db.customers.update_one(
            {"id": payment['customer_id']},
            {"$inc": {"total_paid": -payment['amount'], "total_debt": payment['amount']}}
        )
    
    # Delete payment
    await db.payments.delete_one({"id": payment_id})
    
    return {"message": "Pago eliminado y deuda actualizada"}

# ============= DASHBOARD & REPORTS =============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    # Total customers
    total_customers = await db.customers.count_documents({})
    
    # Get all customers to calculate totals
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    total_debts = sum(c.get('total_debt', 0) for c in customers)
    total_paid = sum(c.get('total_paid', 0) for c in customers)
    
    # Overdue debts
    now = datetime.now(timezone.utc).isoformat()
    overdue_count = await db.debts.count_documents({
        "status": {"$in": ["overdue", "pending", "partial"]},
        "due_date": {"$lt": now}
    })
    
    # Recent payments
    recent_payments_docs = await db.payments.find({}, {"_id": 0}).sort("payment_date", -1).limit(5).to_list(5)
    for doc in recent_payments_docs:
        deserialize_doc(doc)
    recent_payments = [Payment(**doc) for doc in recent_payments_docs]
    
    return DashboardStats(
        total_customers=total_customers,
        total_debts=total_debts,
        total_paid=total_paid,
        total_pending=total_debts,
        overdue_debts=overdue_count,
        recent_payments=recent_payments
    )

@api_router.get("/reports/export")
async def export_report():
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    debts = await db.debts.find({}, {"_id": 0}).to_list(10000)
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    
    return {
        "customers": customers,
        "debts": debts,
        "payments": payments,
        "exported_at": datetime.now(timezone.utc).isoformat()
    }

# ============= ROOT & MIDDLEWARE =============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()