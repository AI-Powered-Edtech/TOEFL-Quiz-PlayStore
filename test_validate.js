const q = {
    "skill_id": 1,
    "section": "structure",
    "interaction": "fill_blank",
    "stimulus": {
      "type": "text",
      "content": "The committee _____ reached a decision after hours of debate."
    },
    "prompt": "Choose the correct answer: _____",
    "choices": ["has", "have", "having", "is"],
    "correct_response": ["has"],
    "cefr_target": "B2",
    "difficulty_score": 65,
    "metadata": { "source": "ai", "explanation": "'Committee' is a collective noun functioning as a single unit, so it takes a singular verb 'has'.", qti_compliant: true, cefr_compliant: true }
};

function validateCanonicalQuestion(q) {
  if (!q || typeof q !== 'object') { console.log('1'); return false; }
  if (typeof q.skill_id !== 'number') { console.log('2'); return false; }
  if (!['structure', 'written', 'reading', 'listening'].includes(q.section)) { console.log('3'); return false; }
  if (!['fill_blank', 'identify_error', 'multiple_choice'].includes(q.interaction)) { console.log('4'); return false; }
  if (!q.stimulus || typeof q.stimulus !== 'object') { console.log('5'); return false; }
  if (typeof q.prompt !== 'string') { console.log('6'); return false; }
  if (!Array.isArray(q.choices)) { console.log('7'); return false; }
  if (!Array.isArray(q.correct_response)) { console.log('8'); return false; }
  if (!['A2', 'B1', 'B2', 'C1'].includes(q.cefr_target)) { console.log('9'); return false; }
  if (typeof q.difficulty_score !== 'number') { console.log('10'); return false; }
  if (!q.metadata || typeof q.metadata !== 'object') { console.log('11'); return false; }
  if (!['ai', 'db', 'pdf'].includes(q.metadata.source)) { console.log('12'); return false; }
  return true;
}

console.log(validateCanonicalQuestion(q));
