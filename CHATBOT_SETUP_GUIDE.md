# AI Chatbot Setup Guide - SmartRail

This document outlines the required environment configuration for the SmartRail AI Chatbot to function correctly.

## Repository Information
The AI Chatbot source code is hosted separately at:
[https://github.com/Albiin777/SmartRailchatbot](https://github.com/Albiin777/SmartRailchatbot)

## Required Environment Configuration

The following specific versions are required for the bot to work as intended (as provided by the user):

| Component                    | Required Version                                      |
| ---------------------------- | ----------------------------------------------------- |
| **Rasa Version**             | 3.6.21                                                |
| **Minimum Compatible Version**| 3.6.21                                                |
| **Rasa SDK Version**         | 3.6.2                                                 |
| **Python Version**           | 3.10.11                                               |
| **Operating System**         | Windows 10 (10.0.26200-SP0)                           |
| **Recommended Python Path**  | `C:\Users\fidha\rasa-env\Scripts\python.exe`          |

---

## Local Setup Instructions

### 1. Create a Virtual Environment
It is highly recommended to use a dedicated virtual environment (like `rasa-env`) to avoid dependency conflicts.

```powershell
# Create virtual environment
python -m venv rasa-env

# Activate virtual environment
.\rasa-env\Scripts\activate
```

### 2. Install Required Packages
Once the environment is active, install the specific Rasa versions:

```powershell
pip install rasa==3.6.21
pip install rasa-sdk==3.6.2
```

### 3. Training the Bot
Navigate to the chatbot repository directory and run:

```powershell
rasa train
```

### 4. Running the Bot
To use the bot with the SmartRail frontend, you need to run both the Rasa server and the action server:

**Start Rasa Server:**
```powershell
rasa run --enable-api --cors "*"
```

**Start Action Server (in a separate terminal):**
```powershell
rasa run actions
```

### 5. Frontend Integration
Ensure the `VITE_RASA_WEBHOOK_URL` in your frontend `.env` file points to your local or hosted Rasa server:

```env
VITE_RASA_WEBHOOK_URL=http://localhost:5005/webhooks/rest/webhook
```
Currently, the default production URL being used in `frontend/src/components/SmartRailChatbot.jsx` is:
`https://rasa-server-production-bb81.up.railway.app/webhooks/rest/webhook`

---

## Troubleshooting

- **Server Unreachable:** Ensure the Rasa server is running with `--cors "*"` to allow the frontend to communicate with it.
- **Python Version Mismatch:** Rasa 3.6.x is most stable on Python 3.10. Using 3.11+ might cause compatibility issues.
- **Action Server Errors:** Ensure the action server is running if the bot needs to perform custom tasks (like checking train status).
