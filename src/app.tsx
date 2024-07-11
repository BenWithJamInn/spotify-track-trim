import ReactDOMType from "react-dom";
import ReactType from "react";
import {PlayBackBar} from "./components/PlayBackBar";
import {Simulate} from "react-dom/test-utils";

const ReactDOM = Spicetify.ReactDOM as typeof ReactDOMType;
const React = Spicetify.React as typeof ReactType

async function App() {
  if (!(Spicetify.Player && Spicetify.React && Spicetify.ReactDOM && Spicetify.ReactComponent && Spicetify.showNotification)) {
		setTimeout(App, 10);
		return;
	}
  const bar = document.querySelector(".progress-bar") as HTMLElement
  if (!(bar)) {
    Spicetify.showNotification("Failed to load spotify trim: Playback bar not found!")
		return;
	}


  SpotifyTrim.barOverlay.id = "playback-bar-overlap"
  SpotifyTrim.barOverlay.style.position = "absolute"
  SpotifyTrim.barOverlay.style.width = "100%"
  SpotifyTrim.barOverlay.style.height = "100%"
  bar.style.position = "relative"
  bar.append(SpotifyTrim.barOverlay);

  const _ = (async () => ReactDOM.render(<PlayBackBar />, SpotifyTrim.barOverlay))()

  // initalise spotify trim
  SpotifyTrim.init()
}

class SpotifyTrim {
  private static trims: { [key: string]: Trim[]} = {}
  private static _updateActiveTrims: ((trims: Trim[]) => void) | null = null;
  private static _barOverlay: HTMLDivElement = document.createElement("div");
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
   */
  public static getNextTimestampJump(songID: string, timestamp: number, maxTimestamp: number, direction: "left" | "right"): number {
    const trims = this.trims[songID] || []
    const left = direction === "left"
    if (trims.length == 0) {
      if (direction === "left") {
        return 0
      } else {
        return maxTimestamp
      }
    }
    let minTimestamp = left ? 0 : maxTimestamp
    let currentMinDelta = maxTimestamp
    for (let trim of trims) {
      if (left) {
        let delta = timestamp - trim.trimRight;
        if (trim.trimRight < timestamp && delta < currentMinDelta) {
          minTimestamp = trim.trimRight
          currentMinDelta = delta
        }
      } else {
        let delta = trim.trimLeft - timestamp;
        if (trim.trimLeft > timestamp && delta < currentMinDelta) {
          minTimestamp = trim.trimLeft
          currentMinDelta = delta
        }
      }
    }
    console.log("max", maxTimestamp, "min", minTimestamp)
    if (minTimestamp != 0 && minTimestamp != maxTimestamp) {
      if (left) {
        minTimestamp += 20000
      } else {
        minTimestamp -= 20000
      }
    }
    return minTimestamp
  }

  static get barOverlay(): HTMLDivElement {
    return this._barOverlay;
  }

  static get lastX(): number {
    return this._lastX;
  }

  static set updateActiveTrims(value: ((trims: Trim[]) => void) | null) {
    this._updateActiveTrims = value;
  }
}

class Trim {
  private readonly _trimID: string;
  private readonly _trimLeft: number;
  private readonly _trimRight: number;

  constructor(trimLeft: number, trimRight: number) {
    this._trimID = Math.random().toString(36).substring(7);
    this._trimLeft = trimLeft;
    this._trimRight = trimRight;
  }

  /**
   * Returns true if the progress is within the trim
   *
   * @param progress The progress to check
   */
  public isProgressWithinTrim(progress: number) {
    return progress >= this.trimLeft && progress <= this.trimRight;
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
}

export default App;
export { SpotifyTrim, Trim }
