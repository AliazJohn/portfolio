---
title: "Making APIs Reliable in the Real World - Part 4"
date: "2026-03-06T18:30:00.000Z"
excerpt: "Part 4: Learn how production APIs handle failures with retries, authentication, background jobs, and idempotency. The complete guide to building reliable backend systems."
---
<div class="series-badge">SERIES 1 • PART 4 OF 4</div>



<div class="series-title">The Life of a Backend Request - How Real APIs Work</div>



<p>
Our backend now handles concurrency correctly.
</p>

<p>
But real systems must also deal with network failures and distributed systems issues.
</p>

<h2>External APIs fail sometimes</h2>

<p>
When calling services like email providers, we might receive errors like:
</p>

<pre><code>
503 Service Unavailable
</code></pre>

<p>
Instead of failing immediately, systems use retries with exponential backoff.
</p>

<h3>Exponential backoff</h3>

<p>
Example:
</p>

<pre><code>
Attempt 1 → wait 1 second
Attempt 2 → wait 2 seconds
Attempt 3 → wait 4 seconds
Attempt 4 → wait 8 seconds
</code></pre>

<p>
The wait time doubles after each failure.
</p>

<p>
This prevents overwhelming a service that is already struggling.
</p>

<h3>Implementing retries in Python</h3>

<pre><code>
import time

def send_email_with_retry(student_email, max_retries=3):
    for attempt in range(max_retries):
        try:
            send_email(student_email)
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1, 2, 4 seconds
                time.sleep(wait_time)
            else:
                # Log failure and move to dead letter queue
                log_failed_email(student_email)
                return False
</code></pre>

<h2>Authentication with headers</h2>

<p>
APIs must verify who is calling them.
</p>

<p>
Instead of sending credentials in URLs, systems use headers.
</p>

<pre><code>
Authorization: Bearer TOKEN
</code></pre>

<p>
Tokens are generated when a user logs in and stored by the client (browser, mobile app, etc).
</p>

<p>
Each request includes the token so the server can verify identity.
</p>

<h3>Example in FastAPI</h3>

<pre><code>
from fastapi import Header, HTTPException

@app.post("/register")
async def register(
    student: Student,
    authorization: str = Header(None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.split(" ")[1]
    user = verify_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Process registration
</code></pre>

<h2>Long-running tasks</h2>

<p>
Some tasks take time.
</p>

<p>
Ticket generation might involve:
</p>

<p>
• generate QR code<br>
• create PDF<br>
• upload ticket<br>
• send email
</p>

<p>
Instead of blocking the API, these tasks run as background jobs.
</p>

<pre><code>
Student registers
↓
API saves data
↓
Job added to queue
↓
Background worker processes task
</code></pre>

<h3>Using Redis Queue</h3>

<pre><code>
from rq import Queue
from redis import Redis

redis_conn = Redis()
queue = Queue(connection=redis_conn)

@app.post("/register")
async def register(student: Student):
    # Save registration immediately
    save_registration(student)
    
    # Queue background job
    queue.enqueue(generate_and_send_ticket, student.id)
    
    return {"message": "Registration successful"}
</code></pre>

<p>
The API responds immediately.
The ticket generation happens in the background.
</p>

<h2>Idempotency</h2>

<p>
Sometimes the client retries a request because the response was lost.
</p>

<p>
Without protection, the student might get registered twice.
</p>

<p>
To avoid this, APIs use idempotency keys.
</p>

<pre><code>
Idempotency-Key: abc123
</code></pre>

<p>
If the same key appears again, the server returns the previous result instead of executing the operation again.
</p>

<h3>Implementing idempotency</h3>

<pre><code>
import redis

redis_client = redis.Redis()

@app.post("/register")
async def register(
    student: Student,
    idempotency_key: str = Header(None)
):
    if idempotency_key:
        # Check if we've seen this key before
        cached_response = redis_client.get(f"idempotency:{idempotency_key}")
        if cached_response:
            return json.loads(cached_response)
    
    # Process registration
    result = save_registration(student)
    
    # Cache the response
    if idempotency_key:
        redis_client.setex(
            f"idempotency:{idempotency_key}",
            86400,  # 24 hours
            json.dumps(result)
        )
    
    return result
</code></pre>

<h2>The real life of a backend request</h2>

<p>
Behind every simple API endpoint, many systems work together:
</p>

<p>
<strong>Workers</strong> handling concurrency<br>
<strong>Async operations</strong> managing I/O<br>
<strong>Locks</strong> preventing race conditions<br>
<strong>Atomic writes</strong> protecting data<br>
<strong>Retries</strong> handling network failures<br>
<strong>Authentication</strong> securing APIs<br>
<strong>Background workers</strong> handling long tasks<br>
<strong>Idempotency</strong> preventing duplicate actions
</p>

<p>
These are the concepts that turn simple API code into reliable production systems.
</p>

<p>
And that is the real story behind every backend request.
</p>

<div class="series-nav">
  <h3>The Life of a Backend Request Series</h3>
  <ul class="series-list">
    <li><a href="backend-request-part-1-workers-load-balancers.html">Part 1: When Hundreds of Users Hit Your API</a></li>
    <li><a href="backend-request-part-2-async-concurrency.html">Part 2: Why Async APIs Can Handle Thousands of Requests</a></li>
    <li><a href="backend-request-part-3-race-conditions-locks.html">Part 3: Race Conditions, Locks and Safe Data Handling</a></li>
    <li><span class="current">Part 4: Making APIs Reliable in the Real World</span></li>
  </ul>
</div>
