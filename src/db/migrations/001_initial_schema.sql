

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    friend_code TEXT UNIQUE,
    hearts_count INTEGER DEFAULT 5,
    xp INTEGER DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free',
    fcm_token TEXT,
    password_hash TEXT NOT NULL,
    peer_review_prefs TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
    user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'admin',
    pin_hash TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE TABLE IF NOT EXISTS passages (
    id TEXT PRIMARY KEY,
    topic TEXT,
    content TEXT NOT NULL,
    source TEXT,
    difficulty TEXT,
    word_count INTEGER,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS question_bank (
    id TEXT PRIMARY KEY,
    skill_id INTEGER NOT NULL,
    section TEXT NOT NULL CHECK (section IN ('structure','written','reading','listening')),
    interaction TEXT NOT NULL CHECK (interaction IN ('fill_blank','identify_error','multiple_choice')),
    stimulus TEXT,
    prompt TEXT NOT NULL,
    choices TEXT,
    correct_response TEXT,
    cefr_target TEXT CHECK (cefr_target IN ('A2','B1','B2','C1')),
    difficulty_score INTEGER,
    passage_id TEXT REFERENCES passages(id),
    metadata TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    skill_id TEXT,
    section TEXT NOT NULL,
    score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    xp_earned INTEGER NOT NULL,
    breakdown TEXT
);

CREATE TABLE IF NOT EXISTS user_question_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    answered_correctly INTEGER NOT NULL,
    time_spent_ms INTEGER,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cefr_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    test_set_id TEXT,
    cefr_level TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    reading_score INTEGER,
    listening_score INTEGER,
    writing_score INTEGER,
    speaking_score INTEGER,
    feedback TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE TABLE IF NOT EXISTS ai_token_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    tokens_limit INTEGER NOT NULL,
    feature TEXT,
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free',
    tokens_limit INTEGER,
    provider TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS feature_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    period_type TEXT,
    used_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE TABLE IF NOT EXISTS exercise_pool (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    difficulty TEXT,
    exercise_data TEXT NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS writing_gym_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    skill_id TEXT,
    exercises_completed INTEGER DEFAULT 0,
    exercises_total INTEGER,
    stars_earned INTEGER DEFAULT 0,
    history TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(user_id, level, skill_id)
);

CREATE TABLE IF NOT EXISTS writing_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    skill_id TEXT,
    session_state TEXT,
    best_score INTEGER,
    status TEXT DEFAULT 'in_progress',
    expires_at TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS writing_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    prompt TEXT,
    reading_passage TEXT,
    user_essay TEXT NOT NULL,
    word_count INTEGER,
    ai_score INTEGER,
    ai_feedback TEXT,
    breakdown TEXT,
    time_spent_seconds INTEGER,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS integrated_writing_tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    reading_passage TEXT,
    listening_content TEXT,
    writing_prompt TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS model_essays (
    id TEXT PRIMARY KEY,
    topic TEXT,
    task_type TEXT NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER,
    band_score REAL,
    breakdown TEXT,
    annotations TEXT,
    highlights TEXT,
    category TEXT,
    source TEXT,
    views_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_saved_essays (
    user_id TEXT NOT NULL,
    essay_id TEXT NOT NULL REFERENCES model_essays(id) ON DELETE CASCADE,
    notes TEXT,
    time_spent_ms INTEGER,
    completed INTEGER DEFAULT 0,
    saved_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (user_id, essay_id)
);

CREATE TABLE IF NOT EXISTS collected_vocabulary (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    definition TEXT,
    cefr_level TEXT,
    example_sentence TEXT,
    source_essay_id TEXT REFERENCES model_essays(id),
    review_count INTEGER DEFAULT 0,
    next_review_at TEXT,
    collected_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS devils_advocate_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_argument TEXT,
    detected_claim TEXT,
    counter_point TEXT,
    score INTEGER,
    feedback TEXT,
    time_spent_seconds INTEGER,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE TABLE IF NOT EXISTS peer_review_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    essay_content TEXT NOT NULL,
    prompt TEXT,
    task_type TEXT CHECK (task_type IN ('discussion','integrated','independent')),
    word_count INTEGER,
    is_anonymous INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_review','completed','expired')),
    claimed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    claimed_at TEXT,
    difficulty_level TEXT,
    moderation_status TEXT DEFAULT 'approved',
    report_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS peer_reviews (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES peer_review_submissions(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL,
    task_response_score INTEGER CHECK (task_response_score BETWEEN 1 AND 9),
    coherence_score INTEGER CHECK (coherence_score BETWEEN 1 AND 9),
    lexical_score INTEGER CHECK (lexical_score BETWEEN 1 AND 9),
    grammar_score INTEGER CHECK (grammar_score BETWEEN 1 AND 9),
    overall_band REAL,
    strengths TEXT,
    weaknesses TEXT,
    suggestions TEXT,
    inline_corrections TEXT,
    time_spent_seconds INTEGER,
    helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
    report_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reviewer_profiles (
    user_id TEXT PRIMARY KEY,
    total_reviews INTEGER DEFAULT 0,
    avg_helpfulness REAL DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'novice',
    quality_average REAL DEFAULT 0,
    tutorial_completed INTEGER DEFAULT 0,
    quiz_score INTEGER,
    qualification_level INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS circles (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL,
    is_public INTEGER DEFAULT 1,
    chat_mode TEXT DEFAULT 'everyone',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS circle_members (
    id TEXT PRIMARY KEY,
    circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS circle_messages (
    id TEXT PRIMARY KEY,
    circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_system INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prediction_type TEXT NOT NULL,
    predicted_value REAL,
    actual_value REAL,
    confidence REAL,
    breakdown TEXT,
    is_current INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    feature TEXT,
    xp_earned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(user_id, achievement_id)
);


CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    total_earnings REAL DEFAULT 0,
    payout_method TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS daily_bites (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    section TEXT,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    quiz_question TEXT,
    quiz_options TEXT,
    quiz_correct_index INTEGER,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS bite_interactions (
    id TEXT PRIMARY KEY,
    bite_id TEXT NOT NULL,
    user_id TEXT,
    interaction_type TEXT CHECK (interaction_type IN ('view','like','share','quiz')),
    watch_duration_seconds INTEGER,
    quiz_correct INTEGER,
    progress REAL DEFAULT 0,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('tip','payment','payout')),
    order_id TEXT UNIQUE,
    from_user_id TEXT,
    to_creator_id TEXT,
    bite_id TEXT,
    amount REAL NOT NULL,
    platform_fee REAL DEFAULT 0,
    creator_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'pending',
    provider TEXT,
    metadata TEXT,
    processed_by TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS creator_earnings (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    bite_id TEXT,
    transaction_id TEXT,
    amount REAL NOT NULL,
    earning_type TEXT,
    is_paid INTEGER DEFAULT 0,
    payout_request_id TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE TABLE IF NOT EXISTS app_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('debug','info','warn','error','critical')),
    component TEXT,
    message TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    metadata TEXT,
    stack_trace TEXT,
    resolved INTEGER DEFAULT 0,
    resolved_at TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS app_metrics (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    unit TEXT,
    component TEXT,
    tags TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS alert_config (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,
    service_name TEXT,
    threshold TEXT,
    enabled INTEGER DEFAULT 1,
    notification_channels TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS alert_history (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT,
    message TEXT,
    metadata TEXT,
    sent_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    enabled INTEGER DEFAULT 0,
    rollout_percent INTEGER DEFAULT 0,
    allowed_users TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS content_reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    reason TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    resolved_by TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(reporter_id, content_id, content_type)
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    skill_id TEXT UNIQUE,
    section TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    is_featured INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE INDEX IF NOT EXISTS idx_quiz_results_user_date ON quiz_results(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_question_bank_section ON question_bank(section, skill_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_cefr ON question_bank(cefr_target);
CREATE INDEX IF NOT EXISTS idx_user_question_history ON user_question_history(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_user_date ON ai_token_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_writing_sessions_user ON writing_sessions(user_id, level, status);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_user ON writing_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON peer_review_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON peer_review_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_submission ON peer_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_circles_code ON circles(code);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON circle_messages(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id, prediction_type, is_current);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_creator ON transactions(to_creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_bite_interactions_bite ON bite_interactions(bite_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_component ON app_logs(component, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_metrics_name ON app_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON profiles(friend_code);
