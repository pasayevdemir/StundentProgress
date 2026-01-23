## 📂 Project Structure

The project follows a modular architecture using vanilla JavaScript classes for Models, Controllers, and Services.

```
/
├── css/                    # Shared global styles (sidebar, preloaders, etc.)
├── dashboard/              # Dashboard view
│   ├── dashboard.js        # Logic for dashboard stats and widgets
│   └── index.html
├── js/
│   ├── components/         # Reusable UI components (e.g., Sidebar)
│   ├── config.js           # Configuration (Supabase keys, etc.)
│   ├── controllers/        # Page-specific logic
│   │   ├── CSVUploadController.js
│   │   ├── ReviewController.js
│   │   └── StudentDetailController.js
│   ├── models/             # Data access and business logic
│   │   ├── ProgressModel.js    # Complex progress calculations & analytics
│   │   ├── ReviewModel.js      # Review CRUD and statistics
│   │   ├── ReviewerModel.js
│   │   ├── StudentModel.js
│   │   └── TechnicalPresentationModel.js
│   ├── services/           # External API integrations
│   │   └── GeminiService.js    # Google Gemini AI wrapper
│   └── utils/              # Helper functions
│       ├── CSVParser.js
│       └── UIHelper.js
├── leaderboard/            # Leaderboard view
├── login/                  # Authentication page
├── review/                 # Main review listing page
│   └── write/              # Individual student review form
├── settings/               # App configuration (API keys, themes)
└── index.html              # Entry point (handles auth redirection)
```

## 🛠 Tech Stack

-   **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+ Classes).
-   **Backend**: [Supabase](https://supabase.com/) (PostgreSQL Database, Authentication).
-   **AI**: [Google Gemini Pro/Flash](https://deepmind.google/technologies/gemini/) (via REST API).
-   **Icons**: FontAwesome / Custom SVG.

## ⚙️ Key Components

### Models
-   **`ProgressModel.js`**: The core logic engine. It handles:
    -   Fetching student progress efficiently (batch queries to avoid N+1).
    -   Calculating `performanceRatio` based on a student's start date vs. current module completion.
    -   Determining progress "Seasons" (Onboarding, Season 01-04).
-   **`StudentModel.js`**: Manages student identity, creation, and updates.

### Services
-   **`GeminiService.js`**: Handles communication with Google's Gemini API.
    -   Includes fallback logic to switch between models (`gemini-1.5-pro`, `gemini-1.5-flash`) if rate limits are hit.
    -   `optimizeReviewText`: Takes raw reviewer notes and polishes the grammar and tone without changing the sentiment.

### Controllers
-   **`ReviewController.js`**: Manages the reviewer's workflow, filtering students, and checking daily review status.

## 📦 Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    ```

2.  **Configuration:**
    -   Ensure `js/config.js` exists and contains your Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
    -   Example `js/config.js`:
        ```javascript
        const SUPABASE_URL = "your_supabase_url";
        const SUPABASE_KEY = "your_supabase_anon_key";
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        // ...Module configurations
        ```

3.  **Run Locally:**
    -   Since this is a static site calling APIs, you can serve it with any static server.
    -   Example with Python:
        ```bash
        python3 -m http.server 3000
        ```
    -   Example with VS Code: Install "Live Server" extension and click "Go Live".

4.  **AI Setup:**
    -   Navigate to the **Settings** page within the app.
    -   Enter your Google Gemini API Key. This is stored in `localStorage` for the browser.