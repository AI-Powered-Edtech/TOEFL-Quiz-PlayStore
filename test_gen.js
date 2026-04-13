async function run() {
    const resReg = await fetch('http://127.0.0.1:8082/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: "test_da2_" + Date.now(), password: "password123", full_name: "Test DA" })
    });
    const regData = await resReg.json();
    const token = regData.access_token;

    const args = {
        messages: [
            { role: 'system', content: 'test' },
            { role: 'user', content: 'test' }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 6144
    };

    const resGen = await fetch('http://127.0.0.1:5173/api/ai/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(args)
    });
    console.log(resGen.status);
    const genData = await resGen.text();
    console.log(genData);
}
run().catch(console.error);
