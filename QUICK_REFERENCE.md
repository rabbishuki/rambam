# Daily Rambam API - Quick Reference

## Step 1: Get today's ref

```
GET https://www.sefaria.org/api/calendars
```

Or for a specific date:

```
GET https://www.sefaria.org/api/calendars?day=1&month=2&year=2026
```

**Parameters:**
- `day` - 1-based day of month
- `month` - 1-based month
- `year` - 4-digit year

```js
const url = response.calendar_items.find(x => x.title.en === "Daily Rambam (3 Chapters)")?.url
```

## Step 2: Get the text

```
GET https://www.sefaria.org/api/v3/texts/{url}
```

### Response structure

- `versions[0].text` → array of הלכות (Hebrew with nikud)
- Each array element = one הלכה

## Hebrew Date Converter
GET https://www.hebcal.com/converter?cfg=json&date=2026-02-03

Response: { heDateParts: { d: "ט״ז", m: "שבט", y: "תשפ״ו" }, hebrew: "ט״ז בִּשְׁבָט תשפ״ו", events: [...] }

## Zmanim (Sunset Time)
GET https://www.hebcal.com/zmanim?cfg=json&latitude=32.0853&longitude=34.7818&date=2026-02-03

Response: { times: { sunset: "2026-02-03T17:16:00+02:00", ... } }
