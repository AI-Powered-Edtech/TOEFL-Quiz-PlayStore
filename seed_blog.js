const POSTS = [
  {
    skill_id: "S1",
    title: "Skill 1: Be Sure the Sentence Has a Subject and a Verb",
    section: "STRUCTURE",
    status: "published",
    is_featured: true,
    content: "## Overview\nA sentence in English must have at least one subject and one verb.\n\n### Formula\n**SUBJECT + VERB**\n\n### Example\nThe boy _____ going to the movies.\n(A) he is\n(B) he always was\n(C) is\n(D) will be\n\n**Correct Answer: C**\nBecause the sentence already has a subject (The boy), it only needs a verb."
  },
  {
    skill_id: "R1",
    title: "Reading Skill 1: Answer Main Idea Questions",
    section: "READING",
    status: "published",
    is_featured: false,
    content: "## Overview\nMain idea questions ask you to identify the primary point of the passage.\n\n### Strategy\nRead the first line of each paragraph. It usually contains the topic sentence."
  }
];

async function seed() {
  // First, register a user to get token
  const resReg = await fetch('http://127.0.0.1:8082/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "admin_blog_" + Date.now(), password: "password123", full_name: "Admin" })
  });
  const regData = await resReg.json();
  const token = regData.access_token;
  
  // Note: the backend route POST /api/blog/admin/posts requires admin. 
  // Let's see if our user is admin, if not it will fail with 403.
  // Wait, if it requires admin, I should modify the DB to make them admin or bypass the middleware.
  for (const post of POSTS) {
    const res = await fetch('http://127.0.0.1:8082/api/blog/admin/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(post)
    });
    console.log(`Seeded ${post.skill_id}:`, res.status, await res.text());
  }
}
seed().catch(console.error);
