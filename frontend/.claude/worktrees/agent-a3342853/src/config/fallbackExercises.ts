export const FALLBACK_EXERCISES = {
    mason: {
        type: 'drag_drop' as const,
        target_sentence: "The professor claims that the theory is invalid.",
        fragments: ["The professor", "claims that", "the theory", "is invalid", "."]
    },
    logic_weaver: [
        { main: "The reading passage states that solar power is efficient", sub: "the lecturer argues it is too expensive", correct: "however", distractors: ["furthermore", "therefore", "because"] },
        { main: "Regular exercise improves cardiovascular health", sub: "it also enhances mental well-being and cognitive function", correct: "furthermore", distractors: ["however", "although", "despite"] },
        { main: "Ocean temperatures have risen significantly over the past decade", sub: "many marine species are migrating to cooler waters", correct: "consequently", distractors: ["however", "furthermore", "although"] },
        { main: "The new policy aims to reduce carbon emissions by 50%", sub: "critics argue that the targets are unrealistic", correct: "nevertheless", distractors: ["therefore", "because", "in addition"] },
        { main: "Urban populations continue to grow at an unprecedented rate", sub: "cities must invest heavily in public infrastructure", correct: "therefore", distractors: ["however", "although", "in addition"] },
        { main: "Researchers discovered a new species of deep-sea fish", sub: "the discovery challenges existing theories about ocean biodiversity", correct: "in fact", distractors: ["however", "because", "meanwhile"] },
    ],
    ielts_paragraph: {
        type: 'ielts_paragraph' as const,
        ielts_data: {
            task_prompt: "Some people believe that remote work has more advantages than disadvantages for both employees and employers. To what extent do you agree or disagree?",
            steps: [
                {
                    step_type: "Topic Sentence",
                    options: [
                        { id: "A", text: "Remote work is good for everyone.", band_level: 5, feedback: "Too simple and vague. Lacks sophisticated vocabulary." },
                        { id: "B", text: "The shift towards remote work has fundamentally transformed the modern workplace, offering unprecedented flexibility for employees whilst presenting new challenges for organizational cohesion.", band_level: 9, feedback: "Excellent topic sentence with sophisticated vocabulary and complex structure." },
                        { id: "C", text: "Working from home has become increasingly popular in recent years, providing workers with greater flexibility and work-life balance.", band_level: 7, feedback: "Good topic sentence with clear structure, though vocabulary could be more varied." }
                    ]
                },
                {
                    step_type: "Supporting Detail",
                    options: [
                        { id: "A", text: "People like it because they can stay home.", band_level: 5, feedback: "Too informal and lacks development." },
                        { id: "B", text: "Research conducted by Stanford University demonstrated that remote employees exhibited a 13% increase in productivity, attributed largely to fewer workplace distractions and reduced commuting stress.", band_level: 9, feedback: "Excellent supporting detail with specific evidence and academic tone." },
                        { id: "C", text: "Studies have shown that employees who work remotely tend to be more productive and satisfied with their jobs.", band_level: 7, feedback: "Good supporting point but lacks specific evidence or examples." }
                    ]
                },
                {
                    step_type: "Example",
                    options: [
                        { id: "A", text: "For example, my friend works from home and likes it.", band_level: 5, feedback: "Too personal and anecdotal for academic writing." },
                        { id: "B", text: "A compelling illustration of this phenomenon can be observed in the technology sector, where companies such as GitLab and Automattic have successfully implemented fully remote models, reporting both enhanced employee retention and access to a global talent pool.", band_level: 9, feedback: "Excellent example with specific companies and outcomes." },
                        { id: "C", text: "For instance, many technology companies have adopted remote work policies and seen positive results in employee satisfaction.", band_level: 7, feedback: "Good example but could be more specific with data or company names." }
                    ]
                }
            ]
        }
    }
};
