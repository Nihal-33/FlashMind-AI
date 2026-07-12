# Product Requirement Document (PRD)
## Project Name: FlashMind AI
**Tagline:** Learn Faster with AI Generated Flashcards
**Version:** 1.0.0  
**Author:** AI Engineering & Design Team  
**Date:** July 12, 2026  
**Status:** Approved & Implemented  

---

## 1. Executive Summary
FlashMind AI is a modern, production-ready, full-stack web application designed to help students automatically create, study, and manage study materials using Artificial Intelligence. 

By combining the structural simplicity of **Notion**, the learning efficacy of **Quizlet**, and the conversational reasoning power of **ChatGPT**, FlashMind AI makes study preparation seamless, automated, and scientifically optimized.

---

## 2. Target Audience & Personas
*   **The Busy Student (University/School):** Needs to convert long lecture PDFs, slides, and raw textbook chapters into bite-sized, high-yield study cards quickly before exams.
*   **The Lifelong Learner:** Needs to build long-term memory in professional subjects (coding, language, history) using structured, repetitive review cycles.

---

## 3. Product Features & Functional Requirements

### 3.1. Document & Note Ingestion
*   **PDF Upload & Parsing:** Users can drag-and-drop or upload PDF study materials. The system reads and extracts text locally.
*   **Plain Text Notes:** A paste-area allowing users to dump text notes directly.
*   **Topic-Based Generation:** Users can type a search prompt or subject topic (e.g., "Mitochondria cellular respiration") to generate cards from scratch.

### 3.2. Generative AI Engine
*   **DeepSeek & Llama Inference:** Powered by high-speed NVIDIA NIM endpoints.
*   **Model Fallback Loop:** To handle NVIDIA 503 rate limits or overloads, the server handles requests through a robust fallback chain:
    $$\text{DeepSeek-V3/Flash} \rightarrow \text{Llama-3.1-Nemotron-70b} \rightarrow \text{Llama-3.1-8b-Instruct}$$
*   **Safe JSON Extraction:** A custom parser isolates JSON arrays `[...]` or objects `{...}` from conversational AI prefixes/suffixes.

### 3.3. Subject & Deck Management
*   **Subject Directories:** Decks are grouped under subjects (e.g., "Biology", "Computer Science") to keep workspaces clean.
*   **Custom Decks:** Flashcards are structured into individual collections (decks) for targeted study sessions.

### 3.4. Scientific Spaced Repetition Study Mode
*   **SM-2 Algorithm Integration:** Review schedules are calculated dynamically using the SuperMemo-2 (SM-2) spaced repetition algorithm:
    *   *Quality Responses (0-5)*: Users self-rate their recall.
    *   *Repetitions ($n$)*, *Easiness Factor ($EF$)*, and *Intervals ($I$)* are saved individually per card.
*   **TTS Audio Support:** Text-to-speech audio pronunciation triggers for auditory learners.
*   **Interactive 3D Cards:** CSS 3D perspectives allow users to click-to-flip cards smoothly.

### 3.5. Dynamic Quiz Arena
*   **AI Quiz Generation:** Generates graded Multiple Choice, True/False, or Fill-in-the-blank questions based on the deck's content.
*   **Performance Feedback:** Instantly shows correct/incorrect answers, provides detailed explanations, and saves progress to database history.

### 3.6. Gamification & Analytics Dashboard
*   **XP System:** Users earn $+5\text{ XP}$ for creating flashcards and $+10\text{ XP}$ for answering quiz questions correctly.
*   **Level Badges:** Automatically ranks user proficiency levels (e.g., "Scholar Level 2") based on total XP.
*   **Study Streaks:** Tracks consecutive active study days using database-driven streak counters.
*   **Progress Charts:** Interactive charts showing weekly cards studied and quiz success rates.

### 3.7. Responsive Day/Night Themes
*   **Dual Theme Toggle:** A header toggle switches between a vibrant dark-morphic theme and a clean, high-contrast day mode.
*   **Aesthetics:** Smooth CSS variables transitions, glassmorphic menus, and readable text contrasts on all page elements.

---

## 4. Technical Architecture & Database Schema

### 4.1. Core Tech Stack
*   **Frontend & Server Routes:** Next.js 16 (Turbopack) with React 19.
*   **Database & Auth:** Supabase (PostgreSQL with Row Level Security).
*   **Inference API:** NVIDIA NIM API.
*   **Styles:** Tailwind CSS v4 with custom CSS custom property overrides.

### 4.2. Database Design (PostgreSQL)
The application leverages the following relational database tables:
*   `profiles`: Custom user level, XP, study streak tracker, and user avatars.
*   `subjects`: Subjects created by users.
*   `decks`: Decks linked to subjects.
*   `flashcards`: Individual cards holding front text, back text, and SM-2 metadata (`reps`, `interval`, `easiness_factor`, `next_review`).
*   `study_logs`: History logs tracking cards studied for chart metrics.
*   `quiz_history`: Score records of completed quizzes.

---

## 5. Non-Functional Requirements & Performance
*   **Lazy Loading Pagination:** Grid views load a maximum of 12 complex 3D cards at once to prevent browser lag. A "Load More" action handles pagination.
*   **PDF Ingestion Stability:** Heavy worker processes are loaded via local bundles to prevent third-party CDN worker loading blockers.
*   **Safety & Security:** All queries strictly obey Supabase Row Level Security (RLS) policies based on the active authenticated user ID.
