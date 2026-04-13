const args = {
    messages: [
        { role: 'system', content: 'You are a critical thinking AI trained in rhetoric, logic, and argumentation.\nYour role is to identify the core claim in a user\'s argument and generate a strong, evidence-based counter-argument.\n\nTASKS:\n1. Extract the main claim from the user\'s argument\n2. Identify any logical fallacies (if present)\n3. Generate a compelling counter-argument that challenges the weakest point\n4. Provide 3 concession starters to help the user defend their position\n\nOUTPUT FORMAT (JSON):\n{\n  "detected_claim": "The core claim you identified",\n  "counter_point": "Your counter-argument (2-3 sentences, academic tone)",\n  "logical_fallacy_check": "Name of fallacy if detected, or \'None\'",\n  "suggested_starters": [\n    "While it\'s true that..., ",\n    "I acknowledge that..., however, ",\n    "That\'s a valid point, but "\n  ]\n}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.' },
        { role: 'user', content: 'USER ARGUMENT: "sdsdsdsdssssssssssssssssssssssss"\n\nGenerate a critical counter-argument. Be intellectually rigorous but fair.' }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 6144
};

fetch('http://127.0.0.1:8082/api/ai/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzYTExMGFkYy1hZWIxLTRlYmMtYjgzYy04NjE5ZWI4N2ZlNWUiLCJyb2xlIjoidXNlciIsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NzYwNzcyOTksImlhdCI6MTc3NjA3NjM5OX0.mrfW3FxUDeb2wSMGE-B9vY2GaZmSy_yJkyvK_ZhxSus'
    },
    body: JSON.stringify(args)
}).then(res => res.json()).then(console.log).catch(console.error);
