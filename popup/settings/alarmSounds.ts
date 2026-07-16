interface AlarmSoundSetting {
  id: string
  display: string
  assetLoc: string 
}

const alarmData: AlarmSoundSetting[] = [
  {
    id: "digital_long",
    display: "Digital",
    assetLoc: "assets/sound/digital.ogg"
  },
  {
    id: "xylophone_short",
    display: "Xylophone",
    assetLoc: "assets/sound/xylophone.ogg"
  }
]

export { type AlarmSoundSetting, alarmData}