# People Monitor - Emergency Response & Safety Tracking System

A comprehensive web application designed to monitor and track the safety status of team members during emergency situations such as floods, typhoons, storms, earthquakes, and other calamities.

## 🎯 Purpose

People Monitor enables administrators to quickly assess the safety status of their team members during emergencies, providing real-time situational awareness when it matters most. The system allows for rapid deployment of safety check-ins through shareable links that work across all devices and platforms.

## ✨ Key Features

### 🔐 Admin Authentication
- Secure user registration and login system
- JWT-based authentication with password hashing
- Protected admin routes and event isolation

### 📋 Event Management
- Create emergency response events for different calamity types
- Edit event details (title, description, calamity type)
- Duplicate existing events with all associated people
- Delete events with confirmation dialogs
- Real-time event statistics and monitoring

### 👥 People Management
- Add individual people with contact information and team tags
- Edit existing people's details
- Remove people from events
- Bulk import via text input or Excel file upload
- Tag-based organization for teams and groups

### 📊 Real-Time Monitoring
- Live status tracking (Safe, Need Help, No Response)
- Response rate calculations
- Tag-based statistics grouping
- Automatic dashboard updates every 5 seconds

### 🔗 Emergency Response
- Generate shareable links for quick safety check-ins
- Public response interface (no login required)
- Mobile-responsive design for emergency accessibility
- Status submission with optional messages

### 📁 Bulk Operations
- Text-based bulk import (CSV-style format)
- Excel file upload (.xlsx/.xls support)
- Comprehensive error reporting and validation
- Progress tracking for large imports

## 🛠 Technology Stack

### Frontend
- **React** - Modern UI library
- **ShadCN UI** - Professional component library
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **Radix UI** - Accessible UI primitives

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB** - NoSQL document database
- **JWT** - Secure token-based authentication
- **bcrypt** - Password hashing
- **pandas** - Excel file processing
- **python-multipart** - File upload handling

### Development & Deployment
- **Docker** - Containerization
- **Supervisor** - Process management
- **Yarn** - Package management
- **Hot reload** - Development efficiency

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB
- Yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd people-monitor
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
```

3. **Frontend Setup**
```bash
cd frontend
yarn install
```

4. **Environment Configuration**
```bash
# Backend .env
MONGO_URL=mongodb://localhost:27017/
SECRET_KEY=your-secret-key-here

# Frontend .env
REACT_APP_BACKEND_URL=http://localhost:8001
```

5. **Start the Application**
```bash
# Start backend
cd backend
python server.py

# Start frontend (in another terminal)
cd frontend
yarn start
```

## 📖 Usage Guide

### For Administrators

1. **Register/Login**
   - Create an admin account or login with existing credentials
   - Access is restricted to authenticated users only

2. **Create Emergency Event**
   - Click "Create New Event" on the dashboard
   - Fill in event details (title, description, calamity type)
   - Save to create the monitoring event

3. **Add People to Monitor**
   - Individual: Use "Add Person" button for single entries
   - Bulk Text: Use "Bulk Add" → "Text Input" tab for CSV-style data
   - Excel Upload: Use "Bulk Add" → "Excel Upload" tab for spreadsheet imports

4. **Share Emergency Link**
   - Click "Share" button to generate and copy the response link
   - Distribute via WhatsApp, SMS, email, or any messaging platform
   - No login required for people to respond

5. **Monitor Responses**
   - View real-time statistics and response rates
   - Track individual status updates
   - Monitor by team tags and groups

### For Responders

1. **Click the shared link** (no registration required)
2. **Select your name** from the dropdown
3. **Choose your status**: Safe or Need Help
4. **Add optional message** if needed
5. **Submit response** - confirmation will appear

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Event Management
- `GET /api/events` - List user's events
- `POST /api/events` - Create new event
- `GET /api/events/{id}` - Get event details
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `POST /api/events/{id}/duplicate` - Duplicate event

### People Management
- `GET /api/events/{id}/people` - List people in event
- `POST /api/events/{id}/people` - Add person to event
- `PUT /api/events/{id}/people/{person_id}` - Update person
- `DELETE /api/events/{id}/people/{person_id}` - Remove person
- `POST /api/events/{id}/people/bulk` - Bulk add people
- `POST /api/events/{id}/people/bulk/excel` - Excel upload

### Response Tracking
- `GET /api/events/{id}/responses` - Get all responses
- `POST /api/events/{id}/respond` - Submit status response
- `GET /api/events/{id}/statistics` - Get event statistics
- `GET /api/events/{id}/share` - Generate share link

### Public Access
- `GET /api/respond/{event_id}` - Public response page (HTML)

## 📊 Excel Upload Format

For bulk imports, use this Excel format:

| Name | Contact | Tags |
|------|---------|------|
| John Doe | john@company.com | IT Team, Floor 3 |
| Jane Smith | jane@company.com | HR Team, Floor 2 |
| Mike Johnson | mike@company.com | IT Team |

**Requirements:**
- Required columns: `Name`, `Contact`
- Optional: `Tags` (comma-separated) or `Tag1`, `Tag2`, etc.
- File formats: `.xlsx` or `.xls`
- First row must contain headers

## 🎨 UI Features

- **Modern Design** - Clean, professional interface using ShadCN components
- **Mobile Responsive** - Works on all devices and screen sizes
- **Accessibility** - ARIA compliant with keyboard navigation
- **Real-time Updates** - Live statistics and status changes
- **Confirmation Dialogs** - Prevent accidental deletions
- **Loading States** - Clear feedback during operations

## 🔒 Security Features

- **Authentication** - JWT token-based security
- **Password Hashing** - bcrypt encryption
- **Input Validation** - Comprehensive data sanitization
- **CORS Protection** - Cross-origin request security
- **Event Isolation** - Users can only access their own events

## 🚨 Emergency Best Practices

1. **Pre-populate People** - Add team members before emergencies occur
2. **Test Share Links** - Verify accessibility before deployment
3. **Use Team Tags** - Organize by departments, floors, or locations
4. **Monitor Response Rates** - Follow up on non-responders
5. **Multiple Channels** - Share links via various communication methods

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

## 🙏 Acknowledgments

- Built with modern web technologies for reliability and performance
- Designed with emergency response professionals in mind
- Tested in real-world scenarios for maximum effectiveness

---

**Remember: In emergencies, every second counts. People Monitor helps you quickly assess team safety when it matters most.**
