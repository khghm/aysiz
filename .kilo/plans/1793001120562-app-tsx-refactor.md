# App.tsx Refactor Plan

## Goal
Split the monolithic `src/App.tsx` (~6300 lines, 40+ components) into a modular, feature-based file structure. No behavior changes — pure structural refactor.

## Current State
`src/App.tsx` contains all components: storefront views, admin panel (20+ sections), customer auth, payment, shared UI. All components are co-located, making navigation, testing, and maintenance difficult.

## Target Structure

```
src/
├── App.tsx                    # Root: providers + router only (~50 lines)
├── main.tsx                   # Entry point (unchanged)
├── components/
│   ├── shared/
│   │   ├── Toasts.tsx
│   │   ├── Stars.tsx
│   │   ├── ProductCard.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Icons.tsx          (already separate)
│   ├── storefront/
│   │   ├── HomeView.tsx
│   │   ├── ShopView.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── CartView.tsx
│   │   ├── BlogView.tsx
│   │   ├── BlogPostView.tsx
│   │   ├── PaymentResult.tsx
│   │   └── CustomerLogin.tsx
│   ├── customer/
│   │   └── CustomerAccount.tsx
│   └── admin/
│       ├── AdminLogin.tsx
│       ├── AdminPanel.tsx
│       ├── AdminContent.tsx
│       ├── AdminHome.tsx
│       ├── AdminOrders.tsx
│       ├── AdminProducts.tsx
│       ├── AdminReports.tsx
│       ├── AdminInvoices.tsx
│       ├── InvoicePreview.tsx
│       ├── AdminFinance.tsx
│       ├── AdminCustomers.tsx
│       ├── AdminReviews.tsx
│       ├── AdminDiscounts.tsx
│       ├── AdminGrowth.tsx
│       ├── AdminReturns.tsx
│       ├── AdminSupport.tsx
│       ├── AdminOperations.tsx
│       ├── AdminSystem.tsx
│       ├── AdminSettings.tsx
│       ├── AdminInsights.tsx
│       ├── AdminAffiliates.tsx
│       ├── AdminPOS.tsx
│       ├── AdminContentManager.tsx
│       ├── AdminVendors.tsx
│       ├── AdminLogistics.tsx
│       └── AdminTasks.tsx
├── context/
│   ├── ShopContext.tsx         (already separate)
│   └── AdminContext.tsx       (already separate)
├── stores/
│   ├── shopStore.ts           (already separate)
│   └── adminStore.ts          (already separate)
├── services/
│   ├── api.ts                 (already separate)
│   └── queryClient.ts         (already separate)
├── data/
│   ├── products.ts            (already separate)
│   └── adminData.ts           (already separate)
└── utils/
    ├── format.ts              (already separate)
    └── analytics.ts           (already separate)
```

## Migration Steps (ordered)

### Phase 1: Extract shared components (lowest risk)
1. Create `src/components/shared/` directory
2. Move `Toasts`, `Stars`, `ProductCard`, `Header`, `Footer` to individual files
3. Update imports in App.tsx
4. Verify build + typecheck

### Phase 2: Extract storefront views
5. Create `src/components/storefront/` directory
6. Move `HomeView`, `ShopView`, `ProductDetail`, `CartView`, `BlogView`, `BlogPostView`, `PaymentResult`, `CustomerLogin`
7. Update imports
8. Verify build + typecheck

### Phase 3: Extract customer account
9. Create `src/components/customer/` directory
10. Move `CustomerAccount`
11. Update imports
12. Verify build + typecheck

### Phase 4: Extract admin components
13. Create `src/components/admin/` directory
14. Move all `Admin*` components + `InvoicePreview` + `AdminLogin`
15. Update imports
16. Verify build + typecheck

### Phase 5: Slim down App.tsx
17. App.tsx becomes root with providers + route switch only
18. Move `AppContent` logic to a router component
19. Final verification: typecheck + build + manual smoke test

## Key Considerations

- **Shared state**: Components use `useShop()` and `useAdmin()` from context providers. These are already in separate files. No state logic needs to move.
- **Imports**: Each extracted component needs its imports updated. Many components share utilities (`faNum`, `formatPrice`, `faDateFull`, etc.) — these should be imported from `utils/format.ts`.
- **CSS**: `index.css` is global, no per-component CSS needed.
- **Routing**: App.tsx uses view-switching via state (not React Router for admin). Keep this pattern during refactor; migrate to React Router in a separate task.
- **Admin panel size**: AdminProducts (294 lines), AdminFinance (529 lines), AdminCustomers (248 lines) are large. Consider further splitting sub-components within these (e.g., product form, product table).

## Risk Mitigation
- Each phase is independently verifiable (build + typecheck after each)
- No behavior changes — pure file moves + import updates
- Git commits per phase for easy rollback
- Keep original App.tsx as backup until all phases verified

## Estimated Effort
- Phase 1 (shared): ~10 components, ~200 lines
- Phase 2 (storefront): ~8 components, ~1500 lines
- Phase 3 (customer): ~1 component, ~200 lines
- Phase 4 (admin): ~25 components, ~4500 lines
- Phase 5 (cleanup): ~50 lines

## Out of Scope
- React Router migration (separate task)
- Performance optimization (lazy loading, memoization)
- TypeScript strictness improvements (removing `any`)
- Component-level unit tests
