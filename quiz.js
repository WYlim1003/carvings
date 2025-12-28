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
      console.log("Submitting quiz with payload:", payload);
      
      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Accept": "application/json" 
        },
        body: JSON.stringify(payload)
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server returned error:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      // Check if the response is actually JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        console.log("Quiz submitted successfully:", data);
        
        if (data.success) {
          showResults(score, answers);
        } else {
          throw new Error(data.error || "Submission failed");
        }
      } else {
        const text = await response.text();
        console.error("Server did not return JSON. Response:", text);
        throw new Error("Server did not return JSON response");
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("Failed to submit quiz. Error: " + err.message + "\n\nPlease check your internet connection and try again.");
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
      ${answers.q1 === CORRECT_ANSWERS.q1 ? "✓ Correct" : "✗ Wrong (Correct: B)"}
    </p>

    <p><strong>Q2:</strong> Your answer: ${answers.q2.toUpperCase()} —
      ${answers.q2 === CORRECT_ANSWERS.q2 ? "✓ Correct" : "✗ Wrong (Correct: B)"}
    </p>

    <p><strong>Q3:</strong> Your answer: ${answers.q3.toUpperCase()} —
      ${answers.q3 === CORRECT_ANSWERS.q3 ? "✓ Correct" : "✗ Wrong (Correct: A)"}
    </p>

    <p><strong>Q4:</strong> Your answer: ${answers.q4.toUpperCase()} —
      ${answers.q4 === CORRECT_ANSWERS.q4 ? "✓ Correct" : "✗ Wrong (Correct: C)"}
    </p>
  `;
}

async function resetQuiz() {
  try {
    const response = await fetch("/api/save-click", {
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
    // Wait a tiny bit to ensure all scripts are loaded
    setTimeout(() => {
        if (document.getElementById("submit-btn")) {
            if (typeof QUIZ_QUESTIONS === 'undefined' || typeof translations === 'undefined') {
                console.error("Quiz dependencies not loaded. Make sure script.js loads before quiz.js");
                const quizContent = document.getElementById("quiz-content");
                if (quizContent) {
                    quizContent.innerHTML = "<p style='color: red; padding: 20px;'>Error: Quiz data not loaded. Please refresh the page.</p>";
                }
                return;
            }
            generateQuizQuestions();
            document.getElementById("submit-btn").addEventListener("click", submitQuiz);
            const retakeBtn = document.getElementById("retake-btn");
            if (retakeBtn) {
                retakeBtn.addEventListener("click", resetQuiz);
            }
        }
    }, 100);
});