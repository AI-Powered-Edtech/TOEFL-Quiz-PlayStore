async function run() {
  const resReg = await fetch('http://127.0.0.1:8082/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "db_tester_" + Date.now(), password: "password123", full_name: "Tester" })
  });
  const regData = await resReg.json();
  const token = regData.access_token;
  console.log("User registered.");

  // 1. Save a Quiz Result
  const payload = {
    skill_id: "S1",
    section: "STRUCTURE",
    score: 85,
    correct_count: 8,
    total_questions: 10
  };
  
  const resQuiz = await fetch('http://127.0.0.1:8082/api/quiz/results', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(payload)
  });
  
  console.log("Quiz Save Response:", resQuiz.status, await resQuiz.text());
  
  // 2. Fetch User Profile to see XP updated
  const resProfile = await fetch('http://127.0.0.1:8082/api/auth/profile', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  const profile = await resProfile.json();
  console.log("Updated Profile XP:", profile.total_xp);
  
  // 3. Output the raw DB table row to verify
  const { execSync } = require('child_process');
  console.log("Raw DB Row for user:");
  console.log(execSync(`sqlite3 /workspace/data.db "SELECT * FROM quiz_results WHERE user_id = '${profile.id}'"`).toString());
}

run().catch(console.error);
