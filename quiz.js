function generateQuizQuestions() {
    const quizContent = document.getElementById("quiz-content");
    if (!quizContent || typeof QUIZ_QUESTIONS === 'undefined') {
        console.error("Critical: QUIZ_QUESTIONS data is not accessible.");
        if (quizContent) quizContent.innerHTML = "Error loading quiz. Data missing.";
        return;
    }
    let html = '';

    const currentLang = (window.sessionStorage && sessionStorage.getItem('lang')) || 'en';
    const dict = translations[currentLang];

    QUIZ_QUESTIONS.forEach((q, index) => {
        const questionNumber = index + 1;
        const questionTextKey = q.textKey;
        const questionText = dict[questionTextKey] || questionTextKey;
        
        let optionsHtml = '';
        for (const [value, optionKey] of Object.entries(q.options)) { 
            const optionText = dict[optionKey] || optionKey; 
            
            optionsHtml += `
                <li class="option-item">
                    <label class="option-label">
                        <input type="radio" name="${q.name}" value="${value}" />
                        <span class="option-text" data-i18n="${optionKey}">${optionText}</span>
                    </label>
                </li>
            `;
        }

        html += `
            <div class="question-block" data-question="${questionNumber}">
              <span class="question-number">
                <span data-i18n="questionLabel">${dict.questionLabel || 'Question'}</span> 
                  ${questionNumber}
              </span>
              <div class="question-text" data-i18n="${questionTextKey}">${questionText}</div>
              <ul class="options-list">
                  ${optionsHtml}
              </ul>
          </div>
        `;
    });

    const quizActions = quizContent.querySelector('.quiz-actions');
    if (quizActions) {
        quizActions.insertAdjacentHTML('beforebegin', html);
    } else {
        quizContent.insertAdjacentHTML('beforeend', html);
    }
    applyLanguage(currentLang);
}

// async function submitQuiz() {
//     const visitorID = document.getElementById("user-id-input").value.trim() || `anon-${Math.floor(Math.random() * 1000000)}`;

//     // 1. Collect answers
//     const answers = {
//         q1: document.querySelector("input[name='q1']:checked")?.value || null,
//         q2: document.querySelector("input[name='q2']:checked")?.value || null,
//         q3: document.querySelector("input[name='q3']:checked")?.value || null,
//         q4: document.querySelector("input[name='q4']:checked")?.value || null
//     };

//     // 2. Ensure all questions are answered
//     if (!answers.q1 || !answers.q2 || !answers.q3 || !answers.q4) {
//         alert("Please answer all questions before submitting.");
//         return;
//     }

//     // 3. Calculate score
//     let score = 0;
//     for (let q in CORRECT_ANSWERS) {
//         if (answers[q] === CORRECT_ANSWERS[q]) score++;
//     }
//     const percentage = (score / 4) * 100;

//     try {
//         const response = await fetch("/api/submit-quiz", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//                 visitorID: visitorID,
//                 question1: answers.q1,
//                 question2: answers.q2,
//                 question3: answers.q3,
//                 question4: answers.q4,
//                 score: score,
//                 percentage: percentage
//             })
//         });

//         const result = await response.json();
//         if (!result.success) {
//             console.error("Supabase Error:", result.error);
//         } else {
//             console.log("Successfully saved to Supabase!");
//         }
//     } catch (err) {
//         console.error("Failed to connect to API:", err);
//     }

//     // 5. UI Updates (Existing logic)
//     const quizContent = document.getElementById("quiz-content");
//     if (quizContent) quizContent.classList.add("hidden");

//     const resultsContainer = document.getElementById("results-container");
//     if (resultsContainer) resultsContainer.classList.remove("hidden");

//     const scoreDisplay = document.getElementById("score-display");
//     if (scoreDisplay) scoreDisplay.textContent = `${score}/4`;

//     const resultsMessage = document.getElementById("results-message");
//     if (resultsMessage) {
//         let message = (score === 4) ? "Excellent! You got all correct!" :
//                      (score === 3) ? "Great job!" : "Keep learning!";
//         resultsMessage.textContent = message;
//     }

//     // Update detailed list
//     const answersList = document.getElementById("answers-list");
//     if (answersList) {
//         answersList.innerHTML = Object.keys(answers).map((q, index) => {
//             const isCorrect = answers[q] === CORRECT_ANSWERS[q];
//             return `
//                 <div class="answer-item" style="margin:10px 0; padding:10px; border-left:4px solid ${isCorrect ? '#4CAF50' : '#f44336'}; background:#f9f9f9;">
//                     <p><strong>Question ${index + 1}:</strong> ${isCorrect ? '✓ Correct' : '✗ Incorrect'}</p>
//                     <p>Your answer: ${answers[q].toUpperCase()} | Correct: ${CORRECT_ANSWERS[q].toUpperCase()}</p>
//                 </div>
//             `;
//         }).join('');
//     }
// }

async function submitQuiz() {
    const submitBtn = document.getElementById("submit-btn");
    const visitorIDInput = document.getElementById("user-id-input");
    const visitorID = visitorIDInput ? visitorIDInput.value.trim() : `anon-${Math.floor(Math.random() * 1000000)}`;

    // 1. Collect answers using the names the BACKEND expects
    const answers = {
        visitorID: visitorID,
        question1: document.querySelector("input[name='q1']:checked")?.value || null,
        question2: document.querySelector("input[name='q2']:checked")?.value || null,
        question3: document.querySelector("input[name='q3']:checked")?.value || null,
        question4: document.querySelector("input[name='q4']:checked")?.value || null
    };

    // 2. Validate
    if (!answers.question1 || !answers.question2 || !answers.question3 || !answers.question4) {
        alert("Please answer all questions before submitting.");
        return;
    }

    // 3. Prevent multiple clicks and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    // 4. Calculate score for the database
    let score = 0;
    const CORRECT_ANSWERS = { q1: 'B', q2: 'B', q3: 'A', q4: 'C' }; // Ensure these match your actual correct answers
    if (answers.question1 === CORRECT_ANSWERS.q1) score++;
    if (answers.question2 === CORRECT_ANSWERS.q2) score++;
    if (answers.question3 === CORRECT_ANSWERS.q3) score++;
    if (answers.question4 === CORRECT_ANSWERS.q4) score++;
    
    const payload = {
        ...answers,
        score: score,
        percentage: (score / 4) * 100
    };

    try {
        const response = await fetch("/api/submit-quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            console.log("Successfully saved!");
            showResults(score, answers); // Call your UI update function
        } else {
            throw new Error(result.error || "Unknown server error");
        }
    } catch (err) {
        console.error("Submission error:", err);
        alert("Failed to submit: " + err.message);
        
        // IMPORTANT: Reset button so user can try again
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Quiz";
    }
}

  function showResults(score, answers) {
  document.getElementById("quiz-content").classList.add("hidden");
  document.getElementById("results-container").classList.remove("hidden");

  document.getElementById("score-display").textContent = `${score}/4`;

  const message =
    score === 4 ? "Excellent! You got all correct!" :
    score === 3 ? "Great job!" :
    score === 2 ? "Good try!" :
    score === 1 ? "Keep learning!" :
    "Try again!";

  document.getElementById("results-message").textContent = message;

  const answersList = document.getElementById("answers-list");

  answersList.innerHTML = `
    <p><strong>Q1:</strong> Your answer: ${answers.q1.toUpperCase()} —
      ${answers.q1 === CORRECT_ANSWERS.q1 ? "✔ Correct" : "✖ Wrong (Correct: B)"}
    </p>

    <p><strong>Q2:</strong> Your answer: ${answers.q2.toUpperCase()} —
      ${answers.q2 === CORRECT_ANSWERS.q2 ? "✔ Correct" : "✖ Wrong (Correct: B)"}
    </p>

    <p><strong>Q3:</strong> Your answer: ${answers.q3.toUpperCase()} —
      ${answers.q3 === CORRECT_ANSWERS.q3 ? "✔ Correct" : "✖ Wrong (Correct: A)"}
    </p>

    <p><strong>Q4:</strong> Your answer: ${answers.q4.toUpperCase()} —
      ${answers.q4 === CORRECT_ANSWERS.q4 ? "✔ Correct" : "✖ Wrong (Correct: C)"}
    </p>
  `;
}


async function resetQuiz() {
  try {
        const response = await fetch("/save-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        console.log("Retake registered. Total Clicks:", data.totalClicks);
    } catch (err) {
        console.error("Failed to register retake click:", err);
    }

  document.getElementById("results-container").classList.add("hidden");
  document.getElementById("quiz-content").classList.remove("hidden");

  document.querySelectorAll("input[type=radio]").forEach(r => (r.checked = false));
  document.getElementById("user-id-input").value = "";
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("submit-btn")) {
        generateQuizQuestions();
        document.getElementById("submit-btn").addEventListener("click", submitQuiz);
        document.getElementById("retake-btn").addEventListener("click", resetQuiz);
    }
});
