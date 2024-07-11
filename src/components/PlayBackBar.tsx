import ReactType, {useEffect} from "react";
import PlayBackBarContextMenu from "./PlayBackBarContextMenu";
import {SpotifyTrim, Trim} from "../app";
import {TbChevronLeftPipe, TbChevronRightPipe} from "react-icons/tb";

const React = Spicetify.React as typeof ReactType;

const getSongDuration = () => {
  return Spicetify.Player.data.item.duration.milliseconds
}

const PlayBackBar = () => {
  const [songTrims, setSongTrims] = React.useState<{trims: Trim[], reID: number}>({trims: [], reID: 0});

  useEffect(() => {
    SpotifyTrim.updateActiveTrims = (newTrims) => {
      setSongTrims({trims: newTrims, reID: songTrims.reID + 1});
    }
  }, [])

  console.log(songTrims)

  return (
    <div style={{width: "100%", height: "100%"}}>
      <PlayBackBarContextMenu/>
      <div style={{width: "100%", height: "100%", position: "absolute", display: "flex", alignItems: "center"}} id={"test22"}>
        {songTrims.trims.map((trim, index) => <><PlayBackBarChevron direction={"left"} timestamp={trim.trimRight} /><PlayBackBarChevron direction={"right"} timestamp={trim.trimLeft} /></>)}
      </div>
    </div>
  )
}

interface PlayBackBarChevronProps {
  direction: "left" | "right",
  timestamp: number
}

const PlayBackBarChevron = (props: PlayBackBarChevronProps) => {
  const icon = props.direction === "left" ? <TbChevronLeftPipe size={20} /> : <TbChevronRightPipe size={20}  />;
  let offset = SpotifyTrim.getRelativeXFromProgress(props.timestamp / getSongDuration()) - (props.direction === "left" ? 7 : 13);

  return (
    <div style={{position: "absolute", left: offset, display: "flex", alignItems: "center"}}>
      {icon}
    </div>
  )
}

export {PlayBackBar}
