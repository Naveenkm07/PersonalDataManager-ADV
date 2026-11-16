# PersonalDataManager-ADV

![GitHub repo size](https://img.shields.io/github/repo-size/Naveenkm07/PersonalDataManager-ADV)
![GitHub stars](https://img.shields.io/github/stars/Naveenkm07/PersonalDataManager-ADV?style=social)
![GitHub license](https://img.shields.io/github/license/Naveenkm07/PersonalDataManager-ADV)
![GitHub last commit](https://img.shields.io/github/last-commit/Naveenkm07/PersonalDataManager-ADV)

A personal data management project with a React/TypeScript client, an Express API backed by MongoDB, and legacy Spring Boot source. The API includes JWT authentication, authenticator-app MFA, and a restricted admin role for security audit events.

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
- **Backend:** Node.js/Express (the repository also contains legacy Spring Boot source)
- **Database:** MongoDB through Mongoose
- **Authentication:** bcrypt password hashing, HS256 JWTs, TOTP MFA
- **Authorization:** user/admin role checks; admin role is assigned by server-side email allow-list

## Security Setup

The API fails closed when `JWT_SECRET` is missing or shorter than 32 characters. MFA setup also requires a separate `MFA_ENCRYPTION_KEY` of at least 32 characters. Generate random values and keep them in the deployment environment; never commit them.

Copy `backend/env.example` to `backend/.env`, configure `MONGO_URI`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, and `FRONTEND_URL`. New accounts always receive the `user` role. An operator can grant admin access to verified account IDs through `SECURITY_ADMIN_USER_IDS` or trusted database provisioning; the registration form cannot assign roles. MFA is opt-in per account and can be enabled from Security Center; an authenticator code is then required at login.

Run the focused security checks with:

```sh
cd backend
npm ci
npm run test:security
```

This repository does not currently implement OAuth 2.0, a Python/MySQL backend, or verified usage by 500+ users. Do not claim those items on a resume unless you add and verify them separately. The credential-management UI also still contains local/mock data paths, so the project should be described as a prototype rather than a production password vault.

---

## ⚡ Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm
- Java (for Spring Boot backend)
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
3. **Install backend dependencies:**
   ```sh
   cd ../backend
   npm install
   # or for Java backend
   mvn install
   ```

### Running the App
- **Frontend:**
  ```sh
  cd frontend
  npm start
  ```
- **Node.js Backend:**
  ```sh
  cd backend
  npm start
  ```
- **Java Backend:**
  ```sh
  cd backend
  mvn spring-boot:run
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
> No. MFA secrets are encrypted in the API database, and account passwords are hashed. The broader credential and note storage paths have not yet been audited or completed for production-grade encryption.

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
