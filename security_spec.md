# Security Specification for Assimilate.one Case Platform

## 1. Data Invariants
- A `MedicalCase` must have a valid `presenterId`.
- Only `internal` roles or the `presenter` can modify a case.
- `published` cases are publicly viewable (read-only).
- `draft` cases are only visible to the presenter or internal admins.
- User profiles are viewable by the owner or internal admins.
- `stats` on user profiles are only modifiable by the system (or internal admin).

## 2. The Dirty Dozen (Attack Vectors)
1. **Identity Spoofing**: Trying to create a case with someone else's `presenterId`.
2. **Privilege Escalation**: An `audience` user trying to update their role to `internal`.
3. **State Shortcutting**: Skipping the `draft` phase if there's a review process (not strictly enforced yet, but status changes should be controlled).
4. **Data Corruption**: Injecting huge strings into `title` or `transcript`.
5. **PII Leak**: Accessing another user's private profile data.
6. **Shadow Update**: Adding a field like `isVerified: true` to a case during a regular update.
7. **Unauthorized Deletion**: A user trying to delete a case they don't own.
8. **Resource Poisoning**: Using non-alphanumeric IDs to break indexing or query logic.
9. **Spam Creation**: Flooding the database with empty cases.
10. **Query Scrapping**: Trying to list all `draft` cases of other users.
11. **Assessment Bypass**: Awarding self credit points without valid assessment completion (logic handled in app, but rules should protect user stats).
12. **Language Hijacking**: Adding unsupported languages to a case.

## 3. Test Runner Concept (Internal logic for rules)
- Case creation must match `request.auth.uid`.
- Case update must use `affectedKeys().hasOnly()`.
- Case read must check `status == 'published'` if not admin/presenter.
