# merch

the merch page at [thecollabagepatch.com/merch](https://thecollabagepatch.com/merch)
reads our etsy shop ([etsy.com/shop/thecollabagepatch](https://www.etsy.com/shop/thecollabagepatch))
through etsy's api. etsy is the source of truth, and checkout, shipping and
sales tax all happen there.

## what happens automatically

the site refreshes from etsy every 10 minutes. no code change, no deploy.

| do this on etsy | the site does this |
| --- | --- |
| publish a listing | it shows up on /merch |
| edit the title, price, photos or description | the card updates |
| deactivate it, or it sells out | it disappears |
| feature it in the shop | it moves to the front (featured order wins) |
| put it in a shop section | the section name shows on the card, and items group by section order |

what the card shows:

- **name**: the etsy title up to the first ` - `. etsy titles are written for etsy
  search, so "Custom 3D Printed Drink Coasters - Multi-Color Logos and Designs - …"
  becomes "Custom 3D Printed Drink Coasters". start the title with the name you
  want on the site.
- **photos**: all of them, in etsy's order. the first is the big one. square photos
  look best. etsy's photo alt text is used if you fill it in.
- **price**: etsy's price, as "from $8" when the listing has variations (the
  lowest variation price).
- **blurb**: the first paragraph of the description, cut around 200 characters.
- "only N left" when 3 or fewer are in stock.

with a single item in the shop, it gets the big layout on its own.

## site-only tweaks: `src/app/lib/merch-overrides.json`

for things etsy has no field for. keys are etsy listing ids (the number in the
listing url, `etsy.com/listing/<id>/...`). every field is optional, and an empty
file (`{}`) means everything is automatic.

```json
{
  "4619641566": {
    "name": "gary coasters",
    "blurb": "a one-liner just for the site",
    "size": "large",
    "order": 1,
    "hide": false
  }
}
```

- `name`, `blurb`: replace the automatic ones on the site only. etsy is unchanged.
- `size`: `"large"` makes a big tile that spans the grid.
- `order`: lower comes first. items without one follow in etsy's order.
- `hide`: `true` keeps a listing off the site while it stays on etsy.

changing this file needs a pull request, since merging to `main` deploys the
site. an agent can open the PR (edit the file, nothing else); kev reviews and
merges it. ids that no longer exist are ignored, so stale entries are harmless.

## setup notes

- the site uses a read-only etsy **seller app** key in `ETSY_API_KEY`
  (`keystring:shared_secret`), in `.env.local` on the VM and on dev machines.
  never commit it, and don't hand it to other tools: it's for the website only.
  creating or editing listings through the api needs a separate OAuth setup.
- without the key the page shows a link to the etsy shop instead of the grid.
- etsy's api terms ask for a contact email, a privacy policy and terms on the
  page, and the line "The term 'Etsy' is a trademark of Etsy, Inc. This
  application uses the Etsy API but is not endorsed or certified by Etsy, Inc."
  all of those are on /merch. keep them if you redesign the page.
- the code is in `src/app/lib/etsy.ts` and `src/app/(site)/merch/`.
