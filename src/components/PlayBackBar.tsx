import ReactType, {useEffect, useState} from "react";
import PlayBackBarContextMenu from "./PlayBackBarContextMenu";
import {SpotifyTrim, Trim} from "../app";
import {TbChevronLeftPipe, TbChevronRightPipe, TbTrash} from "react-icons/tb";

const React = Spicetify.React as typeof ReactType;

const getSongDuration = () => {
  return Spicetify.Player.data.item.duration.milliseconds
}

const getCurrentSongID = () => {
  return Spicetify.Player.data.item.uid
}

const PlayBackBar = () => {
  return (
    <div style={{width: "100%", height: "100%"}}>
      <PlayBackBarContextMenu/>
    </div>
  )
}

const ChevronBar = () => {
  const [songTrims, setSongTrims] = React.useState<{ trims: Trim[], reID: number }>({trims: [], reID: 0});

  useEffect(() => {
    SpotifyTrim.updateActiveTrims = (newTrims) => {
      setSongTrims({trims: newTrims, reID: songTrims.reID + 1});
    }
  }, [])
  return (
    <Spicetify.ReactComponent.RemoteConfigProvider
      configuration={Spicetify.Platform.RemoteConfiguration}
    >
      <div style={{width: "100%", height: "100%", position: "absolute", display: "flex", alignItems: "center"}}>
        {songTrims.trims.map((trim, index) => <>
            <PlayBackBarChevron direction={"left"} timestamp={trim.trimRight} trim={trim}
                                updateTimestamp={num => trim.trimRight = num}/>
            <PlayBackBarChevron direction={"right"} timestamp={trim.trimLeft} trim={trim}
                                updateTimestamp={num => trim.trimLeft = num}/>
          </>
        )}
      </div>
    </Spicetify.ReactComponent.RemoteConfigProvider>
  )
}

interface PlayBackBarChevronProps {
  direction: "left" | "right",
  timestamp: number,
  trim: Trim,
  updateTimestamp: (timestamp: number) => void
}

const PlayBackBarChevron = (props: PlayBackBarChevronProps) => {
  const [hovered, setHovered] = useState(false)
  const [mouseDown, setMouseDown] = useState(false)
  const [timeStamp, setTimeStamp] = useState(props.timestamp)
  const visualHover = hovered || mouseDown

  const icon = props.direction === "left" ?
    <TbChevronLeftPipe size={visualHover ? 22 : 20} color={visualHover ? "white" : ""}/> :
    <TbChevronRightPipe size={visualHover ? 22 : 20} color={visualHover ? "white" : ""}/>;
  let offset = SpotifyTrim.getRelativeXFromProgress(timeStamp / getSongDuration()) - (props.direction === "left" ? 7 : 15);

  useEffect(() => {
    const pairedTimestamp = props.direction === "left" ? props.trim.trimLeft : props.trim.trimRight

    const handleMouseMove = (event: MouseEvent) => {
      if (mouseDown) {
        const x = event.clientX
        const progress = Math.min(getSongDuration(), Math.max(0, SpotifyTrim.getProgressFromX(x)))
        let newTimestamp = getSongDuration() * progress
        const maxMinTimeStamp = SpotifyTrim.getNextTimestampJump(
          getCurrentSongID(),
          pairedTimestamp,
          getSongDuration(),
          props.direction === "left" ? "right" : "left",
          props.trim.trimID
        )
        if (props.direction === "left") {
          newTimestamp = Math.max(Math.min(maxMinTimeStamp, newTimestamp), pairedTimestamp + 2000)
        } else {
          newTimestamp = Math.min(Math.max(maxMinTimeStamp, newTimestamp), pairedTimestamp - 2000)
        }
        props.updateTimestamp(newTimestamp)
        setTimeStamp(newTimestamp)
      }
    }
    const handleMouseUp = () => {
      if (mouseDown) {
        setMouseDown(false)
      }
    }
    document.body.addEventListener("mousemove", handleMouseMove)
    document.body.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.body.removeEventListener("mousemove", handleMouseMove)
      document.body.removeEventListener("mouseup", handleMouseUp)
    }
  }, [mouseDown, timeStamp]);

  return (
    <div
      style={{
        position: "absolute",
        left: offset,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "999",
        height: {hovered} ? "22px" : "20px",
        width: {hovered} ? "22px" : "20px",
      }}
      onMouseEnter={(event) => {
        setHovered(true)
      }}
      onMouseLeave={(event) => {
        setHovered(false)
      }}
      onMouseDown={(event) => {
        setMouseDown(true)
      }}
    >
      <Spicetify.ReactComponent.RightClickMenu
        menu={<ChevronMenu trimID={props.trim.trimID}/>}
      >
        {icon}
      </Spicetify.ReactComponent.RightClickMenu>
    </div>
  )
}

interface ChevronMenuProps {
  trimID: string
}

const ChevronMenu = (props: ChevronMenuProps) => {
  return (
    <Spicetify.ReactComponent.Menu>
      <Spicetify.ReactComponent.MenuItem
        onClick={() => {
          SpotifyTrim.removeTrim(getCurrentSongID(), props.trimID)
        }}
        leadingIcon={<TbTrash size={22} />}
      >
        <Spicetify.ReactComponent.TextComponent
          semanticColor="textBase"
          variant="viola"
          weight="book"
        >
          Remove Trim
        </Spicetify.ReactComponent.TextComponent>
      </Spicetify.ReactComponent.MenuItem>
    </Spicetify.ReactComponent.Menu>
  )
}

export {PlayBackBar, ChevronBar}
