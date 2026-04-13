async function run() {
  const resReg = await fetch('http://127.0.0.1:8082/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "ai_tester_" + Date.now(), password: "password123", full_name: "Tester" })
  });
  const regData = await resReg.json();
  const token = regData.access_token;

  const payload = {
    messages: [{ role: 'user', content: 'test' }],
    model: 'llama-3.3-70b-versatile'
  };
  
  const resAi = await fetch('http://127.0.0.1:8082/api/ai/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(payload)
  });
  
  console.log("AI Response Status:", resAi.status);
  console.log("AI Response Body:", await resAi.text());
}
run().catch(console.error);
