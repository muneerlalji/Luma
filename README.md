# Luma

A gentle memory assistant application designed to help people with dementia and memory challenges stay connected with their loved ones and cherished memories.

## Features

### Memory Management
- **Photo Memories**: Organize and tag photos to help recall special moments
- **People Tagging**: Tag loved ones in photos for easy identification
- **Event Recall**: Revisit past events, birthdays, and anniversaries with context
- **Memory Creation**: Create and store personal memories with photos and descriptions

### Relationship Support
- **People Reminders**: Get gentle reminders to reach out to friends and family
- **Relationship Insights**: Track interaction frequency with loved ones
- **Connection Suggestions**: Receive personalized prompts to nurture relationships

### AI-Powered Assistance
- **Chat Interface**: Interactive chat for memory support and conversation
- **Personalized Suggestions**: AI learns preferences to offer thoughtful reminders
- **Contextual Help**: Get assistance based on your photo history and relationships

### User Experience
- **Secure Authentication**: Email verification and password management
- **Profile Management**: Update personal information and preferences
- **Photo Upload**: Secure cloud storage for your memories
- **Responsive Design**: Works seamlessly across devices

## Tech Stack

### Backend
- **Language**: Go 1.24.4
- **Framework**: Gin (HTTP web framework)
- **Database**: PostgreSQL with GORM
- **Authentication**: JWT tokens
- **File Storage**: AWS S3
- **Email**: SMTP with Go mail package
- **Environment**: Environment variables with godotenv

### Frontend
- **Framework**: Next.js 15.4.1
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API

## Getting Started

### Prerequisites
- Go 1.24.4 or higher
- Node.js 18+ and npm
- PostgreSQL database
- AWS S3 bucket (for photo storage)
- SMTP email service

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/muneerlalji/Luma.git
   cd Luma/backend
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

3. **Environment configuration**
   Create a `.env` file in the backend directory:
   ```env
   PORT=8080
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=luma_db
   JWT_SECRET=your_jwt_secret
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   S3_BUCKET=your_s3_bucket_name
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USERNAME=your_smtp_username
   SMTP_PASSWORD=your_smtp_password
   CLAUDE_API_KEY=your-api-key
   ```

4. **Run the backend**
   ```bash
   go run main.go
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   Create a `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

4. **Run the frontend**
   ```bash
   npm run dev
   ```

## Usage

### Getting Started
1. **Register**: Create an account with email verification
2. **Upload Photos**: Add your cherished photos to the platform
3. **Tag People**: Identify and tag loved ones in your photos
4. **Create Memories**: Add descriptions and context to your photos
5. **Chat with Luma**: Use the AI assistant for memory support

### Key Features
- **Dashboard**: View your memories and recent activities
- **People**: Manage your contacts and relationships
- **Memories**: Browse and search through your photo collection
- **Chat**: Interact with Luma for assistance and conversation
- **Profile**: Update your personal information and preferences

## Security & Privacy

- **Data Encryption**: All sensitive data is encrypted
- **Secure Authentication**: JWT-based authentication with email verification
- **Cloud Storage**: Photos stored securely in AWS S3
- **Privacy First**: Your data remains private and secure
