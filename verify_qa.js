async function run() {
  const baseUrl = 'http://localhost:8082/api';
  const login = async (email, password) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    return res.json();
  };

  try {
    // 1. dev_free@test.com
    console.log("=== Testing dev_free@test.com ===");
    const freeLogin = await login('dev_free@test.com', 'password123');
    const freeToken = freeLogin.access_token;
    if (!freeToken) {
      console.error("Free login failed:", freeLogin);
      throw new Error("Failed to login dev_free");
    }
    
    // Token usage
    let res = await fetch(`${baseUrl}/ai/token-usage`, { headers: { 'Authorization': `Bearer ${freeToken}` } });
    let usage = await res.json();
    console.log("Free Token Usage:", usage);
    
    console.log("Attempting to hit paywall by using AI...");
    let paywallHit = false;
    for (let i = 0; i < 20; i++) {
      res = await fetch(`${baseUrl}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freeToken}` },
        body: JSON.stringify({
          messages: [{role: "user", content: "hello"}],
          model: "llama-3.1-8b-instant"
        })
      });
      if (res.status !== 200) {
        console.log(`Paywall reached for dev_free at request ${i+1}! Status:`, res.status, await res.text());
        paywallHit = true;
        break;
      }
    }
    if (!paywallHit) {
      console.log("Did not hit paywall for dev_free after 20 requests.");
    }

    // 2. dev_pro@test.com
    console.log("\n=== Testing dev_pro@test.com ===");
    const proLogin = await login('dev_pro@test.com', 'password123');
    const proToken = proLogin.access_token;
    if (!proToken) throw new Error("Failed to login dev_pro");
    
    res = await fetch(`${baseUrl}/ai/token-usage`, { headers: { 'Authorization': `Bearer ${proToken}` } });
    usage = await res.json();
    console.log("Pro Token Usage:", usage);

    res = await fetch(`${baseUrl}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${proToken}` },
        body: JSON.stringify({
          messages: [{role: "user", content: "hello"}],
          model: "llama-3.1-8b-instant"
        })
    });
    console.log("Pro AI Generate Status:", res.status);

    res = await fetch(`${baseUrl}/writing/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${proToken}` },
        body: JSON.stringify({
          essay: "Technology has fundamentally transformed education in many significant ways over the past decade. Students can now access learning materials from virtually anywhere in the world using their smartphones and laptops. Online platforms provide interactive lessons, real-time feedback, and personalized learning paths. However, some critics argue that technology creates unnecessary distractions in the classroom. Despite these concerns, the benefits of educational technology far outweigh the drawbacks when implemented thoughtfully and with proper guidance from educators.",
          task_type: "discussion",
          prompt: "Technology in education"
        })
    });
    console.log("Pro Essay Evaluate Status:", res.status);

    // 3. admin@test.com
    console.log("\n=== Testing admin@test.com ===");
    const adminLogin = await login('admin@test.com', 'password123');
    const adminToken = adminLogin.access_token;
    
    res = await fetch(`${baseUrl}/admin/users`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
    if (res.status === 200) {
      const users = await res.json();
      console.log("Admin Users List:", users.length, "users found.");
    } else {
      console.log("Admin access failed:", res.status, await res.text());
    }

    console.log("\nQA Verify Script Complete!");
  } catch (err) {
    console.error(err);
  }
}
run();