---
title: "When Hundreds of Users Hit Your API - Part 1"
date: "2026-03-03T18:30:00.000Z"
excerpt: "Part 1: Learn how backend workers and load balancers handle hundreds of concurrent requests in production systems. A practical guide using a real-world tech fest registration system."
---
<div class="series-badge">SERIES 1 • PART 1 OF 4</div>



<div class="series-title">The Life of a Backend Request - How Real APIs Work</div>



<p>
When we first build a backend API, things look very simple.
</p>

<p>
A request comes in, the server processes it, and a response goes out.
</p>

<p>
For example, imagine we are building a backend for a school tech fest registration system.
Students from different schools can register for events like coding competitions, robotics challenges, and quizzes.
</p>

<p>
Our backend uses a simple stack:
</p>

<p>
<strong>FastAPI</strong> for the backend framework<br>
<strong>Gunicorn</strong> as the server<br>
<strong>PostgreSQL</strong> as the database<br>
<strong>Redis workers</strong> for background jobs<br>
<strong>External email service</strong> for confirmations
</p>

<p>
The architecture roughly looks like this:
</p>

<pre><code>
Students
   ↓
Load Balancer
   ↓
Gunicorn
   ↓
Worker Processes
   ↓
FastAPI
   ↓
Database + External APIs
</code></pre>

<p>
A registration endpoint might look like this:
</p>

<pre><code>
@app.post("/register")
async def register(student: Student):
    save_registration(student)
    reserve_seat(student)
    generate_ticket(student)
    send_confirmation_email(student)
</code></pre>

<p>
Looks harmless.
</p>

<p>
But the moment the registration link is shared in the school WhatsApp group,
hundreds of students start clicking Register.
</p>

<p>
Now the backend has a real problem.
</p>

<h2>The first challenge: too many requests</h2>

<p>
If the server processed requests one by one, every student would wait for the previous one.
</p>

<p>
That is not acceptable for real systems.
</p>

<p>
Instead, backend servers run multiple worker processes.
</p>

<p>
A process is simply a running instance of a program managed by the operating system.
</p>

<p>
When we start our server like this:
</p>

<pre><code>
gunicorn -w 4 main:app
</code></pre>

<p>
Gunicorn creates:
</p>

<p>
<strong>1 master process</strong><br>
<strong>4 worker processes</strong>
</p>

<p>
Each worker loads the same backend code.
</p>

<pre><code>
Gunicorn Master
   |
   |--- Worker 1 → FastAPI running
   |--- Worker 2 → FastAPI running
   |--- Worker 3 → FastAPI running
   |--- Worker 4 → FastAPI running
</code></pre>

<p>
So yes - our backend application is essentially running four times, once inside each worker.
</p>

<p>
Each worker can:
</p>

<p>
• receive HTTP requests<br>
• execute backend logic<br>
• return responses
</p>

<h2>How requests reach workers</h2>

<p>
Before reaching workers, requests usually pass through a load balancer.
</p>

<p>
A load balancer distributes incoming traffic across available workers.
</p>

<pre><code>
Students → Load Balancer
                 ↓
        Worker 1  Worker 2  Worker 3  Worker 4
</code></pre>

<p>
In many production systems the flow is:
</p>

<pre><code>
Internet
   ↓
Nginx (Load Balancer)
   ↓
Gunicorn
   ↓
Workers
</code></pre>

<p>
The load balancer spreads traffic, while Gunicorn manages workers.
</p>

<h2>If there are 4 workers, can only 4 users connect?</h2>

<p>
No.
</p>

<p>
Workers are not fixed seats.
</p>

<p>
Think of them like cashiers in a supermarket.
If there are four cashiers, hundreds of customers can still enter the store.
Each cashier serves one customer at a time and then moves to the next.
</p>

<p>
Workers behave the same way.
</p>

<h2>Why workers alone are not enough</h2>

<p>
Even with workers, something else slows the system down.
</p>

<p>
Network calls.
</p>

<p>
For example:
</p>

<pre><code>
send_confirmation_email(student)
</code></pre>

<p>
This operation might take two seconds.
</p>

<p>
If the worker waits for those two seconds doing nothing, performance drops quickly.
</p>

<p>
This is where asynchronous programming becomes important.
</p>

<p>
And that is where our backend story continues.
</p>

<div class="next-post">
  <div class="next-post-label">NEXT IN SERIES →</div>
  <a href="backend-request-part-2-async-concurrency.html">Part 2: Why Async APIs Can Handle Thousands of Requests</a>
<div class="series-nav">
  <h3>The Life of a Backend Request Series</h3>
  <ul class="series-list">
    <li><span class="current">Part 1: When Hundreds of Users Hit Your API</span></li>
    <li><a href="backend-request-part-2-async-concurrency.html">Part 2: Why Async APIs Can Handle Thousands of Requests</a></li>
    <li><a href="backend-request-part-3-race-conditions-locks.html">Part 3: Race Conditions, Locks and Safe Data Handling</a></li>
    <li><a href="backend-request-part-4-production-reliability.html">Part 4: Making APIs Reliable in the Real World</a></li>
  </ul>
</div>
