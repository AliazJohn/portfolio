---
title: "Race Conditions, Locks and Safe Data Handling - Part 3"
date: "2026-03-05T18:30:00.000Z"
excerpt: "Part 3: Learn how race conditions happen in concurrent systems and how locks and atomic operations prevent data corruption in production backends."
---
<div class="series-badge">SERIES 1 • PART 3 OF 4</div>



<div class="series-title">The Life of a Backend Request - How Real APIs Work</div>



<p>
The tech fest registration system is now popular.
</p>

<p>
But a bug appears.
</p>

<p>
Two students manage to register for the last seat of an event.
</p>

<p>
How did that happen?
</p>

<h2>Race conditions</h2>

<p>
Imagine there is one seat left.
</p>

<p>
Two workers check the database simultaneously.
</p>

<pre><code>
Worker 1 → seats_available = 1
Worker 2 → seats_available = 1
</code></pre>

<p>
Both proceed to reserve the seat.
</p>

<p>
Now the event is overbooked.
</p>

<p>
This problem is called a race condition.
Multiple processes race to update the same resource.
</p>

<h2>Using locks</h2>

<p>
A lock ensures only one worker accesses a critical section at a time.
</p>

<pre><code>
Worker A acquires lock
↓
Checks seat count
↓
Reserves seat
↓
Releases lock
</code></pre>

<p>
Worker B must wait until the lock is released.
</p>

<p>
The worker that gets the lock first wins.
</p>

<h3>Implementing locks in Python</h3>

<pre><code>
import redis

redis_client = redis.Redis()

def reserve_seat(event_id, student_id):
    lock_key = f"lock:event:{event_id}"
    
    # Try to acquire lock
    lock = redis_client.lock(lock_key, timeout=5)
    
    if lock.acquire(blocking=True):
        try:
            # Critical section
            seats = get_available_seats(event_id)
            if seats > 0:
                save_registration(event_id, student_id)
                return True
            return False
        finally:
            lock.release()
</code></pre>

<p>
Redis locks work across multiple workers because Redis is a shared resource.
</p>

<h2>Database-level locks</h2>

<p>
Databases also provide locking mechanisms.
</p>

<pre><code>
SELECT * FROM events 
WHERE event_id = 123 
FOR UPDATE;
</code></pre>

<p>
The FOR UPDATE clause locks the row until the transaction completes.
</p>

<p>
Other workers trying to read that row will wait.
</p>

<h2>Atomic writes</h2>

<p>
Another issue appears when writing data.
</p>

<p>
Suppose the server crashes while writing a file.
</p>

<p>
The file may look like this:
</p>

<pre><code>
{
 "name": "Rahul",
 "email":
</code></pre>

<p>
This is a partial write.
</p>

<p>
To prevent corruption, systems use atomic writes.
</p>

<p>
Instead of writing directly to the final file:
</p>

<pre><code>
registrations.json
</code></pre>

<p>
We write to a temporary file:
</p>

<pre><code>
registrations.tmp
</code></pre>

<p>
Then rename it:
</p>

<pre><code>
registrations.tmp → registrations.json
</code></pre>

<p>
File renaming is atomic, meaning the file appears completely or not at all.
</p>

<h3>Atomic writes in Python</h3>

<pre><code>
import os
import json

def save_registration_safely(data):
    temp_file = "registrations.tmp"
    final_file = "registrations.json"
    
    # Write to temp file
    with open(temp_file, 'w') as f:
        json.dump(data, f)
    
    # Atomic rename
    os.replace(temp_file, final_file)
</code></pre>

<h2>Database transactions</h2>

<p>
Databases handle atomicity through transactions.
</p>

<pre><code>
BEGIN TRANSACTION;

UPDATE events SET seats_available = seats_available - 1 
WHERE event_id = 123;

INSERT INTO registrations (student_id, event_id) 
VALUES (456, 123);

COMMIT;
</code></pre>

<p>
Either both operations succeed, or both fail.
There is no partial state.
</p>

<p>
But backend systems interact with external services too.
</p>

<p>
And external systems fail.
</p>

<p>
That introduces the next challenge.
</p>

<div class="next-post">
  <div class="next-post-label">NEXT IN SERIES →</div>
  <a href="backend-request-part-4-production-reliability.html">Part 4: Making APIs Reliable in the Real World</a>
<div class="series-nav">
  <h3>The Life of a Backend Request Series</h3>
  <ul class="series-list">
    <li><a href="backend-request-part-1-workers-load-balancers.html">Part 1: When Hundreds of Users Hit Your API</a></li>
    <li><a href="backend-request-part-2-async-concurrency.html">Part 2: Why Async APIs Can Handle Thousands of Requests</a></li>
    <li><span class="current">Part 3: Race Conditions, Locks and Safe Data Handling</span></li>
    <li><a href="backend-request-part-4-production-reliability.html">Part 4: Making APIs Reliable in the Real World</a></li>
  </ul>
</div>
