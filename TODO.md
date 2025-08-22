# TODOs: Alphalend Claim & Swap Utilities

Short-term
- [ ] Cetus: Build a helper to construct claim Move calls that return coin results (not transfers), then append CLMM swap legs in the same Transaction (true single-tx Claim + Swap).
- [ ] Cetus: Keep current two-step fallback; add per-token pool selection by best route (liquidity, fee tier) instead of first/biggest only.
- [ ] Swap UX: Add a post-swap detailed summary listing which token swaps succeeded/failed.
- [ ] Staged amounts: Show formatted amounts (with decimals) in the “Ready to swap” tag.
- [ ] Retry policy: Add two-step routing fallback (token → USDC → target) for problem tokens (e.g., BLUE, STSUI) when 7k or Cetus direct route fails.
- [ ] Pre-flight: Add devInspect per token and skip/mark failing routes prior to signing.

Medium-term
- [ ] Router policy: Auto-fallback per token between 7k and Cetus based on route viability and expected output.
- [ ] Persist settings: Save last chosen slippage and router in localStorage.
- [ ] Background refresh: Auto-refresh pending rewards after claim and after each swap.
- [ ] Accessibility: Add focus/hover states to segmented controls, and ARIA labels for toasts/actions.

Nice-to-have
- [ ] Token icons and labels for claimable/pending sections.
- [ ] Analytics: Count of successful swaps vs. failures, and common failure causes (routing/liquidity/settle).
- [ ] Tests: Add a lightweight smoke test for staging logic and amount conversion (decimal → raw).

