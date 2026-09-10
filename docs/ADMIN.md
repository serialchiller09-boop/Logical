# Plant data, admin access and how the two kinds of content differ

Logical separates **reference content** (what a standard or a vendor manual says) from **plant content**
(what *your* facility decided). They live in different places and change through different doors. This is the
whole model:

| | reference content | plant content |
|---|---|---|
| where it is authored | `server/src/seed/data/*.js` (version controlled) | the **Plant data** screen (`/admin`) → SQLite |
| who can change it | you, in git, with a code review | anyone holding the admin token, at the keyboard |
| after a reseed | replaced from source | kept, and flagged `edited` |
| badge shown | `standard-defined` / `practice` / `vendor` / `unverified` … | plus `edited from reference` |
| personal state (bookmarks, notes, recents) | — | always kept; never part of the seed |

## The admin token

All write endpoints are guarded:

```
PUT    /api/admin/entries/:id
POST   /api/admin/entries
DELETE /api/admin/entries/:id
GET    /api/admin/diff/:id
POST   /api/admin/revert/:id
POST   /api/admin/reseed
GET    /api/admin/export
```

The guard compares the `x-admin-token` request header with `process.env.ADMIN_TOKEN`.

```bash
# 1. give the server a real token
ADMIN_TOKEN='something-you-would-not-guess' npm start

# 2. open the UI, go to Plant data, and paste that value into the unlock box.
#    It is kept in this browser's localStorage only (key: logical.adminToken)
#    and is sent as a header on admin calls.
```

If `ADMIN_TOKEN` is **not** set, the server logs a warning on boot and accepts the development default
`logical-admin`. That is convenient on a laptop and wrong on a shared machine — anyone who can reach the
port can rewrite the register. Either set a token, or don't expose the port.

There is no user accounts model: this is a single-install working tool. If you put it on a shared server,
put it behind your normal auth (reverse proxy, SSO, VPN) and treat the token as a break-glass secret, not as
the access control.

## What an edit does

`PUT /api/admin/entries/:id` writes only the fields you send, then sets `edited = 1`:

```jsonc
{
  "title": "C — user's choice",
  "body": "On this plant the suffix C means compressor stage. Instrument letter C is still user's choice.",
  "status": "site-specific",
  "tags": ["tag register", "rev 4"],
  "plantNote": "Confirmed against tag register rev 4, 2023-11. Do not use for the flare knockout."
}
```

* `plantNote` is stored inside the entry `payload`, and the entry page shows it in a warning box — so the plant
  answer appears **next to** the generic definition instead of replacing it silently.
* `GET /api/admin/diff/:id` compares the row with what `server/src/seed/*` currently says, field by field.
* `POST /api/admin/revert/:id` puts the shipped text back and clears the `edited` flag.
* `DELETE /api/admin/entries/:id` only deletes rows **you** created. Reference rows refuse to be deleted and
  tell you to revert instead — a missing definition in a shared install is worse than a wrong one.

## Reseeding

```bash
npm run seed            # fill an empty database (no-op if already seeded)
npm run seed:force      # re-apply reference content from source; plant rows survive
npm run seed:reset      # delete the database file, then seed from scratch
```

`seed:force` replaces rows where `edited = 0` and leaves `edited = 1` rows alone; bookmarks and notes are
preserved (bookmarks pointing at vanished ids are dropped rather than left dangling). `seed:reset` deletes the
SQLite file, which **does** take your bookmarks and notes with it — export first (`GET /api/admin/export`, or
the Export button) if you want to keep them.

The database path is `server/data/logical.db` (gitignored). Override with `LOGICAL_DB=/path/to.db`, or move the
whole data directory with `LOGICAL_DATA_DIR=/var/lib/logical`.

## Recording plant-specific answers well

The point of the editor is not to "fix" the reference — it is to make your deviation visible:

1. Say **what** your plant does, in the body.
2. Say **where it says so**: tag register + revision, spec clause, C&E matrix sheet, panel drawing number.
3. Set the status to `site-specific` when the meaning is only true at your facility. Do not promote it to
   `standard-defined` because that is exactly how a local convention turns into a "fact" the next shift acts on.
4. Keep the generic definition in place if it still matters (e.g. "ISA-5.1 leaves C to the user"), and put the
   plant meaning in the note so the deviation is visible as a deviation.
5. If your answer contradicts a standard, that is a finding for engineering, not a text edit. Record it, then
   route it through management of change.

## No numbers, in either direction

The app will not supply setpoints, alarm limits, relief settings, stroke times, or process conditions, and the
admin editor is not a place to publish them either — a plant value entered here is a note to your own crew, with
your own document cited next to it. Anything numeric in the reference is definitional arithmetic
(`4–20 mA` mapping, `psia = psig + atmospheric`, `Kc = 100/PB`, IEC bit widths, `MMBtu/d = Mcf/d × Btu/scf ÷ 1000`)
and each such entry says so on its face.
