-- FlashMind AI Database Schema

-- Drop existing tables to start fresh
drop table if exists public.notifications cascade;
drop table if exists public.analytics cascade;
drop table if exists public.quiz_attempts cascade;
drop table if exists public.study_sessions cascade;
drop table if exists public.flashcards cascade;
drop table if exists public.topics cascade;
drop table if exists public.subjects cascade;
drop table if exists public.profiles cascade;

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  avatar text,
  bio text,
  timezone text,
  daily_goal integer default 10,
  preferred_language text default 'English',
  theme text default 'dark',
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  last_active date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger function to automatically create a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar, theme)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Student'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'dark'
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      avatar = excluded.avatar;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and create it
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Subjects Table
create table public.subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  color text default '#4F46E5',
  icon text default 'Folder',
  created_at timestamp with time zone default now() not null
);

-- 3. Topics Table
create table public.topics (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default now() not null
);

-- 4. Flashcards Table (incorporates SM-2 Spaced Repetition parameters)
create table public.flashcards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects on delete set null,
  topic_id uuid references public.topics on delete set null,
  question text not null,
  answer text not null,
  explanation text,
  difficulty text check (difficulty in ('Easy', 'Medium', 'Hard')) default 'Medium',
  tags text[] default '{}'::text[],
  source_type text default 'text',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  review_date timestamp with time zone default now() not null,
  mastery_level integer default 0,
  favorite boolean default false,
  repetitions integer default 0,
  interval integer default 1,
  ease_factor numeric default 2.5
);

-- 5. Study Sessions Table
create table public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  start_time timestamp with time zone default now() not null,
  end_time timestamp with time zone,
  cards_studied integer default 0,
  correct_count integer default 0
);

-- 6. Quiz Attempts Table
create table public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  score integer not null,
  total_questions integer not null,
  time_taken integer, -- in seconds
  answers jsonb, -- array of {question, user_answer, correct_answer, correct, feedback}
  created_at timestamp with time zone default now() not null
);

-- 7. Analytics Table (Daily Aggregates)
create table public.analytics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date default current_date not null,
  cards_studied integer default 0,
  cards_generated integer default 0,
  study_time integer default 0, -- in seconds
  quiz_score numeric,
  unique (user_id, date)
);

-- 8. Notifications Table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default now() not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_sessions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.analytics enable row level security;
alter table public.notifications enable row level security;

-- Create Policies for Profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create Policies for Subjects
create policy "Users can manage own subjects" on public.subjects
  for all using (auth.uid() = user_id);

-- Create Policies for Topics (linked to owned subjects)
create policy "Users can manage own topics" on public.topics
  for all using (
    exists (
      select 1 from public.subjects s
      where s.id = topics.subject_id and s.user_id = auth.uid()
    )
  );

-- Create Policies for Flashcards
create policy "Users can manage own flashcards" on public.flashcards
  for all using (auth.uid() = user_id);

-- Create Policies for Study Sessions
create policy "Users can manage own study sessions" on public.study_sessions
  for all using (auth.uid() = user_id);

-- Create Policies for Quiz Attempts
create policy "Users can manage own quiz attempts" on public.quiz_attempts
  for all using (auth.uid() = user_id);

-- Create Policies for Analytics
create policy "Users can manage own analytics" on public.analytics
  for all using (auth.uid() = user_id);

-- Create Policies for Notifications
create policy "Users can manage own notifications" on public.notifications
  for all using (auth.uid() = user_id);
