# Voice & tone

Navigator's voice is not a brand exercise — it's a usability requirement. A
parent under sustained stress can't parse cheery copywriting and can't tolerate
clinical coldness. The product addresses them as "you", acknowledges what's
hard, and never adds emotional load.

## The rules

1. **You, not we.** "You logged a dose at 7:42 am." Not "We have recorded
   your dose."
2. **Verbs over nouns.** "Log a dose" > "Dose entry". "Generate report" >
   "Report generation".
3. **Specific over abstract.** "12 minutes late" > "slightly delayed".
   "3 missed doses this week" > "low adherence".
4. **No exclamation marks.** Ever. Even on success. A green checkmark and
   "Saved" is enough.
5. **No emoji in product UI.** Emoji may appear in marketing copy if quoting
   a parent. Never in app chrome.
6. **Sentence case for everything** — headings, buttons, labels, menu items.
   Not "Generate Report" — "Generate report".
7. **Acknowledge the hard parts.** Empty states say "Nothing logged today yet.
   Start with this morning's dose." Not "No entries found."

## The pattern bank

| Context | ✅ Navigator says | ❌ Don't say |
|---|---|---|
| Dose logged | "Logged · 7:42 am" | "Great job! Dose saved! 🎉" |
| Sync OK | "Saved" (+ green dot) | "All your data has been successfully synced!" |
| Offline | "Offline — saved locally" | "Connection lost. Try again later." |
| Empty timeline | "Nothing logged today yet. Start with this morning's dose." | "No entries found." |
| Generating | "Pulling 90 days of events…" | "Please wait while we process your request." |
| Sensitive prompt | "Refused — what happened?" | "Why did your child refuse?" |
| Error | "Couldn't save that. It's still on this device." | "An error occurred." |
| Marketing hero | "Walk into every appointment prepared." | "Revolutionize your child's care journey!" |

## Numbers, dates, times

- 12-hour clock with lowercase am/pm: `7:42 am`, `9:30 pm`.
- Relative times in the timeline: `12m ago`, `2h ago`, `Yesterday · 8:14 pm`.
- Tabular figures (JetBrains Mono) for dose mg, times, percentages, durations.
- Whole-number percentages: `87% adherence`, not `87.3%`.

## Clinical terms

When the parent introduces a clinical word ("meltdown", "wear-off"), use the
same word back. Navigator does not introduce diagnostic terms. The parent
owns the vocabulary about their child.
