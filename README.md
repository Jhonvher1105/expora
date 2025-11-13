# Expora - Airbnb-like Platform

A comprehensive marketplace platform connecting hosts with guests for properties, experiences, and services. Built with React, Firebase, and modern web technologies.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📋 Features

### For Guests
- Browse listings (Properties, Experiences, Services)
- Advanced search and filtering
- Booking management
- Multiple payment methods (E-Wallet, PayPal)
- Reviews and ratings
- Favorites/Wishlist
- Points and rewards program
- Smart recommendations

### For Hosts
- Create and manage listings
- Booking management dashboard
- Earnings tracking
- Payout requests
- Payment history
- Chat with guests

### For Admins
- Comprehensive dashboard
- Analytics and reporting
- Payment review and management
- Payout approval system
- Service fees configuration
- User management
- Policy management
- Report generation (PDF/CSV)

## 🛠️ Technology Stack

- **Frontend**: React 18.3.1
- **Build Tool**: Vite 5.4.21
- **Backend**: Firebase (Authentication, Firestore)
- **Payment**: PayPal SDK
- **Maps**: React Leaflet
- **Images**: Cloudinary

## 📚 Documentation

For complete documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md)

### Quick Links
- [Installation & Setup](./DOCUMENTATION.md#installation--setup)
- [User Guides](./DOCUMENTATION.md#user-guides)
- [Development Guide](./DOCUMENTATION.md#development-guide)
- [Deployment](./DOCUMENTATION.md#deployment)
- [Troubleshooting](./DOCUMENTATION.md#troubleshooting)

### Additional Guides
- [Admin Setup Guide](./ADMIN_SETUP.md)
- [PayPal Setup Guide](./PAYPAL_SETUP.md)
- [Feature Status](./FEATURES_AND_REQUIREMENTS_SUMMARY.md)

## 🏗️ Project Structure

```
expora/
├── src/
│   ├── components/      # React components
│   │   ├── admin/      # Admin dashboard
│   │   ├── hostFolder/ # Host features
│   │   ├── UserFolder/ # Guest features
│   │   └── ui/         # Reusable UI components
│   ├── context/        # React Context providers
│   ├── login2/         # Authentication
│   └── firebase.js     # Firebase configuration
├── public/             # Static assets
└── package.json        # Dependencies
```

## ⚙️ Configuration

### Required Setup

1. **Firebase Configuration**
   - Create Firebase project
   - Update `src/firebase.js` with your config
   - Enable Authentication (Email/Password)
   - Create Firestore database

2. **Cloudinary** (for image uploads)
   - Create Cloudinary account
   - Update image upload components

3. **PayPal** (optional for development)
   - Create PayPal Developer account
   - Add `VITE_PAYPAL_CLIENT_ID` to `.env`

See [Installation & Setup](./DOCUMENTATION.md#installation--setup) for detailed instructions.

## 📊 Project Status

**Overall Completion: 97%** ✅

- ✅ Core Features: 100%
- ✅ Host Features: 95%
- ✅ Guest Features: 95%
- ✅ Admin Dashboard: 100%
- ✅ Payment Systems: 100%
- ✅ Reviews & Ratings: 90%
- ✅ Points & Rewards: 100%

**Status**: Production Ready

## 🎯 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd expora
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Set up Firebase project
   - Update `src/firebase.js`

4. **Configure environment variables**
   - Create `.env` file
   - Add PayPal Client ID (optional)

5. **Run the application**
   ```bash
   npm run dev
   ```

6. **Set up admin user**
   - Register a user
   - Update Firestore `users` collection with `role: "admin"`
   - Access admin dashboard at `/Admin`

See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete setup instructions.

## 🔐 Security Notes

- Never commit `.env` files
- Use different Firebase projects for dev/prod
- Configure Firestore security rules
- Use production PayPal credentials for live site

## 🐛 Troubleshooting

Common issues and solutions are documented in the [Troubleshooting](./DOCUMENTATION.md#troubleshooting) section.

## 📝 License

[Specify your license here]

## 🤝 Contributing

[Add contribution guidelines if needed]

## 📞 Support

For issues and questions, please refer to the [Documentation](./DOCUMENTATION.md) or create an issue.

---

**Version**: 3.0  
**Last Updated**: [Current Date]
