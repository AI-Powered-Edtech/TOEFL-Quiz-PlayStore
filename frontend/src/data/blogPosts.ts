export interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    category: 'Structure' | 'Written' | 'Listening' | 'Reading';
    author: string;
    date: string;
    readTime: string;
    thumbnail: string;
    skillId?: number; // Related skill for CTA
}

export const BLOG_POSTS: BlogPost[] = [
    // ==================== STRUCTURE SKILLS 1-14 ====================
    {
        id: 'mastering-connectors',
        title: 'Mastering Connectors for Cohesive Writing',
        excerpt: 'Learn how to effectively use connecting words to improve your TOEFL Structure and Writing scores.',
        category: 'Structure',
        author: 'TOEFL Expert',
        date: 'Feb 24, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1454165833767-02409744f9cf?auto=format&fit=crop&q=80&w=400',
        skillId: 1,
        content: `
# Mastering Connectors for Cohesive Writing

In the TOEFL test, particularly in the **Structure** and **Written Expression** sections, the ability to connect ideas logically is crucial. Connectors, or transition words, act as bridges between your thoughts, guiding the reader through your argument or description.

## Why Connectors Matter
Connectors are not just "extra" words; they are essential for:
1.  **Cohesion**: Making your sentences flow naturally.
2.  **Clarity**: Helping the reader understand the relationship between ideas (e.g., contrast, addition, result).
3.  **Score Boosting**: Graders look for a variety of transition words to award higher marks in the Writing section.

## Common Connector Types

### 1. Addition
Used to add more information to a previous point.
- *Examples*: Furthermore, moreover, in addition, additionally.
- *Usage*: "The study found that the temperature increased. **Furthermore**, the humidity levels rose significantly."

### 2. Contrast
Used to show a difference or opposition.
- *Examples*: However, nevertheless, on the other hand, conversely.
- *Usage*: "Many people believe that technology isolation. **However**, recent studies show it can actually foster community."

### 3. Cause and Effect
Used to show the result of an action.
- *Examples*: Consequently, therefore, as a result, thus.
- *Usage*: "The company failed to innovate. **As a result**, it lost its market share."

## Tips for the TOEFL
- **Avoid Overuse**: Don't start every sentence with a connector. Use them only when necessary to clarify relationships.
- **Variety is Key**: Don't just use "and" or "but." Use more academic alternatives like "moreover" or "nevertheless."
- **Check Punctuation**: Most connectors used at the start of a sentence are followed by a comma.

Ready to practice? Check out the **Structure** section to test your skills!
    `
    },
    {
        id: 'objects-of-prepositions',
        title: 'Objects of Prepositions: Finding the True Subject',
        excerpt: 'Master the skill of identifying subjects correctly when prepositional phrases try to distract you.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 23, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1484661146680-0b03978e7f77?auto=format&fit=crop&q=80&w=400',
        skillId: 2,
        content: `
# Objects of Prepositions: Finding the True Subject

One of the most common tricks in TOEFL Structure questions is hiding the true subject behind a prepositional phrase. Understanding this concept can significantly improve your accuracy on test day.

## The Core Rule

**An object of a preposition can NEVER be the subject of a sentence.**

When you see a prepositional phrase (a preposition + noun phrase), the noun inside that phrase is NOT the subject. You must look elsewhere for the actual subject.

## Common Prepositions to Watch For

| Single Word | Multi-Word |
|-------------|------------|
| of, in, to, for | in front of |
| with, on, at, by | because of |
| from, about, into | instead of |
| over, under, through | according to |

## How to Find the Subject

### Step 1: Identify the Prepositional Phrase
Look for the preposition and its object.
- Example: "The students **in the library** are studying."

### Step 2: Cross Out the Prepositional Phrase
Mentally remove it to find the core sentence.
- "The students ~~in the library~~ are studying."

### Step 3: Find the Subject-Verb Pair
- Subject: "The students" (plural)
- Verb: "are studying" (plural) ✓

## TOEFL Question Patterns

### Pattern 1: Subject-Verb Agreement Trap
"The list of items \_\_\_\_\_\_ on the desk."
- A) are
- B) is
- C) were
- D) being

**Analysis**: Cross out "of items." The subject is "list" (singular). Answer: **B) is**

### Pattern 2: Missing Subject
"With his friend, \_\_\_\_\_\_ found the movie theater."
- A) has
- B) he
- C) later
- D) when

**Analysis**: "With his friend" is a prepositional phrase. The sentence needs a subject. Answer: **B) he**

## Practice Tips
1. Always identify prepositional phrases first
2. Mentally cross them out before analyzing
3. The subject will never be inside a prepositional phrase
4. Watch for multiple prepositional phrases in a row

Test your skills in the **Structure** practice section!
    `
    },
    {
        id: 'understanding-appositives',
        title: 'Understanding Appositives: The Interrupters',
        excerpt: 'Learn to recognize appositives and avoid common traps in TOEFL Structure questions.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 22, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&q=80&w=400',
        skillId: 3,
        content: `
# Understanding Appositives: The Interrupters

Appositives are noun phrases that rename or describe another noun right beside it. In TOEFL Structure questions, appositives can confuse test-takers by creating the illusion of multiple subjects or verbs.

## What is an Appositive?

An appositive is a noun or noun phrase that sits next to another noun to rename or describe it.

**Example**: "Paris, **the capital of France**, is beautiful."
- "The capital of France" is an appositive renaming "Paris"

## Appositive Patterns

### Pattern 1: Essential Appositives (No Commas)
These provide necessary information and are not set off by commas.
- "My friend **John** is coming over." (Which friend? John.)

### Pattern 2: Non-Essential Appositives (With Commas)
These provide extra information and are set off by commas.
- "My friend, **John**, is coming over." (I have only one friend.)

## The TOEFL Trap

Appositives can make you think a sentence has two subjects or is missing a verb.

### Example Trap:
"The professor, an expert in biology, \_\_\_\_\_\_ the lecture."
- A) she gave
- B) gave
- C) giving
- D) was given

**Analysis**: 
- Subject: "The professor"
- Appositive: "an expert in biology" (extra info, not the subject)
- The sentence needs a verb.
- "she gave" = double subject ✗
- "gave" = correct verb ✓

**Answer: B) gave**

## How to Handle Appositives

1. **Identify the appositive**: Look for noun phrases set off by commas
2. **Cross it out mentally**: Remove the appositive to see the core sentence
3. **Find the true subject and verb**: They will be outside the appositive

## Common Appositive Markers

| Signal | Example |
|--------|---------|
| Commas | "Tokyo, **Japan's capital**, is crowded." |
| Dashes | "The winner—**my sister**—celebrated." |
| Parentheses | "Mount Everest (**the tallest mountain**) is in Nepal." |

## Practice Strategy

When you see commas in a TOEFL question:
1. Check if the phrase between commas is an appositive
2. If it renames the noun before it, it's extra information
3. Ignore it when determining subject-verb agreement

Master this skill in the **Structure** practice section!
    `
    },
    {
        id: 'present-participles-guide',
        title: 'Present Participles: The -ing Forms Explained',
        excerpt: 'Distinguish between present participles as verbs, adjectives, and nouns in TOEFL questions.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 21, 2026',
        readTime: '6 min',
        thumbnail: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?auto=format&fit=crop&q=80&w=400',
        skillId: 4,
        content: `
# Present Participles: The -ing Forms Explained

Present participles (verbs ending in -ing) are versatile words that can function as part of a verb, an adjective, or even a noun (gerund). Understanding their roles is essential for TOEFL Structure success.

## Three Roles of -ing Forms

### 1. Part of a Progressive Verb
When combined with "be" (am, is, are, was, were), the -ing form creates progressive tenses.
- "She **is studying** for the exam." (present progressive)
- "They **were watching** a movie." (past progressive)

### 2. As an Adjective
The -ing form can describe a noun.
- "The **sleeping** baby is cute."
- "It was an **exciting** game."

### 3. As a Gerund (Noun)
The -ing form can function as the subject or object of a sentence.
- "**Swimming** is good exercise." (subject)
- "I enjoy **reading**." (object)

## TOEFL Question Patterns

### Pattern 1: Missing Auxiliary Verb
"The students \_\_\_\_\_\_ in the library right now."
- A) study
- B) studying
- C) are studying
- D) studied

**Analysis**: "Right now" indicates present progressive. We need "be + -ing."
**Answer: C) are studying**

### Pattern 2: Distinguishing Adjective vs. Verb
"The \_\_\_\_\_\_ water tasted fresh."
- A) running
- B) ran
- C) run
- D) runs

**Analysis**: We need an adjective to describe "water."
**Answer: A) running**

### Pattern 3: Gerund as Subject
"\_\_\_\_\_\_ early has many benefits."
- A) Wake up
- B) Waking up
- C) To waking up
- D) Woke up

**Analysis**: We need a noun (gerund) as the subject.
**Answer: B) Waking up**

## Common Errors to Avoid

| Error | Correction |
|-------|------------|
| "She studying now." | "She **is** studying now." |
| "The bored students" vs "The boring students" | Bored = how they feel; Boring = what they are like |
| "I enjoy to swim." | "I enjoy **swimming**." |

## Quick Test Strategy

1. If you see -ing alone, check for a "be" verb
2. If -ing describes a noun, it's an adjective
3. If -ing is the subject or object, it's a gerund
4. Remember: -ing cannot be the main verb without "be"

Practice these patterns in the **Structure** section!
    `
    },
    {
        id: 'past-participles-guide',
        title: 'Past Participles: Mastering the -ed Forms',
        excerpt: 'Understand how past participles function in perfect tenses and passive voice constructions.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 20, 2026',
        readTime: '6 min',
        thumbnail: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?auto=format&fit=crop&q=80&w=400',
        skillId: 5,
        content: `
# Past Participles: Mastering the -ed Forms

Past participles (typically verb + -ed, though irregular verbs vary) are crucial for forming perfect tenses and passive voice. TOEFL Structure questions frequently test your ability to recognize and use them correctly.

## Two Main Uses of Past Participles

### 1. Perfect Tenses (with have/has/had)
Past participles combine with "have" forms to create perfect tenses.
- "She **has finished** her homework." (present perfect)
- "They **had left** before I arrived." (past perfect)
- "I **have visited** Paris twice." (present perfect)

### 2. Passive Voice (with be verbs)
Past participles combine with "be" forms to create passive constructions.
- "The book **was written** by a famous author."
- "The cake **is being baked**."
- "The project **will be completed** tomorrow."

## Irregular Past Participles to Know

| Base Form | Past Tense | Past Participle |
|-----------|------------|-----------------|
| go | went | **gone** |
| write | wrote | **written** |
| take | took | **taken** |
| see | saw | **seen** |
| do | did | **done** |
| eat | ate | **eaten** |
| give | gave | **given** |
| break | broke | **broken** |

## TOEFL Question Patterns

### Pattern 1: Present Perfect
"She \_\_\_\_\_\_ to Japan three times."
- A) has go
- B) has went
- C) has gone
- D) have gone

**Analysis**: Present perfect = has/have + past participle. "Gone" is the past participle of "go."
**Answer: C) has gone**

### Pattern 2: Passive Voice
"The letter \_\_\_\_\_\_ yesterday."
- A) sent
- B) was sent
- C) was send
- D) is sending

**Analysis**: Passive = be + past participle. The letter didn't send itself.
**Answer: B) was sent**

### Pattern 3: Past Participle as Adjective
"The \_\_\_\_\_\_ glass lay on the floor."
- A) breaking
- B) broke
- C) broken
- D) break

**Analysis**: We need an adjective describing the glass. "Broken" is correct.
**Answer: C) broken**

## Quick Recognition Tips

1. **With have/has/had** → Past participle for perfect tense
2. **With be (is/are/was/were)** → Past participle for passive voice
3. **Before a noun** → Past participle as adjective
4. **-ing vs -ed adjectives**: -ing = active/causing; -ed = passive/receiving

## Common Mistakes

| Wrong | Right |
|-------|-------|
| "I have went" | "I have **gone**" |
| "The work was did" | "The work was **done**" |
| "She has wrote" | "She has **written**" |

Sharpen your skills in the **Structure** practice section!
    `
    },
    {
        id: 'coordinate-connectors',
        title: 'Coordinate Connectors: Building Compound Sentences',
        excerpt: 'Master the use of and, but, or, so, and yet to connect independent clauses correctly.',
        category: 'Structure',
        author: 'TOEFL Expert',
        date: 'Feb 19, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?auto=format&fit=crop&q=80&w=400',
        skillId: 6,
        content: `
# Coordinate Connectors: Building Compound Sentences

Coordinate connectors (coordinating conjunctions) join two independent clauses to form compound sentences. The TOEFL frequently tests your knowledge of these connectors and their punctuation rules.

## The FANBOYS

Remember the acronym **FANBOYS** for the seven coordinating conjunctions:

| Letter | Conjunction | Function |
|--------|-------------|----------|
| F | For | Reason/Cause |
| A | And | Addition |
| N | Nor | Negative Addition |
| B | But | Contrast |
| O | Or | Alternative |
| Y | Yet | Contrast |
| S | So | Result |

## Punctuation Rules

### Rule 1: With Comma
When joining two complete sentences, use a comma before the conjunction.
- "I wanted to go, **but** it started raining."

### Rule 2: Without Comma
When connecting two items (not complete sentences), no comma is needed.
- "I like coffee **and** tea."

## TOEFL Question Patterns

### Pattern 1: Missing Connector
"The exam was difficult, \_\_\_\_\_\_ most students passed."
- A) because
- B) but
- C) when
- D) although

**Analysis**: Two complete sentences need a connector. "But" shows contrast.
**Answer: B) but**

### Pattern 2: Wrong Connector Type
"She studied hard, \_\_\_\_\_\_ she failed."
- A) and
- B) so
- C) but
- D) or

**Analysis**: Studying hard but failing is unexpected = contrast.
**Answer: C) but**

### Pattern 3: Punctuation Check
"The weather was nice \_\_\_\_\_\_ we went for a walk."
- A) and,
- B) , and
- C) and
- D) ; and

**Analysis**: Comma goes BEFORE "and" when joining sentences.
**Answer: C) and**

## Logic Relationships

| Relationship | Connector | Example |
|--------------|-----------|---------|
| Addition | and | "I cooked, **and** he cleaned." |
| Contrast | but, yet | "It's small, **but** it's comfortable." |
| Result | so | "It rained, **so** we stayed inside." |
| Choice | or | "Study hard, **or** you will fail." |
| Reason | for | "She left, **for** she was tired." |

## Common Errors

1. **Run-on sentences**: "I like coffee, I drink it daily." → Missing connector
2. **Comma splices**: "I like coffee, and I drink it daily." → No comma needed with "and" connecting items
3. **Wrong logic**: "She studied hard, so she failed." → Should be "but" (contrast)

Practice coordinate connectors in the **Structure** section!
    `
    },
    {
        id: 'adverb-time-cause-connectors',
        title: 'Adverb Connectors: Time and Cause',
        excerpt: 'Learn to use because, since, after, before, and when to create complex sentences.',
        category: 'Structure',
        author: 'TOEFL Expert',
        date: 'Feb 18, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?auto=format&fit=crop&q=80&w=400',
        skillId: 7,
        content: `
# Adverb Connectors: Time and Cause

Adverb connectors (subordinating conjunctions) join a dependent clause to an independent clause. Time and cause connectors are among the most frequently tested in TOEFL Structure.

## Time Connectors

These show when something happens relative to another event.

| Connector | Meaning |
|-----------|---------|
| after | later than |
| before | earlier than |
| when | at that time |
| while | during that time |
| since | from that time until now |
| until | up to that time |
| as soon as | immediately when |

### Examples:
- "**After** the rain stopped, we went outside."
- "I will call you **when** I arrive."
- "**While** she was cooking, he set the table."

## Cause Connectors

These show why something happens.

| Connector | Meaning |
|-----------|---------|
| because | for the reason that |
| since | given that |
| as | since/because |
| now that | considering that |

### Examples:
- "**Because** it was late, we went home."
- "**Since** you're here, let's start."
- "**Now that** the exam is over, we can relax."

## Punctuation Rules

### Rule 1: Dependent Clause First
When the dependent clause comes first, use a comma.
- "**Because it rained**, we stayed inside."

### Rule 2: Independent Clause First
When the independent clause comes first, no comma is needed.
- "We stayed inside **because it rained**."

## TOEFL Question Patterns

### Pattern 1: Missing Connector
"\_\_\_\_\_\_ the movie ended, we went for dinner."
- A) However
- B) After
- C) But
- D) And

**Analysis**: Need a time connector. "After" fits the context.
**Answer: B) After**

### Pattern 2: Clause Structure
"The students left \_\_\_\_\_\_ the bell rang."
- A) when
- B) when did
- C) when was
- D) when it

**Analysis**: After a subordinating conjunction, use normal word order (no inversion).
**Answer: A) when**

### Pattern 3: Logic Relationship
"\_\_\_\_\_\_ she studied hard, she passed the exam."
- A) When
- B) Because
- C) After
- D) Before

**Analysis**: Studying hard leads to passing = cause relationship.
**Answer: B) Because**

## Key Points to Remember

1. Time connectors show temporal relationships
2. Cause connectors show reason/result
3. Dependent clause + comma + independent clause
4. Independent clause + NO comma + dependent clause
5. Never use question word order after subordinating conjunctions

Master these connectors in the **Structure** practice section!
    `
    },
    {
        id: 'adverb-contrast-connectors',
        title: 'Adverb Connectors: Contrast and Condition',
        excerpt: 'Master although, even though, while, if, and unless for expressing contrast and conditions.',
        category: 'Structure',
        author: 'TOEFL Expert',
        date: 'Feb 17, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1509225770129-fbcf8a696c0b?auto=format&fit=crop&q=80&w=400',
        skillId: 8,
        content: `
# Adverb Connectors: Contrast and Condition

Contrast and condition connectors allow you to express unexpected results, opposing ideas, and hypothetical situations. These are essential for sophisticated sentence construction in TOEFL.

## Contrast Connectors

These show opposition or unexpected results.

| Connector | Usage |
|-----------|-------|
| although | despite the fact that |
| even though | stronger than although |
| though | informal version |
| while | contrast or simultaneous time |
| whereas | formal contrast |

### Examples:
- "**Although** it rained, we enjoyed the picnic."
- "**Even though** she was tired, she finished the work."
- "**While** some agreed, others objected."

## Condition Connectors

These show conditions for something to happen.

| Connector | Meaning |
|-----------|---------|
| if | condition |
| unless | if not |
| provided that | only if |
| as long as | on condition that |
| in case | in the event that |

### Examples:
- "**If** you study, you will pass."
- "I won't go **unless** you come too."
- "**Provided that** you finish early, you can leave."

## TOEFL Question Patterns

### Pattern 1: Contrast Logic
"\_\_\_\_\_\_ the weather was bad, the event was successful."
- A) Because
- B) Although
- C) Therefore
- D) So

**Analysis**: Bad weather but successful event = contrast.
**Answer: B) Although**

### Pattern 2: Condition Logic
"You will fail \_\_\_\_\_\_ you study harder."
- A) if
- B) unless
- C) because
- D) although

**Analysis**: Failing unless studying harder = negative condition.
**Answer: B) unless**

### Pattern 3: Clause Position
"\_\_\_\_\_\_, the team continued playing."
- A) Although raining
- B) Although it was raining
- C) Despite it was raining
- D) Even it was raining

**Analysis**: Need subject + verb after "although."
**Answer: B) Although it was raining**

## Common Errors to Avoid

| Wrong | Right |
|-------|-------|
| "Although..., but..." | "Although..., [no but]" |
| "Despite it was raining" | "Despite the rain" OR "Although it was raining" |
| "Unless you don't study" | "Unless you study" (unless = if not) |

## Quick Reference

1. **Contrast**: although, even though, while, whereas
2. **Condition**: if, unless, provided that, as long as
3. Never combine "although" with "but" in the same sentence
4. "Unless" already contains negative meaning—don't add "not"

Practice these patterns in the **Structure** section!
    `
    },
    {
        id: 'noun-clause-connectors',
        title: 'Noun Clause Connectors: What, That, Whether',
        excerpt: 'Learn to identify and use noun clause connectors correctly in complex sentences.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 16, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&q=80&w=400',
        skillId: 9,
        content: `
# Noun Clause Connectors: What, That, Whether

Noun clauses are dependent clauses that function as nouns. They can be subjects, objects, or complements. Understanding noun clause connectors is crucial for TOEFL Structure success.

## What is a Noun Clause?

A noun clause is a group of words that functions as a noun in a sentence.

**Examples:**
- "**What she said** surprised me." (subject)
- "I don't know **where he went**." (object)
- "The question is **whether we should go**." (complement)

## Types of Noun Clause Connectors

### 1. That
Used for statements. Often optional in object position.
- "**That the earth is round** is a fact." (subject position)
- "I believe **(that) he is honest**." (object position—'that' optional)

### 2. Wh- Words
Used for questions or indirect questions.
| Connector | Usage |
|-----------|-------|
| what | thing/information |
| who | person (subject) |
| whom | person (object) |
| whose | possession |
| where | place |
| when | time |
| why | reason |
| how | manner |

### 3. Whether / If
Used for yes/no questions.
- "I wonder **whether/if** she will come."
- "**Whether** to go or stay is the question."

## TOEFL Question Patterns

### Pattern 1: Missing Connector
"I don't know \_\_\_\_\_\_ he will arrive."
- A) when
- B) when is
- C) that when
- D) is when

**Analysis**: Need a connector for the noun clause. "When" introduces the clause.
**Answer: A) when**

### Pattern 2: Subject Noun Clause
"\_\_\_\_\_\_ was surprising to everyone."
- A) What did he say
- B) What he said
- C) That what he said
- D) He said what

**Analysis**: Need a noun clause as subject. Normal word order after connector.
**Answer: B) What he said**

### Pattern 3: Whether vs. That
"The teacher asked \_\_\_\_\_\_ we had finished."
- A) that
- B) whether
- C) what
- D) who

**Analysis**: Asking about completion (yes/no) requires "whether."
**Answer: B) whether**

## Word Order Rules

**Important**: Noun clauses use STATEMENT word order, not question order.

| Question | Noun Clause |
|----------|-------------|
| Where is he? | I know **where he is**. |
| What did she say? | I heard **what she said**. |
| When will they come? | Ask **when they will come**. |

## Common Errors

| Wrong | Right |
|-------|-------|
| "I know where is he." | "I know **where he is**." |
| "I wonder what time is it." | "I wonder **what time it is**." |
| "That he said was true." | "**What** he said was true." |

Practice noun clauses in the **Structure** section!
    `
    },
    {
        id: 'noun-clause-subjects',
        title: 'Noun Clause Subjects: When the Connector IS the Subject',
        excerpt: 'Master the special case where the noun clause connector also serves as the subject.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 15, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400',
        skillId: 10,
        content: `
# Noun Clause Subjects: When the Connector IS the Subject

Sometimes, the noun clause connector serves double duty—it connects the clause AND functions as the subject within that clause. This special case often confuses TOEFL test-takers.

## The Concept

In most noun clauses, you have:
- A connector (what, where, when...)
- A separate subject
- A verb

**Example**: "I know **what** [connector] **he** [subject] **said** [verb]."

But when the connector IS the subject:
- The connector (what, who, whoever, whatever)
- IS ALSO the subject
- Followed directly by the verb

**Example**: "**What** [connector + subject] **happened** [verb] was amazing."

## Connectors That Can Be Subjects

| Connector | Usage |
|-----------|-------|
| who | person (singular/plural) |
| whoever | any person |
| what | thing |
| whatever | anything |
| which | choice from a set |

## TOEFL Question Patterns

### Pattern 1: Subject Position
"\_\_\_\_\_\_ happened was unexpected."
- A) What it
- B) What
- C) That what
- D) It what

**Analysis**: "What" is both connector and subject of "happened."
**Answer: B) What**

### Pattern 2: Object Position
"I will hire \_\_\_\_\_\_ is most qualified."
- A) who
- B) whoever
- C) whomever
- D) whom

**Analysis**: Need subject of "is most qualified." "Whoever" is the subject.
**Answer: B) whoever**

### Pattern 3: Distinguishing Subject vs. Object
"I know \_\_\_\_\_\_ called you."
- A) who
- B) whom
- C) whose
- D) which

**Analysis**: Who did the calling? Subject position = "who."
**Answer: A) who**

## Subject vs. Object Connectors

| Subject Position | Object Position |
|------------------|-----------------|
| **Who** called you? | **Whom** did you call? |
| I know **who** called. | I know **whom** you called. |
| **Whoever** wants to go may leave. | Give it to **whomever** you choose. |

## Common Patterns to Recognize

### Pattern A: "What happened"
- "**What happened** surprised everyone."
- "**What occurred** was strange."
- "**What exists** is unclear."

### Pattern B: "Whoever"
- "**Whoever** finishes first wins."
- "**Whoever** said that was wrong."
- "I'll hire **whoever** applies."

### Pattern C: "Whatever"
- "**Whatever** you decide is fine."
- "**Whatever** remains will be discarded."
- "Take **whatever** you need."

## Quick Test Strategy

1. Identify the noun clause
2. Ask: Is there a separate subject after the connector?
3. If NO, the connector IS the subject
4. Use who/whoever/what/whatever (subject forms)

Master this skill in the **Structure** practice section!
    `
    },
    {
        id: 'adjective-clause-connectors',
        title: 'Adjective Clause Connectors: Who, Whom, Which, That',
        excerpt: 'Learn to use relative pronouns correctly to modify nouns and create complex sentences.',
        category: 'Structure',
        author: 'TOEFL Expert',
        date: 'Feb 14, 2026',
        readTime: '6 min',
        thumbnail: 'https://images.unsplash.com/photo-1453847668862-487637052f8a?auto=format&fit=crop&q=80&w=400',
        skillId: 11,
        content: `
# Adjective Clause Connectors: Who, Whom, Which, That

Adjective clauses (also called relative clauses) modify nouns. The choice of connector depends on whether you're referring to a person or thing, and whether the connector serves as subject or object within the clause.

## Types of Relative Pronouns

| For People | For Things | For Both |
|------------|------------|----------|
| who | which | that |
| whom | | (whose) |
| whose | whose | |

## Basic Patterns

### Pattern 1: Subject Relative Pronoun
When the relative pronoun is the SUBJECT of the adjective clause:
- "The man **who** called me is my uncle."
- "The book **which** is on the table is mine."
- "The student **that** won the prize studies hard."

### Pattern 2: Object Relative Pronoun
When the relative pronoun is the OBJECT of the adjective clause:
- "The man **whom** I met is a doctor."
- "The book **which** I bought is interesting."
- "The student **that** I helped was grateful."

## Who vs. Whom

| Function | Form | Example |
|----------|------|---------|
| Subject | who | "The person **who** called..." |
| Object | whom | "The person **whom** I called..." |

**Tip**: In informal English, "who" is often used for both. In TOEFL, use "whom" for object position.

## TOEFL Question Patterns

### Pattern 1: Person vs. Thing
"The book \_\_\_\_\_\_ I read was fascinating."
- A) who
- B) whom
- C) which
- D) whose

**Analysis**: "Book" is a thing. Use "which" or "that."
**Answer: C) which**

### Pattern 2: Subject vs. Object
"The woman \_\_\_\_\_\_ lives next door is friendly."
- A) whom
- B) who
- C) which
- D) what

**Analysis**: The woman lives (she is the subject). Use "who."
**Answer: B) who**

### Pattern 3: Whose (Possession)
"The author \_\_\_\_\_\_ book won the award is famous."
- A) who
- B) whom
- C) whose
- D) which

**Analysis**: Whose book = the book of the author. Shows possession.
**Answer: C) whose**

## Essential vs. Non-Essential Clauses

### Essential (No Commas)
Information is necessary to identify the noun.
- "The students **who studied hard** passed." (Only those who studied)

### Non-Essential (With Commas)
Information is extra; the noun is already identified.
- "My brother, **who lives in Tokyo**, is visiting." (I have only one brother)

**Important**: Never use "that" with non-essential clauses.

## Common Errors

| Wrong | Right |
|-------|-------|
| "The man which called" | "The man **who** called" |
| "The book who I read" | "The book **which/that** I read" |
| "The person whom called" | "The person **who** called" |

Practice adjective clauses in the **Structure** section!
    `
    },
    {
        id: 'adjective-clause-subjects',
        title: 'Adjective Clause Subjects: The Double-Duty Connector',
        excerpt: 'Understand when the relative pronoun serves as both connector and subject in adjective clauses.',
        category: 'Structure',
        author: 'TOEFL Expert',
        date: 'Feb 13, 2026',
        readTime: '5 min',
        thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
        skillId: 12,
        content: `
# Adjective Clause Subjects: The Double-Duty Connector

When a relative pronoun serves as both the connector AND the subject of an adjective clause, it creates a specific pattern that TOEFL frequently tests. Understanding this pattern is essential for correct sentence analysis.

## The Pattern

When the relative pronoun is the subject:
**Noun + [who/which/that] + verb + rest of clause**

**Examples:**
- "The man **who** [subject] **called** [verb] me is my uncle."
- "The book **which** [subject] **explains** [verb] grammar is helpful."
- "The student **that** [subject] **studies** [verb] most will succeed."

## Key Recognition Points

1. The relative pronoun immediately follows the noun it modifies
2. There is NO separate subject between the pronoun and the verb
3. The verb agrees with the ANTECEDENT (the noun being modified)

## TOEFL Question Patterns

### Pattern 1: Missing Subject-Connector
"The scientist \_\_\_\_\_\_ discovered the element won a Nobel Prize."
- A) he
- B) who he
- C) who
- D) whom

**Analysis**: Need connector + subject. "Who" serves both roles.
**Answer: C) who**

### Pattern 2: Subject-Verb Agreement
"The students who \_\_\_\_\_\_ in the library are studying for finals."
- A) is
- B) was
- C) are
- D) been

**Analysis**: "Who" refers to "students" (plural). Verb must be plural.
**Answer: C) are**

### Pattern 3: That vs. Who/Which
"The book \_\_\_\_\_\_ explains grammar is on the shelf."
- A) who
- B) whom
- C) which
- D) what

**Analysis**: "Book" is a thing. Use "which" or "that."
**Answer: C) which**

## Subject vs. Object Relative Pronouns

| Position | Subject Form | Object Form |
|----------|--------------|-------------|
| Person | who | whom |
| Thing | which | which |
| Person/Thing | that | that |

**Subject Example**: "The teacher **who** teaches math is strict."
**Object Example**: "The teacher **whom** I admire teaches math."

## Common Errors

| Wrong | Right | Reason |
|-------|-------|--------|
| "The man who he called" | "The man **who called**" | "Who" is already the subject |
| "The book which it explains" | "The book **which explains**" | "Which" is already the subject |
| "The student whom studies" | "The student **who studies**" | Subject position requires "who" |

## Quick Test Strategy

1. Find the adjective clause (starts with relative pronoun)
2. Look for a subject after the pronoun
3. If there's no separate subject, the pronoun IS the subject
4. Check that the verb agrees with the antecedent

## Agreement Rules

- "The **man who is**..." (singular)
- "The **men who are**..." (plural)
- "The **book which has**..." (singular)
- "The **books which have**..." (plural)

Master this pattern in the **Structure** practice section!
    `
    },
    {
        id: 'reduced-adjective-clauses',
        title: 'Reduced Adjective Clauses: Simplifying Complex Sentences',
        excerpt: 'Learn how to reduce full adjective clauses to participle phrases for more concise writing.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 12, 2026',
        readTime: '6 min',
        thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400',
        skillId: 13,
        content: `
# Reduced Adjective Clauses: Simplifying Complex Sentences

Reduced adjective clauses (also called participle phrases) are a sophisticated way to combine sentences. TOEFL tests your ability to recognize and use these reduced forms correctly.

## What is a Reduced Adjective Clause?

A reduced adjective clause removes the relative pronoun (who, which, that) and the "be" verb, leaving only the participle.

**Full Clause**: "The man **who is standing** there is my father."
**Reduced**: "The man **standing** there is my father."

## Reduction Rules

### Rule 1: Active Voice → Present Participle (-ing)
When the original clause is in active voice, use -ing.

| Full Clause | Reduced |
|-------------|---------|
| The girl who is crying | The girl **crying** |
| The students who study | The students **studying** |
| The man who lives | The man **living** |

### Rule 2: Passive Voice → Past Participle (-ed/-en)
When the original clause is in passive voice, use past participle.

| Full Clause | Reduced |
|-------------|---------|
| The book which was written | The book **written** |
| The car that was damaged | The car **damaged** |
| The letter which was sent | The letter **sent** |

## TOEFL Question Patterns

### Pattern 1: Active Reduction
"The woman \_\_\_\_\_\_ to the teacher is my mother."
- A) who talking
- B) talking
- C) is talking
- D) talked

**Analysis**: Reduce "who is talking" to "talking."
**Answer: B) talking**

### Pattern 2: Passive Reduction
"The report \_\_\_\_\_\_ by the committee was approved."
- A) which submitted
- B) submitted
- C) submitting
- D) was submitted

**Analysis**: Reduce "which was submitted" to "submitted."
**Answer: B) submitted**

### Pattern 3: Position of Reduced Clause
"\_\_\_\_\_\_ the Nobel Prize, the scientist became famous."
- A) Winning
- B) Who won
- C) He won
- D) Won

**Analysis**: Reduced clause can come before the noun it modifies.
**Answer: A) Winning** (= "The scientist winning the Nobel Prize...")

## When Can You Reduce?

| Can Reduce | Cannot Reduce |
|------------|---------------|
| who is working → working | who works → (no reduction) |
| which was made → made | which has made → (no reduction) |
| that is located → located | that will be located → (no reduction) |

**Key**: You can only reduce when there's a form of "be" + participle in the original clause.

## Common Errors

| Wrong | Right |
|-------|-------|
| "The man lives next door" | "The man **living** next door" |
| "The book wrote by her" | "The book **written** by her" |
| "The student sat there" | "The student **sitting** there" |

## Quick Recognition Tips

1. **Active meaning** → Present participle (-ing)
2. **Passive meaning** → Past participle (-ed/-en)
3. Reduced clauses can appear before or after the noun
4. No relative pronoun or "be" verb in reduced form

Practice reduced clauses in the **Structure** section!
    `
    },
    {
        id: 'reduced-adverb-clauses',
        title: 'Reduced Adverb Clauses: Efficient Sentence Construction',
        excerpt: 'Master the art of reducing adverb clauses while maintaining the connector for clarity.',
        category: 'Structure',
        author: 'Grammar Guide',
        date: 'Feb 11, 2026',
        readTime: '6 min',
        thumbnail: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=400',
        skillId: 14,
        content: `
# Reduced Adverb Clauses: Efficient Sentence Construction

Reduced adverb clauses (also called reduced adverbial phrases) allow you to express complex relationships concisely. Unlike reduced adjective clauses, these keep the subordinating conjunction.

## The Reduction Pattern

**Full Adverb Clause**: "While **he was walking** to school, he saw an accident."
**Reduced**: "While **walking** to school, he saw an accident."

**Key Difference from Adjective Clauses**: The connector (while, when, if, etc.) is RETAINED.

## Reduction Rules

### Rule 1: Same Subject Required
Both clauses must have the same subject.
- "While **he** was walking, **he** saw..." ✓ (same subject)
- "While **he** was walking, **she** saw..." ✗ (different subjects)

### Rule 2: Remove Subject + Be
Delete the subject and the "be" verb, keep the connector + participle.

| Full Clause | Reduced |
|-------------|---------|
| When he is working | When **working** |
| While she was studying | While **studying** |
| Because they were tired | **Being** tired |
| If it is possible | If **possible** |

### Rule 3: Active → Present Participle
For active voice, use -ing form.
- "After he **finished** his work..." → "After **finishing** his work..."

### Rule 4: Passive → Past Participle + Being (or just Past Participle)
For passive voice, use past participle.
- "When it **was completed**..." → "When **completed**..."

## Common Connectors Used with Reduced Clauses

| Time | Condition | Contrast | Cause |
|------|-----------|----------|-------|
| when | if | although | because |
| while | unless | though | since |
| after | | even though | |
| before | | while | |
| until | | | |

## TOEFL Question Patterns

### Pattern 1: Time Reduction
"\_\_\_\_\_\_ the exam, she felt relieved."
- A) When finishing
- B) When finished
- C) When she finishing
- D) When was finishing

**Analysis**: Reduce "When she finished" → "When finishing" (active).
**Answer: A) When finishing**

### Pattern 2: Passive Reduction
"When \_\_\_\_\_\_, the material becomes soft."
- A) heating
- B) heated
- C) it heating
- D) being heat

**Analysis**: Material is heated (passive). Use past participle.
**Answer: B) heated**

### Pattern 3: Condition Reduction
"If \_\_\_\_\_\_ properly, the machine will last for years."
- A) maintaining
- B) maintained
- C) maintain
- D) being maintain

**Analysis**: Machine is maintained (passive). Use past participle.
**Answer: B) maintained**

## Special Cases

### "Being" for "Because/Since"
- "Because he was tired..." → "**Being** tired..."
- "Since she was the oldest..." → "**Being** the oldest..."

### Perfect Form: "Having + Past Participle"
Shows completed action before the main verb.
- "After he had finished..." → "After **having finished**..." or "After **finishing**..."

## Common Errors

| Wrong | Right |
|-------|-------|
| "When walking, the rain started." | "When walking, **I** noticed the rain started." (subject needed) |
| "While worked, he listened to music." | "While **working**, he listened to music." |
| "If heating, the metal expands." | "If **heated**, the metal expands." (passive) |

## Quick Test Strategy

1. Check if both clauses have the same subject
2. Identify if the action is active (-ing) or passive (-ed)
3. Keep the connector
4. Remove subject + be verb

Master reduced adverb clauses in the **Structure** practice section!
    `
    },

    // ==================== EXISTING POSTS ====================
    {
        id: 'integrated-writing-blueprint',
        title: 'The Integrated Writing Blueprint',
        excerpt: 'A step-by-step guide to structuring your integrated essay for top scores.',
        category: 'Written',
        author: 'Writing Tutor',
        date: 'Feb 22, 2026',
        readTime: '7 min',
        thumbnail: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=400',
        skillId: 20,
        content: `
# The Integrated Writing Blueprint

The Integrated Writing task requires you to read a short passage and then listen to a lecture on the same topic. Your job is to summarize the points made in the lecture and explain how they relate to the points in the reading.

## The Standard Structure

A high-scoring integrated essay typically follows a four-paragraph structure:

### 1. Introduction
Briefly state the topic of both the reading and the lecture. Mention that the lecture challenges or supports the points in the reading.
*Template*: "Both the reading and the lecture discuss [Topic]. While the reading suggests [Point A], the lecturer provides several counter-arguments."

### 2. Body Paragraph 1: The First Point
Explain the first point from the reading and how the lecture responds to it.
*Keywords*: Firstly, in contrast, the lecturer argues that...

### 3. Body Paragraph 2: The Second Point
Describe the second point from the reading and the lecture's response.
*Keywords*: Secondly, the professor notes, contrary to the reading...

### 4. Body Paragraph 3: The Third Point
Detail the final point and the lecturer's rebuttal or support.
*Keywords*: Finally, according to the speaker, this contradicts the text...

## Expert Tips
- **Focus on the Lecture**: The lecture is usually more important. Spend about 60-70% of your essay on the lecture's points.
- **Paraphrase**: Avoid copying long phrases from the reading. Use your own words to describe the ideas.
- **Use Transitions**: Use words like "however," "on the other hand," and "conversely" to show the relationship between the two sources.

Practice your writing in the **Writing Gym**!
    `
    },
    {
        id: 'active-listening-strategies',
        title: 'Active Listening: Beyond Just Hearing',
        excerpt: 'Techniques for engaging with audio, predicting content, and identifying key information.',
        category: 'Listening',
        author: 'Listening Coach',
        date: 'Feb 20, 2026',
        readTime: '6 min',
        thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=400',
        skillId: 70,
        content: `
# Active Listening: Beyond Just Hearing

Listening is not a passive activity. In the TOEFL, you need to be an active participant in the audio streams to capture the details that matter.

## What is Active Listening?
Active listening means you are not just waiting for the audio to end; you are actively looking for:
- **Main Ideas**: What is the overall topic?
- **Supporting Details**: What examples or reasons are given?
- **Signal Words**: Words like "but," "for example," or "in conclusion" that tell you what's coming next.
- **Speaker Attitude**: Is the speaker certain, doubtful, or enthusiastic?

## Shorthand Note-Taking
You don't have time to write every word. Develop a shorthand system:
- w/ = with
- w/o = without
- \> = increase / better
- < = decrease / worse
- b/c = because

## Predicting the Content
As you listen, try to predict what the speaker will say next. If a professor says, "There are three main reasons for this," your brain should immediately prepare to number three points in your notes.

## Stay Focused
It's easy to drift off during a 5-minute lecture. If you miss a word, **don't panic**. Keep listening for the next point. One missed detail won't ruin your score, but losing focus for the rest of the lecture will.

Head over to the **Listening Hub** to try some practice exercises!
    `
    },
    {
        id: 'decoding-academic-texts',
        title: 'Decoding Complex Academic Texts',
        excerpt: 'Master the art of skimming, scanning, and deep comprehension for the Reading section.',
        category: 'Reading',
        author: 'Reading Specialist',
        date: 'Feb 18, 2026',
        readTime: '8 min',
        thumbnail: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=400',
        skillId: 100,
        content: `
# Decoding Complex Academic Texts

The TOEFL Reading section can be intimidating with its long, dense passages on history, science, or social studies. However, with the right strategy, you can navigate them with ease.

## Skimming vs. Scanning

### Skimming
**Goal**: Get the "gist" or main idea.
**Method**: Read the title, the first and last sentences of each paragraph, and any bold words. Do this quickly (under 2 minutes per passage).

### Scanning
**Goal**: Find specific information (names, dates, key terms).
**Method**: Move your eyes quickly across the lines without "reading" every word, looking for the specific trigger word from the question.

## Understanding Paragraph Structure
Most academic paragraphs follow a standard pattern:
1.  **Topic Sentence**: The main idea.
2.  **Supporting Sentences**: Evidence, examples, or explanations.
3.  **Concluding Sentence**: Summaries or transitions to the next point.

## Dealing with Unknown Vocabulary
You *will* encounter words you don't know. Use **context clues**:
- **Synonyms**: Look for words nearby that might mean the same thing.
- **Antonyms**: Look for "contrast" words like "however" or "unlike."
- **Word Roots**: If you know "bio" means life, you can guess what "bioluminescence" might be about.

## Manage Your Time
You have about 18 minutes per passage. Don't spend more than 1 minute on any single question. If you're stuck, pick your best guess, mark it for review, and move on.

Test your decoding skills in the **Reading Lab**!
    `
    },
    // ==================== LISTENING SKILLS ====================
    {
        id: 'listening-short-dialogues-part-a',
        title: 'Mastering Short Dialogues: Focus on the Second Line',
        excerpt: 'Improve your Listening Part A scores by learning why the second line of the dialogue contains the key to the answer.',
        category: 'Listening',
        author: 'TOEFL Expert',
        date: 'Mar 1, 2026',
        readTime: '4 min',
        thumbnail: 'https://images.unsplash.com/photo-1516280440502-311542f5eb52?auto=format&fit=crop&q=80&w=400',
        content: `
# Mastering Short Dialogues: Focus on the Second Line

In the TOEFL Listening section (Part A - Short Dialogues), you will hear a brief conversation between two people, followed by a question. A key strategy for this section is paying close attention to the **second speaker**.

## Why the Second Line?

The question in Part A almost always focuses on what the second speaker implies, suggests, or means. While the first speaker provides the context, the core information needed to answer the question is usually found in the second line.

## Example Dialogue

Listen to the following short audio sample:

[AUDIO: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3]

**Man:** "Did you see the professor after class?"
**Woman:** "No, he had already left by the time I packed up my things."
**Question:** "What does the woman mean?"

### Discussion

- A) She spoke to the professor.
- B) She left before the professor.
- C) **She didn't see the professor.**
- D) She packed her things slowly.

**Analysis**: The first line introduces the topic (seeing the professor). The second line ("No, he had already left...") gives the crucial information. The correct answer is C, as it directly restates that she didn't see him because he was already gone.

## Strategy for Success

1. **Anticipate**: Be ready to listen harder when the second person speaks.
2. **Listen for Restatements**: Use synonyms. If the speaker says "he had already left", the right answer might say "he was gone".
3. **Don't ignore the first line**: It sets the stage, but the "meat" of the problem is in the second line.

Ready to practice? Check out the **Listening** module to test your skills!
    `
    }
];
