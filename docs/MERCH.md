# merch

the merch page at [thecollabagepatch.com/merch](https://thecollabagepatch.com/merch)
reads our etsy shop ([etsy.com/shop/thecollabagepatch](https://www.etsy.com/shop/thecollabagepatch))
through etsy's api. etsy is the source of truth, and checkout, shipping and
sales tax all happen there.

## the short version

- **publishing on etsy is the whole job.** a new listing shows up on the site by
  itself within about 10 minutes. no pull request, no deploy.
- **write the listing so the site can read it** (see below): start the title
  with a short name followed by ` - `, and make the description's first paragraph
  a one-line blurb. then the site copy is right with no extra steps.
- **pull requests are the exception.** they're only for things etsy can't hold:
  a big tile, a custom order, hiding something from the site, or site copy that
  has to differ from the listing.

## what happens automatically

the site refreshes from etsy every 10 minutes.

| do this on etsy | the site does this |
| --- | --- |
| publish a listing | it shows up on /merch |
| edit the title, price, photos or description | the card updates |
| deactivate it, or it sells out | it disappears |
| feature it in the shop | it moves to the front (featured order wins) |
| put it in a shop section | the section name shows on the card, and items group by section order |

## writing a listing the site can read

the site builds each card from two parts of the etsy listing:

- **name** = the title up to the first ` - ` (space, dash, space; ` | ` and long
  dashes work too).
- **blurb** = the description's first paragraph, up to the first blank line
  (cut around 200 characters).

both are shown lowercase on the site. etsy keeps exactly what you typed.

that means one listing can serve both places. etsy wants keyword-heavy titles and
descriptions so people find it in search, and the site wants a short name and one
line in the patch's voice. put the site's part first and etsy's part after it:

```
title:
Coasters - Custom 3D Printed Drink Coasters - Multi-Color Logos and Designs - 90mm Bar and Desk Coaster

description:
support open source music software, get a dope throne for your coffee.

Upgrade your desk, studio, or home bar with our custom multi-color 3D printed
drink coasters! ...the rest of the etsy copy...
```

on the site that card reads **coasters**, with "support open source music
software, get a dope throne for your coffee." everything after the first ` - `
and after the first blank line is still there for etsy search.

if a title has no ` - `, the whole title becomes the name. if the description
has no blank line, its opening becomes the blurb. that works, but it usually
reads like an ad on the site.

### the copy rules

these are for the name and the first-paragraph blurb (and for overrides):

- **lowercase.** the site lowercases text from etsy anyway, so write it the way
  it'll look. keep capitals only where a name really has them (LoRA, YuE2,
  ACE-Step). those only survive in overrides, which are shown exactly as written.
- **name**: what the thing is, as short as it can be. one or two words beats a
  sentence. "coasters", not "custom 3d printed drink coasters".
- **blurb**: one line, said the way you'd say it out loud. why it exists beats
  what it's made of.
- **no sales talk** in the name or blurb. no "upgrade your desk", no exclamation
  marks, no keyword lists. that belongs in the rest of the etsy listing.

## what else the card shows

- **photos**: all of them, in etsy's order. the first is the big one. square photos
  look best. etsy's photo alt text is used if you fill it in.
- **price**: etsy's price, as "from $8" when the listing has variations (the
  lowest variation price).
- **section**: the etsy shop section's name, as a small label.
- "only N left" when 3 or fewer are in stock.

with a single item in the shop, it gets the big layout on its own.

## when a pull request is needed: `src/app/lib/merch-overrides.json`

this file is for things etsy has no field for. keys are etsy listing ids (the
number in the listing url, `etsy.com/listing/<id>/...`). every field is
optional, and an empty file (`{}`) means everything comes from etsy.

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

- `name`, `blurb`: site-only text. an override **wins** over the etsy listing,
  so once one is set, editing the etsy title or description no longer changes
  the site. use these when the site copy has to differ from the listing, or needs
  capitals the lowercasing would remove. otherwise, write it on etsy instead.
- `size`: `"large"` makes a big tile that spans the grid.
- `order`: lower comes first. items without one follow in etsy's order.
- `hide`: `true` keeps a listing off the site while it stays on etsy.

the coasters (`4619641566`) currently have a `name` and `blurb` override, because
the listing went up before this convention. once the etsy listing is rewritten
the way shown above, that override can be deleted in a PR. the site will look the
same, and from then on the etsy listing is the only place to edit.

how the PR works: merging to `main` deploys the site, so an agent can open the PR
(edit this file, nothing else) and kev reviews and merges it. ids that no longer
exist are ignored, so stale entries are harmless.

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
