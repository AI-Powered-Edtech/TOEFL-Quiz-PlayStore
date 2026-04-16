use crate::error::AppError;
use crate::middleware::auth::Claims;
use vil::prelude::*;
use serde::{Deserialize, Serialize};
use vil_server_core::axum::extract::Query;

#[derive(Deserialize)]
pub struct PredictQuery {
    pub user_id: String,
}

// Port of AggregatedOracleData from frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct ScorePrediction {
    pub id: String,
    pub user_id: String,
    pub toefl_pbt_score: i64,
    pub toefl_ibt_score: i64,
    pub toefl_itp_score: i64,
    pub ielts_score: f64,
    pub toefl_pbt_breakdown: PbtBreakdown,
    pub toefl_ibt_breakdown: IbtBreakdown,
    pub toefl_itp_breakdown: PbtBreakdown,
    pub ielts_breakdown: IeltsBreakdown,
    pub confidence_level: String,
    pub data_points: i64,
    pub last_activity_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PbtBreakdown {
    pub listening: i64,
    pub structure_written: i64,
    pub reading: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IbtBreakdown {
    pub reading: i64,
    pub listening: i64,
    pub speaking: i64,
    pub writing: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IeltsBreakdown {
    pub listening: f64,
    pub reading: f64,
    pub writing: f64,
    pub speaking: f64,
}

// Stats fetched from DB
#[derive(Default)]
struct UserStats {
    listening_total: i64,
    listening_correct: i64,
    reading_total: i64,
    reading_correct: i64,
    structure_total: i64,
    structure_correct: i64,
    written_total: i64,
    written_correct: i64,
    gym_exercises: i64,
    essays_submitted: i64,
    last_activity_date: Option<String>,
}

fn safe_divide(a: f64, b: f64) -> f64 {
    if b == 0.0 { 0.0 } else { a / b }
}

fn clamp(v: f64, min: f64, max: f64) -> f64 {
    v.max(min).min(max)
}

fn round_to_half_band(score: f64) -> f64 {
    (score * 2.0).round() / 2.0
}

fn lookup_conversion(table: &[(f64, f64)], pbt_score: f64) -> f64 {
    if pbt_score >= table[0].0 { return table[0].1; }
    if pbt_score <= table[table.len() - 1].0 { return table[table.len() - 1].1; }

    for i in 0..table.len() - 1 {
        let (high_pbt, high_val) = table[i];
        let (low_pbt, low_val) = table[i + 1];
        if pbt_score >= low_pbt && pbt_score <= high_pbt {
            let ratio = (pbt_score - low_pbt) / (high_pbt - low_pbt);
            return low_val + ratio * (high_val - low_val);
        }
    }
    table[table.len() - 1].1
}

const PBT_TO_IBT: &[(f64, f64)] = &[
    (677.0, 120.0), (670.0, 119.0), (660.0, 117.0), (650.0, 114.0),
    (640.0, 111.0), (637.0, 110.0), (630.0, 109.0), (623.0, 106.0),
    (620.0, 105.0), (617.0, 103.0), (613.0, 102.0), (610.0, 101.0),
    (607.0, 100.0), (603.0, 100.0), (600.0, 100.0), (597.0, 98.0),
    (590.0, 96.0), (587.0, 95.0), (580.0, 93.0), (577.0, 91.0),
    (573.0, 90.0), (570.0, 89.0), (567.0, 88.0), (563.0, 86.0),
    (560.0, 85.0), (557.0, 84.0), (553.0, 83.0), (550.0, 80.0),
    (547.0, 79.0), (543.0, 78.0), (540.0, 76.0), (537.0, 75.0),
    (533.0, 74.0), (530.0, 72.0), (527.0, 71.0), (523.0, 70.0),
    (520.0, 68.0), (517.0, 67.0), (513.0, 65.0), (510.0, 64.0),
    (507.0, 63.0), (503.0, 61.0), (500.0, 60.0), (497.0, 59.0),
    (493.0, 57.0), (490.0, 56.0), (487.0, 55.0), (483.0, 53.0),
    (480.0, 52.0), (477.0, 51.0), (473.0, 49.0), (470.0, 48.0),
    (467.0, 47.0), (463.0, 45.0), (460.0, 44.0), (457.0, 43.0),
    (453.0, 41.0), (450.0, 40.0), (447.0, 39.0), (443.0, 38.0),
    (440.0, 37.0), (437.0, 36.0), (433.0, 35.0), (430.0, 34.0),
    (423.0, 32.0), (420.0, 31.0), (417.0, 30.0), (410.0, 29.0),
    (403.0, 27.0), (400.0, 26.0), (397.0, 25.0), (390.0, 23.0),
    (387.0, 22.0), (380.0, 21.0), (377.0, 20.0), (370.0, 19.0),
    (363.0, 18.0), (357.0, 17.0), (350.0, 15.0), (343.0, 14.0),
    (337.0, 13.0), (333.0, 12.0), (330.0, 11.0), (323.0, 10.0),
    (317.0, 9.0), (310.0, 8.0),
];

const PBT_TO_IELTS: &[(f64, f64)] = &[
    (677.0, 9.0), (670.0, 9.0), (660.0, 9.0), (650.0, 9.0), (640.0, 9.0), (630.0, 9.0),
    (620.0, 8.5), (613.0, 8.5), (610.0, 8.5), (603.0, 8.5),
    (600.0, 8.0), (593.0, 8.0), (590.0, 8.0), (580.0, 8.0),
    (577.0, 7.5), (570.0, 7.5), (567.0, 7.5), (563.0, 7.5), (560.0, 7.5), (553.0, 7.5),
    (550.0, 7.0), (543.0, 7.0), (540.0, 7.0), (537.0, 7.0), (530.0, 7.0),
    (527.0, 6.5), (523.0, 6.5), (520.0, 6.5), (517.0, 6.5), (513.0, 6.5), (510.0, 6.5), (507.0, 6.5), (503.0, 6.5),
    (500.0, 6.0), (497.0, 6.0), (493.0, 6.0), (490.0, 6.0), (487.0, 6.0), (483.0, 6.0), (480.0, 6.0), (477.0, 6.0),
    (473.0, 5.5), (470.0, 5.5), (467.0, 5.5), (463.0, 5.5), (460.0, 5.5), (457.0, 5.5), (453.0, 5.5), (450.0, 5.5),
    (447.0, 5.0), (443.0, 5.0), (440.0, 5.0), (437.0, 5.0), (433.0, 5.0), (430.0, 5.0), (423.0, 5.0),
    (420.0, 4.5), (417.0, 4.5), (413.0, 4.5), (410.0, 4.5), (403.0, 4.5),
    (400.0, 4.0), (397.0, 4.0), (393.0, 4.0), (390.0, 4.0), (387.0, 4.0),
    (383.0, 3.5), (380.0, 3.5), (377.0, 3.5), (373.0, 3.5), (370.0, 3.5), (363.0, 3.5),
    (360.0, 3.0), (357.0, 3.0), (353.0, 3.0), (350.0, 3.0), (347.0, 3.0), (343.0, 3.0), (340.0, 3.0),
    (337.0, 2.5), (333.0, 2.5), (330.0, 2.5),
    (323.0, 2.0), (317.0, 2.0), (310.0, 2.0),
];

fn calculate_pbt(stats: &UserStats) -> (i64, i64, i64, i64) {
    let listening_acc = safe_divide(stats.listening_correct as f64, stats.listening_total as f64);
    let structure_correct = stats.structure_correct + stats.written_correct;
    let structure_total = stats.structure_total + stats.written_total;
    let structure_acc = safe_divide(structure_correct as f64, structure_total as f64);
    let reading_acc = safe_divide(stats.reading_correct as f64, stats.reading_total as f64);

    let listening_scaled = (31.0 + listening_acc * 37.0).round();
    let structure_scaled = (31.0 + structure_acc * 37.0).round();
    let reading_scaled = (31.0 + reading_acc * 36.0).round();

    let total = clamp(
        (((listening_scaled + structure_scaled + reading_scaled) / 3.0) * 10.0).round(),
        310.0, 677.0
    );

    (total as i64, listening_scaled as i64, structure_scaled as i64, reading_scaled as i64)
}

fn distribute_ibt(ibt_total: i64, pbt_list: i64, pbt_struct: i64, pbt_read: i64) -> IbtBreakdown {
    let sum = (pbt_list + pbt_struct + pbt_read) as f64;
    if sum == 0.0 {
        return IbtBreakdown { reading: 0, listening: 0, speaking: 0, writing: 0 };
    }

    let listen_ratio = pbt_list as f64 / sum;
    let read_ratio = pbt_read as f64 / sum;
    let struct_ratio = pbt_struct as f64 / sum;

    let ibt = ibt_total as f64;
    let listening = clamp((ibt * listen_ratio * (4.0 / 3.0)).round(), 0.0, 30.0) as i64;
    let reading = clamp((ibt * read_ratio * (4.0 / 3.0)).round(), 0.0, 30.0) as i64;
    let writing = clamp((ibt * struct_ratio * (4.0 / 3.0) * 0.55).round(), 0.0, 30.0) as i64;
    let speaking = clamp((ibt_total - listening - reading - writing) as f64, 0.0, 30.0) as i64;

    IbtBreakdown { reading, listening, speaking, writing }
}

fn distribute_ielts(overall: f64, pbt_list: i64, pbt_struct: i64, pbt_read: i64) -> IeltsBreakdown {
    let sum = (pbt_list + pbt_struct + pbt_read) as f64;
    if sum == 0.0 {
        return IeltsBreakdown { listening: 4.0, reading: 4.0, writing: 4.0, speaking: 4.0 };
    }

    let listen_ratio = pbt_list as f64 / sum;
    let read_ratio = pbt_read as f64 / sum;
    let struct_ratio = pbt_struct as f64 / sum;

    let listening = round_to_half_band(clamp(overall * (0.4 + listen_ratio * 0.6 * 3.0), 2.0, 9.0));
    let reading = round_to_half_band(clamp(overall * (0.4 + read_ratio * 0.6 * 3.0), 2.0, 9.0));
    let writing = round_to_half_band(clamp(overall * (0.4 + struct_ratio * 0.3 * 3.0), 2.0, 9.0));
    let speaking = round_to_half_band(clamp(overall * (0.4 + struct_ratio * 0.3 * 3.0), 2.0, 9.0));

    IeltsBreakdown { listening, reading, writing, speaking }
}

fn calculate_confidence(stats: &UserStats, total_activities: i64) -> String {
    let has_listening = stats.listening_total >= 20;
    let has_reading = stats.reading_total >= 20;
    let has_structure = (stats.structure_total + stats.written_total) >= 10;
    let has_writing = stats.essays_submitted >= 3;
    let has_gym = stats.gym_exercises >= 10;

    if total_activities >= 100 && has_listening && has_reading && has_structure && has_writing && has_gym {
        "high".to_string()
    } else if total_activities >= 50 && has_listening && has_reading {
        "medium".to_string()
    } else {
        "low".to_string()
    }
}

#[vil_handler]
pub async fn predict_score(
    ctx: ServiceCtx,
    _claims: Claims,
    Query(params): Query<PredictQuery>,
) -> Result<VilResponse<ScorePrediction>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let user_id = params.user_id;

    // Fetch quiz stats
    let quiz_rows: Vec<(String, i64, i64, Option<String>)> = sqlx::query_as(
        "SELECT section, COALESCE(SUM(total_questions), 0) as total, COALESCE(SUM(correct_count), 0) as correct, MAX(date) as last_date FROM quiz_results WHERE user_id = ? GROUP BY section"
    )
    .bind(&user_id)
    .fetch_all(state.pool.inner())
    .await
    .unwrap_or_default();

    let mut stats = UserStats::default();
    let mut last_date: Option<String> = None;

    for row in quiz_rows {
        let section = row.0;
        let total = row.1;
        let correct = row.2;
        let date = row.3;

        match section.as_str() {
            "listening" => { stats.listening_total = total; stats.listening_correct = correct; }
            "reading" => { stats.reading_total = total; stats.reading_correct = correct; }
            "structure" => { stats.structure_total = total; stats.structure_correct = correct; }
            "written" => { stats.written_total = total; stats.written_correct = correct; }
            _ => {}
        }

        if let Some(d) = date {
            if last_date.is_none() || d > last_date.clone().unwrap() {
                last_date = Some(d);
            }
        }
    }

    // Fetch gym stats
    let gym_row: Option<(i64, Option<String>)> = sqlx::query_as(
        "SELECT COALESCE(SUM(exercises_completed), 0) as total, MAX(created_at) as last_date FROM writing_gym_progress WHERE user_id = ?"
    )
    .bind(&user_id)
    .fetch_one(state.pool.inner())
    .await
    .ok();

    if let Some(row) = gym_row {
        stats.gym_exercises = row.0;
        if let Some(d) = row.1 {
            if last_date.is_none() || d > last_date.clone().unwrap() {
                last_date = Some(d);
            }
        }
    }

    // Fetch essay stats
    let essay_row: Option<(i64, Option<String>)> = sqlx::query_as(
        "SELECT CAST(COUNT(*) AS INTEGER) as total, MAX(created_at) as last_date FROM writing_submissions WHERE user_id = ?"
    )
    .bind(&user_id)
    .fetch_one(state.pool.inner())
    .await
    .ok();

    if let Some(row) = essay_row {
        stats.essays_submitted = row.0;
        if let Some(d) = row.1 {
            if last_date.is_none() || d > last_date.clone().unwrap() {
                last_date = Some(d);
            }
        }
    }

    stats.last_activity_date = last_date.clone();

    let total_activities = stats.listening_total + stats.reading_total + stats.structure_total + stats.written_total + stats.gym_exercises + stats.essays_submitted;

    let (pbt_total, pbt_list, pbt_struct, pbt_read) = calculate_pbt(&stats);
    let ibt_total = lookup_conversion(PBT_TO_IBT, pbt_total as f64).round() as i64;
    let ielts_overall = round_to_half_band(lookup_conversion(PBT_TO_IELTS, pbt_total as f64));

    let ibt_breakdown = distribute_ibt(ibt_total, pbt_list, pbt_struct, pbt_read);
    let ielts_breakdown = distribute_ielts(ielts_overall, pbt_list, pbt_struct, pbt_read);
    let confidence = calculate_confidence(&stats, total_activities);

    let prediction = ScorePrediction {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        toefl_pbt_score: pbt_total,
        toefl_ibt_score: ibt_total,
        toefl_itp_score: pbt_total,
        ielts_score: ielts_overall,
        toefl_pbt_breakdown: PbtBreakdown { listening: pbt_list * 10, structure_written: pbt_struct * 10, reading: pbt_read * 10 },
        toefl_ibt_breakdown: ibt_breakdown,
        toefl_itp_breakdown: PbtBreakdown { listening: pbt_list * 10, structure_written: pbt_struct * 10, reading: pbt_read * 10 },
        ielts_breakdown,
        confidence_level: confidence,
        data_points: total_activities,
        last_activity_at: last_date,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    Ok(VilResponse::ok(prediction))
}
