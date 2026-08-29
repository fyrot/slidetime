# Changelog 

## 1.3.3

### Fixed
- Resolved bug where slower networks would miss the first registration of timers on the first-loaded slide
- Improved slide responsiveness by checking for both slide changes and content changes periodically  

## 1.3.2

### Added

- New review link in personalization tab that redirects to browser/store-dependent listing 

### Changed

- The <<time>> text now maps to "hh:mm am/pm" (previously "hh:mm:ss am/pm")
- The <<shorttime>> text now maps to "hh:mm:ss am/pm" (previously "hh:mm am/pm")

## 1.3.1

### Added

- New personalization disabled border parameter for all themes for better contrast

- Internal: uploaded the new screenshot promotional material to the codebase (not bundled with extension builds)

### Changed

- Changed the blue accent color in the Air theme to be slightly darker
- Adjusted the opacity of the navigation header and other surfaces in the Ghost theme

- Internal: kept store description up-to-date with the back-up copy 

### Fixed 

- Resolved visual bug where double the margin would appear between the "Timer Alarm" and "Pause/Play" settings cards  

## 1.3.0

### Added

- New theme (Ghost) that is also the new default, Air is kept as an alternate theme
- New alarm sound (xylophone) for the sound-when-zero timer setting
- New option that appears when sound-when-zero is on to select preferred alarm sound

- Internal: new component to allow selection from a list
- Internal: local storage cache system to allow for  
- Internal: store listing redesign with screenshots

### Changed

- The presented order of the themes has changed

All items listed *underneath* a version header are associated with that version and the changes it introduced. 
<!-- this is a changelog file that will loosely model the keepachangelog "standard", grouping changes by release order  -->

## 1.2.0

### Added

- New setting implemented to allow timers play a preset sound when they hit zero 
- Reference cards now allow click-to-copy; commands can be copied from the extension window 

### Changed

- Shortened description for the "Pause/Play Timer" setting

## 1.1.0

### Added

- New ability to specify the ID of a timer via the "id=blah" flag. This enables timers on separate slides to share the same if configured to identical ids. For example, two stopwatches on two separate slides would reflect the same time and have increases reflected on both. 

### Changed

- Internal: in accordance with manifest v3 paradigms for extensions, the background store worker now acts as a cache for the true timer state database, which is now session storage
- Internal: flags are now distinguished by an array of applied flags
- Internal: applied flags now can carry values other than booleans 
- Internal: slide IDs are stored as an array to allow timers to update on multiple slides 

### Fixed

- Fixed major bug where a presentation placed in the background for too long (>30 secs) would cause extension scripts to fall asleep or be deactivated by Chrome, losing content-background state and rendering already-registered timers frozen; tldr: bug stemmed from inactive/background tab leading Chrome to remove the background service worker, which the local content script would sync with even on a disconnected port, leaving the DOM stuck because no new times could be written.

## 1.0.2 

### Added

- New support for playing & pausing timers via an optional input, driven by key events ('y') if enabled.

## 1.0.1

### Added

- New ability to select the extension's toolbar icon in the personalization screen
- New <<datetime>> placeholder
- New UI for a planned setting where running timers on a slide can be paused/resumed
- New ability to make timer components perpetual (continue to tick while not presenting their respective slide) and/or resettable (restart when navigating to/from). This feature can be used by appending 'p' or 'r' inside the existing placeholder. For example, <<0:00+>> -> <<0:00+p>>. 

### Changed

- <<shortdate>> now omits the year in its output when presented
- Extension icon is now disjoint/independent from the selected theme
- <<~mm:ss>>, or "timeto", is no longer a wrapper for the standard "countdown" (mm:ss-). The time until is recalculated on slide navigation. 
- <<longtime>> now renders the millisecond component of the time in place of including the date. Changes reflected in reference. 
- Scroll behavior in the popup now returns to the top of the page when navigating between menus. 

## 1.0.0 (Initial release)

