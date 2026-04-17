# Slidetime

[![Get it on the Chrome Web Store](https://developer.chrome.com/static/docs/webstore/branding/image/UV4C4ybeBTsZt43U4xis.png)](https://chromewebstore.google.com/detail/slidetime/ogmlodhmcglfnaphcgojbobkadlbomji)

## What is it?

Slidetime is a lightweight browser extension that allows placeholder phrases to be transformed into live timers, clocks, countdowns, and more in Google Slides presentations. To use it, simply place a text block anywhere on a given slide, input one of the placeholders below, and click present in order to view your timer in action.

`<<time>>` | Displays the current time in the format hh:mm:ss     
`<<date>>` | Displays the current date in the format mm/dd/yyyy    
`<<mm:ss->>` | Displays a countdown to zero starting from mm:ss   
`<<mm:ss+>>` | Displays a stopwatch starting from mm:ss    
`<<~hh:mm>>` | Displays a countdown that reaches zero at hh:mm      
`<<shorttime>>` | Displays the current time in the format hh:mm      
`<<longtime>>` | Displays the current time and date (ex: Tuesday, April 14 at 11:05:00 PM)     
`<<shortdate>>` | Displays the current date, abbreviated (ex: Tue, Apr 14)     
`<<longdate>>` | Displays the current date (ex: Tuesday, April 14, 2026)

## Installation 

You can find this project on the Chrome Web Store, where you can add it to your browser.

Alternatively, you can `git clone` this repository and run `npm run build` in the project directory in order to create a production-ready build. From there, go to `chrome://extensions`, enable developer mode, and select the built folder. We recommend installing via your browser’s extension store for the added convenience of passively receiving updates with all the new features the Slidetime team has planned. 

## Feedback

We’re always looking forward to including new features to make the extension more helpful! Any feedback is appreciated and goes a long way in figuring out how to improve the Slidetime experience. 
