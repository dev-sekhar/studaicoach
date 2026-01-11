# StudAICoach Admin Dashboard

Super Admin dashboard for managing the StudAICoach SaaS platform.

## Features

- **Implementation Plan Viewer/Editor**: View and edit the implementation plan in markdown format
- **Task List Viewer/Editor**: View and edit the task list with real-time updates
- **File Upload/Download**: Import and export markdown files
- **Markdown Rendering**: Beautiful rendering of markdown with syntax highlighting
- **Dark Mode Support**: Automatic dark mode based on system preferences

## Getting Started

### Installation

```bash
cd admin-dashboard
yarn install
```

### Development

```bash
yarn dev
```

The dashboard will be available at `http://localhost:3001`

### Build for Production

```bash
yarn build
yarn start
```

## Usage

1. **View Documents**: Switch between Implementation Plan and Task List tabs
2. **Edit Mode**: Click "Edit" to modify the documents
3. **Save Changes**: Click "Save" to persist changes to disk
4. **Download**: Export documents as markdown files
5. **Upload**: Import markdown files from your local system

## API Endpoints

- `GET /api/documents/implementation-plan` - Fetch implementation plan
- `PUT /api/documents/implementation-plan` - Update implementation plan
- `GET /api/documents/task-list` - Fetch task list
- `PUT /api/documents/task-list` - Update task list

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Markdown**: react-markdown with syntax highlighting
- **Icons**: lucide-react
