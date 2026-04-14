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
    {
        id: 's1-subject-verb',
        title: 'Skill 1: Be Sure the Sentence Has a Subject and a Verb',
        excerpt: 'A sentence in English must have at least one subject and one verb. Learn how to identify missing subjects or verbs.',
        content: `# Skill 1: Be Sure the Sentence Has a Subject and a Verb

A sentence in English must have at least one subject and one verb. The most common types of problems on the TOEFL test related to this skill involve missing subjects, missing verbs, or extra subjects/verbs.

## 1. Missing Subject
Sometimes a sentence is missing a subject.
**Example:**
- _Was backed up for miles on the freeway._
Here, the verb is *was backed up*, but there is no subject. We need a subject like *traffic*.
**Correct:** _Traffic was backed up for miles on the freeway._

## 2. Missing Verb
Sometimes a sentence is missing a verb.
**Example:**
- _The boy going to the movies with a friend._
Here, *going* is not a complete verb. It needs a helping verb like *is*.
**Correct:** _The boy is going to the movies with a friend._

## 3. Extra Subject or Verb
Sometimes a sentence has an extra subject or verb.
**Example:**
- _The boy he is going to the movies._
Here, *he* is an extra subject. We don't need both *The boy* and *he*.
**Correct:** _The boy is going to the movies._

### Summary Formula
> **SUBJECT + VERB**
`,
        category: 'Structure',
        author: 'Admin',
        date: '2026-04-14',
        readTime: '5 min',
        thumbnail: 'bg-blue-500',
        skillId: 1
    },
    {
        id: 'r1-main-idea',
        title: 'Reading Strategy: Finding the Main Idea',
        excerpt: 'Almost every reading passage on the TOEFL test will have a question about the main idea of a passage. Learn how to identify it quickly.',
        content: `# Finding the Main Idea

Almost every reading passage on the TOEFL test will have a question about the main idea of a passage. Such a question may be worded in a variety of ways.

## Common Question Types
- What is the topic of the passage?
- What is the subject of the passage?
- What is the main idea of the passage?
- What is the author's main point in the passage?
- With what is the author primarily concerned?
- Which of the following would be the best title?

## Strategy
1. Read the first line of each paragraph.
2. Look for a common theme or idea in the first lines.
3. Pass your eyes quickly over the rest of the passage to check that you really have found the topic sentence(s).
4. Eliminate any definitely wrong answers and choose the best answer from the remaining choices.
`,
        category: 'Reading',
        author: 'Admin',
        date: '2026-04-14',
        readTime: '7 min',
        thumbnail: 'bg-emerald-400',
        skillId: 101
    }
];
