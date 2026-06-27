# AI-Powered Legal Contract Simplifier

This is a VS Code-ready frontend project for simplifying complex legal contracts, app rules, terms and conditions, and privacy policies into simple language.

## Folder Structure

```text
ai-powered-legal-contract-simplifier/
├── index.html
├── package.json
├── README.md
├── samples/
│   └── sample-terms.txt
└── src/
    ├── main.js
    └── styles.css
```

## How to Run in VS Code

1. Open this folder in VS Code:

   ```text
   ai-powered-legal-contract-simplifier
   ```

2. Open the terminal in VS Code.

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the project:

   ```bash
   npm run dev
   ```

5. Open the local URL shown in the terminal, usually:

   ```text
   http://127.0.0.1:5173/
   ```

6. Try uploading:

   ```text
   samples/sample-terms.txt
   ```

## Features

- Paste legal text and simplify it
- Upload `.txt` or `.md` files
- Upload `.pdf` files and extract readable text
- Upload `.docx` files and extract readable text
- Upload screenshot images and extract text using OCR
- Important risk detection
- English, Hindi, Kannada, Tamil, Telugu, and Malayalam language options
- Voice explanation using browser text-to-speech
- Voice input where browser speech recognition is supported

## Upload Notes

- Clear digital PDFs work best.
- Scanned PDFs may need OCR first; use screenshot/image upload for OCR.
- OCR can take time the first time because browser OCR language files need to load.
- Screenshot OCR quality depends on image clarity, font size, and lighting.

## Future Improvements

- Improve OCR accuracy for screenshots and scanned documents
- Connect a real AI summarization API
- Add proper translation API support
- Add login and user history
- Add downloadable simplified reports
