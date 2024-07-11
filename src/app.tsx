import ReactDOMType from "react-dom";
import ReactType from "react";
import PlaybackBarContextMenu from "./components/PlaybackBarContextMenu";

const ReactDOM = Spicetify.ReactDOM as typeof ReactDOMType;
const React = Spicetify.React as typeof ReactType;

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

  let floatingElements = document.createElement("div")
  floatingElements.id = "playback-bar-overlap"
  floatingElements.style.position = "absolute"
  floatingElements.style.width = "100%"
  floatingElements.style.height = "120%"
  bar.style.position = "relative"
  bar.append(floatingElements);

  const _ = (async () => ReactDOM.render(<PlaybackBarContextMenu />, floatingElements))()
}

export default App;
