// SIMPLE NAV + TOP BUTTON
const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const btnAbout = document.getElementById("btn-about");
const mobileAbout = document.getElementById("mobile-about");
const topBtn = document.getElementById("topBtn");

if (menuBtn && mobileMenu) {
  menuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
}
if (btnAbout && mobileAbout) {
  btnAbout.addEventListener("click", () => {
    mobileAbout.classList.toggle("hidden");
  });
}
window.addEventListener("scroll", () => {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    topBtn.style.display = "block";
  } else {
    topBtn.style.display = "none";
  }
});
topBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// =========================
// QUIZ TOOL LOGIC
// =========================

// B.COM. 1st SEMESTER UNITS & TOPICS FROM SPREADSHEET
const BCOM_1ST_UNIT_TOPICS = {
  "Business Organisation": {
    "Unit 1: Business: Concept, Meaning, Features, Stages of dev...ion & Vocation, Modern Business and their Characteristics.": [],
    "Unit 2: Promotion of Business: Considerations in Establishi... and Public Company, Concept of One Person Company and LPP": [],
    "Unit 3: Plant Location: Concept, Meaning, Importance, Facto...ize. Optimum Size and factors determining the Optimum Size": [],
    "Unit 4: Business Combination: Meaning, Characteristics, Obj...haracteristics, Objectives, Principles, Merits and demerits": []
  },
  "Business Statistics": {
    "Unit 1: Evolution of Statistics in India, contribution of I...of Data Diagrammatical and Graphical Presentation of Data.": [],
    "Unit 2: Measures of Central Tendency Mean, Median, Mode, Ge...s and Dispersion, Its Importance, Co-efficientof Skewness.": [],
    "Unit 3: Correlation- Meaning, application, types and degree...lation, Concurrent method, Probable Error & Standard Error": [],
    "Unit 4: Index Number: Meaning, Types and Uses, Methods of c...e Series: Moving Average Method and Method of Least square.": []
  }
};

// SUBJECT LISTS FROM SPREADSHEET
const BA_1ST_SUBJECTS = [
  "Music",
  "Sanskrit",
  "Drawing & Paintings",
  "Economics",
  "Political Science",
  "Home Science",
  "Psychology",
  "Philosophy",
  "Physical Education",
  "English",
  "Library Science",
  "Defence studies",
  "Sociology",
  "Hindi",
  "History",
  "Geography"
];

const BSC_1ST_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "Zoology",
  "Geology",
  "Statistics",
  "Botany"
];

// BASE QUIZ DATA (subjects + units)
const quizData = {
  english: {},
  hindi: {}
};

// Add B.COM. subjects (same labels for both languages)
Object.assign(quizData.english, BCOM_1ST_UNIT_TOPICS);
Object.assign(quizData.hindi, BCOM_1ST_UNIT_TOPICS);

// Add BA & B.Sc subjects with generic units (since spreadsheet has only subjects)
function addGenericUnitsForSubjects(subjectList, lang) {
  subjectList.forEach((subj) => {
    if (!quizData[lang][subj]) {
      const units = {};
      for (let i = 1; i <= 5; i++) {
        const label = lang === "english" ? `Unit ${i}` : `Unit ${i}`; // same label for both
        units[label] = [];
      }
      quizData[lang][subj] = units;
    }
  });
}

addGenericUnitsForSubjects(BA_1ST_SUBJECTS, "english");
addGenericUnitsForSubjects(BSC_1ST_SUBJECTS, "english");
addGenericUnitsForSubjects(BA_1ST_SUBJECTS, "hindi");
addGenericUnitsForSubjects(BSC_1ST_SUBJECTS, "hindi");

// COURSE / SEMESTER → SUBJECT MAPPING (spreadsheet)
const courseSemesterSubjects = {
  "B.COM.": {
    "1st": {
      english: Object.keys(BCOM_1ST_UNIT_TOPICS),
      hindi: Object.keys(BCOM_1ST_UNIT_TOPICS)
    }
    // 2nd, 4th, 6th not yet configured
  },
  "B.A.": {
    "1st": {
      english: BA_1ST_SUBJECTS,
      hindi: BA_1ST_SUBJECTS
    }
  },
  "B.Sc.": {
    "1st": {
      english: BSC_1ST_SUBJECTS,
      hindi: BSC_1ST_SUBJECTS
    }
  }
};

// GLOBAL STATE
let currentLanguage = "english";
let currentCourse = "";
let currentSemester = "";
let currentSubject = "";
let currentUnit = "";
let currentQuestionIndex = 0;
let selectedOptionIndex = null;
let questionSet = [];

// Cache questions per language/subject/unit
const savedQuestions = {
  english: {},
  hindi: {}
};

const API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // ⬅️ put your real Gemini API key
const MODEL_ID = "gemini-2.5-flash-preview-09-2025";
const NUMBER_OF_QUESTIONS = 100;

// DOM ELEMENTS
const dom = {
  langSwitchBtn: document.getElementById("language-switch-btn"),
  subjectList: document.getElementById("subject-list"),
  unitSection: document.getElementById("unit-section"),
  unitList: document.getElementById("unit-list"),
  quizContainer: document.getElementById("quiz-container"),
  welcomeMessage: document.getElementById("welcome-message"),
  loadingQuestions: document.getElementById("loading-questions"),
  questionCard: document.getElementById("question-card"),
  questionText: document.getElementById("question-text"),
  optionsContainer: document.getElementById("options-container"),
  checkAnswerBtn: document.getElementById("check-answer-btn"),
  explanationBtn: document.getElementById("explanation-btn"),
  nextQuestionBtn: document.getElementById("next-question-btn"),
  geminiAiBtn: document.getElementById("gemini-ai-btn"),
  geminiBtnText: document.getElementById("gemini-btn-text"),
  feedbackArea: document.getElementById("feedback-area"),
  resultMessage: document.getElementById("result-message"),
  explanationBlock: document.getElementById("explanation-block"),
  explanationText: document.getElementById("explanation-text"),
  geminiAnalysisBlock: document.getElementById("gemini-analysis-block"),
  geminiAnalysisContent: document.getElementById("gemini-analysis-content"),
  geminiSources: document.getElementById("gemini-sources"),
  currentUnitInfo: document.getElementById("current-unit-info"),
  questionCounter: document.getElementById("question-counter"),
  selectorTitle: document.getElementById("selector-title"),
  unitTitle: document.getElementById("unit-title"),
  geminiAnalysisHeading: document.getElementById("gemini-analysis-heading"),
  sourcesHeading: document.getElementById("sources-heading"),
  sourcesList: document.getElementById("sources-list"),

  courseSelect: document.getElementById("course-select"),
  semesterSelect: document.getElementById("semester-select"),
  courseLabel: document.getElementById("course-label"),
  semesterLabel: document.getElementById("semester-label"),
};

// UTILITY: fetch with retry
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429 && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// SUBJECT FILTERING BY COURSE + SEMESTER
function getFilteredSubjects() {
  const allSubjects = Object.keys(quizData[currentLanguage]);

  // If course or semester not chosen -> no subjects
  if (!currentCourse || !currentSemester) return [];

  const courseCfg = courseSemesterSubjects[currentCourse];
  if (!courseCfg) return [];

  const allowedList = courseCfg[currentSemester]?.[currentLanguage];
  if (!allowedList) return [];

  const cleaned = allowedList.filter(Boolean);
  if (!cleaned.length) return [];

  return cleaned.filter((subj) => allSubjects.includes(subj));
}

// QUESTION GENERATION WITH GEMINI
async function generateQuestions(subject, unit, language) {
  const isEnglish = language === "english";

  if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    dom.welcomeMessage.classList.remove("hidden");
    dom.loadingQuestions.classList.add("hidden");
    dom.questionCard.classList.add("hidden");
    dom.welcomeMessage.textContent = isEnglish
      ? "Please set your Gemini API key in the code (API_KEY constant)."
      : "कृपया कोड में अपना जेमिनी API कुंजी (API_KEY) सेट करें।";
    return;
  }

  dom.welcomeMessage.classList.add("hidden");
  dom.questionCard.classList.add("hidden");
  dom.loadingQuestions.classList.remove("hidden");

  const targetLang = isEnglish ? "English" : "Hindi";

  const systemPrompt = `You are a specialist in creating challenging and concept-based Multiple Choice Questions (MCQs) for undergraduate students.
Your task is to generate exactly ${NUMBER_OF_QUESTIONS} MCQs for the subject "${subject}" under the unit "${unit}".
Each question must have 4 distinct options and one clear correct answer.
Provide a detailed, accurate explanation for why the chosen answer is correct.
The entire response must be a valid JSON array matching the provided schema, and all text (question, options, explanation) must be in ${targetLang}.`;

  const userQuery = `Generate ${NUMBER_OF_QUESTIONS} fresh, concept-based MCQs for: Subject = ${subject}, Unit = ${unit}. Output only in ${targetLang}.`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            q: { type: "STRING" },
            options: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            ans: { type: "INTEGER" },
            exp: { type: "STRING" },
          },
          required: ["q", "options", "ans", "exp"],
        },
      },
    },
  };

  try {
    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (jsonText) {
      const parsedQuestions = JSON.parse(jsonText);
      if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
        questionSet = parsedQuestions;
        currentQuestionIndex = 0;

        if (!savedQuestions[language][subject]) {
          savedQuestions[language][subject] = {};
        }
        savedQuestions[language][subject][unit] = parsedQuestions;

        dom.loadingQuestions.classList.add("hidden");
        dom.questionCard.classList.remove("hidden");
        renderQuestion();
        return;
      }
    }
    throw new Error("Invalid or empty JSON response from API.");
  } catch (error) {
    console.error("Question Generation Error:", error);
    dom.loadingQuestions.classList.add("hidden");
    dom.welcomeMessage.classList.remove("hidden");
    dom.welcomeMessage.textContent = isEnglish
      ? `Error generating questions for ${unit}. Please check your API key or try again.`
      : `${unit} के लिए प्रश्न बनाने में त्रुटि। कृपया अपनी API कुंजी जांचें या पुनः प्रयास करें।`;
  }
}

// GEMINI ANALYSIS OF CURRENT QUESTION
async function analyzeQuestionWithGemini() {
  if (!currentSubject || !currentUnit || !questionSet.length) return;
  if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    dom.geminiAnalysisBlock.classList.remove("hidden");
    dom.geminiAnalysisContent.innerHTML =
      '<p class="text-red-600 text-sm">Please set your Gemini API key in the code (API_KEY constant).</p>';
    return;
  }

  const currentQuestion = questionSet[currentQuestionIndex];
  const questionText =
    currentQuestion.q +
    " Options: " +
    currentQuestion.options.join(", ") +
    ". Correct answer index: " +
    currentQuestion.ans;

  dom.geminiAnalysisBlock.classList.remove("hidden");
  dom.geminiAnalysisContent.innerHTML =
    '<div class="flex items-center space-x-2 text-emerald-600"><svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938ल3-2.647z"></path></svg><span>Analyzing...</span></div>';
  dom.geminiAiBtn.disabled = true;
  dom.geminiAiBtn.classList.add("opacity-50", "cursor-not-allowed");
  dom.sourcesList.innerHTML = "";
  dom.geminiSources.classList.add("hidden");

  const systemPrompt = `You are an expert tutor. Provide a concise, single-paragraph analysis of the multiple-choice question.
Explain:
1. The core concept being tested.
2. Why the correct option is correct.
3. Why the other options are incorrect.`;

  const userQuery = `Analyze this MCQ from "${currentSubject} - ${currentUnit}": ${questionText}. Respond in ${
    currentLanguage === "english" ? "English" : "Hindi"
  }.`;      

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  try {
    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const candidate = result.candidates?.[0];

    if (candidate && candidate.content?.parts?.[0]?.text) {
      const text = candidate.content.parts[0].text;
      dom.geminiAnalysisContent.innerHTML = `<p class="text-gray-700 text-sm leading-relaxed">${text}</p>`;

      let sources = [];
      const groundingMetadata =
        candidate.groundingMetadata || result.groundingMetadata;
      if (
        groundingMetadata &&
        groundingMetadata.groundingAttributions
      ) {
        sources = groundingMetadata.groundingAttributions
          .map((attribution) => ({
            uri: attribution.web?.uri,
            title: attribution.web?.title,
          }))
          .filter((source) => source.uri && source.title);
      }

      if (sources.length > 0) {
        dom.sourcesList.innerHTML = sources
          .map(
            (source) =>
              `<li><a href="${source.uri}" target="_blank" class="text-blue-500 hover:text-blue-700 underline">${source.title ||
                "Source Link"}</a></li>`
          )
          .join("");
        dom.geminiSources.classList.remove("hidden");
      }
    } else {
      dom.geminiAnalysisContent.innerHTML =
        '<p class="text-red-600 text-sm">AI analysis failed. Please try again later.</p>';
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    dom.geminiAnalysisContent.innerHTML =
      '<p class="text-red-600 text-sm">Failed to connect to the AI service. Check your network or API key.</p>';
  } finally {
    dom.geminiAiBtn.disabled = false;
    dom.geminiAiBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

// TEXTS / UI LANGUAGE
function updateTexts() {
  const isEnglish = currentLanguage === "english";
  dom.langSwitchBtn.textContent = isEnglish
    ? "हिंदी में बदलें"
    : "Switch to English";
  dom.selectorTitle.textContent = isEnglish
    ? "Select Subject"
    : "विषय चुनें";
  dom.unitTitle.textContent = isEnglish ? "Select Unit" : "इकाई चुनें";
  dom.welcomeMessage.textContent = isEnglish
    ? (currentCourse && currentSemester
        ? "Please select a subject and a unit to begin your MCQ test."
        : "Please select your course and semester to begin.")
    : (currentCourse && currentSemester
        ? "कृपया अपना MCQ परीक्षण शुरू करने के लिए विषय और इकाई चुनें।"
        : "कृपया शुरू करने के लिए पाठ्यक्रम और सेमेस्टर चुनें।");
  dom.checkAnswerBtn.textContent = isEnglish
    ? "Check Answer"
    : "उत्तर जांचें";
  dom.explanationBtn.textContent = isEnglish
    ? "Show Explanation"
    : "स्पष्टीकरण दिखाएँ";
  dom.nextQuestionBtn.textContent = isEnglish
    ? "Next Question"
    : "अगला प्रश्न";
  dom.geminiBtnText.textContent = isEnglish
    ? "Analyze with Gemini AI"
    : "जेमिनी एआई से विश्लेषण करें";
  document.getElementById("explanation-heading").textContent = isEnglish
    ? "Explanation:"
    : "स्पष्टीकरण:";
  const headingLabelSpan =
    dom.geminiAnalysisHeading.querySelector("span:last-child");
  if (headingLabelSpan) {
    headingLabelSpan.textContent = isEnglish
      ? "Gemini AI Analysis:"
      : "जेमिनी एआई विश्लेषण:";
  }
  dom.sourcesHeading.textContent = isEnglish ? "Sources:" : "स्रोत:";

  dom.courseLabel.textContent = isEnglish ? "Course" : "पाठ्यक्रम";
  dom.semesterLabel.textContent = isEnglish ? "Semester" : "सेमेस्टर";

  if (dom.courseSelect && dom.courseSelect.options.length > 0) {
    dom.courseSelect.options[0].text = isEnglish
      ? "Select course"
      : "पाठ्यक्रम चुनें";
  }
  if (dom.semesterSelect && dom.semesterSelect.options.length > 0) {
    dom.semesterSelect.options[0].text = isEnglish
      ? "Select semester"
      : "सेमेस्टर चुनें";
  }
}

// RENDER SUBJECTS / UNITS
function renderSubjects() {
  const subjects = getFilteredSubjects();

  dom.subjectList.innerHTML = "";
  dom.unitSection.classList.add("hidden");
  dom.questionCard.classList.add("hidden");
  dom.loadingQuestions.classList.add("hidden");

  // If course/semester not selected at all
  if (!currentCourse || !currentSemester) {
    dom.welcomeMessage.classList.remove("hidden");
    dom.welcomeMessage.textContent =
      currentLanguage === "english"
        ? "Please select your course and semester to begin."
        : "कृपया शुरू करने के लिए पाठ्यक्रम और सेमेस्टर चुनें।";
    return;
  }

  // If no subjects configured for this course+semester
  if (!subjects.length) {
    dom.welcomeMessage.classList.remove("hidden");
    dom.welcomeMessage.textContent =
      currentLanguage === "english"
        ? "No subjects are configured yet for this course and semester."
        : "इस पाठ्यक्रम और सेमेस्टर के लिए अभी कोई विषय जोड़ा नहीं गया है।";
    return;
  }

  // Normal case: show subjects
  dom.welcomeMessage.classList.remove("hidden");
  dom.welcomeMessage.textContent =
    currentLanguage === "english"
      ? "Please select a subject and a unit to begin your MCQ test."
      : "कृपया अपना MCQ परीक्षण शुरू करने के लिए विषय और इकाई चुनें।";

  subjects.forEach((subject) => {
    const isActive = subject === currentSubject;
    const button = document.createElement("button");
    button.textContent = subject;
    button.className =
      "w-full text-left py-2 px-4 rounded-lg font-medium transition duration-150 " +
      (isActive
        ? "bg-indigo-500 text-white shadow-md"
        : "bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-600");
    button.onclick = () => selectSubject(subject);
    dom.subjectList.appendChild(button);
  });

  if (currentSubject) {
    dom.welcomeMessage.classList.add("hidden");
    dom.unitSection.classList.remove("hidden");
    renderUnits(currentSubject);
  }
}

function renderUnits(subject) {
  const units = Object.keys(quizData[currentLanguage][subject]);
  dom.unitList.innerHTML = "";

  units.forEach((unit) => {
    const isActive = unit === currentUnit;
    const button = document.createElement("button");
    button.textContent = unit;
    button.className =
      "w-full md:w-auto text-left py-2 px-4 rounded-lg text-sm transition duration-150 " +
      (isActive
        ? "bg-indigo-400 text-white shadow-sm"
        : "bg-white border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-500");
    button.onclick = () => selectUnit(unit);
    dom.unitList.appendChild(button);
  });

  if (currentUnit && questionSet.length > 0) {
    dom.questionCard.classList.remove("hidden");
    renderQuestion();
  }
}

function renderQuestion() {
  if (questionSet.length === 0) return;

  const qData = questionSet[currentQuestionIndex];
  const isEnglish = currentLanguage === "english";
  const totalQuestions = questionSet.length;

  selectedOptionIndex = null;
  dom.resultMessage.classList.add("hidden");
  dom.explanationBlock.classList.add("hidden");
  dom.nextQuestionBtn.classList.add("hidden");
  dom.checkAnswerBtn.classList.remove("hidden");
  dom.explanationBtn.classList.add("hidden");
  dom.checkAnswerBtn.disabled = true;
  dom.checkAnswerBtn.classList.add("opacity-50", "cursor-not-allowed");
  dom.geminiAnalysisBlock.classList.add("hidden");
  dom.geminiAiBtn.disabled = false;
  dom.geminiAiBtn.classList.remove("opacity-50", "cursor-not-allowed");

  dom.currentUnitInfo.textContent = `${currentSubject} / ${currentUnit}`;
  dom.questionCounter.textContent = isEnglish
    ? `Question ${currentQuestionIndex + 1} of ${totalQuestions}`
    : `प्रश्न ${currentQuestionIndex + 1} / ${totalQuestions}`;
  dom.questionText.textContent = qData.q;
  dom.optionsContainer.innerHTML = "";

  qData.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.dataset.index = index;
    button.className =
      "option-button w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-gray-800 transition duration-150";
    button.onclick = handleOptionSelection;
    dom.optionsContainer.appendChild(button);
  });
}

function handleOptionSelection(event) {
  const allOptions = dom.optionsContainer.querySelectorAll(".option-button");
  const clickedButton = event.target.closest(".option-button");
  if (!clickedButton) return;

  allOptions.forEach((btn) =>
    btn.classList.remove(
      "selected-option",
      "correct-answer",
      "incorrect-answer",
      "font-bold"
    )
  );
  clickedButton.classList.add("selected-option");

  selectedOptionIndex = parseInt(clickedButton.dataset.index, 10);
  dom.checkAnswerBtn.disabled = false;
  dom.checkAnswerBtn.classList.remove("opacity-50", "cursor-not-allowed");
}

function checkAnswer() {
  if (selectedOptionIndex === null) return;

  const currentQuestion = questionSet[currentQuestionIndex];
  const correctIndex = currentQuestion.ans;
  const isCorrect = selectedOptionIndex === correctIndex;
  const options = dom.optionsContainer.querySelectorAll(".option-button");
  const isEnglish = currentLanguage === "english";

  options.forEach((btn) => (btn.onclick = null));
  dom.checkAnswerBtn.classList.add("hidden");
  dom.explanationBtn.classList.remove("hidden");

  const correctText = currentQuestion.options[correctIndex];
  const yourText = currentQuestion.options[selectedOptionIndex];

  dom.resultMessage.classList.remove(
    "hidden",
    "bg-red-100",
    "bg-green-100",
    "text-red-800",
    "text-green-800"
  );
  if (isCorrect) {
    dom.resultMessage.classList.add("bg-green-100", "text-green-800");
    dom.resultMessage.textContent =
      (isEnglish
        ? "Result: Correct Answer! 🎉 "
        : "परिणाम: सही उत्तर! 🎉 ") +
      (isEnglish
        ? `Correct option: ${correctText}`
        : `सही विकल्प: ${correctText}`);
  } else {
    dom.resultMessage.classList.add("bg-red-100", "text-red-800");
    dom.resultMessage.textContent =
      (isEnglish
        ? "Result: Incorrect. "
        : "परिणाम: गलत। ") +
      (isEnglish
        ? `Your answer: ${yourText} | Correct option: ${correctText}`
        : `आपका उत्तर: ${yourText} | सही विकल्प: ${correctText}`);
  }

  options.forEach((btn, index) => {
    btn.classList.remove("selected-option");
    if (index === correctIndex) {
      btn.classList.add("correct-answer", "font-bold");
    } else if (index === selectedOptionIndex && !isCorrect) {
      btn.classList.add("incorrect-answer", "font-bold");
    }
  });

  dom.nextQuestionBtn.classList.remove("hidden");
}

function showExplanation() {
  const currentQuestion = questionSet[currentQuestionIndex];
  dom.explanationText.textContent = currentQuestion.exp;
  dom.explanationBlock.classList.toggle("hidden");
  dom.explanationBtn.textContent = dom.explanationBlock.classList.contains(
    "hidden"
  )
    ? currentLanguage === "english"
      ? "Show Explanation"
      : "स्पष्टीकरण दिखाएँ"
    : currentLanguage === "english"
    ? "Hide Explanation"
    : "स्पष्टीकरण छिपाएँ";
}

// CONTROLLERS
function selectSubject(subject) {
  currentSubject = subject;
  currentUnit = "";
  questionSet = [];
  renderSubjects();
  dom.unitSection.classList.remove("hidden");
  dom.questionCard.classList.add("hidden");
}

function selectUnit(unit) {
  if (currentUnit === unit && questionSet.length > 0) return;

  currentUnit = unit;

  const cached =
    savedQuestions[currentLanguage]?.[currentSubject]?.[currentUnit];

  if (cached && cached.length) {
    questionSet = cached;
    if (currentQuestionIndex >= questionSet.length) {
      currentQuestionIndex = 0;
    }
    dom.welcomeMessage.classList.add("hidden");
    dom.loadingQuestions.classList.add("hidden");
    dom.questionCard.classList.remove("hidden");
    renderQuestion();
  } else {
    questionSet = [];
    dom.questionCard.classList.add("hidden");
    generateQuestions(currentSubject, currentUnit, currentLanguage);
  }
}

function goToNextQuestion() {
  dom.resultMessage.classList.add("hidden");
  dom.explanationBlock.classList.add("hidden");
  dom.geminiAnalysisBlock.classList.add("hidden");
  dom.nextQuestionBtn.classList.add("hidden");

  if (currentQuestionIndex < questionSet.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    dom.questionCard.classList.add("hidden");
    dom.welcomeMessage.classList.remove("hidden");
    dom.welcomeMessage.textContent =
      currentLanguage === "english"
        ? `You have completed Unit ${currentUnit} of ${currentSubject}! Select another unit or subject to generate a new test.`
        : `आपने ${currentSubject} की इकाई ${currentUnit} पूरी कर ली है! नया टेस्ट जनरेट करने के लिए कोई अन्य इकाई या विषय चुनें।`;
    currentUnit = "";
    questionSet = [];
    renderSubjects();
  }
}

function toggleLanguage() {
  const wasQuestionVisible =
    !dom.questionCard.classList.contains("hidden") &&
    questionSet.length > 0;

  currentLanguage =
    currentLanguage === "english" ? "hindi" : "english";

  updateTexts();
  // Re-render subjects & units but keep same course/semester/subject/unit
  renderSubjects();

  if (currentSubject) {
    dom.unitSection.classList.remove("hidden");
    renderUnits(currentSubject);
  }

  if (wasQuestionVisible && currentSubject && currentUnit) {
    const cached =
      savedQuestions[currentLanguage]?.[currentSubject]?.[currentUnit];

    if (cached && cached.length) {
      questionSet = cached;
      if (currentQuestionIndex >= questionSet.length) {
        currentQuestionIndex = 0;
      }
      dom.welcomeMessage.classList.add("hidden");
      dom.questionCard.classList.remove("hidden");
      renderQuestion();
    } else {
      questionSet = [];
      dom.questionCard.classList.add("hidden");
      generateQuestions(currentSubject, currentUnit, currentLanguage);
    }
  }
}

// EVENT LISTENERS
dom.langSwitchBtn.addEventListener("click", toggleLanguage);
dom.checkAnswerBtn.addEventListener("click", checkAnswer);
dom.nextQuestionBtn.addEventListener("click", goToNextQuestion);
dom.explanationBtn.addEventListener("click", showExplanation);
dom.geminiAiBtn.addEventListener("click", analyzeQuestionWithGemini);

dom.courseSelect.addEventListener("change", () => {
  currentCourse = dom.courseSelect.value;
  currentSubject = "";
  currentUnit = "";
  questionSet = [];
  renderSubjects();
});

dom.semesterSelect.addEventListener("change", () => {
  currentSemester = dom.semesterSelect.value;
  currentSubject = "";
  currentUnit = "";
  questionSet = [];
  renderSubjects();
});

// INIT
(function init() {
  updateTexts();
  renderSubjects(); // will show "select course & semester" and NO prefilled subjects
})();