const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const postsDir = path.join(__dirname, '_posts');
const outputDir = path.join(__dirname, 'blog');
const templatePath = path.join(outputDir, 'post-template.html');
const blogHtmlPath = path.join(__dirname, 'blog.html');

if (!fs.existsSync(postsDir)) {
  console.log('_posts directory does not exist. Creating it...');
  fs.mkdirSync(postsDir);
  process.exit(0);
}

const template = fs.readFileSync(templatePath, 'utf8');
let blogHtml = fs.readFileSync(blogHtmlPath, 'utf8');

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
let newPostCards = [];

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(content);
  
  const title = parsed.data.title || 'Untitled';
  const dateStr = parsed.data.date || new Date().toISOString();
  let excerpt = parsed.data.excerpt || '';
  
  const dateObj = new Date(dateStr);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  });
  const dataDate = dateObj.toISOString().split('T')[0];
  
  const htmlContent = marked.parse(parsed.content);
  
  // Create slug from filename (Decap/Sveltia usually adds date/title)
  // For safety, strip .md
  let slug = file.replace(/\.md$/, '');
  
  // Replace tokens in template
  let postHtml = template.replace(
    '<title>Blog Post Title | Aliyas John</title>', 
    `<title>${title} | Aliyas John</title>`
  );
  postHtml = postHtml.replace(
    '<h1>Your Blog Post Title Here</h1>',
    `<h1>${title}</h1>`
  );
  postHtml = postHtml.replace(
    '<div class="post-date">January 15, 2026</div>',
    `<div class="post-date">${formattedDate}</div>`
  );
  postHtml = postHtml.replace(
    '<!-- CMS_CONTENT -->', 
    htmlContent
  );
  
  const outputPath = path.join(outputDir, `${slug}.html`);
  fs.writeFileSync(outputPath, postHtml);
  console.log(`Generated ${outputPath}`);
  
  if (!excerpt && parsed.content) {
      excerpt = parsed.content.substring(0, 150).replace(/[^a-zA-Z0-9.,?!\s]/g, '') + '...';
  }

  // Generate card for blog.html
  const cardHtml = `
  <a href="blog/${slug}.html" style="text-decoration: none; color: inherit;" data-date="${dataDate}">
    <div class="blog-card">
      <div class="blog-date">${formattedDate}</div>
      <h2 class="blog-title">${title}</h2>
      <p class="blog-excerpt">${excerpt}</p>
    </div>
  </a>`;
  
  newPostCards.push(cardHtml);
});

// Update blog.html between markers
if (newPostCards.length > 0) {
  const markerStart = '<!-- CMS_POSTS_START -->';
  const markerEnd = '<!-- CMS_POSTS_END -->';
  
  const regex = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`);
  const insertion = `${markerStart}\n${newPostCards.join('\n')}\n  ${markerEnd}`;
  
  blogHtml = blogHtml.replace(regex, insertion);
  fs.writeFileSync(blogHtmlPath, blogHtml);
  console.log('Updated blog.html with new posts');
} else {
  console.log('No posts found to generation.');
}
