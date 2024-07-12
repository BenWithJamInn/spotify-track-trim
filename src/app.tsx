import ReactDOMType from "react-dom";
import ReactType from "react";
import {ChevronBar, PlayBackBar} from "./components/PlayBackBar";

const ReactDOM = Spicetify.ReactDOM as typeof ReactDOMType;
const React = Spicetify.React as typeof ReactType

async function App() {
  if (!(Spicetify.Player && Spicetify.React && Spicetify.ReactDOM && Spicetify.ReactComponent && Spicetify.showNotification)) {
		setTimeout(App, 10);
		return;
	}
  const barLower = document.querySelector(".progress-bar") as HTMLElement
  const barUpper = document.querySelector(".playback-progressbar-container") as HTMLElement
  if (!(barLower && barUpper)) {
    Spicetify.showNotification("Failed to load track-trim: Playback bar not found!")
		return;
	}

  TrackTrim.barOverlay.id = "playback-bar-overlap"
  TrackTrim.barOverlay.style.position = "absolute"
  TrackTrim.barOverlay.style.width = "100%"
  TrackTrim.barOverlay.style.height = "100%"
  barLower.style.position = "relative"
  barLower.append(TrackTrim.barOverlay);
  TrackTrim.internalProgressBar = barLower

  TrackTrim.dragBlock.id = "playback-bar-drag-block"
  TrackTrim.dragBlock.style.position = "absolute"
  TrackTrim.dragBlock.style.width = "100%"
  TrackTrim.dragBlock.style.height = "100%"
  barUpper.style.position = "relative"
  barUpper.append(TrackTrim.dragBlock)

  const ignored1 = (async () => ReactDOM.render(<PlayBackBar />, TrackTrim.barOverlay))()
  const ignored2 = (async () => ReactDOM.render(<ChevronBar />, TrackTrim.dragBlock))()

  // initalise spotify trim
  TrackTrim.init()
  const id = setInterval(() => {
    if (Spicetify.Player.data.item) {
      TrackTrim.renderTrims(Spicetify.Player.data.item.uid)
      clearInterval(id)
    }
  }, 1000)
}

class TrackTrim {
  private static trims: { [key: string]: Trim[]} = {}
  private static _updateActiveTrims: ((trims: Trim[]) => void) | null = null;
  private static _barOverlay: HTMLDivElement = document.createElement("div");
  private static _internalProgressBar: HTMLElement
  public static dragBlock: HTMLDivElement = document.createElement("div");
  private static _lastX: number = 0;
  private static handlingCooldown: number = 0;

  public static init() {
    this._barOverlay.addEventListener("contextmenu", (event) => {
      this._lastX = event.clientX
    })

    visualViewport!.addEventListener("resize", () => {
      this.renderTrims(Spicetify.Player.data.item.uid)
    })

    Spicetify.Player.addEventListener("songchange", () => {
      TrackTrim.renderTrims(Spicetify.Player.data.item.uid)
    })

    Spicetify.Player.addEventListener("onprogress", (event) => {
      // cooldown of 15 events after seeking/skipping as events are sent too fast and can cause seeks to fire twice
      if (this.handlingCooldown > 0) {
        this.handlingCooldown--
        return;
      }
      const timestamp = Spicetify.Player.getProgress();
      const duration = Spicetify.Player.data.item.duration.milliseconds
      const uid = Spicetify.Player.data.item.uid
      const trim = this.getIntersectingTrim(uid, timestamp)
      if (trim == null) {
        return
      }
      trim.incrementSkipCount()
      this.handlingCooldown = 15;
      const seekTimesteamp = this.resolveSongSeek(uid, timestamp, duration, Spicetify.Player.getRepeat() != 2)
      if (seekTimesteamp == duration) {
        Spicetify.Player.next()
      } else {
        Spicetify.Player.seek(seekTimesteamp)
      }
    })
  }

  /**
   * Creates a new trim for a song
   *
   * @param songID
   * @param trimLeft The left timestamp
   * @param trimRight The right timestamp
   */
  public static newTrim(songID: string, trimLeft: number, trimRight: number) {
    if (trimLeft > trimRight) {
      throw new Error("Left trim cannot be greater than right trim")
    }
    if (!this.trims[songID]) {
      this.trims[songID] = []
    }
    const trim = Trim.new(songID, trimLeft, trimRight)
    this.trims[songID].push(trim)
    trim.save()
  }

  /**
   * Removes a trim from a song
   *
   * @param songID
   * @param trimID
   */
  public static removeTrim(songID: string, trimID: string) {
    if (this.trims[songID]) {
      this.trims[songID] = this.trims[songID].filter(trim => trim.trimID !== trimID)
    }
    const savedSong = this.getSavedSong(songID);
    delete savedSong.trims[trimID]
    this.saveSong(savedSong)
    this.renderTrims(songID)
  }

  /**
   * Removes all trims from a song
   *
   * @param songID
   */
  public static removeAllTrims(songID: string) {
    if (this.trims[songID]) {
      this.trims[songID] = []
    }
    const savedSong = this.getSavedSong(songID);
    savedSong.trims = {}
    this.saveSong(savedSong)
    this.renderTrims(songID)
  }

  /**
   * Get the trims for a song
   *
    * @param songID The song ID to get the trims for
   */
  public static getTrims(songID: string): Trim[] {
    const trims = this.trims[songID]
    if (trims) {
      return trims
    }
    const newTrims: Trim[] = []
    Object.entries(this.getSavedSong(songID).trims).forEach(([key, value]) => {
      newTrims.push(new Trim(key, songID, value.dateCreated, value.dateLastUpdated, value.skipCount, value.trimLeft, value.trimRight))
    })
    return newTrims
  }

  /**
   * Retrieve the saved song from local storage
   * @param songID
   */
  public static getSavedSong(songID: string): SavedSong {
    let result = Spicetify.LocalStorage.get(`track-trim:trims:${songID}`)
    if (!result) {
      const date = new Date().toISOString()
      return  {
        id: songID,
        dateCreated: date,
        dateLastUpdated: date,
        trims: {}
      }
    }
    return JSON.parse(result)
  }

  public static saveSong(song: SavedSong) {
    const string = JSON.stringify(song)
    Spicetify.LocalStorage.set(`track-trim:trims:${song.id}`, string)
  }

  /**
   * Re-renders the chevrons on the playback bar
   *
   * @param songID The song ID to render the trims for
   */
  public static renderTrims(songID: string) {
    if (this._updateActiveTrims) {
      this._updateActiveTrims(this.getTrims(songID) || [])
    }
  }

  /**
   * Get the progress of the playback bar from an x coordinate
   *
   * @param x The x coordinate
   *
   * @return The progress of the playback bar 0-1
   */
  public static getProgressFromX(x: number): number {
    const BB = this.barOverlay.getBoundingClientRect();
    if (x < BB.left) {
      return 0;
    }
    if (x > BB.right) {
      return 1;
    }
    const deltaX = x - BB.x;
    return deltaX / BB.width;
  }

  /**
   * Get the x coordinate of the playback bar at the given progress
   *
   * @param progress The progress of the playback bar 0-1
   *
   * @return The relative x distance from the start of the playback bar
   */
  public static getRelativeXFromProgress(progress: number): number {
    const BB = this.barOverlay.getBoundingClientRect();
    return BB.width * progress;
  }

  /**
   * Search left/right of the timestamp for a suitable end trim point
   *
   * @param songID
   * @param timestamp
   * @param maxTimestamp
   * @param direction
   * @param ignoredID
   */
  public static getNextTimestampJump(songID: string, timestamp: number, maxTimestamp: number, direction: "left" | "right", ignoredID: string | null = null): number {
    const trims = this.getTrims(songID) || []
    const left = direction === "left" // lowest?
    if (trims.length == 0) {
      if (left) {
        return 0
      } else {
        maxTimestamp
      }
    }
    let result = left ? 0 : maxTimestamp
    for (let i = trims.length - 1; i >= 0; i--) {
      if (trims[i].trimID === ignoredID) {
        continue
      }
      if (left) {
        if (trims[i].trimRight < timestamp) {
          result = Math.max(result, trims[i].trimRight)
        }
      } else {
        if (trims[i].trimLeft > timestamp) {
          result = Math.min(result, trims[i].trimLeft)
        }
      }
    }
    const reduction = Math.min(maxTimestamp * 0.05, Math.abs(result - timestamp))
    if (result != 0 && result != maxTimestamp) {
      if (left) {
        result += reduction
      } else {
        result -= reduction
      }
    }
    return result
  }

  /**
   * Returns any intersecting trim with the timestamp
   *
   * @param songID The song ID to check
   * @param timestamp The timestamp to check
   */
  public static getIntersectingTrim(songID: string, timestamp: number): Trim | null {
    const trims = this.getTrims(songID) || []
    for (let trim of trims) {
      if (trim.isTimestampWithinTrim(timestamp)) {
        return trim
      }
    }
    return null
  }

  /**
   * Resolves the seek time for a song, this prevents from seeking into a trimmed section of the song
   *
   * @param songID The song ID
   * @param timestamp The current time stamp
   * @param duration The duration of the song, if the timestamp equals the duration then skip the song
   * @param allowSkip If the song can be skipped, this will be false if the song is on repeat and a timestamp withing
   * the track will be returned
   */
  public static resolveSongSeek(songID: string, timestamp: number, duration: number, allowSkip: boolean): number {
    const trims = this.getTrims(songID) || []
    for (let trim of trims) {
      if (trim.isTimestampWithinTrim(timestamp)) {
        if (duration - trim.trimRight <= 1000 && !allowSkip) {
          return this.resolveSongSeek(songID, 0, duration, true) + 1000
        } else if (trim.trimRight + 1000 >= duration) {
          return duration
        } else {
          return trim.trimRight + 1000
        }
      }
    }
    return timestamp
  }

  static get barOverlay(): HTMLDivElement {
    return this._barOverlay;
  }

  static get lastX(): number {
    return this._lastX;
  }

  static get internalProgressBar(): HTMLElement {
    return this._internalProgressBar;
  }

  static set internalProgressBar(value: HTMLElement) {
    this._internalProgressBar = value;
  }

  static set updateActiveTrims(value: ((trims: Trim[]) => void) | null) {
    this._updateActiveTrims = value;
  }
}

interface SavedSong {
  id: string,
  dateCreated: string,
  dateLastUpdated: string,
  trims: { [key: string]: SavedTrim }
}

interface SavedTrim {
  dateCreated: string,
  dateLastUpdated: string,
  trimLeft: number,
  trimRight: number,
  skipCount: number
}

class Trim {
  public readonly trimID: string;
  public readonly songID: string;
  private readonly _dateCreated: string;
  private _dateLastUpdated: string;
  private _skipCount: number;
  private _trimLeft: number;
  private _trimRight: number;


  constructor(trimID: string, songID: string, dateCreated: string, dateLastUpdated: string, skipCount: number, trimLeft: number, trimRight: number) {
    this.trimID = trimID;
    this.songID = songID;
    this._dateCreated = dateCreated;
    this._dateLastUpdated = dateLastUpdated;
    this._skipCount = skipCount;
    this._trimLeft = trimLeft;
    this._trimRight = trimRight;
  }

  public static new(songID: string, trimLeft: number, trimRight: number) {
    return new Trim(
      Math.random().toString(36).substring(7),
      songID,
      new Date().toISOString(),
      new Date().toISOString(),
      0,
      trimLeft,
      trimRight
    )
  }

  /**
   * Returns true if the progress is within the trim
   *
   * @param timestamp The timestamp to check
   */
  public isTimestampWithinTrim(timestamp: number) {
    return timestamp >= this.trimLeft && timestamp <= this.trimRight;
  }

  private toData(): SavedTrim {
    return {
      dateCreated: this._dateCreated,
      dateLastUpdated: this._dateLastUpdated,
      trimLeft: this._trimLeft,
      trimRight: this._trimRight,
      skipCount: this._skipCount
    }
  }

  /**
   * Save the trim to local storage
   */
  public save() {
    const savedSong = TrackTrim.getSavedSong(this.songID)
    const date = new Date().toISOString()
    savedSong.dateLastUpdated = date
    this._dateLastUpdated = date
    savedSong.trims[this.trimID] = this.toData()
    TrackTrim.saveSong(savedSong)
  }

  /**
   * Increment the skip count
   */
  public incrementSkipCount() {
    this._skipCount++
    this.save()
  }

  get trimLeft(): number {
    return this._trimLeft;
  }

  get trimRight(): number {
    return this._trimRight;
  }

  set trimLeft(value: number) {
    this._trimLeft = value;
    this.save()
  }

  set trimRight(value: number) {
    this._trimRight = value;
    this.save()
  }
}

export default App;
export { TrackTrim, Trim }
