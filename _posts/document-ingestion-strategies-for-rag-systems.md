---
title: "Document Ingestion Strategies for RAG Systems"
date: "2026-03-07T18:30:00.000Z"
excerpt: "Learn practical document ingestion strategies for production RAG systems - from chunking methods to handling tables, images, and complex layouts for better retrieval accuracy."
---
<p>
When many developers build their first RAG system, the pipeline usually looks simple.
Load documents → split into chunks → create embeddings → store in a vector database.
</p>

<p>
This works well in demos. But once real documents enter the system - financial reports,
research papers, contracts, PDFs with tables and images - the answers start becoming unreliable.
</p>

<p>
Most of the time the issue is not the LLM.  
The problem is <strong>how the documents are ingested</strong>.
</p>

<h2>A Typical RAG Ingestion Pipeline</h2>

<pre><code>
Document
↓
Document Normalization
↓
Layout Extraction
↓
Chunking
↓
Embeddings
↓
Vector Database
</code></pre>

<p>
Each stage plays a role in making the information easier for retrieval.
</p>

<h2>1. Document Normalization</h2>

<p>
Documents arrive in many formats: PDF, DOCX, HTML, scanned images, PowerPoint slides.
Without normalization, you might end up with broken text, duplicate headers on every page,
or encoding issues that corrupt embeddings.
</p>

<p>
Normalization converts messy real-world documents into clean, consistent text
that chunking strategies can work with reliably.
</p>

<h3>Common normalization tasks</h3>

<p>
<strong>Remove repeated headers and footers</strong><br>
Many PDFs repeat "Page 5 of 20" or company logos on every page.
These add noise to chunks and waste embedding space.
</p>

<p>
<strong>Fix encoding issues</strong><br>
Some PDFs use custom fonts or encodings that break text extraction.
Normalization detects and fixes these before chunking.
</p>

<p>
<strong>Merge hyphenated words</strong><br>
PDFs often split words across lines: "docu-\nment" becomes "document".
</p>

<p>
<strong>Preserve document structure</strong><br>
Keep section boundaries, page numbers as metadata, not inline text.
</p>

<h3>Example with PyMuPDF</h3>

<pre><code>
import fitz
import re

def normalize_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    
    for page in doc:
        page_text = page.get_text()
        
        # Remove page numbers
        page_text = re.sub(r'Page \d+ of \d+', '', page_text)
        
        # Fix hyphenated words
        page_text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', page_text)
        
        text += page_text
    
    return text.strip()
</code></pre>

<h2>2. Fixed Length Chunking</h2>

<p>
The simplest strategy is splitting text by size.
For example, every 500 tokens becomes one chunk.
</p>

<p>
This is useful for quick prototypes, but it has a major problem.
It ignores document structure completely.
</p>

<p>
A chunk might start in the middle of a paragraph and end halfway through a table.
This breaks context and makes retrieval less accurate.
</p>

<h3>When to use it</h3>

<p>
Fixed length chunking works fine for simple documents like plain text articles or blog posts.
But for complex documents with tables, lists, or sections, it often fails.
</p>

<pre><code>
from langchain.text_splitter import CharacterTextSplitter

splitter = CharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50  # Overlap helps preserve context at boundaries
)

chunks = splitter.split_text(document_text)
</code></pre>

<h2>3. Recursive Chunking</h2>

<p>
Recursive chunking is smarter than fixed length chunking.
It tries to respect document structure by splitting at natural boundaries.
</p>

<p>
Here's how it works:
</p>

<p>
First, it tries to split by paragraphs (double newlines).<br>
If a paragraph is still too large, it splits by sentences (periods).<br>
If a sentence is still too large, it splits by words.
</p>

<p>
This way, chunks are more likely to contain complete thoughts
rather than cutting mid-sentence.
</p>

<h3>Why it's better</h3>

<p>
When you retrieve a chunk, it contains a full idea instead of broken fragments.
This helps the LLM generate better answers.
</p>

<pre><code>
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""]  # Try these in order
)

chunks = splitter.split_text(document_text)
</code></pre>

<h2>4. Semantic Chunking</h2>

<p>
Semantic chunking is the most intelligent approach.
Instead of splitting by size or structure, it splits by meaning.
</p>

<p>
Here's the idea:
</p>

<p>
The system converts each sentence into an embedding (a vector representation).<br>
It then measures similarity between consecutive sentences.<br>
When similarity drops significantly, it means the topic has changed.<br>
That's where a new chunk begins.
</p>

<h3>Why this matters</h3>

<p>
Imagine a document that discusses "revenue" in one paragraph
and then switches to "employee benefits" in the next.
</p>

<p>
Semantic chunking detects this topic shift and creates a boundary.
This keeps related information together, even if paragraphs are short or long.
</p>

<h3>The tradeoff</h3>

<p>
Semantic chunking is slower because it requires embedding every sentence.
But for complex documents, the improved retrieval quality is often worth it.
</p>

<pre><code>
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

sentences = document_text.split(".")
embeddings = model.encode(sentences)

# Calculate similarity between consecutive sentences
# Split when similarity drops below threshold
</code></pre>

<h2>5. Parent–Child (Hierarchical) Chunking</h2>

<p>
This is one of the most effective strategies for production RAG systems.
It solves a common problem: small chunks lose context.
</p>

<h3>The problem with small chunks</h3>

<p>
Small chunks (200-300 tokens) are great for precise retrieval.
But they often lack surrounding context.
</p>

<p>
For example, a chunk might say "The policy was updated in Q3."
But which policy? Without context, the LLM cannot answer properly.
</p>

<h3>How parent-child chunking works</h3>

<p>
First, split the document into <strong>large parent sections</strong> (1000-1500 tokens).<br>
Then split each parent into <strong>smaller child chunks</strong> (200-300 tokens).
</p>

<p>
During retrieval:
</p>

<p>
The system searches using the small child chunks (precise matching).<br>
But it returns the entire parent section to the LLM (full context).
</p>

<h3>Why this works</h3>

<p>
You get the best of both worlds.
Precise retrieval from small chunks, but the LLM sees the full context.
</p>

<pre><code>
Parent Section (1500 tokens)
   ├ Child chunk 1 (300 tokens)
   ├ Child chunk 2 (300 tokens)
   ├ Child chunk 3 (300 tokens)
   └ Child chunk 4 (300 tokens)

# Search using child chunks
# Return parent section to LLM
</code></pre>

<h2>6. Layout Aware Parsing</h2>

<p>
Many PDFs are not just text.
They contain tables, images, charts, multi-column layouts, and text boxes.
</p>

<p>
If you extract these as plain text, the structure gets destroyed.
A table becomes a mess of words with no clear meaning.
</p>

<h3>What layout-aware parsing does</h3>

<p>
It detects different elements in the document:
</p>

<p>
• Text blocks<br>
• Tables<br>
• Images<br>
• Headers and footers<br>
• Multi-column sections
</p>

<p>
Each element is extracted separately and processed differently.
Tables stay as tables. Images are described. Text flows naturally.
</p>

<h3>Tools for layout parsing</h3>

<p>
<strong>Unstructured</strong> - Open source, works well for most PDFs<br>
<strong>Azure Document Intelligence</strong> - Cloud service, very accurate<br>
<strong>Amazon Textract</strong> - AWS service, good for forms and tables<br>
<strong>PyMuPDF</strong> - Fast and lightweight, basic layout detection
</p>

<pre><code>
from unstructured.partition.pdf import partition_pdf

elements = partition_pdf("report.pdf")

for e in elements:
    if e.category == "Table":
        # Handle table separately
    elif e.category == "Image":
        # Extract and describe image
    else:
        # Regular text
</code></pre>

<h2>7. Handling Tables</h2>

<p>
Tables are one of the hardest parts of document ingestion.
If you convert a table to plain text, it becomes unreadable.
</p>

<h3>The problem with flattening tables</h3>

<p>
Imagine this table:
</p>

<pre><code>
| Year | Revenue | Profit |
|------|---------|--------|
| 2023 | 5M      | 1.2M   |
| 2024 | 7M      | 2.1M   |
</code></pre>

<p>
If you flatten it to text, you get:
"Year Revenue Profit 2023 5M 1.2M 2024 7M 2.1M"
</p>

<p>
The LLM cannot understand which number belongs to which column.
</p>

<h3>Better approach: Structured text</h3>

<p>
Convert tables into structured text that preserves relationships:
</p>

<pre><code>
Year: 2023
Revenue: 5M
Profit: 1.2M

Year: 2024
Revenue: 7M
Profit: 2.1M
</code></pre>

<p>
Now the LLM can clearly see that 5M revenue belongs to 2023.
</p>

<h3>Tools for table extraction</h3>

<p>
<strong>LlamaParse</strong> - Specifically built for complex tables<br>
<strong>Azure Document Intelligence</strong> - Excellent table detection<br>
<strong>Amazon Textract</strong> - Good for forms and structured tables<br>
<strong>Unstructured</strong> - Works for simple tables<br>
<strong>PyMuPDF</strong> - Fast but less accurate
</p>

<h2>8. Handling Images</h2>

<p>
Images cannot be embedded directly with text embeddings.
They must first be converted into text descriptions or vision embeddings.
</p>

<h3>Approach 1: Vision Language Models (Recommended)</h3>

<p>
Modern vision-language models like GPT-4o, Claude, Qwen or Gemini can generate
detailed descriptions of images including charts, diagrams, and screenshots.
</p>

<pre><code>
from openai import OpenAI
import base64

client = OpenAI()

with open("chart.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Describe this image in detail for a RAG system."},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}}
        ]
    }]
)

image_description = response.choices[0].message.content
</code></pre>

<h3>Approach 2: OCR for Text-Heavy Images</h3>

<p>
For scanned documents or images with text, OCR extracts the text directly.
</p>

<pre><code>
import pytesseract
from PIL import Image

text = pytesseract.image_to_string(Image.open("scan.png"))
</code></pre>

<h3>Approach 3: Multimodal Embeddings</h3>

<p>
Some embedding models support both text and images in the same vector space.
This allows direct image-to-text retrieval.
</p>

<pre><code>
from sentence_transformers import SentenceTransformer
from PIL import Image

model = SentenceTransformer('clip-ViT-B-32')

image = Image.open("diagram.png")
image_embedding = model.encode(image)

text_embedding = model.encode("technical architecture diagram")
</code></pre>

<h2>9. Metadata Enriched Ingestion</h2>

<p>
Metadata is extra information about each chunk that helps during retrieval.
It acts like filters or tags.
</p>

<h3>Why metadata matters</h3>

<p>
Imagine you have 1000 documents in your vector database.
A user asks: "What was the revenue policy in 2024?"
</p>

<p>
Without metadata, the system searches through all 1000 documents.
With metadata, it can filter to only documents from 2024 in the "finance" category.
</p>

<p>
This makes retrieval faster and more accurate.
</p>

<h3>Common metadata fields</h3>

<p>
<strong>source</strong> - Which document this chunk came from<br>
<strong>date</strong> - When the document was created<br>
<strong>section</strong> - Which section of the document<br>
<strong>page_number</strong> - For reference<br>
<strong>document_type</strong> - Policy, report, email, etc.
</p>

<pre><code>
{
  "text": "The revenue policy was updated...",
  "metadata": {
    "source": "finance_policy_2024.pdf",
    "year": 2024,
    "section": "taxation",
    "page": 12,
    "document_type": "policy"
  }
}
</code></pre>

<p>
During retrieval, you can filter:
"Find chunks where year=2024 AND section='taxation'"
</p>

<h2>Final Thoughts</h2>

<p>
Many discussions about RAG focus on models and embeddings.
But in practice, the biggest improvements often come from
<strong>better document ingestion</strong>.
</p>

<p>
If document structure is broken during ingestion,
even the best LLM cannot recover the lost context.
</p>

<p>
A well designed ingestion pipeline usually leads to
better retrieval and more reliable answers.
</p>
