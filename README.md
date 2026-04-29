# Fintech Bank / Digital Wallet

A modern fintech digital wallet application built with **Django (REST Framework)** and **React (Vite + Tailwind CSS)**. This project features secure user authentication, transaction management, Stripe integration, and an interactive dashboard.

## 🚀 Key Features

- **User Authentication**: Secure signup/login with JWT (SimpleJWT) and HttpOnly cookies.
- **OTP Verification**: Multi-channel OTP (Email/SMS) for secure registration and transactions.
- **Digital Wallet**: Fund transfers, transaction history, and balance management.
- **Stripe Integration**: Secure payment processing for adding funds.
- **Transaction PIN**: Secure 4-digit PIN for sensitive operations.
- **Admin Dashboard**: Enhanced admin interface using Django Jazzmin.
- **Modern UI**: Fully responsive frontend built with React, Vite, and Tailwind CSS.

---

## 📁 Project Structure

```text
Fintech_Bank/
├── backend/            # Django REST API
│   ├── core/           # Core banking logic & transactions
│   ├── userauths/      # Custom User model & Authentication
│   ├── backend/        # Main project configuration (settings, urls)
│   └── manage.py       # Django CLI
├── frontend/           # React + Vite application
│   ├── src/            # Components, pages, hooks, state
│   ├── public/         # Static assets
│   └── index.html      # Main entry point
├── images/             # Project screenshots
└── README.md           # This file
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Python 3.8+**
- **Node.js (LTS)**
- **npm** or **yarn**

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Create a `.env` file based on `.env.example`.
5. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file (e.g., `VITE_API_URL=http://127.0.0.1:8000/api/v1/`).
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🛡️ Security
- **JWT Auth**: Access tokens stored in state, refresh tokens in HttpOnly cookies.
- **CORS/CSRF**: Configured to protect against cross-site attacks.
- **Input Validation**: Strict validation for transactions and user data.

## 💳 Payment Integration
- Uses **Stripe** for secure payment processing.
- Webhook support for real-time transaction updates (Optional/Planned).

## 📄 License
This project is for educational purposes.

---

## 📸 Screenshots

### Authentication
| Signup | Login | Login Email |
| :---: | :---: | :---: |
| ![Signup](images/signup%20page.png) | ![Login](images/login%20page.png) | ![Login Email](images/login%20email%20page.png) |

### Dashboard & Overview
| Overview | Dashboard | Notifications |
| :---: | :---: | :---: |
| ![Overview](images/overveiwpage.png) | ![Dashboard](images/dashboardpage.png) | ![Notifications](images/notificationpage.png) |

### Banking & Transactions
| Bank Page | Transactions | Transfers |
| :---: | :---: | :---: |
| ![Bank](images/Bank%20page.png) | ![Transactions](images/transactions%20page.png) | ![Transfers](images/transferspage.png) |

### Beneficiaries
| Beneficiaries List | Add Beneficiary |
| :---: | :---: |
| ![Beneficiaries](images/Beneficiaries%20page.png) | ![Add Beneficiary](images/Add%20beneficiaries%20page.png) |

### Goals
| Goals Overview | Create New Goal |
| :---: | :---: |
| ![Goals](images/Goal%20page.png) | ![New Goal](images/New%20goal%20page.png) |

### Loans & Profile
| Loan Application | Loan Details | Profile |
| :---: | :---: | :---: |
| ![Loan Apply](images/loanapplypage.png) | ![Loan Page](images/Loan%20page.png) | ![Profile](images/profile%20page.png) |
