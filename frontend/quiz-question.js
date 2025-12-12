const QUIZ_QUESTIONS = [
    {
        name: "q1",
        text: "What do Flora motifs symbolize in Malay wood carving?",
        options: {
            a: "Freedom and dynamic movement",
            b: "Beauty and harmony with nature", // CORRECT
            c: "Connection between humans and the universe",
            d: "Balance, unity and harmony"
        },
        correct: "b"
    },
    {
        name: "q2",
        text: "Which motif category includes animals such as birds, fish and insects?",
        options: {
            a: "Flora",
            b: "Fauna", // CORRECT
            c: "Cosmos",
            d: "Geometric"
        },
        correct: "b"
    },
    {
        name: "q3",
        text: "Cosmic motifs are inspired by celestial elements. What do they symbolize?",
        options: {
            a: "The connection between humans and the universe", // CORRECT
            b: "Beauty and harmony with nature",
            c: "Freedom and dynamic movement",
            d: "Balance, unity and harmony"
        },
        correct: "a"
    },
    {
        name: "q4",
        text: "Geometric motifs are composed of shapes and symmetric patterns. Which of these is NOT typically part of geometric motifs?",
        options: {
            a: "Triangles, circles and squares",
            b: "Symmetric patterns",
            c: "Plants and flowers", // CORRECT
            d: "Repeating patterns"
        },
        correct: "c"
    }
];

const CORRECT_ANSWERS = QUIZ_QUESTIONS.reduce((acc, q) => {
    acc[q.name] = q.correct;
    return acc;
}, {});