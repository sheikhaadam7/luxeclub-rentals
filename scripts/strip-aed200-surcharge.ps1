# One-off: remove every "AED 200 no-deposit surcharge" reference from "What's Included" sections.
# Keeps the AED 1,000-3,000 range mentions intact (intentional flexibility per user).
# Scope: 12 brand pages + 2 category pages in lib/money-pages.ts.
# Does NOT touch:
#   - Line 1232 (Group B FAQ — pending separate wording)
#   - Line 1386 (/luxury-car-rental-no-deposit-dubai landing page — kept as-is)

$file = 'lib/money-pages.ts'
$content = Get-Content $file -Raw
$count = 0

# Each removal includes the leading "\n\n" so the surrounding paragraph spacing collapses cleanly.
$toRemove = @(
    # Lamborghini
    "\n\n**A no-deposit option** is available at pickup — a flat 200 AED surcharge in lieu of the damage hold. Most customers take it.",
    # Ferrari
    "\n\n**No-deposit option** at pickup: flat AED 200 surcharge in lieu of the damage hold. Most customers take it.",
    # Bentley
    "\n\n**No-deposit option** at pickup: flat AED 200 surcharge in lieu of the damage hold. Most customers take it for Bentley rentals given the comfort of knowing the hold is off the card.",
    # Mercedes
    "\n\n**No-deposit option** at pickup: flat AED 200 surcharge in lieu of the damage hold for eligible drivers.",
    # Range Rover / McLaren / Aston Martin / Audi / Maserati / Cadillac (identical wording)
    "\n\n**No-deposit option** at pickup: flat AED 200 surcharge in lieu of the damage hold.",
    # BMW (longer wording)
    "\n\n**A no-deposit option** is available at pickup. If you prefer not to put down a damage hold, there's a flat 200 AED surcharge in lieu of the deposit — most customers take it.",
    # car-rental-dubai (category page)
    "\n\n**Optional no-deposit pickup** — a flat AED 200 surcharge replaces the damage hold entirely. Popular with shorter rentals on mainstream cars.",
    # luxury SUV (category page)
    "\n\n**Optional no-deposit pickup** — a flat AED 200 surcharge replaces the damage hold entirely. Most SUV customers take it because the deposit on cars like the Cullinan or Purosangue is substantial."
)

foreach ($phrase in $toRemove) {
    $before = $content
    # String.Replace counts all matches automatically; for our Porsche pattern it will collapse 6 identical bullets in one call.
    $content = $content.Replace($phrase, '')
    if ($before -ne $content) {
        $hits = ([regex]::Matches($before, [regex]::Escape($phrase))).Count
        $count += $hits
    } else {
        Write-Host "WARNING: no match for: $($phrase.Substring(0, [Math]::Min(80, $phrase.Length)))..."
    }
}

if ($count -gt 0) {
    Set-Content -Path $file -Value $content -NoNewline -Encoding UTF8
    Write-Host "$file — $count removal(s) applied"
} else {
    Write-Host "No changes"
}

# Verify the only remaining AED 200 references are the two intentionally untouched ones (1232, 1386)
Write-Host ""
Write-Host "Remaining 'AED 200' / '200 AED' mentions in money-pages.ts:"
Select-String -Path $file -Pattern 'AED 200|200 AED' | ForEach-Object {
    Write-Host "  line $($_.LineNumber): $($_.Line.Substring(0, [Math]::Min(160, $_.Line.Length)))..."
}
