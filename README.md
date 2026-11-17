# PersonalDataManager-ADV

![GitHub repo size](https://img.shields.io/github/repo-size/Naveenkm07/PersonalDataManager-ADV)
![GitHub stars](https://img.shields.io/github/stars/Naveenkm07/PersonalDataManager-ADV?style=social)
![GitHub license](https://img.shields.io/github/license/Naveenkm07/PersonalDataManager-ADV)
![GitHub last commit](https://img.shields.io/github/last-commit/Naveenkm07/PersonalDataManager-ADV)

A personal data management prototype with a React/TypeScript client, a Python/FastAPI API backed by MySQL, an earlier Express/MongoDB API, and legacy Spring Boot source. The Python API provides password authentication, JWT sessions, authenticator-app MFA, Google OAuth 2.0 sign-in, encrypted record payloads, owner-scoped records, and restricted admin audit access.

---

## 🚀 Features
- 🔐 Secure password and note storage
- 📝 Manage contacts and teams
- 📊 Analytics dashboard
- 🔄 Data backup and restore
- 🌙 Dark mode and responsive UI
- 🛡️ Security center for activity logs
- 🔗 Sync across devices

## 🖥️ Screenshots

> _Add your screenshots here!_

| Dashboard | Secure Notes | Analytics |
|-----------|-------------|-----------|
| ![Dashboard](screenshort/Screenshot%202025-07-14%20102236.png) | ![Secure Notes](screenshort/Screenshot%202025-07-14%20102318.png) | ![Analytics](screenshort/Screenshot%202025-07-14%20102332.png) |

---

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Material-UI
- **Backend:** Python/FastAPI (plus an earlier Node.js/Express API and legacy Spring Boot source)
- **Database:** MySQL through SQLAlchemy and PyMySQL; SQLite is used for tests
- **Authentication:** Argon2 password hashing, HS256 JWTs, TOTP MFA, Google OAuth 2.0 authorization code flow with PKCE
- **Authorization:** owner-scoped record access and user/admin roles; admins are assigned through server-side `SECURITY_ADMIN_USER_IDS`

## Security Setup

The Python API fails closed in production when `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `RECORD_ENCRYPTION_KEY`, or `OAUTH_STATE_KEY` is missing or shorter than 32 characters. Generate distinct random values and keep them in the deployment environment; never commit them. The Node API has its own environment variables described in `backend/env.example`.

Copy `python-api/.env.example` to `python-api/.env`, set the four secrets, and configure the database URL and frontend origin. Google sign-in also requires a Google OAuth client ID and secret, with the exact callback URL registered in Google Cloud Console. New accounts always receive the `user` role. Admin access is configured through `SECURITY_ADMIN_USER_IDS`; the registration form cannot assign roles. MFA is opt-in per account and can be enabled from Security Center.

Run the Python API with SQLite for local development and run its focused security checks with:

```sh
cd python-api
python -m venv .venv
# activate the virtual environment, then:
pip install -r requirements.txt
uvicorn securevault.main:app --reload --port 8000
pytest -q
```

To run the MySQL-backed API with Docker Compose, first create `python-api/.env` from the example, set strong secrets and database passwords, then run `docker compose up --build` from `python-api`. The API creates its tables at startup. The automated OAuth callback test uses mocked Google token and identity verification; a live Google sign-in requires configured credentials and a registered callback URL. The MySQL container workflow and public multi-user deployment have not been independently load-tested. The broader legacy credential-management UI still contains local/mock data paths, so describe this as a prototype rather than a production password vault. No verified 500+ user count is available.

---

## ⚡ Getting Started

### Prerequisites
- Python 3.11 or newer
- Node.js and npm (for the frontend)
- MySQL 8.4 or Docker Compose (optional for local SQLite development)
- Git

### Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/Naveenkm07/PersonalDataManager-ADV.git
   cd PersonalDataManager-ADV
   ```
2. **Install frontend dependencies:**
   ```sh
   cd frontend
   npm install
   ```
3. **Install Python API dependencies:**
   ```sh
   cd ../python-api
   python -m venv .venv
   # activate .venv, then:
   pip install -r requirements.txt
   ```

### Running the App
- **Frontend:**
  ```sh
  cd frontend
  npm start
  ```
- **Python API:**
  ```sh
  cd python-api
  uvicorn securevault.main:app --reload --port 8000
  ```
- **Earlier Node.js API:**
  ```sh
  cd backend
  npm install
  npm start
  ```

### Usage
- Access the app at [http://localhost:3000](http://localhost:3000)
- Register or log in to manage your data securely

---

## 🤝 Contributing
1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ❓ FAQ

**Q: Does this project provide end-to-end encrypted vault storage?**
> No. MFA secrets and record payloads are encrypted by the Python API, and account passwords are hashed. The broader legacy UI and deployment have not yet been audited for production use.

**Q: Can I use this on mobile?**
> Yes, the UI is fully responsive and works on all modern devices.

**Q: How do I backup or restore my data?**
> Use the Data Management section in the dashboard for backup and restore options.

**Q: How do I report a bug or request a feature?**
> Please open an issue on the [GitHub Issues page](https://github.com/Naveenkm07/PersonalDataManager-ADV/issues).

---

## 📬 Contact
- **Author:** Naveen Kumar KM
- **Email:** kmnaveenkm01@gmail.com
- **GitHub:** [Naveenkm07](https://github.com/Naveenkm07)

---

## 📄 License
[MIT](LICENSE)

---

> **PersonalDataManager-ADV** – A personal data management prototype with API authentication and MFA.
