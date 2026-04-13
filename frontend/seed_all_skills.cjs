const fs = require('fs');

async function seed() {
  const tsContent = fs.readFileSync('src/data/skills.ts', 'utf8');
  
  // Extract all exported arrays
  const skills = [];
  
  // We can just regex the objects out since it's just JS objects in TS
  const regex = /\{ id: '([^']+)', name: '([^']+)', description: '([^']+)', category: '([^']+)', part: '([^']+)' \}/g;
  let match;
  while ((match = regex.exec(tsContent)) !== null) {
    skills.push({
      id: match[1],
      name: match[2],
      description: match[3],
      category: match[4],
      part: match[5]
    });
  }

  console.log(`Found ${skills.length} skills to seed.`);

  const resReg = await fetch('http://127.0.0.1:8082/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "admin_blog_all_" + Date.now(), password: "password123", full_name: "Admin" })
  });
  const regData = await resReg.json();
  const token = regData.access_token;

  let seededCount = 0;
  for (const s of skills) {
    // Generate some basic markdown content
    const content = `## Overview
${s.description}

This skill belongs to the category **${s.category}** in the **${s.part}** section of the TOEFL exam.

### Strategy
To master ${s.name}, you must practice identifying its pattern in TOEFL questions.

### Example Question
Identify the error in the following sentence related to ${s.name}.

**Correct Answer:** This will be explained in the practice section.

> **Tip:** Always look for the subject and verb first!
`;

    const sectionMapping = {
      'Structure': 'STRUCTURE',
      'Written Expression': 'WRITTEN',
      'Listening': 'LISTENING',
      'Reading': 'READING'
    };

    const post = {
      skill_id: s.id,
      title: s.name,
      section: sectionMapping[s.part] || 'STRUCTURE',
      status: 'published',
      is_featured: seededCount < 5, // make first 5 featured
      content: content
    };

    const res = await fetch('http://127.0.0.1:8082/api/blog/admin/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(post)
    });
    
    if (res.status === 200) {
      seededCount++;
    } else {
      console.error(`Failed to seed ${s.id}:`, res.status, await res.text());
    }
  }
  
  console.log(`Successfully seeded ${seededCount} posts.`);
}

seed().catch(console.error);
