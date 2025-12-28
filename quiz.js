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
          // Show detailed error from server
          const errorMsg = data.error || "Submission failed";
          const errorCode = data.errorCode ? ` (Code: ${data.errorCode})` : '';
          throw new Error(errorMsg + errorCode);
        }
      } else {
        const text = await response.text();
        console.error("Server did not return JSON. Response:", text);
        throw new Error("Server did not return JSON response");
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      console.error("Full error:", err);
      
      // Show more detailed error message
      let errorMessage = err.message || "Unknown error occurred";
      if (errorMessage.includes("Row Level Security") || errorMessage.includes("RLS")) {
        errorMessage += "\n\nPlease check Supabase RLS policies for the quiz_submissions table.";
      } else if (errorMessage.includes("not found") || errorMessage.includes("does not exist")) {
        errorMessage += "\n\nPlease verify the quiz_submissions table exists in your Supabase database.";
      }
      
      alert("Failed to submit quiz.\n\nError: " + errorMessage + "\n\nCheck the browser console (F12) for more details.");
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

// Wait for both DOM and scripts to be ready
function initializeQuiz() {
    const submitBtn = document.getElementById("submit-btn");
    if (!submitBtn) {
        console.warn("Submit button not found, quiz may not be on this page");
        return;
    }

    // Check if dependencies are loaded
    const missingDeps = [];
    if (typeof QUIZ_QUESTIONS === 'undefined') missingDeps.push('QUIZ_QUESTIONS');
    if (typeof translations === 'undefined') missingDeps.push('translations');
    if (typeof CORRECT_ANSWERS === 'undefined') missingDeps.push('CORRECT_ANSWERS');

    if (missingDeps.length > 0) {
        console.error("Missing dependencies:", missingDeps);
        console.error("This usually means script.js didn't load or has an error.");
        console.error("Check the browser console for script.js errors.");
        
        const quizContent = document.getElementById("quiz-content");
        if (quizContent) {
            quizContent.innerHTML = `
                <div style='color: red; padding: 20px; border: 2px solid red; border-radius: 5px; margin: 20px 0;'>
                    <h3>Error: Quiz data not loaded</h3>
                    <p><strong>Missing:</strong> ${missingDeps.join(', ')}</p>
                    <p>Please check:</p>
                    <ul>
                        <li>Open browser console (F12) to see detailed errors</li>
                        <li>Make sure script.js is loading correctly (check Network tab)</li>
                        <li>Look for JavaScript errors in the console</li>
                        <li>Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)</li>
                    </ul>
                    <p style='margin-top: 10px; font-size: 0.9em; color: #666;'>
                        If the problem persists, check that script.js exists and has no syntax errors.
                    </p>
                </div>
            `;
        }
        return;
    }

    // All dependencies loaded, initialize quiz
    try {
        generateQuizQuestions();
        submitBtn.addEventListener("click", submitQuiz);
        const retakeBtn = document.getElementById("retake-btn");
        if (retakeBtn) {
            retakeBtn.addEventListener("click", resetQuiz);
        }
        console.log("Quiz initialized successfully");
    } catch (err) {
        console.error("Error initializing quiz:", err);
        const quizContent = document.getElementById("quiz-content");
        if (quizContent) {
            quizContent.innerHTML = `
                <div style='color: red; padding: 20px; border: 2px solid red; border-radius: 5px; margin: 20px 0;'>
                    <h3>Error initializing quiz</h3>
                    <p>${err.message}</p>
                    <p>Please check the browser console (F12) for more details.</p>
                </div>
            `;
        }
    }
}

// Try multiple initialization strategies
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", () => {
        // Wait a bit for scripts to execute
        setTimeout(initializeQuiz, 100);
    });
} else {
    // DOM already loaded, wait for scripts
    setTimeout(initializeQuiz, 100);
}