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
        // Fallback insertion if .quiz-actions isn't found
        quizContent.insertAdjacentHTML('beforeend', html);
    }
    applyLanguage(currentLang);
}

function calculateScore(answers) {
    let score = 0;
    for (let q in CORRECT_ANSWERS) {
        if (answers[q] === CORRECT_ANSWERS[q]) score++;
    }
    return score;
}

async function submitQuiz() {
    const answers = {
      q1: document.querySelector("input[name='q1']:checked")?.value || null,
      q2: document.querySelector("input[name='q2']:checked")?.value || null,
      q3: document.querySelector("input[name='q3']:checked")?.value || null,
      q4: document.querySelector("input[name='q4']:checked")?.value || null
    };

    const questions = ['q1', 'q2', 'q3', 'q4'];
    if (questions.some(q => answers[q] === null)) {
      alert("Please answer all questions before submitting.");
      return;
    }

    let visitorID = document.getElementById("user-id-input").value.trim();
    visitorID = visitorID.replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 50);
    if (visitorID.length === 0) {
        visitorID = `anon-${Math.floor(Math.random() * 1000000)}`;
    }

    let score = calculateScore(answers);

    const normalizedAnswers = {
        q1: answers.q1.toUpperCase(),
        q2: answers.q2.toUpperCase(),
        q3: answers.q3.toUpperCase(),
        q4: answers.q4.toUpperCase()
    };

    const payload = {
        visitorID: visitorID,
        score: score,
        ...normalizedAnswers 
    };

    try {
        const response = await fetch("/api/server", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             const errorBody = await response.json();
             console.error('Server submission failed:', response.status, errorBody.error);
             throw new Error('Failed to save submission.');
        }

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
        await fetch("/.netlify/functions/save-click", { // *** MODIFIED URL ***
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: 'retake', visitorID: document.getElementById("user-id-input").value.trim() }) 
        });
    } catch (err) {
        console.warn("Failed to register retake click:", err);
    }
    
    document.getElementById("results-container").classList.add("hidden");
    document.getElementById("quiz-content").classList.remove("hidden");
    document.querySelectorAll("input[type=radio]").forEach(r => (r.checked = false));
    document.getElementById("user-id-input").value = "";
}
