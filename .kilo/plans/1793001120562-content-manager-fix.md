# Plan: Fix Admin Content Manager (image upload + edit + validation)

## Goal
Make content manager fully functional: image upload for pages/banners/posts, working edit for all tabs, and fix "title required" save errors.

## Context
- `src/components/admin/AdminContentManager.tsx`: edit modal exists but only pages/SEO have edit buttons; banners/posts lack edit buttons. Image upload is missing.
- `src/context/AdminContext.tsx`: `useBackendCollection` syncs local state to backend; content create/update goes through `api.content.*`.
- Backend `server/src/routes/content.js`: validates `title` for pages/banners/posts.
- Product image upload pattern exists: `/api/uploads/products/:id/images` with sharp variants and CSRF exemption for `/images` path.

## Decisions
1. Use base64 image storage for content (consistent with current content model) OR add dedicated upload endpoint. Given product migration to file storage, prefer adding `/api/uploads/content/:id/images` endpoint for consistency.
2. Add edit buttons to banners and blog tabs.
3. Ensure modal save updates state correctly and title is preserved.
4. Add image thumbnail preview in list views.

## Tasks
1. Backend: Add `server/src/routes/uploads.js` support for content images (POST/DELETE) or generic upload route.
2. Backend: Mount `/api/uploads/content` and exempt from CSRF (or move before csrfProtection).
3. Frontend: Add `api.catalog`/`api.content.uploadContentImage` method.
4. Frontend: AdminContentManager:
   - Add image upload input in modal.
   - Add edit buttons for banners and blog.
   - Show thumbnail in list.
   - Fix save to preserve title and image.
5. Validation: client-side check for required title before save.
6. Deploy backend + frontend, restart service.

## Risks
- Content images currently base64; migration needed if switching to files.
- CSRF exemption for uploads must include new path.

## Additional Plan: Brand Management & Icon Picker

### Goal
Extend category manager in AdminProducts to manage brands and category icons, with shared source via /api/meta.

### Tasks
1. Frontend: Add brand list editor in category manager modal (add/remove/rename).
2. Frontend: Add icon picker for each category (select from a fixed icon set).
3. Backend: No changes needed (meta already supports brands).
4. State: Update `setCategories` and brands via `updateMeta`.
5. Validation: prevent duplicate brands, empty names.

### Open Questions
- Icon set: use existing Icons component names or emoji? Recommended: predefined list of icon keys mapped to Icons.

