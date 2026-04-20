# Changelog 

All items listed *underneath* a version header are associated with that version and the changes it introduced. 
<!-- this is a changelog file that will loosely model the keepachangelog "standard", grouping changes by release order  -->

## 1.0.3

### Added

- New ability to specify the ID of a timer via the "id=blah" flag. This enables timers on separate slides to share the same if configured to identical ids. For example, two stopwatches on two separate slides would reflect the same time and have increases reflected on both. 

### Changed

- Internal: flags are now distinguished by an array of applied flags
- Internal: applied flags now can carry values other than booleans 
- Internal: slide IDs are stored as an array to allow timers to update on multiple slides 

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

