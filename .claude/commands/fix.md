# Fix — root-cause a bug and resolve it minimally

Bug or issue to fix: **$ARGUMENTS**

Execute in order.

## 1. Reproduce the problem

Read the file(s) most likely to contain the bug. State:
- What the code currently does
- What it should do instead
- The exact line or logic that is wrong

Do not guess. If you cannot find the cause after reading 3 files, say so and ask the user where to look.

## 2. Find the root cause

Trace the data flow:
- Where does the value come from? (mock JSON → type → hook → component)
- Where does it break down?

Name the root cause in one sentence before writing any fix.

## 3. Make the minimal fix

Change only what is necessary to fix the root cause.
Do not refactor surrounding code.
Do not add features.
Do not "clean up while you're here."

## 4. Type-check

Run: `pnpm tsc --noEmit`

Fix any new type errors introduced by the fix. Do not leave the repo in a worse type state than you found it.

## 5. Report

- What was wrong (one sentence)
- What you changed and where (file + line)
- What to verify in http://localhost:3302 to confirm it's fixed
- Any related areas that might have the same bug
