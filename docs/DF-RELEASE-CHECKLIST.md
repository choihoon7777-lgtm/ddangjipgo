# Development Focus release checklist
1. npm ci
2. npm run build
3. Confirm /focus, /focus-admin/login, /focus-admin/ai-test, /focus-admin/publish and /focus/article render.
4. Confirm anonymous users cannot read df_editorial_queue or non-published df_articles.
5. Confirm AI result can be saved only by an authenticated Development Focus admin.
6. Confirm RED is blocked, YELLOW requires manual review, GREEN still requires final verification gate.
7. Confirm publish RPC is the only production publish path and published_at is preserved.
8. Confirm public article query returns status=published only.
9. Never merge code that fails the Quality Gate.
