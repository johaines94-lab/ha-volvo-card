# Volvo Car Card

A [Home Assistant](https://www.home-assistant.io/) Lovelace card for vehicles exposed by the
[Volvo integration](https://www.home-assistant.io/integrations/volvo/), styled after the layout of
the official Volvo app. Works with combustion, plug-in hybrid, and full-electric Volvos — the card
figures out which stats to show based on which entities you give it, so the same card works whether
you drive a gas XC60 or an electric EX30.

The car render is pulled automatically for your specific vehicle from your Volvo account (see
[The image backend](#the-image-backend-required-separately--not-part-of-the-hacs-install) below),
cropped the same way as in the app, alongside a headline range/battery stat, a secondary fuel/
electric stat, lock/charging status text, and (for PHEV/BEV) a charging pulse animation and
charge-cable overlay when plugged in.

## Screenshots

![All card states](assets/volvo-card-overview.jpg)

| | Light | Dark |
|---|---|---|
| Parked | ![Parked, light mode](assets/light-mode-parked.jpg) | ![Parked, dark mode](assets/dark-mode-parked.jpg) |
| Plugged in | ![Plugged in, light mode](assets/light-mode-plugged-in.jpg) | ![Plugged in, dark mode](assets/dark-mode-plugged-in.jpg) |
| Charging | ![Charging, light mode](assets/light-mode-charging.jpg) | ![Charging, dark mode](assets/dark-mode-charging.jpg) |

## Installation

There are two ways to install the card. Pick whichever you're more comfortable with — both end up
in the same place.

### Option 1: Add as a custom repository (recommended if you have HACS)

1. Open **HACS** in your Home Assistant sidebar, then go to the **Frontend** section.
2. Click the **⋮** menu (top right) → **Custom repositories**.
3. Paste in this repository's URL, set **Category** to `Dashboard`, then click **Add**.
4. Search for **Volvo Car Card** in HACS → Frontend, open it, and click **Download**.
5. Reload your browser tab (or restart Home Assistant) so the new card is picked up.

### Option 2: Add manually (no HACS needed)

1. Download `volvo-car-card.js` from this repository (**Code → Download ZIP**, then unzip, or grab
   the file directly from the [repo](.)).
2. Copy `volvo-car-card.js` into the `www` folder inside your Home Assistant `config` directory
   (create a `www` folder there if it doesn't exist yet — e.g. `config/www/volvo-car-card.js`).
3. In Home Assistant, go to **Settings → Dashboards**, click the **⋮** menu (top right) →
   **Resources**.
4. Click **Add Resource**, set the URL to `/local/volvo-car-card.js` and the type to
   **JavaScript Module**, then click **Create**.

### Add the card to a dashboard

Once installed (via either option above), edit any dashboard, click **Add Card**, choose
**Manual**, and paste in a config like the one below — or add it as `type: custom:volvo-car-card`
directly (see config below).

## Card config

Every entity is optional — **which entities you set determines the vehicle type**:

- Set `battery` + `distance_to_empty_battery` **and** `fuel_amount` + `distance_to_empty_tank` → **hybrid** UI (charging states, fuel + electric sub-stats).
- Set only the battery ones → **BEV** UI (charging states, no fuel line).
- Set only the fuel ones → **ICE** UI (no charging states, no pulse/cable, just range + fuel %).

```yaml
type: custom:volvo-car-card
name: XC90                      # optional label above the header
entities:
  battery: sensor.volvo_xc90_battery
  distance_to_empty_battery: sensor.volvo_xc90_distance_to_empty_battery
  distance_to_empty_tank: sensor.volvo_xc90_distance_to_empty_tank
  fuel_amount: sensor.volvo_xc90_fuel_amount
  fuel_tank_capacity_l: 50          # static number — no HA entity for this
  charging_connection_status: sensor.volvo_xc90_charging_connection_status
  charging_status: sensor.volvo_xc90_charging_status
  lock: lock.volvo_xc90_lock
  location: device_tracker.volvo_xc90_location
  start_climatisation: button.volvo_xc90_start_climatisation   # optional — adds a climate button to the tap dialog
  stop_climatisation: button.volvo_xc90_stop_climatisation      # optional — needed to turn climate back off
images:
  exterior_back: sensor.volvo_xc90_images        # entity whose `exterior_back` attribute holds a URL
  exterior_side_left: sensor.volvo_xc90_images    # entity whose `exterior_side_left` attribute holds a URL
  fallback: /local/assets/volvo-xc90.png          # shown if the attribute is empty
```

For an EV, just drop the `fuel_amount` / `distance_to_empty_tank` / `fuel_tank_capacity_l` keys.
For a gas-only car, drop the `battery` / `distance_to_empty_battery` /
`charging_connection_status` / `charging_status` keys.

Entity IDs are never hardcoded in the card — HA generates them per-vehicle/per-account, so they're
always config, not code. This also means the card works with more than one Volvo: add one card
instance per vehicle, each pointing at that vehicle's own entities.

Tapping the card opens a small dialog with a lock toggle (shown when `lock` is set) and a climate
toggle (shown when either `start_climatisation` or `stop_climatisation` is set — the Volvo
integration exposes these as momentary `button.*` entities, not a single on/off switch, so the card
tracks the on/off state itself and presses whichever button matches).

## The image backend (required separately — not part of the HACS install)

The Volvo integration can hand back a signed, temporary render URL for your car
(`volvo.get_image_url`), but a Lovelace card is pure frontend JS — it can't call HA service actions,
so it can't fetch and cache that image itself. That has to happen in your own `configuration.yaml`
(or a packages file), once, and the card just reads whatever local path the result ends up at.

Add this to your Home Assistant config (adjust `entry` to your own Volvo config-entry ID, found in
the URL bar under **Settings → Devices & Services → Volvo**, `#config_entry=...`):

```yaml
downloader:
  download_dir: assets/volvo   # anywhere under /config that maps to /local

template:
  - trigger:
      - trigger: homeassistant
        event: start
    action:
      - action: volvo.get_image_url
        data:
          entry: <VOLVO_CONFIG_ENTRY_ID>
          images:
            - exterior_back
            - exterior_side_left
        response_variable: volvo_images
      - action: downloader.download_file
        data:
          url: >-
            {{ volvo_images.images | selectattr('type','eq','exterior_back') | map(attribute='url') | first | default('') }}
          filename: exterior-back.jpg
          overwrite: true
      - action: downloader.download_file
        data:
          url: >-
            {{ volvo_images.images | selectattr('type','eq','exterior_side_left') | map(attribute='url') | first | default('') }}
          filename: exterior-side-left.jpg
          overwrite: true
    sensor:
      - name: "Volvo Images"
        unique_id: volvo_images
        state: "ok"
        attributes:
          exterior_back: "/local/assets/volvo/exterior-back.jpg"
          exterior_side_left: "/local/assets/volvo/exterior-side-left.jpg"
```

Notes:
- `volvo.get_image_url` returns `{"images": [{"type": "exterior_back", "url": "..."}, ...]}` — a
  list keyed by `type`, not a flat dict.
- This trigger only fires on HA start, so the renders are fetched once and cached locally — a full
  restart is needed to re-pull if Volvo ever rotates the URLs (they're effectively static per
  vehicle, so this is intentional).
- Uses the core `downloader` integration rather than a shell command, so it works regardless of
  what actually runs your HA (HAOS, Docker, a Pi, Windows, ...).
- If you don't want to set this up, just omit `images` from the card config (or point `fallback` at
  a static image you host yourself) — everything else still works.

## Development

```
npm install
npm run build     # outputs volvo-car-card.js at the repo root
npm run watch      # rebuild on change
```
