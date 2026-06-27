import "./styles.css";
import mammoth from "mammoth/mammoth.browser";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import Tesseract from "tesseract.js/dist/tesseract.esm.min.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

document.querySelector("#app").innerHTML = `
  <main class="app-shell">
    <section class="workspace" aria-label="Legal contract simplifier">
      <header class="topbar">
        <div>
          <p class="eyebrow">AI-powered legal help</p>
          <h1>Contract Simplifier</h1>
        </div>
        <div class="status-pill" id="supportStatus">Voice ready</div>
      </header>

      <section class="control-strip" aria-label="Output settings">
        <label>
          Language
          <select id="languageSelect">
            <option value="en-IN">English</option>
            <option value="hi-IN">Hindi</option>
            <option value="kn-IN">Kannada</option>
            <option value="ta-IN">Tamil</option>
            <option value="te-IN">Telugu</option>
            <option value="ml-IN">Malayalam</option>
          </select>
        </label>
        <label>
          Tone
          <select id="toneSelect">
            <option value="simple">Simple</option>
            <option value="student">Student friendly</option>
            <option value="voice">Voice explanation</option>
          </select>
        </label>
        <label>
          Detail
          <input id="detailRange" type="range" min="1" max="3" value="2" />
        </label>
      </section>

      <div class="panels">
        <section class="panel input-panel">
          <div class="panel-heading">
            <div>
              <h2>Original legal text</h2>
              <p>Paste app rules, privacy policy, contract clauses, or terms and conditions.</p>
            </div>
            <button class="icon-button" id="micButton" type="button" title="Record voice input" aria-label="Record voice input">
              mic
            </button>
          </div>

          <textarea id="legalInput" spellcheck="true" placeholder="Paste legal content here..."></textarea>

          <div class="upload-zone" id="uploadZone">
            <input id="fileInput" type="file" accept=".txt,.md,.text,image/*,.pdf,.doc,.docx" />
            <div>
              <strong>Upload document or screenshot</strong>
              <span id="fileHelp">Text files are read in-browser. Screenshots and PDFs are previewed for prototype use.</span>
            </div>
          </div>

          <div class="actions">
            <button id="sampleButton" type="button" class="secondary">Use sample</button>
            <button id="clearButton" type="button" class="secondary">Clear</button>
            <button id="simplifyButton" type="button" class="primary">Simplify</button>
          </div>
        </section>

        <section class="panel output-panel" aria-live="polite">
          <div class="panel-heading">
            <div>
              <h2>Simplified explanation</h2>
              <p>Plain-language meaning, important risks, and suggested questions.</p>
            </div>
            <button class="icon-button" id="speakButton" type="button" title="Listen to explanation" aria-label="Listen to explanation">
              play
            </button>
          </div>

          <div class="result-stack">
            <article>
              <h3 id="summaryTitle">Simple summary</h3>
              <p id="summaryText">Your simplified contract explanation will appear here.</p>
            </article>
            <article>
              <h3 id="riskTitle">Important points</h3>
              <ul id="riskList">
                <li>Paste legal content and press Simplify.</li>
              </ul>
            </article>
            <article>
              <h3 id="questionsTitle">Questions to ask</h3>
              <ul id="questionList">
                <li>Which part of this agreement affects me the most?</li>
              </ul>
            </article>
          </div>
        </section>
      </div>

      <section class="preview-row">
        <div class="metric">
          <span id="wordCount">0</span>
          <strong>words scanned</strong>
        </div>
        <div class="metric">
          <span id="riskCount">0</span>
          <strong>risk signals</strong>
        </div>
        <div class="metric">
          <span id="readingLevel">-</span>
          <strong>reading effort</strong>
        </div>
      </section>
    </section>
  </main>
`;

const legalInput = document.querySelector("#legalInput");
const simplifyButton = document.querySelector("#simplifyButton");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");
const micButton = document.querySelector("#micButton");
const speakButton = document.querySelector("#speakButton");
const languageSelect = document.querySelector("#languageSelect");
const toneSelect = document.querySelector("#toneSelect");
const detailRange = document.querySelector("#detailRange");
const fileInput = document.querySelector("#fileInput");
const fileHelp = document.querySelector("#fileHelp");
const supportStatus = document.querySelector("#supportStatus");
const summaryText = document.querySelector("#summaryText");
const riskList = document.querySelector("#riskList");
const questionList = document.querySelector("#questionList");
const wordCount = document.querySelector("#wordCount");
const riskCount = document.querySelector("#riskCount");
const readingLevel = document.querySelector("#readingLevel");
const summaryTitle = document.querySelector("#summaryTitle");
const riskTitle = document.querySelector("#riskTitle");
const questionsTitle = document.querySelector("#questionsTitle");

const labels = {
  "en-IN": {
    summary: "Simple summary",
    risks: "Important points",
    questions: "Questions to ask",
    intro: "In simple words:",
    warning: "Please check this carefully:",
    fallback: "This text looks short. Add more contract or policy content for a better explanation."
  },
  "hi-IN": {
    summary: "सरल सारांश",
    risks: "महत्वपूर्ण बातें",
    questions: "पूछने योग्य सवाल",
    intro: "सरल भाषा में:",
    warning: "इसे ध्यान से जांचें:",
    fallback: "यह पाठ छोटा है। बेहतर समझ के लिए अधिक नियम या अनुबंध जोड़ें।"
  },
  "kn-IN": {
    summary: "ಸರಳ ಸಾರಾಂಶ",
    risks: "ಮುಖ್ಯ ಅಂಶಗಳು",
    questions: "ಕೇಳಬೇಕಾದ ಪ್ರಶ್ನೆಗಳು",
    intro: "ಸರಳವಾಗಿ ಹೇಳುವುದಾದರೆ:",
    warning: "ಇದನ್ನು ಗಮನದಿಂದ ಪರಿಶೀಲಿಸಿ:",
    fallback: "ಈ ಪಠ್ಯ ಚಿಕ್ಕದಾಗಿದೆ. ಉತ್ತಮ ವಿವರಣೆಗಾಗಿ ಹೆಚ್ಚಿನ ಒಪ್ಪಂದದ ಪಠ್ಯ ಸೇರಿಸಿ."
  },
  "ta-IN": {
    summary: "எளிய சுருக்கம்",
    risks: "முக்கிய அம்சங்கள்",
    questions: "கேட்க வேண்டிய கேள்விகள்",
    intro: "எளிய வார்த்தைகளில்:",
    warning: "இதைக் கவனமாக பார்க்கவும்:",
    fallback: "இந்த உரை குறைவாக உள்ளது. நல்ல விளக்கத்திற்கு மேலும் ஒப்பந்த உரையை சேர்க்கவும்."
  },
  "te-IN": {
    summary: "సులభ సారాంశం",
    risks: "ముఖ్య విషయాలు",
    questions: "అడగాల్సిన ప్రశ్నలు",
    intro: "సులభంగా చెప్పాలంటే:",
    warning: "దీనిని జాగ్రత్తగా చూడండి:",
    fallback: "ఈ పాఠ్యం చిన్నది. మెరుగైన వివరణ కోసం మరిన్ని ఒప్పంద వివరాలు జోడించండి."
  },
  "ml-IN": {
    summary: "ലളിതമായ സംഗ്രഹം",
    risks: "പ്രധാന കാര്യങ്ങൾ",
    questions: "ചോദിക്കേണ്ട ചോദ്യങ്ങൾ",
    intro: "ലളിതമായി പറഞ്ഞാൽ:",
    warning: "ഇത് ശ്രദ്ധിച്ച് പരിശോധിക്കുക:",
    fallback: "ഈ എഴുത്ത് ചെറിയതാണ്. നല്ല വിശദീകരണത്തിനായി കൂടുതൽ കരാർ വിവരങ്ങൾ ചേർക്കുക."
  }
};

const riskSignals = [
  {
    terms: ["share your data", "third party", "affiliates", "partners", "sell", "advertising"],
    simple: "Your data may be shared with another company or used for advertising."
  },
  {
    terms: ["automatically renew", "auto-renew", "recurring", "subscription renews"],
    simple: "Payment or subscription may continue automatically unless you cancel."
  },
  {
    terms: ["not liable", "limited liability", "no responsibility", "as is"],
    simple: "The company may be limiting responsibility if something goes wrong."
  },
  {
    terms: ["terminate", "suspend", "disable your account", "remove access"],
    simple: "Your account or access can be stopped under certain conditions."
  },
  {
    terms: ["location", "cookies", "tracking", "device information", "usage data"],
    simple: "The service may collect details about your device, location, or activity."
  },
  {
    terms: ["arbitration", "jurisdiction", "governing law", "class action", "dispute"],
    simple: "If there is a legal problem, the rules may decide where and how you can complain."
  }
];

const sample = `By using this application, you agree that we may collect usage data, device information, location details, and cookies to improve our services and provide personalized advertising. We may share your information with affiliates, service providers, and business partners. Your subscription will automatically renew each month unless cancelled before the renewal date. We are not liable for indirect damages, loss of data, or service interruptions. We may suspend or terminate your account if you violate these terms. Any dispute will be resolved by arbitration under the governing law stated in this agreement.`;

let lastSpokenText = "";
let isReadingFile = false;

function getLabel() {
  return labels[languageSelect.value] || labels["en-IN"];
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function detectRisks(text) {
  const lower = text.toLowerCase();
  return riskSignals.filter((signal) => signal.terms.some((term) => lower.includes(term)));
}

function estimateReadingEffort(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 20) return "-";

  const longWords = words.filter((word) => word.length > 10).length;
  const score = longWords / words.length;

  if (score > 0.16) return "High";
  if (score > 0.08) return "Medium";
  return "Low";
}

function makeSummary(text, risks) {
  const currentLabels = getLabel();
  const sentences = splitSentences(text);
  const detail = Number(detailRange.value);
  const selected = sentences.slice(0, detail + 1);

  if (!text.trim() || text.trim().split(/\s+/).length < 12) {
    return currentLabels.fallback;
  }

  const simplified = selected.map((sentence) => {
    return sentence
      .replace(/\bhereinafter\b/gi, "from now on")
      .replace(/\bnotwithstanding\b/gi, "even if")
      .replace(/\bpursuant to\b/gi, "under")
      .replace(/\bterminate\b/gi, "end")
      .replace(/\bliable\b/gi, "responsible")
      .replace(/\bjurisdiction\b/gi, "legal area")
      .replace(/\baffiliates\b/gi, "related companies");
  });

  const riskSentence = risks.length
    ? ` ${currentLabels.warning} ${risks.map((risk) => risk.simple).join(" ")}`
    : " No major risk signal was found by this prototype, but important legal rights may still be present.";

  const tonePrefix =
    toneSelect.value === "student"
      ? "Imagine you are reading this before clicking I Agree. "
      : toneSelect.value === "voice"
        ? "Here is the spoken-style explanation. "
        : "";

  return `${currentLabels.intro} ${tonePrefix}${simplified.join(" ")}${riskSentence}`;
}

function renderList(target, items) {
  target.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function simplify() {
  const text = legalInput.value;
  const risks = detectRisks(text);
  const currentLabels = getLabel();
  const words = text.trim().split(/\s+/).filter(Boolean);

  summaryTitle.textContent = currentLabels.summary;
  riskTitle.textContent = currentLabels.risks;
  questionsTitle.textContent = currentLabels.questions;
  summaryText.textContent = makeSummary(text, risks);

  const riskItems = risks.length
    ? risks.map((risk) => risk.simple)
    : ["No obvious high-risk phrase was detected. Still review payment, privacy, cancellation, and dispute terms."];

  const questionItems = [
    "What data is collected, and who receives it?",
    "Can I cancel, delete my account, or remove my data easily?",
    "What happens if the service makes a mistake or stops working?"
  ];

  renderList(riskList, riskItems);
  renderList(questionList, questionItems);

  wordCount.textContent = String(words.length);
  riskCount.textContent = String(risks.length);
  readingLevel.textContent = estimateReadingEffort(text);
  lastSpokenText = `${summaryText.textContent}. ${riskItems.join(". ")}. ${questionItems.join(". ")}`;
}

function speak() {
  if (!("speechSynthesis" in window)) {
    supportStatus.textContent = "Speech unavailable";
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(lastSpokenText || summaryText.textContent);
  utterance.lang = languageSelect.value;
  utterance.rate = 0.9;

  window.speechSynthesis.speak(utterance);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    supportStatus.textContent = "Voice input limited";
    micButton.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = languageSelect.value;

  micButton.addEventListener("click", () => {
    recognition.lang = languageSelect.value;
    supportStatus.textContent = "Listening...";
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");

    legalInput.value = `${legalInput.value} ${transcript}`.trim();
    supportStatus.textContent = "Voice captured";
    simplify();
  });

  recognition.addEventListener("end", () => {
    if (supportStatus.textContent === "Listening...") {
      supportStatus.textContent = "Voice ready";
    }
  });
}

function setFileLoading(message) {
  isReadingFile = true;
  simplifyButton.disabled = true;
  fileHelp.textContent = message;
  supportStatus.textContent = "Reading file...";
}

function clearFileLoading(message) {
  isReadingFile = false;
  simplifyButton.disabled = false;
  fileHelp.textContent = message;
  supportStatus.textContent = "File loaded";
}

function getFileExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

function getOcrLanguage() {
  const languageMap = {
    "en-IN": "eng",
    "hi-IN": "hin",
    "kn-IN": "kan",
    "ta-IN": "tam",
    "te-IN": "tel",
    "ml-IN": "mal"
  };

  return languageMap[languageSelect.value] || "eng";
}

async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractImageText(file) {
    const worker = await Tesseract.createWorker(getOcrLanguage());

  try {
    const result = await worker.recognize(file);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromFile(file) {
  const extension = getFileExtension(file.name);

  if (file.type.startsWith("text/") || ["txt", "md", "text"].includes(extension)) {
    return file.text();
  }

  if (extension === "pdf" || file.type === "application/pdf") {
    return extractPdfText(file);
  }

  if (extension === "docx") {
    return extractDocxText(file);
  }

  if (file.type.startsWith("image/")) {
    return extractImageText(file);
  }

  throw new Error("Unsupported file type. Please upload TXT, PDF, DOCX, or an image screenshot.");
}

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    setFileLoading(`Extracting text from ${file.name}...`);
    const extractedText = await extractTextFromFile(file);
    const cleanedText = extractedText.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();

    if (!cleanedText) {
      throw new Error("No readable text was found in this file.");
    }

    legalInput.value = cleanedText;
    clearFileLoading(`${file.name} loaded and simplified.`);
    simplify();
  } catch (error) {
    isReadingFile = false;
    simplifyButton.disabled = false;
    supportStatus.textContent = "Upload failed";
    fileHelp.textContent = error.message;
  }
});

sampleButton.addEventListener("click", () => {
  legalInput.value = sample;
  simplify();
});

clearButton.addEventListener("click", () => {
  legalInput.value = "";
  fileInput.value = "";
  fileHelp.textContent = "Text files are read in-browser. Screenshots and PDFs are previewed for prototype use.";
  simplify();
});

simplifyButton.addEventListener("click", simplify);
simplifyButton.addEventListener("click", () => {
  if (isReadingFile) {
    fileHelp.textContent = "Please wait until the uploaded file finishes processing.";
  }
});
speakButton.addEventListener("click", speak);
languageSelect.addEventListener("change", simplify);
detailRange.addEventListener("input", simplify);
toneSelect.addEventListener("change", simplify);

legalInput.addEventListener("input", () => {
  const words = legalInput.value.trim().split(/\s+/).filter(Boolean);
  wordCount.textContent = String(words.length);
  readingLevel.textContent = estimateReadingEffort(legalInput.value);
});

setupSpeechRecognition();
simplify();
