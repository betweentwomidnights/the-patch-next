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

- **name**: the etsy title up to the first ` - `, lowercased. etsy titles are
  written for etsy search, so "Custom 3D Printed Drink Coasters - Multi-Color
  Logos and Designs - …" becomes "custom 3d printed drink coasters". usually you'll
  want a proper site name in the overrides instead (see below).
- **photos**: all of them, in etsy's order. the first is the big one. square photos
  look best. etsy's photo alt text is used if you fill it in.
- **price**: etsy's price, as "from $8" when the listing has variations (the
  lowest variation price).
- **blurb**: the first paragraph of the description, lowercased and cut around
  200 characters. again, the overrides are where the real site copy goes.
- "only N left" when 3 or fewer are in stock.

with a single item in the shop, it gets the big layout on its own.

## site copy

the etsy listing is written for etsy: keyword-heavy titles and descriptions help
people find it there, so keep doing that on etsy. the site speaks in the
patch's own voice, so every item should get a site `name` and `blurb` in the
overrides file below. the rules:

- **lowercase.** names, blurbs, everything. keep capitals only where a name
  really has them (LoRA, YuE2, ACE-Step). overrides are shown exactly as written;
  text pulled from etsy is lowercased automatically.
- **name**: what the thing is, as short as it can be. one or two words beats a
  sentence. "coasters", not "custom 3d printed drink coasters".
- **blurb**: one line, said the way you'd say it out loud. why it exists beats
  what it's made of.
- **no sales talk.** no "upgrade your desk", no exclamation marks, no keyword
  lists. that's etsy's job.

the coasters are the example to match:

| | etsy | site |
| --- | --- | --- |
| name | Custom 3D Printed Drink Coasters - Multi-Color Logos and Designs - … | coasters |
| blurb | Upgrade your desk, studio, or home bar with our custom multi-color 3D printed drink coasters! | support open source music software, get a dope throne for your coffee. |

## site-only tweaks: `src/app/lib/merch-overrides.json`

for things etsy has no field for. keys are etsy listing ids (the number in the
listing url, `etsy.com/listing/<id>/...`). every field is optional, and an empty
file (`{}`) means everything is automatic.

```json
{
  "4619641566": {
    "name": "coasters",
    "blurb": "support open source music software, get a dope throne for your coffee."
  }
}
```

every field, for reference:

```json
{
  "<listing id>": {
    "name": "short lowercase name",
    "blurb": "one lowercase line",
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

when a new listing goes up on etsy, the PR to open is: add its listing id with a
`name` and `blurb` that follow the copy rules above. until it merges, the site
shows the item with its etsy text, lowercased.

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
