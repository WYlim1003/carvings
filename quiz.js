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

    // Show loading state on submit button
    const submitBtn = document.getElementById("submit-btn");
    const originalSubmitText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

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
        
        // Restore submit button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalSubmitText;
        }
        
        if (data.success) {
          // Show results after successful submission
          console.log("Submission successful, showing results");
          showResults(score, answers);
        } else {
          // Even if submission failed, show results locally
          console.warn("Submission to server failed, but showing results locally");
          showResults(score, answers);
          
          // Show a warning but don't block the results
          setTimeout(() => {
            const errorMsg = data.error || "Submission failed";
            alert("Note: Your results were saved locally, but there was an issue saving to the server.\n\n" + errorMsg);
          }, 500);
        }
      } else {
        const text = await response.text();
        console.error("Server did not return JSON. Response:", text);
        
        // Restore submit button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalSubmitText;
        }
        
        // Still show results even if response format is wrong
        showResults(score, answers);
        throw new Error("Server did not return JSON response");
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      console.error("Full error:", err);
      
      // Restore submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalSubmitText;
      }
      
      // Show results locally even if submission failed
      console.log("Showing results locally despite submission error");
      showResults(score, answers);
      
      // Show error message after a short delay so results are visible
      setTimeout(() => {
        let errorMessage = err.message || "Unknown error occurred";
        if (errorMessage.includes("Row Level Security") || errorMessage.includes("RLS")) {
          errorMessage += "\n\nPlease check Supabase RLS policies for the quiz_submissions table.";
        } else if (errorMessage.includes("not found") || errorMessage.includes("does not exist")) {
          errorMessage += "\n\nPlease verify the quiz_submissions table exists in your Supabase database.";
        }
        
        alert("Note: Your results are shown below, but there was an issue saving to the server.\n\nError: " + errorMessage + "\n\nCheck the browser console (F12) for more details.");
      }, 500);
    }
}

function showResults(score, answers) {
  try {
    console.log("showResults called - score:", score, "answers:", answers);
    
    // Get elements
    const quizContent = document.getElementById("quiz-content");
    const resultsContainer = document.getElementById("results-container");
    
    if (!resultsContainer) {
      console.error("CRITICAL: results-container element not found!");
      alert("Error: Results container not found in page");
      return;
    }

    console.log("Before: resultsContainer classes =", resultsContainer.className);
    
    // Hide quiz content
    if (quizContent) {
      quizContent.classList.add("hidden");
      console.log("Hidden quiz content");
    }
    
    // Show results - remove hidden class
    resultsContainer.classList.remove("hidden");
    console.log("After: resultsContainer classes =", resultsContainer.className);

    // Update score display
    const scoreDisplay = document.getElementById("score-display");
    if (scoreDisplay) {
      scoreDisplay.textContent = `${score}/4`;
      console.log("Updated score display to:", scoreDisplay.textContent);
    } else {
      console.error("Score display element not found!");
    }

    // Get current language for translations
    const currentLang = (window.sessionStorage && sessionStorage.getItem('lang')) || 'en';
    const dict = translations[currentLang] || translations.en;

    // Set result message based on score
    const resultsMessage = document.getElementById("results-message");
    if (resultsMessage) {
      let message = "";
      if (score === 4) {
        message = dict.excellentScore || "Excellent! You got all correct!";
      } else if (score === 3) {
        message = dict.goodScore || "Great job! You understand the carving motifs well.";
      } else if (score === 2) {
        message = dict.averageScore || "Not bad! Review the motifs to improve your score.";
      } else if (score === 1) {
        message = dict.lowScore || "Keep learning! Explore the motif pages to learn more.";
      } else {
        message = dict.lowScore || "Try again! Explore the motif pages to learn more.";
      }
      resultsMessage.textContent = message;
      console.log("Set results message to:", message);
    }

    // Show detailed answers
    const answersList = document.getElementById("answers-list");
    if (answersList) {
      const correctSymbol = "✓";
      const wrongSymbol = "✗";
      
      const questionLabels = [
        { num: 1, correct: CORRECT_ANSWERS.q1, correctText: dict.correctAnswerLabel + " " + CORRECT_ANSWERS.q1.toUpperCase() },
        { num: 2, correct: CORRECT_ANSWERS.q2, correctText: dict.correctAnswerLabel + " " + CORRECT_ANSWERS.q2.toUpperCase() },
        { num: 3, correct: CORRECT_ANSWERS.q3, correctText: dict.correctAnswerLabel + " " + CORRECT_ANSWERS.q3.toUpperCase() },
        { num: 4, correct: CORRECT_ANSWERS.q4, correctText: dict.correctAnswerLabel + " " + CORRECT_ANSWERS.q4.toUpperCase() }
      ];

      answersList.innerHTML = questionLabels.map((q, index) => {
        const answerKey = `q${q.num}`;
        const userAnswer = answers[answerKey];
        const isCorrect = userAnswer === q.correct;
        
        return `
          <div class="answer-item" style="margin: 10px 0; padding: 10px; border-left: 3px solid ${isCorrect ? '#4CAF50' : '#f44336'}; background: ${isCorrect ? '#e8f5e9' : '#ffebee'};">
            <p style="margin: 0;">
              <strong>Question ${q.num}:</strong> 
              <span style="color: ${isCorrect ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                ${isCorrect ? correctSymbol + " " + (dict.correctAnswer || "Correct") : wrongSymbol + " " + (dict.incorrectAnswer || "Incorrect")}
              </span>
            </p>
            <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">
              Your answer: <strong>${userAnswer.toUpperCase()}</strong>
              ${!isCorrect ? ` | ${q.correctText}` : ''}
            </p>
          </div>
        `;
      }).join('');
      console.log("Updated answers list");
    }

    // Scroll to results
    setTimeout(() => {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log("Scrolled to results container");
    }, 100);
    
    console.log("showResults completed successfully");
  } catch (err) {
    console.error("ERROR in showResults:", err);
    console.error("Stack:", err.stack);
    alert("Error showing results: " + err.message);
  }
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