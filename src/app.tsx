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
    Spicetify.showNotification("Failed to load spotify trim: Playback bar not found!")
		return;
	}

  SpotifyTrim.barOverlay.id = "playback-bar-overlap"
  SpotifyTrim.barOverlay.style.position = "absolute"
  SpotifyTrim.barOverlay.style.width = "100%"
  SpotifyTrim.barOverlay.style.height = "100%"
  barLower.style.position = "relative"
  barLower.append(SpotifyTrim.barOverlay);
  SpotifyTrim.internalProgressBar = barLower

  SpotifyTrim.dragBlock.id = "playback-bar-drag-block"
  SpotifyTrim.dragBlock.style.position = "absolute"
  SpotifyTrim.dragBlock.style.width = "100%"
  SpotifyTrim.dragBlock.style.height = "100%"
  barUpper.style.position = "relative"
  barUpper.append(SpotifyTrim.dragBlock)

  const ignored1 = (async () => ReactDOM.render(<PlayBackBar />, SpotifyTrim.barOverlay))()
  const ignored2 = (async () => ReactDOM.render(<ChevronBar />, SpotifyTrim.dragBlock))()

  // initalise spotify trim
  SpotifyTrim.init()
}

class SpotifyTrim {
  private static trims: { [key: string]: Trim[]} = {}
  private static _updateActiveTrims: ((trims: Trim[]) => void) | null = null;
  private static _barOverlay: HTMLDivElement = document.createElement("div");
  private static _internalProgressBar: HTMLElement
  public static dragBlock: HTMLDivElement = document.createElement("div");
  private static _lastX: number = 0;

  public static init() {
    this._barOverlay.addEventListener("contextmenu", (event) => {
      this._lastX = event.clientX
    })

    visualViewport!.addEventListener("resize", () => {
      this.renderTrims(Spicetify.Player.data.item.uid)
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
    this.trims[songID].push(new Trim(trimLeft, trimRight))
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
  }

  /**
   * Get the trims for a song
   *
    * @param songID The song ID to get the trims for
   */
  public static getTrims(songID: string): Trim[] {
    return this.trims[songID] || []
  }

  /**
   * Re-renders the chevrons on the playback bar
   *
   * @param songID The song ID to render the trims for
   */
  public static renderTrims(songID: string) {
    if (this._updateActiveTrims) {
      this._updateActiveTrims(this.trims[songID] || [])
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
    const trims = this.trims[songID] || []
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
    const reduction = Math.min(20000, Math.abs(result - timestamp))
    if (result != 0 && result != maxTimestamp) {
      if (left) {
        result += reduction
      } else {
        result -= reduction
      }
    }
    return result
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

class Trim {
  private readonly _trimID: string;
  private _trimLeft: number;
  private _trimRight: number;

  constructor(trimLeft: number, trimRight: number) {
    this._trimID = Math.random().toString(36).substring(7);
    this._trimLeft = trimLeft;
    this._trimRight = trimRight;
  }

  /**
   * Returns true if the progress is within the trim
   *
   * @param timestamp The timestamp to check
   */
  public isTimestampWithinTrim(timestamp: number) {
    return timestamp >= this.trimLeft && timestamp <= this.trimRight;
  }

  get trimID(): string {
    return this._trimID;
  }

  get trimLeft(): number {
    return this._trimLeft;
  }

  get trimRight(): number {
    return this._trimRight;
  }

  set trimLeft(value: number) {
    this._trimLeft = value;
  }

  set trimRight(value: number) {
    this._trimRight = value;
  }
}

export default App;
export { SpotifyTrim, Trim }
