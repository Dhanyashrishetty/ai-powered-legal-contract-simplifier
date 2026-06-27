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
    fallback: "This text looks short. Add more contract or policy content for a better explanation.",
    noRisk: "No obvious high-risk phrase was detected. Still review payment, privacy, cancellation, and dispute terms.",
    summaryBase: "This document contains rules you may be agreeing to. It can affect your data, account, payments, and legal rights.",
    summaryRisk: "The most important parts found are:",
    noRiskSummary: "No major risk signal was found by this prototype, but important legal rights may still be present.",
    studentTone: "Imagine you are reading this before clicking I Agree.",
    voiceTone: "Here is the spoken-style explanation.",
    questionsList: [
      "What data is collected, and who receives it?",
      "Can I cancel, delete my account, or remove my data easily?",
      "What happens if the service makes a mistake or stops working?"
    ]
  },
  "hi-IN": {
    summary: "सरल सारांश",
    risks: "महत्वपूर्ण बातें",
    questions: "पूछने योग्य सवाल",
    intro: "सरल भाषा में:",
    warning: "इसे ध्यान से जांचें:",
    fallback: "यह पाठ छोटा है। बेहतर समझ के लिए अधिक नियम या अनुबंध जोड़ें।",
    noRisk: "कोई स्पष्ट बड़ा जोखिम वाला वाक्य नहीं मिला। फिर भी भुगतान, गोपनीयता, रद्द करने और विवाद से जुड़े नियम जरूर देखें।",
    summaryBase: "इस दस्तावेज़ में वे नियम हैं जिन्हें आप स्वीकार कर सकते हैं। यह आपके डेटा, खाते, भुगतान और कानूनी अधिकारों को प्रभावित कर सकता है।",
    summaryRisk: "सबसे महत्वपूर्ण बातें ये हैं:",
    noRiskSummary: "इस प्रोटोटाइप को कोई बड़ा जोखिम संकेत नहीं मिला, लेकिन महत्वपूर्ण कानूनी अधिकार फिर भी हो सकते हैं।",
    studentTone: "इसे ऐसे समझें जैसे आप I Agree दबाने से पहले पढ़ रहे हैं।",
    voiceTone: "यह सुनने लायक सरल व्याख्या है।",
    questionsList: [
      "कौन सा डेटा लिया जा रहा है और वह किसके साथ साझा होगा?",
      "क्या मैं अपना खाता रद्द कर सकता/सकती हूं या अपना डेटा हटवा सकता/सकती हूं?",
      "अगर सेवा में गलती होती है या सेवा बंद होती है तो क्या होगा?"
    ]
  },
  "kn-IN": {
    summary: "ಸರಳ ಸಾರಾಂಶ",
    risks: "ಮುಖ್ಯ ಅಂಶಗಳು",
    questions: "ಕೇಳಬೇಕಾದ ಪ್ರಶ್ನೆಗಳು",
    intro: "ಸರಳವಾಗಿ ಹೇಳುವುದಾದರೆ:",
    warning: "ಇದನ್ನು ಗಮನದಿಂದ ಪರಿಶೀಲಿಸಿ:",
    fallback: "ಈ ಪಠ್ಯ ಚಿಕ್ಕದಾಗಿದೆ. ಉತ್ತಮ ವಿವರಣೆಗಾಗಿ ಹೆಚ್ಚಿನ ಒಪ್ಪಂದದ ಪಠ್ಯ ಸೇರಿಸಿ.",
    noRisk: "ಸ್ಪಷ್ಟವಾದ ದೊಡ್ಡ ಅಪಾಯದ ವಾಕ್ಯ ಕಂಡುಬಂದಿಲ್ಲ. ಆದರೂ ಪಾವತಿ, ಗೌಪ್ಯತೆ, ರದ್ದುಪಡಿಸುವಿಕೆ ಮತ್ತು ವಿವಾದದ ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    summaryBase: "ಈ ದಸ್ತಾವೇಜಿನಲ್ಲಿ ನೀವು ಒಪ್ಪಿಕೊಳ್ಳಬಹುದಾದ ನಿಯಮಗಳಿವೆ. ಇದು ನಿಮ್ಮ ಡೇಟಾ, ಖಾತೆ, ಪಾವತಿ ಮತ್ತು ಕಾನೂನು ಹಕ್ಕುಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುತ್ತದೆ.",
    summaryRisk: "ಕಂಡುಬಂದ ಪ್ರಮುಖ ಅಂಶಗಳು:",
    noRiskSummary: "ಈ ಪ್ರೋಟೋಟೈಪ್‌ಗೆ ದೊಡ್ಡ ಅಪಾಯದ ಸೂಚನೆ ಕಂಡುಬಂದಿಲ್ಲ, ಆದರೆ ಪ್ರಮುಖ ಕಾನೂನು ಹಕ್ಕುಗಳು ಇನ್ನೂ ಇರಬಹುದು.",
    studentTone: "I Agree ಒತ್ತುವ ಮೊದಲು ಓದುತ್ತಿದ್ದೀರಿ ಎಂದು ಕಲ್ಪಿಸಿ.",
    voiceTone: "ಇದು ಕೇಳಲು ಸರಳವಾದ ವಿವರಣೆ.",
    questionsList: [
      "ಯಾವ ಡೇಟಾವನ್ನು ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ಅದನ್ನು ಯಾರಿಗೆ ಹಂಚಲಾಗುತ್ತದೆ?",
      "ನಾನು ಖಾತೆಯನ್ನು ರದ್ದುಪಡಿಸಬಹುದೇ ಅಥವಾ ನನ್ನ ಡೇಟಾವನ್ನು ಅಳಿಸಬಹುದೇ?",
      "ಸೇವೆಯಲ್ಲಿ ತಪ್ಪು ಆದರೆ ಅಥವಾ ಸೇವೆ ನಿಂತರೆ ಏನಾಗುತ್ತದೆ?"
    ]
  },
  "ta-IN": {
    summary: "எளிய சுருக்கம்",
    risks: "முக்கிய அம்சங்கள்",
    questions: "கேட்க வேண்டிய கேள்விகள்",
    intro: "எளிய வார்த்தைகளில்:",
    warning: "இதைக் கவனமாக பார்க்கவும்:",
    fallback: "இந்த உரை குறைவாக உள்ளது. நல்ல விளக்கத்திற்கு மேலும் ஒப்பந்த உரையை சேர்க்கவும்.",
    noRisk: "தெளிவான பெரிய ஆபத்து சொல்லாக்கம் கண்டுபிடிக்கப்படவில்லை. இருந்தாலும் கட்டணம், தனியுரிமை, ரத்து செய்தல் மற்றும் வழக்கு விதிகளை பார்க்கவும்.",
    summaryBase: "இந்த ஆவணத்தில் நீங்கள் ஒப்புக்கொள்ளக்கூடிய விதிகள் உள்ளன. இது உங்கள் தரவு, கணக்கு, கட்டணம் மற்றும் சட்ட உரிமைகளை பாதிக்கலாம்.",
    summaryRisk: "கண்டறியப்பட்ட முக்கிய அம்சங்கள்:",
    noRiskSummary: "இந்த மாதிரி பெரிய ஆபத்து சைகையை கண்டுபிடிக்கவில்லை, ஆனால் முக்கியமான சட்ட உரிமைகள் இருக்கலாம்.",
    studentTone: "I Agree அழுத்துவதற்கு முன் இதை படிக்கிறீர்கள் என்று நினைத்து பாருங்கள்.",
    voiceTone: "இது கேட்பதற்கான எளிய விளக்கம்.",
    questionsList: [
      "எந்த தரவு சேகரிக்கப்படுகிறது, அது யாருடன் பகிரப்படுகிறது?",
      "நான் கணக்கை ரத்து செய்யலாமா அல்லது என் தரவை நீக்கலாமா?",
      "சேவையில் தவறு நடந்தால் அல்லது சேவை நிறுத்தப்பட்டால் என்ன ஆகும்?"
    ]
  },
  "te-IN": {
    summary: "సులభ సారాంశం",
    risks: "ముఖ్య విషయాలు",
    questions: "అడగాల్సిన ప్రశ్నలు",
    intro: "సులభంగా చెప్పాలంటే:",
    warning: "దీనిని జాగ్రత్తగా చూడండి:",
    fallback: "ఈ పాఠ్యం చిన్నది. మెరుగైన వివరణ కోసం మరిన్ని ఒప్పంద వివరాలు జోడించండి.",
    noRisk: "స్పష్టమైన పెద్ద ప్రమాద సూచన కనిపించలేదు. అయినా చెల్లింపు, గోప్యత, రద్దు మరియు వివాద నియమాలను పరిశీలించండి.",
    summaryBase: "ఈ పత్రంలో మీరు అంగీకరించే నియమాలు ఉండొచ్చు. ఇది మీ డేటా, ఖాతా, చెల్లింపులు మరియు చట్టపరమైన హక్కులను ప్రభావితం చేయవచ్చు.",
    summaryRisk: "గుర్తించిన ముఖ్యమైన విషయాలు:",
    noRiskSummary: "ఈ ప్రోటోటైప్‌కు పెద్ద ప్రమాద సూచన కనిపించలేదు, కానీ ముఖ్యమైన చట్టపరమైన హక్కులు ఉండవచ్చు.",
    studentTone: "I Agree నొక్కే ముందు చదువుతున్నట్టు దీన్ని అర్థం చేసుకోండి.",
    voiceTone: "ఇది వినడానికి సరళమైన వివరణ.",
    questionsList: [
      "ఏ డేటాను సేకరిస్తారు, దాన్ని ఎవరితో పంచుకుంటారు?",
      "నేను నా ఖాతాను రద్దు చేయగలనా లేదా నా డేటాను తొలగించగలనా?",
      "సేవలో తప్పు జరిగితే లేదా సేవ ఆగితే ఏమవుతుంది?"
    ]
  },
  "ml-IN": {
    summary: "ലളിതമായ സംഗ്രഹം",
    risks: "പ്രധാന കാര്യങ്ങൾ",
    questions: "ചോദിക്കേണ്ട ചോദ്യങ്ങൾ",
    intro: "ലളിതമായി പറഞ്ഞാൽ:",
    warning: "ഇത് ശ്രദ്ധിച്ച് പരിശോധിക്കുക:",
    fallback: "ഈ എഴുത്ത് ചെറിയതാണ്. നല്ല വിശദീകരണത്തിനായി കൂടുതൽ കരാർ വിവരങ്ങൾ ചേർക്കുക.",
    noRisk: "വ്യക്തമായ വലിയ അപകട സൂചന കണ്ടെത്തിയില്ല. എങ്കിലും പണമടയ്ക്കൽ, സ്വകാര്യത, റദ്ദാക്കൽ, തർക്ക നിയമങ്ങൾ പരിശോധിക്കുക.",
    summaryBase: "ഈ രേഖയിൽ നിങ്ങൾ സമ്മതിക്കുന്ന നിയമങ്ങൾ ഉണ്ടായിരിക്കാം. ഇത് നിങ്ങളുടെ ഡാറ്റ, അക്കൗണ്ട്, പണം, നിയമാവകാശങ്ങൾ എന്നിവയെ ബാധിക്കാം.",
    summaryRisk: "കണ്ടെത്തിയ പ്രധാന കാര്യങ്ങൾ:",
    noRiskSummary: "ഈ പ്രോട്ടോടൈപ്പ് വലിയ അപകട സൂചന കണ്ടെത്തിയില്ല, പക്ഷേ പ്രധാന നിയമാവകാശങ്ങൾ ഉണ്ടായിരിക്കാം.",
    studentTone: "I Agree അമർത്തുന്നതിന് മുമ്പ് വായിക്കുന്നതുപോലെ ഇത് മനസ്സിലാക്കുക.",
    voiceTone: "ഇത് കേൾക്കാൻ എളുപ്പമായ ലളിത വിശദീകരണമാണ്.",
    questionsList: [
      "ഏത് ഡാറ്റയാണ് ശേഖരിക്കുന്നത്, അത് ആരുമായി പങ്കിടുന്നു?",
      "എനിക്ക് അക്കൗണ്ട് റദ്ദാക്കാനോ എന്റെ ഡാറ്റ നീക്കാനോ കഴിയുമോ?",
      "സേവനത്തിൽ പിഴവ് സംഭവിച്ചാൽ അല്ലെങ്കിൽ സേവനം നിർത്തിയാൽ എന്ത് സംഭവിക്കും?"
    ]
  }
};

const riskSignals = [
  {
    terms: ["share your data", "third party", "affiliates", "partners", "sell", "advertising"],
    simple: {
      "en-IN": "Your data may be shared with another company or used for advertising.",
      "hi-IN": "आपका डेटा किसी दूसरी कंपनी के साथ साझा हो सकता है या विज्ञापन के लिए इस्तेमाल हो सकता है।",
      "kn-IN": "ನಿಮ್ಮ ಡೇಟಾವನ್ನು ಬೇರೆ ಕಂಪನಿಯೊಂದಿಗೆ ಹಂಚಬಹುದು ಅಥವಾ ಜಾಹೀರಾತಿಗಾಗಿ ಬಳಸಬಹುದು.",
      "ta-IN": "உங்கள் தரவு வேறு நிறுவனத்துடன் பகிரப்படலாம் அல்லது விளம்பரத்திற்கு பயன்படுத்தப்படலாம்.",
      "te-IN": "మీ డేటాను మరొక కంపెనీతో పంచుకోవచ్చు లేదా ప్రకటనల కోసం ఉపయోగించవచ్చు.",
      "ml-IN": "നിങ്ങളുടെ ഡാറ്റ മറ്റൊരു കമ്പനികളുമായി പങ്കിടുകയോ പരസ്യങ്ങൾക്ക് ഉപയോഗിക്കുകയോ ചെയ്യാം."
    }
  },
  {
    terms: ["automatically renew", "auto-renew", "recurring", "subscription renews"],
    simple: {
      "en-IN": "Payment or subscription may continue automatically unless you cancel.",
      "hi-IN": "जब तक आप रद्द नहीं करते, भुगतान या सदस्यता अपने आप जारी रह सकती है।",
      "kn-IN": "ನೀವು ರದ್ದುಪಡಿಸದಿದ್ದರೆ ಪಾವತಿ ಅಥವಾ ಚಂದಾದಾರಿಕೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮುಂದುವರಿಯಬಹುದು.",
      "ta-IN": "நீங்கள் ரத்து செய்யாவிட்டால் கட்டணம் அல்லது சந்தா தானாக தொடரலாம்.",
      "te-IN": "మీరు రద్దు చేయకపోతే చెల్లింపు లేదా సబ్‌స్క్రిప్షన్ స్వయంగా కొనసాగవచ్చు.",
      "ml-IN": "നിങ്ങൾ റദ്ദാക്കാത്ത പക്ഷം പണമടയ്ക്കൽ അല്ലെങ്കിൽ സബ്സ്ക്രിപ്ഷൻ സ്വയം തുടരും."
    }
  },
  {
    terms: ["not liable", "limited liability", "no responsibility", "as is"],
    simple: {
      "en-IN": "The company may be limiting responsibility if something goes wrong.",
      "hi-IN": "अगर कुछ गलत होता है तो कंपनी अपनी जिम्मेदारी सीमित कर सकती है।",
      "kn-IN": "ಏನಾದರೂ ತಪ್ಪಾದರೆ ಕಂಪನಿ ತನ್ನ ಜವಾಬ್ದಾರಿಯನ್ನು ಮಿತಿಗೊಳಿಸಬಹುದು.",
      "ta-IN": "ஏதேனும் தவறு நடந்தால் நிறுவனம் தனது பொறுப்பை குறைக்கலாம்.",
      "te-IN": "ఏదైనా తప్పు జరిగితే కంపెనీ తన బాధ్యతను పరిమితం చేయవచ్చు.",
      "ml-IN": "എന്തെങ്കിലും പ്രശ്നം ഉണ്ടായാൽ കമ്പനി തന്റെ ഉത്തരവാദിത്തം കുറയ്ക്കാം."
    }
  },
  {
    terms: ["terminate", "suspend", "disable your account", "remove access"],
    simple: {
      "en-IN": "Your account or access can be stopped under certain conditions.",
      "hi-IN": "कुछ स्थितियों में आपका खाता या एक्सेस बंद किया जा सकता है।",
      "kn-IN": "ಕೆಲವು ಪರಿಸ್ಥಿತಿಗಳಲ್ಲಿ ನಿಮ್ಮ ಖಾತೆ ಅಥವಾ ಪ್ರವೇಶವನ್ನು ನಿಲ್ಲಿಸಬಹುದು.",
      "ta-IN": "சில சூழ்நிலைகளில் உங்கள் கணக்கு அல்லது அணுகல் நிறுத்தப்படலாம்.",
      "te-IN": "కొన్ని పరిస్థితుల్లో మీ ఖాతా లేదా యాక్సెస్ నిలిపివేయబడవచ్చు.",
      "ml-IN": "ചില സാഹചര്യങ്ങളിൽ നിങ്ങളുടെ അക്കൗണ്ട് അല്ലെങ്കിൽ പ്രവേശനം നിർത്താം."
    }
  },
  {
    terms: ["location", "cookies", "tracking", "device information", "usage data"],
    simple: {
      "en-IN": "The service may collect details about your device, location, or activity.",
      "hi-IN": "सेवा आपके डिवाइस, स्थान या गतिविधि की जानकारी ले सकती है।",
      "kn-IN": "ಸೇವೆ ನಿಮ್ಮ ಸಾಧನ, ಸ್ಥಳ ಅಥವಾ ಬಳಕೆಯ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸಬಹುದು.",
      "ta-IN": "சேவை உங்கள் சாதனம், இடம் அல்லது செயல்பாட்டு விவரங்களை சேகரிக்கலாம்.",
      "te-IN": "సేవ మీ పరికరం, స్థానం లేదా వినియోగ వివరాలను సేకరించవచ్చు.",
      "ml-IN": "സേവനം നിങ്ങളുടെ ഉപകരണം, സ്ഥലം, പ്രവർത്തനം എന്നിവയുടെ വിവരങ്ങൾ ശേഖരിക്കാം."
    }
  },
  {
    terms: ["arbitration", "jurisdiction", "governing law", "class action", "dispute"],
    simple: {
      "en-IN": "If there is a legal problem, the rules may decide where and how you can complain.",
      "hi-IN": "अगर कानूनी समस्या होती है, तो नियम तय कर सकते हैं कि आप कहां और कैसे शिकायत कर सकते हैं।",
      "kn-IN": "ಕಾನೂನು ಸಮಸ್ಯೆ ಬಂದರೆ, ನೀವು ಎಲ್ಲಿ ಮತ್ತು ಹೇಗೆ ದೂರು ನೀಡಬಹುದು ಎಂಬುದನ್ನು ಈ ನಿಯಮಗಳು ನಿರ್ಧರಿಸಬಹುದು.",
      "ta-IN": "சட்ட பிரச்சனை வந்தால், எங்கு எப்படி புகார் செய்யலாம் என்பதை இந்த விதிகள் தீர்மானிக்கலாம்.",
      "te-IN": "చట్టపరమైన సమస్య వస్తే, మీరు ఎక్కడ మరియు ఎలా ఫిర్యాదు చేయగలరో ఈ నియమాలు నిర్ణయించవచ్చు.",
      "ml-IN": "നിയമ പ്രശ്നം ഉണ്ടായാൽ, എവിടെ എങ്ങനെ പരാതി നൽകാമെന്ന് ഈ നിയമങ്ങൾ തീരുമാനിക്കാം."
    }
  }
];

const sample = `By using this application, you agree that we may collect usage data, device information, location details, and cookies to improve our services and provide personalized advertising. We may share your information with affiliates, service providers, and business partners. Your subscription will automatically renew each month unless cancelled before the renewal date. We are not liable for indirect damages, loss of data, or service interruptions. We may suspend or terminate your account if you violate these terms. Any dispute will be resolved by arbitration under the governing law stated in this agreement.`;

let lastSpokenText = "";
let isReadingFile = false;

function getLabel() {
  return labels[languageSelect.value] || labels["en-IN"];
}

function getRiskText(risk) {
  return risk.simple[languageSelect.value] || risk.simple["en-IN"];
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

  const riskTexts = risks.map(getRiskText);
  const riskSentence = risks.length
    ? `${currentLabels.warning} ${riskTexts.join(" ")}`
    : currentLabels.noRiskSummary;

  const tonePrefix =
    toneSelect.value === "student"
      ? `${currentLabels.studentTone} `
      : toneSelect.value === "voice"
        ? `${currentLabels.voiceTone} `
        : "";

  if (languageSelect.value === "en-IN") {
    return `${currentLabels.intro} ${tonePrefix}${simplified.join(" ")} ${riskSentence}`;
  }

  const detectedPart = risks.length ? `${currentLabels.summaryRisk} ${riskTexts.join(" ")}` : riskSentence;
  return `${currentLabels.intro} ${tonePrefix}${currentLabels.summaryBase} ${detectedPart}`;
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

  const riskItems = risks.length ? risks.map(getRiskText) : [currentLabels.noRisk];
  const questionItems = currentLabels.questionsList;

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
