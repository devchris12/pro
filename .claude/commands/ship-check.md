Review the current `git diff --staged` and do the following:

1. Flag any hardcoded values that should be environment variables
2. Flag any console.log statements in .ts or .tsx files
3. Check if any Supabase-related changes are missing a migration file
4. Flag any direct Supabase client initializations outside of /lib/supabase.ts
5. Flag any use of `any` type in TypeScript
6. Suggest a concise commit message (under 72 chars, no emoji, feat/fix/chore prefix)

Output as a short checklist. Be direct — flag issues or say "all clear".
