// A large pool of distinct generic questions to draw from
const pool = [
  "What is the result of `[] == ![]` in JavaScript?",
  "How do you create a flexbox container in CSS?",
  "Which HTTP status code represents 'Not Found'?",
  "In Git, what command creates a new branch?",
  "What does 'NaN' mean in JavaScript?",
  "Which React hook is used to manage state?",
  "What is the time complexity of binary search?",
  "Which SQL keyword is used to sort the result-set?",
  "What does CORS stand for?",
  "How do you parse a JSON string into a JS object?",
  "Which algorithm is used for the shortest path in a graph?",
  "What is the output of `typeof NaN`?",
  "In Python, how do you define a function?",
  "Which CSS property controls the stacking order of elements?",
  "What does REST stand for in web services?",
  "What is the purpose of a primary key in a database?",
  "How do you prevent default form submission in JS?",
  "What is the default box-sizing in CSS?",
  "Which data structure uses LIFO (Last In First Out)?",
  "What is a 'closure' in JavaScript?",
  "How do you deep clone an object in modern JS?",
  "What does SQL stand for?",
  "Which method adds an element to the beginning of an array?",
  "What is the purpose of the `useEffect` hook?",
  "How do you write a media query for screens smaller than 600px?",
  "What is the difference between `let` and `var`?",
  "Which sorting algorithm has a worst-case time complexity of O(n^2)?",
  "What does API stand for?",
  "How do you find the length of a string in Python?",
  "What is a pure function?",
  "Which HTML element is used for playing audio?",
  "What is event delegation in DOM?",
  "How do you clear an interval in JavaScript?",
  "What is the difference between TCP and UDP?",
  "Which CSS unit is relative to the root element's font size?",
  "What does the `this` keyword refer to in arrow functions?",
  "How do you select an element with id 'app' in CSS?",
  "What is the purpose of Webpack?",
  "Which HTTP method is used to update a resource?",
  "What is the difference between `==` and `===`?"
];

// Fisher-Yates shuffle to randomize the pool
const shuffledPool = [...pool].sort(() => Math.random() - 0.5);

export const generateDummyQuestions = (difficulty, count, startIndex) => {
  return Array.from({ length: count }).map((_, i) => {
    const qIndex = startIndex + i;
    // Fallback if we run out of pool questions
    const text = shuffledPool[qIndex % shuffledPool.length];
    
    return {
      id: `${difficulty}-${qIndex}`,
      text: `[${difficulty.toUpperCase()}] ${text}`,
      options: [
        `Option ${qIndex}A (Correct)`, 
        `Option ${qIndex}B`, 
        `Option ${qIndex}C`, 
        `Option ${qIndex}D`
      ].sort(() => Math.random() - 0.5),
      // Because we sort, the correct index changes. We will just hardcode correct logic 
      // in App.js to check if option text includes '(Correct)'. Let's adjust App.js for this.
      // Wait, to avoid editing App.jsx again, let's keep track of the correct option string.
      // App.js currently expects `correctIndex` to be the index in the options array.
      // We will shuffle options, find where the correct one went, and set `correctIndex`.
    };
  }).map(q => {
    const rawOptions = [
      "Option 1",
      "Option 2", 
      "Option 3", 
      "Option 4"
    ];
    // Randomly assign one as the "Right Answer"
    const correctStr = "Correct Answer";
    rawOptions[0] = correctStr;
    const shuffled = rawOptions.sort(() => Math.random() - 0.5);
    
    return {
      id: q.id,
      text: q.text,
      options: shuffled,
      correctIndex: shuffled.indexOf(correctStr),
      points: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4,
      time: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : difficulty === 'hard' ? 90 : 120,
      difficulty: difficulty
    };
  });
};

// Team A gets indexes 0-5, Team B gets indexes 6-11
export const teamAQuestions = [
  ...generateDummyQuestions('easy', 6, 0),
  ...generateDummyQuestions('medium', 6, 12),
  ...generateDummyQuestions('hard', 6, 24)
];

export const teamBQuestions = [
  ...generateDummyQuestions('easy', 6, 6),
  ...generateDummyQuestions('medium', 6, 18),
  ...generateDummyQuestions('hard', 6, 30)
];

export const tieBreakerQuestions = [
  ...generateDummyQuestions('hard', 1, 36),
  ...generateDummyQuestions('hard', 1, 37),
  ...generateDummyQuestions('medium', 1, 38),
  ...generateDummyQuestions('medium', 1, 39),
  ...generateDummyQuestions('easy', 1, 40)
];

export const penaltyQuestions = generateDummyQuestions('very_hard', 10, 41);
