---
title: "Why Async APIs Can Handle Thousands of Requests - Part 2"
date: "2026-03-04T18:30:00.000Z"
excerpt: "Part 2: Understand how async programming enables backend APIs to handle thousands of concurrent requests efficiently. Learn the difference between blocking and non-blocking I/O."
---
<div class="series-badge">SERIES 1 • PART 2 OF 4</div>



<div class="series-title">The Life of a Backend Request - How Real APIs Work</div>



<p>
The registration system is now receiving many requests.
</p>

<p>
Workers are handling them, but another problem appears.
</p>

<p>
Many operations in backend systems involve waiting.
</p>

<p>
Examples:
</p>

<p>
• database queries<br>
• external API calls<br>
• file storage<br>
• sending emails
</p>

<p>
These operations involve I/O (input/output).
</p>

<h2>Blocking I/O</h2>

<p>
If an operation is blocking, the worker waits.
</p>

<p>
Example timeline:
</p>

<pre><code>
Worker receives Student A
↓
Calls email API
↓
Waits 2 seconds
↓
Returns response
</code></pre>

<p>
During those two seconds, the worker cannot serve another request.
</p>

<p>
If 100 students register and each email takes 2 seconds,
the last student waits 200 seconds (over 3 minutes).
</p>

<p>
That is unacceptable.
</p>

<h2>Async I/O</h2>

<p>
Async programming allows the worker to start an operation and continue doing other work while waiting.
</p>

<p>
Example:
</p>

<pre><code>
Worker starts email request for Student A
↓
Email service responding...
↓
Worker processes Student B registration
</code></pre>

<p>
Inside a single worker, the activity may look like this:
</p>

<pre><code>
Worker 1
---------
Student A → waiting for email
Student B → validating request
Student C → saving to database
Student D → waiting for DB response
</code></pre>

<p>
The worker is not idle.
It switches between tasks whenever one is waiting for I/O.
</p>

<h2>How async works in FastAPI</h2>

<p>
When you define an endpoint with async:
</p>

<pre><code>
@app.post("/register")
async def register(student: Student):
    await save_to_database(student)
    await send_email(student)
</code></pre>

<p>
The await keyword tells the worker:
"This operation will take time. Do something else while waiting."
</p>

<p>
Without await, the operation blocks.
</p>

<h2>Why a few workers can handle thousands of requests</h2>

<p>
Workers provide process-level concurrency.
</p>

<p>
Async programming provides I/O concurrency inside each worker.
</p>

<p>
Together they allow backend systems to handle many requests efficiently.
</p>

<p>
For example:
</p>

<p>
<strong>4 workers</strong> (process-level concurrency)<br>
<strong>Each handling 250 async operations</strong> (I/O concurrency)<br>
<strong>Total: 1000 concurrent requests</strong>
</p>

<p>
But high concurrency introduces another challenge.
</p>

<p>
When multiple workers modify the same data, things can break.
</p>

<p>
And that is where race conditions begin.
</p>

<div class="next-post">
  <div class="next-post-label">NEXT IN SERIES →</div>
  <a href="backend-request-part-3-race-conditions-locks.html">Part 3: Race Conditions, Locks and Safe Data Handling</a>
<div class="series-nav">
  <h3>The Life of a Backend Request Series</h3>
  <ul class="series-list">
    <li><a href="backend-request-part-1-workers-load-balancers.html">Part 1: When Hundreds of Users Hit Your API</a></li>
    <li><span class="current">Part 2: Why Async APIs Can Handle Thousands of Requests</span></li>
    <li><a href="backend-request-part-3-race-conditions-locks.html">Part 3: Race Conditions, Locks and Safe Data Handling</a></li>
    <li><a href="backend-request-part-4-production-reliability.html">Part 4: Making APIs Reliable in the Real World</a></li>
  </ul>
</div>
