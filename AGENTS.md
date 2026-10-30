<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Reservation architecture
- Keep the existing external Supabase publishable-only REST client in `src/lib/supabase.ts`; never enable Cloud or introduce a separate backend because this app uses the university's existing data.
- Keep selected-student reservation orchestration in the index route and cancellation UI in `src/components/mis-reservas.tsx`; verify a cancellation by reading its stored state before releasing availability.
- Cancellation uses the narrowly scoped `cancelar_reserva` PostgreSQL function, checked against the selected student ID; it is intentionally prototype identification, not authentication, and must not grant broad table UPDATE access.
- Keep SQL activation scripts under `supabase/` and exercise database rules with an isolated in-memory PostgreSQL test; never modify real appointments as test fixtures.
