import './style.css';
import { JSONParser } from './jsonParser';

const app = document.querySelector<HTMLDivElement>('#app')!;

// Build HTML UI
app.innerHTML = `
  <h1>TypeScript JSON Parser</h1>
  <textarea id="json-input" rows="10" cols="50" placeholder="Paste JSON here..."></textarea>
  <br>
  <button id="parse-btn">Parse</button>
  <button id="clear-btn">Clear</button>
  <pre id="output"></pre>
`;

// Get references to elements
const inputEl = document.querySelector<HTMLTextAreaElement>('#json-input')!;
const outputEl = document.querySelector<HTMLPreElement>('#output')!;
const parseBtn = document.querySelector<HTMLButtonElement>('#parse-btn')!;
const clearBtn = document.querySelector<HTMLButtonElement>('#clear-btn')!;

// Parse button functionality
parseBtn.addEventListener('click', () => {
  const text = inputEl.value.trim();
  if (!text) {
    outputEl.textContent = 'Please enter JSON input.';
    return;
  }

  try {
    const parser = new JSONParser(text);
    const result = parser.parse();
    outputEl.textContent = JSON.stringify(result, null, 2); // Pretty-print output
  } catch (err) {
    outputEl.textContent = `❌ Error: ${(err as Error).message}`;
  }
});

// Clear button functionality
clearBtn.addEventListener('click', () => {
  inputEl.value = '';      // Clear textarea
  outputEl.textContent = ''; // Clear output
});
