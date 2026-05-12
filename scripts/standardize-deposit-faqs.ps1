# One-off: replace each brand-page deposit FAQ answer with the canonical 4-paragraph block.
# Heading (question) stays unchanged — only the answer text changes.
# Per-brand details (specific deposit amounts, AED 200 surcharge etc) intentionally dropped.
#
# Scope: 12 brand-page deposit FAQs in lib/money-pages.ts ONLY.
# Not touched here:
#   - 4 type-page "no-deposit"-themed FAQs (car-rental-dubai, exotic, luxury, supercar) — need separate wording
#   - app/(public)/faq/page.tsx — needs separate wording
#   - /luxury-car-rental-no-deposit-dubai landing page — kept as-is (ranks for that topic)

$canonical = "To secure your reservation, a AED 495 booking confirmation is taken at the time of booking. This guarantees your chosen vehicle today. It is fully deducted from your rental total when you collect the car — not an additional fee.\n\nShould your plans change, you can cancel any time up to 24 hours before your scheduled pickup and the AED 495 will be refunded in full to your original payment method.\n\nA refundable pre-authorisation hold of AED 2,500 is taken on your card at the time of collection. This is a security hold, not a charge — it is released back to your card after the vehicle is returned and inspected.\n\nA no-deposit option is also available on request. Let our team know when booking and we'll arrange it for you."

$file = 'lib/money-pages.ts'
$content = Get-Content $file -Raw
$count = 0

$pairs = @(
    # Ferrari
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (typically AED 1,000–3,000 depending on the vehicle type) is held on your card at pickup for most of the fleet (AED 2,500–4,500), or you can skip the hold entirely with our no-deposit surcharge of AED 200. The SF90 and Purosangue have higher deposit requirements given their values, and we'll walk you through the specifics at booking.", $canonical),
    # Rolls-Royce
    @("Our standard reservation fee is AED 495, paid at booking to secure the vehicle and deducted from your total on pickup day. A damage deposit is held on your card at pickup — the Cullinan Mansory's deposit is higher than the rest of the fleet given the replacement value, and we'll quote the exact figure at booking. You can also opt for our no-deposit surcharge of AED 200 in lieu of the hold, subject to approval for the Cullinan specifically.", $canonical),
    # Bentley
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (AED 2,200–2,500 depending on the Bentley) is held on your card at pickup, or you can skip the hold entirely with our no-deposit surcharge of AED 200. Bentley customers take the no-deposit option more often than average — the simplicity of not having a pre-authorisation on the card is worth the small surcharge.", $canonical),
    # Porsche
    @("Our standard reservation fee is AED 495, paid at booking and deducted from your total on pickup day. A refundable damage deposit (typically AED 1,000–3,000 depending on the vehicle type) is held on your card at pickup, or eligible drivers (aged 23+, with documentation in order) can opt for the no-deposit surcharge of AED 200 in lieu of the hold. The no-deposit option is popular across the Porsche fleet.", $canonical),
    # Mercedes G63
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (AED 1,800) is held on your card at pickup, or you can skip the hold entirely with our no-deposit surcharge of AED 200. The no-deposit option is the most popular choice on G63 rentals because the damage hold would otherwise tie up nearly AED 2,000 of your credit limit.", $canonical),
    # Range Rover
    @("Our standard reservation fee is AED 495, paid at booking and deducted from your total on pickup day. A refundable damage deposit (typically AED 1,000–3,000 depending on the vehicle type) is held on your card at pickup (so AED 1,400–2,500 depending on the Range Rover variant), or you can skip the hold entirely with our no-deposit surcharge of AED 200.", $canonical),
    # McLaren
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (typically AED 1,000–3,000 depending on the vehicle type) is held on your card at pickup (so AED 2,500 on a 570S, AED 5,000 on a 765LT), or you can skip the hold entirely with our no-deposit surcharge of AED 200. The no-deposit option is particularly popular on the 765LT since the damage hold would otherwise tie up AED 5,000 of your credit limit.", $canonical),
    # Aston Martin
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (typically AED 1,000–3,000 depending on the vehicle type) is held on your card at pickup (AED 1,800 for the Vantage, AED 2,500 for the DBX 707), or you can skip the hold entirely with our no-deposit surcharge of AED 200.", $canonical),
    # BMW
    @("No — our standard reservation fee is AED 495, paid at booking time to secure the vehicle. That fee is deducted from your total balance on pickup day. A refundable damage deposit (AED 1,300–2,000 depending on the model) is held on your card at pickup, but you can opt out of that with our no-deposit option for a flat AED 200 surcharge. No large pre-authorisations tying up your credit limit for weeks.", $canonical),
    # Audi
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (typically AED 1,000–3,000 depending on the vehicle type) is held on your card at pickup (so AED 1,000 on an RS3, AED 2,000 on an R8 Spyder), or you can skip the hold entirely with our no-deposit surcharge of AED 200.", $canonical),
    # Maserati
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (AED 2,000 for the MC20) is held on your card at pickup, or you can skip the hold entirely with our no-deposit surcharge of AED 200.", $canonical),
    # Cadillac Escalade
    @("Our standard reservation fee is AED 495 at booking, deducted from your total on pickup day. A refundable damage deposit (AED 1,500) is held on your card at pickup, or you can skip the hold entirely with our no-deposit surcharge of AED 200.", $canonical)
)

foreach ($pair in $pairs) {
    $before = $content
    $content = $content.Replace($pair[0], $pair[1])
    if ($before -ne $content) {
        $count++
    } else {
        Write-Host "WARNING: no match for excerpt starting: $($pair[0].Substring(0, [Math]::Min(80, $pair[0].Length)))..."
    }
}

if ($count -gt 0) {
    Set-Content -Path $file -Value $content -NoNewline -Encoding UTF8
    Write-Host "$file — $count of 12 replacement(s) applied"
} else {
    Write-Host "No replacements made"
}
