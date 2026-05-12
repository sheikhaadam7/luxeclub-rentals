# One-off cleanup: remove every mention of "unlimited-mileage upgrade" from site copy.
# Replaces exact-string matches — no regex, no risk of catching unintended text.
# Run from project root: pwsh scripts/strip-mileage-upgrade.ps1

$files = @(
    'lib/money-pages.ts',
    'lib/vehicle-content.ts'
)

$replacements = @(
    # Standalone "What's Included" lines — drop the upgrade sentence entirely
    @(' Unlimited-mileage upgrades are available — recommended if you''re planning Jebel Jais, Hatta, or an Abu Dhabi day trip in the Revuelto or STO.', ''),
    @(' Unlimited-mileage upgrades available — strongly recommended for the F8, 296, or SF90 if you''re planning Jebel Jais or Abu Dhabi day trips.', ''),
    @(' Unlimited-mileage upgrade available and recommended for the GT3 or GT3 RS if you''re planning Jebel Jais — the round-trip is close to 350 km and the standard daily allowance won''t cover it.', ''),
    @(' Unlimited-mileage upgrade available and recommended for family visits where Hatta, Abu Dhabi, or Al Ain day trips are on the itinerary.', ''),
    @(' Unlimited-mileage upgrade available and strongly recommended for the 720S or 765LT if you''re planning a Jebel Jais or Abu Dhabi day trip.', ''),
    @(' Unlimited-mileage upgrade available and recommended for Jebel Jais or Abu Dhabi day trips.', ''),
    @(' Unlimited-mileage upgrade available and strongly recommended if you''re planning Jebel Jais, Abu Dhabi, or any extended UAE tour.', ''),
    @(' Unlimited-mileage upgrade available and strongly recommended for family trips where Abu Dhabi, Al Ain, Hatta, or Ras Al Khaimah day trips are on the itinerary — the Escalade''s fuel consumption is not its strong point but the distance capability is.', ''),
    @(' Unlimited-mileage upgrades are available on daily and weekly rentals if you plan Jebel Jais, Hatta, or an Abu Dhabi day trip.', ''),
    @(' Unlimited-mileage upgrades are available and recommended for Jebel Jais or Abu Dhabi day trips.', ''),
    @(' Unlimited-mileage upgrades are available and recommended if you''re planning Hatta, Jebel Jais, or any Abu Dhabi trip in the same rental.', ''),
    @(' Unlimited-mileage upgrades are available on request and are recommended if you''re planning day trips to Jebel Jais, Hatta, or Abu Dhabi.', ''),
    @(' **Strongly recommended:** take the unlimited-mileage upgrade if you''re planning a Jebel Jais or Abu Dhabi day trip — a Jebel Jais round-trip is ~350 km and the daily allowance won''t cover it.', ''),
    @(' Unlimited-mileage upgrades available and frequently used on the Continental GT for long weekend trips.', ''),
    @(' Unlimited-mileage upgrades available.', ''),
    @(' Unlimited-mileage upgrade available.', ''),

    # BMW pricing line — mid-list mention
    @(', and unlimited-mileage upgrades available on request', ''),

    # FAQ answers — single-sentence recommendations, dropped wholesale
    @(' We also recommend the unlimited-mileage upgrade since the round-trip from Dubai is about 350 km.', ''),
    @(' We strongly recommend the unlimited-mileage upgrade for Abu Dhabi round-trips — the standard 250 km daily allowance barely covers it.', ''),
    @(' We recommend the unlimited-mileage upgrade if you''re planning a weekend trip to Ras Al Khaimah or Abu Dhabi.', ''),
    @(' We recommend the unlimited-mileage upgrade for Abu Dhabi round-trips since the round-trip exceeds the standard 250 km/day allowance.', ''),
    @(' We recommend the unlimited-mileage upgrade for Abu Dhabi round-trips.', ''),
    @(' We recommend the unlimited-mileage upgrade for the round-trip since the standard 250 km/day allowance may not cover it.', ''),

    # Mid-sentence recommendation — preserve surrounding chauffeur clause
    @('We recommend the unlimited-mileage upgrade for Abu Dhabi round-trips, and a chauffeur add-on', 'A chauffeur add-on'),

    # Inline phrases — keep the surrounding sentence intact
    @(', take the unlimited-mileage upgrade,', ','),
    @(', take the unlimited-mileage upgrade (the round-trip is ~350 km),', ','),
    @(', and consider the unlimited-mileage upgrade since the round-trip is around 300 km', ''),
    @(', consider the unlimited-mileage upgrade for the round-trip', ''),
    @(', consider the unlimited-mileage upgrade.', '.'),
    @(', and take the unlimited-mileage upgrade for the round-trip.', '.'),
    @(', take the unlimited-mileage upgrade.', '.'),
    @(' and take the unlimited-mileage upgrade.', '.'),
    @(' with the unlimited-mileage upgrade.', '.'),

    # "Take the unlimited-mileage upgrade..." standalone FAQ sentences
    @(' Take the unlimited-mileage upgrade since the round-trip exceeds the standard 250 km daily allowance.', ''),
    @(' Take the unlimited-mileage upgrade for the round-trip since it exceeds the standard 250 km/day allowance.', ''),
    @(' Take the unlimited-mileage upgrade for any day trip since the Escalade''s daily mileage allowance gets used up quickly on longer family drives.', ''),
    @(' Take the unlimited-mileage upgrade for the round-trip since the standard 250 km/day allowance won''t cover it.', ''),
    @(' Take the unlimited-mileage upgrade for the round-trip.', ''),
    @(' Take the unlimited-mileage upgrade for either trip.', ''),

    # Supercar combined FAQ
    @(' In every case we recommend the unlimited-mileage upgrade — Jebel Jais round-trip from Dubai is ~350 km, Abu Dhabi round-trip is ~280 km, both exceed the standard 250 km daily allowance.', '')
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "Skipping (not found): $file"
        continue
    }
    $original = Get-Content $file -Raw
    $modified = $original
    $changes = 0
    foreach ($pair in $replacements) {
        $old = $pair[0]
        $new = $pair[1]
        $before = $modified
        $modified = $modified.Replace($old, $new)
        if ($before -ne $modified) {
            $hits = ([regex]::Matches($before, [regex]::Escape($old))).Count
            $changes += $hits
        }
    }
    if ($modified -ne $original) {
        Set-Content -Path $file -Value $modified -NoNewline -Encoding UTF8
        Write-Host "$file — $changes replacement(s) applied"
    } else {
        Write-Host "$file — no changes"
    }
}

# Verify nothing slipped through
Write-Host ""
Write-Host "Remaining 'unlimited-mileage' mentions:"
$pattern = 'unlimited.mileage'
foreach ($file in $files) {
    if (Test-Path $file) {
        $matches = Select-String -Path $file -Pattern $pattern -CaseSensitive:$false
        if ($matches) {
            $matches | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" }
        }
    }
}
