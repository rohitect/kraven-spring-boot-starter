// Import the required libraries
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';

// Make them available globally
window.marked = marked;
window.hljs = hljs;
window.mermaid = mermaid;

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit'
});

console.log('Markdown libraries loaded successfully');
