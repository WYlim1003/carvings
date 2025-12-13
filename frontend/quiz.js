function generateQuizQuestions() {
    const quizContent = document.getElementById("quiz-content");
    if (!quizContent || typeof QUIZ_QUESTIONS === 'undefined') {
        console.error("Critical: QUIZ_QUESTIONS data is not accessible.");
        // Display fallback error text to the user instead of nothing
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
        // Fallback insertion if .quiz-actions isn't found
        quizContent.insertAdjacentHTML('beforeend', html);
    }
    applyLanguage(currentLang);
}


async function submitQuiz() {
    const visitorID = document.getElementById("user-id-input").value.trim() || `anon-${Math.floor(Math.random() * 1000000)}`;

    const answers = {
      q1: document.querySelector("input[name='q1']:checked")?.value || null,
      q2: document.querySelector("input[name='q2']:checked")?.value || null,
      q3: document.querySelector("input[name='q3']:checked")?.value || null,
      q4: document.querySelector("input[name='q4']:checked")?.value || null
    };

    if (!answers.q1 || !answers.q2 || !answers.q3 || !answers.q4) {
      alert("Please answer all questions before submitting.");
      return;
    }

    let score = 0;
    for (let q in CORRECT_ANSWERS) {
      if (answers[q] === CORRECT_ANSWERS[q]) score++;
    }

    const percentage = (score / 4) * 100;
    // Send to server
    const payload = {
      visitorID,
      question1: answers.q1.toUpperCase(),
      question2: answers.q2.toUpperCase(),
      question3: answers.q3.toUpperCase(),
      question4: answers.q4.toUpperCase(),
      score,
      percentage,
    };

  try {
    const response = await fetch("/submit-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log("Saved:", data);
    showResults(score, answers);
  } catch (err) {
    console.error("Error submitting quiz:", err);
    alert("Failed to submit quiz. Please try again.");
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
        // We allow the quiz to reset even if the click fails, but log the error
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
